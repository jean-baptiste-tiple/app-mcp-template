import { execFileSync, spawn } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Ces tests lancent de vrais process Node concurrents ; sur une machine chargée, 5 s ne suffisent pas.
vi.setConfig({ testTimeout: 20_000 })

/**
 * Coordination de plusieurs sessions sur le même checkout (CLAUDE.md § Plusieurs sessions sur le
 * même checkout) : un gel mal appliqué laisse un `verify` couvrir un arbre qu'une autre session
 * modifie, et une file d'attente cassée relance des runs longs en parallèle.
 */

const HOOK = join(process.cwd(), ".claude/hooks/coordinate-sessions.mjs")
const LONG_RUN = join(process.cwd(), "scripts/long-run.mjs")
const DEAD_PID = 999_999

let dir: string
const env = () => ({ ...process.env, LONG_RUN_DIR: dir, LONG_RUN_POLL_MS: "100", LONG_RUN_QUIET_MS: "1000" })

function hook(payload: Record<string, unknown>): number {
  try {
    execFileSync("node", [HOOK], { input: JSON.stringify(payload), stdio: "pipe", env: env() })
    return 0
  } catch (error) {
    return (error as { status: number }).status
  }
}

function lock(entry: Record<string, unknown>) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "lock.json"), JSON.stringify({ task: "verify", startedAt: Date.now(), ...entry }))
}

const write = (session: string) =>
  hook({ session_id: session, tool_name: "Write", tool_input: { file_path: "src/a.ts" } })

/** Lance long-run ; résout avec l'instant (ms) où la commande enveloppée a démarré puis fini. */
function longRun(args: string[], command: string): Promise<{ code: number; stamps: number[] }> {
  const out = join(dir, `stamps-${Math.random().toString(36).slice(2)}.txt`)
  const script = `const fs=require('fs');fs.appendFileSync(${JSON.stringify(out)},Date.now()+'\\n');${command};fs.appendFileSync(${JSON.stringify(out)},Date.now()+'\\n')`
  return new Promise((resolve) => {
    const child = spawn("node", [LONG_RUN, ...args, "--", `node -e "${script.replace(/"/g, '\\"')}"`], {
      env: env(),
      stdio: "ignore",
    })
    child.on("exit", (code) =>
      resolve({
        code: code ?? 1,
        stamps: existsSync(out) ? readFileSync(out, "utf8").trim().split("\n").map(Number) : [],
      })
    )
  })
}

/** Attente active, bornée, que le premier run tienne le verrou : un délai fixe ne suffit pas sous charge. */
async function attendreVerrou(limiteMs = 15_000) {
  const fin = Date.now() + limiteMs
  while (!existsSync(join(dir, "lock.json"))) {
    if (Date.now() > fin) throw new Error(`lock.json absent après ${limiteMs} ms`)
    await new Promise((r) => setTimeout(r, 20))
  }
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "long-run-"))
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe("coordinate-sessions hook", () => {
  it("blocks a write from another session while the checkout is frozen", () => {
    lock({ freeze: true, pid: process.pid, session: "session-a" })
    expect(write("session-b")).toBe(2)
  })

  it("lets the freezing session write", () => {
    lock({ freeze: true, pid: process.pid, session: "session-a" })
    expect(write("session-a")).toBe(0)
  })

  it("ignores a frozen lock whose process is dead and removes it", () => {
    lock({ freeze: true, pid: DEAD_PID, session: "session-a" })
    expect(write("session-b")).toBe(0)
    expect(existsSync(join(dir, "lock.json"))).toBe(false)
  })

  it("does not block writes during a run that does not freeze", () => {
    lock({ task: "test:e2e", freeze: false, pid: process.pid, session: "session-a" })
    expect(write("session-b")).toBe(0)
  })

  it("records the writing session as active", () => {
    write("session-b")
    const state = JSON.parse(readFileSync(join(dir, "sessions/session-b.json"), "utf8"))
    expect(state.lastFile).toBe("src/a.ts")
  })

  it("records which session launches a long run", () => {
    hook({ session_id: "session-a", tool_name: "Bash", tool_input: { command: "pnpm verify" } })
    expect(JSON.parse(readFileSync(join(dir, "intent.json"), "utf8")).session).toBe("session-a")
  })

  it("records the launching session from PowerShell too", () => {
    // app-pmo lance son verify depuis PowerShell : sans intention notée, le gel bloquait aussi la
    // session qui l'avait lancé (2026-11-24).
    hook({ session_id: "session-a", tool_name: "PowerShell", tool_input: { command: "pnpm verify" } })
    expect(JSON.parse(readFileSync(join(dir, "intent.json"), "utf8")).session).toBe("session-a")
  })

  it("does not record an intent for a command that is not a long run", () => {
    hook({ session_id: "session-a", tool_name: "Bash", tool_input: { command: "pnpm lint" } })
    expect(existsSync(join(dir, "intent.json"))).toBe(false)
  })
})

describe("long-run", () => {
  it("runs two long commands one after the other, never together", async () => {
    const sleep = "Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,800)"
    const first = longRun(["build"], sleep)
    await attendreVerrou()
    const second = longRun(["test:e2e"], sleep)
    const [a, b] = await Promise.all([first, second])
    expect(a.code).toBe(0)
    expect(b.code).toBe(0)
    expect(b.stamps[0]).toBeGreaterThanOrEqual(a.stamps[1])
  })

  it("takes over a lock left by a dead process", async () => {
    lock({ freeze: true, pid: DEAD_PID, session: "session-a" })
    const { code, stamps } = await longRun(["verify", "--freeze"], "0")
    expect(code).toBe(0)
    expect(stamps).toHaveLength(2)
  })

  it("delays a freeze while another session is still writing", async () => {
    mkdirSync(join(dir, "sessions"), { recursive: true })
    const startedAt = Date.now()
    writeFileSync(
      join(dir, "sessions/session-b.json"),
      JSON.stringify({ session: "session-b", lastWriteAt: startedAt, lastFile: "src/a.ts" })
    )
    const { stamps } = await longRun(["verify", "--freeze"], "0")
    expect(stamps[0] - startedAt).toBeGreaterThanOrEqual(900)
  })

  it("releases the lock when the command fails", async () => {
    const { code } = await longRun(["build"], "process.exit(3)")
    expect(code).toBe(3)
    expect(existsSync(join(dir, "lock.json"))).toBe(false)
  })
})
