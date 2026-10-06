import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import { verifierInvariants } from "../../scripts/check-framework-invariants.mjs"

const roots: string[] = []

function errorsFor(files: string[]): string[] {
  const root = mkdtempSync(join(tmpdir(), "invariants-"))
  roots.push(root)
  for (const f of files) {
    mkdirSync(join(root, f, ".."), { recursive: true })
    writeFileSync(join(root, f), "export {}\n")
  }
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e)
      if (statSync(p).isDirectory()) walk(p, out)
      else out.push(p)
    }
    return out
  }
  const errors: string[] = []
  verifierInvariants({
    ROOT: root,
    read: (p: string) => readFileSync(p, "utf8"),
    walk,
    err: (m: string) => errors.push(m),
    warn: () => {},
  })
  return errors.filter((m) => m.includes("api/mcp/route.ts"))
}

afterEach(() => {
  for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true })
})

describe("verifierInvariants — collision du MCP Otomata", () => {
  it("should fail when api/mcp/route.ts and api/[transport]/ coexist", () => {
    expect(errorsFor(["src/app/api/mcp/route.ts", "src/app/api/[transport]/route.ts"])).toHaveLength(1)
  })

  it("should pass with the template MCP alone", () => {
    expect(errorsFor(["src/app/api/[transport]/route.ts"])).toHaveLength(0)
  })

  it("should pass with the Otomata MCP alone", () => {
    expect(errorsFor(["src/app/api/mcp/route.ts"])).toHaveLength(0)
  })
})
