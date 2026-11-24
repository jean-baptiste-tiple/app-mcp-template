import { execFileSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { empreinte, verifierManifeste } from "../../scripts/sync-method.mjs"

vi.setConfig({ testTimeout: 20_000 })

/**
 * Synchro de la méthode vers un projet dérivé (CLAUDE.md § Mettre à jour un projet dérivé) :
 * écraser un fichier que le projet a modifié, ou écrire un fichier `merge`, détruit sa part propre
 * sans que rien ne le signale. Le script est copié dans un template jetable : il prend sa racine
 * à côté de lui, et ces tests tournent aussi dans les dérivés, où le manifeste n'existe pas.
 */

const SCRIPT = join(process.cwd(), "scripts/sync-method.mjs")
const MANIFESTE = {
  owned: [
    ".claude/skills/{dev,verify}/**",
    ".method/conventions/{coding-standards,ui-patterns}.md",
    { glob: "docs/decisions/ADR-*.md", dest: "docs/decisions/socle/" },
  ],
  merge: ["CLAUDE.md", ".method/conventions/_index.md"],
}

let root: string
let tpl: string
let cible: string

function ecrire(base: string, files: Record<string, string>) {
  for (const [f, content] of Object.entries(files)) {
    mkdirSync(dirname(join(base, f)), { recursive: true })
    writeFileSync(join(base, f), content)
  }
}

function sync(...args: string[]): { code: number; out: string } {
  try {
    const out = execFileSync("node", [join(tpl, "scripts/sync-method.mjs"), ...args], { stdio: "pipe" })
    return { code: 0, out: out.toString() }
  } catch (error) {
    const e = error as { status: number; stdout: Buffer; stderr: Buffer }
    return { code: e.status, out: `${e.stdout}${e.stderr}` }
  }
}

const lire = (p: string) => readFileSync(join(cible, p), "utf8")
const tampon = () => JSON.parse(lire(".method/sync-state.json")) as { files: Record<string, string> }

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "sync-method-"))
  tpl = join(root, "template")
  cible = join(root, "cible")
  ecrire(tpl, {
    ".method/sync-manifest.json": JSON.stringify(MANIFESTE),
    "package.json": JSON.stringify({ name: "template-test" }),
    ".claude/skills/dev/SKILL.md": "dev v2\n",
    ".claude/skills/verify/SKILL.md": "verify v2\n",
    ".method/conventions/coding-standards.md": "ligne 1\nligne 2\n",
    ".method/conventions/ui-patterns.md": "ui v2\n",
    ".method/conventions/_index.md": "# Index\n\n## Tags\n\n| Tag | Fichier |\n|---|---|\n| `ui` | ui.md |\n| `mcp` | mcp.md |\n",
    "docs/decisions/ADR-001-socle.md": "ADR du template\n",
    "CLAUDE.md": "# Méthode\n\n## Projet\n\n## Nouvelle section\n",
  })
  mkdirSync(join(tpl, "scripts"), { recursive: true })
  copyFileSync(SCRIPT, join(tpl, "scripts/sync-method.mjs"))
  ecrire(cible, {
    ".method/conventions/coding-standards.md": "ligne 1\r\nligne 2\r\n",
    ".method/conventions/ui-patterns.md": "ui v1\n",
    ".method/conventions/_index.md": "# Index\n\n## Tags\n\n| Tag | Fichier |\n|---|---|\n| `ui` | ui.md |\n",
    ".claude/skills/verify/SKILL.md": "verify v1\n",
    "docs/decisions/ADR-001-projet.md": "ADR du projet\n",
    "CLAUDE.md": "# Méthode\n\n## Projet\n\nPart du projet.\n",
  })
})

afterEach(() => rmSync(root, { recursive: true, force: true }))

describe("sync-method — rapport", () => {
  it("should refuse a target without .method/", () => {
    const vide = join(root, "vide")
    mkdirSync(vide)
    const { code, out } = sync(vide)
    expect(code).toBe(1)
    expect(out).toContain("pas de .method/")
  })

  it("should refuse a usage error", () => {
    expect(sync().code).toBe(1)
    expect(sync(cible, "--take", "x").code).toBe(1)
  })

  it("should write nothing without --apply", () => {
    const { code, out } = sync(cible)
    expect(code).toBe(0)
    expect(out).toContain("Résumé : owned : 5 — nouveau 2, identique 1, à jour sûr 0, modifié par le projet 2")
    expect(existsSync(join(cible, ".claude/skills/dev/SKILL.md"))).toBe(false)
    expect(existsSync(join(cible, ".method/sync-state.json"))).toBe(false)
  })

  it("should list merge additions: sections and table rows absent from the target", () => {
    const { out } = sync(cible)
    expect(out).toContain("section « Nouvelle section »")
    expect(out).toContain("ligne de tableau « `mcp` »")
    expect(out).not.toContain("ligne de tableau « `ui` »")
  })
})

describe("sync-method — --apply", () => {
  it("should write a new file", () => {
    sync(cible, "--apply")
    expect(lire(".claude/skills/dev/SKILL.md")).toBe("dev v2\n")
  })

  it("should treat CRLF and LF as identical and not rewrite the file", () => {
    const avant = statSync(join(cible, ".method/conventions/coding-standards.md")).mtimeMs
    sync(cible, "--apply")
    expect(lire(".method/conventions/coding-standards.md")).toBe("ligne 1\r\nligne 2\r\n")
    expect(statSync(join(cible, ".method/conventions/coding-standards.md")).mtimeMs).toBe(avant)
    expect(tampon().files[".method/conventions/coding-standards.md"]).toBe(empreinte(Buffer.from("ligne 1\nligne 2\n")))
  })

  it("should not overwrite a file modified by the project without --take", () => {
    const { out } = sync(cible, "--apply")
    expect(out).toContain("modifié par le projet (2)")
    expect(lire(".method/conventions/ui-patterns.md")).toBe("ui v1\n")
  })

  it("should overwrite a modified file named by --take", () => {
    sync(cible, "--apply", "--take", ".method/conventions/ui-patterns.md")
    expect(lire(".method/conventions/ui-patterns.md")).toBe("ui v2\n")
    expect(lire(".claude/skills/verify/SKILL.md")).toBe("verify v1\n")
  })

  it("should write a safe update: target untouched since the last sync stamp", () => {
    ecrire(cible, {
      ".method/sync-state.json": JSON.stringify({ files: { ".method/conventions/ui-patterns.md": empreinte(Buffer.from("ui v1\n")) } }),
    })
    const { out } = sync(cible, "--apply")
    expect(out).toContain("à jour sûr (1)")
    expect(lire(".method/conventions/ui-patterns.md")).toBe("ui v2\n")
    expect(tampon().files[".method/conventions/ui-patterns.md"]).toBe(empreinte(Buffer.from("ui v2\n")))
  })

  it("should copy template ADRs under docs/decisions/socle/ and leave project ADRs alone", () => {
    sync(cible, "--apply")
    expect(lire("docs/decisions/socle/ADR-001-socle.md")).toBe("ADR du template\n")
    expect(lire("docs/decisions/ADR-001-projet.md")).toBe("ADR du projet\n")
  })

  it("should never write a merge file", () => {
    sync(cible, "--apply")
    expect(lire("CLAUDE.md")).toBe("# Méthode\n\n## Projet\n\nPart du projet.\n")
    expect(lire(".method/conventions/_index.md")).not.toContain("`mcp`")
  })

  it("should report as removed only a file noted by the previous sync, otherwise as project-owned", () => {
    ecrire(cible, {
      "docs/decisions/socle/ADR-009-ancien.md": "x\n",
      ".claude/skills/dev/notes-projet.md": "y\n",
      ".method/sync-state.json": JSON.stringify({ files: { "docs/decisions/socle/ADR-009-ancien.md": empreinte(Buffer.from("x\n")) } }),
    })
    const { out } = sync(cible, "--apply")
    expect(out).toContain("retiré du template (1)\n  docs/decisions/socle/ADR-009-ancien.md")
    expect(out).toContain("propre au projet (1)\n  .claude/skills/dev/notes-projet.md")
    expect(lire(".claude/skills/dev/notes-projet.md")).toBe("y\n")
    expect(lire("docs/decisions/socle/ADR-009-ancien.md")).toBe("x\n")
  })
})

describe("sync-method — --exclude", () => {
  it("should never write an excluded file and record the exclusion in the stamp", () => {
    const { code, out } = sync(cible, "--apply", "--exclude", ".claude/skills/dev/SKILL.md")
    expect(code).toBe(0)
    expect(out).toContain("exclu par le projet (1)")
    expect(existsSync(join(cible, ".claude/skills/dev/SKILL.md"))).toBe(false)
    expect(tampon()).toMatchObject({ exclude: [".claude/skills/dev/SKILL.md"] })
  })

  it("should keep the exclusion on later syncs without repeating the option", () => {
    sync(cible, "--apply", "--exclude", ".claude/skills/dev/SKILL.md")
    const { out } = sync(cible, "--apply")
    expect(out).toContain("exclu par le projet (1)")
    expect(existsSync(join(cible, ".claude/skills/dev/SKILL.md"))).toBe(false)
    expect(tampon().files).not.toHaveProperty(".claude/skills/dev/SKILL.md")
  })

  it("should refuse --exclude without --apply, or on a file the template does not provide", () => {
    expect(sync(cible, "--exclude", ".claude/skills/dev/SKILL.md").code).toBe(1)
    expect(sync(cible, "--apply", "--exclude", "src/app/page.tsx").code).toBe(1)
    expect(existsSync(join(cible, ".method/sync-state.json"))).toBe(false)
  })
})

describe("sync-method — --diff", () => {
  it("should print the unified diff template to target, CRLF normalised, and write nothing", () => {
    const { code, out } = sync(cible, "--diff", ".method/conventions/ui-patterns.md", "--diff", ".method/conventions/coding-standards.md")
    expect(code).toBe(0)
    expect(out).toContain("-ui v2")
    expect(out).toContain("+ui v1")
    expect(out).toContain(".method/conventions/coding-standards.md : identique au template (CRLF normalisé)")
    expect(lire(".method/conventions/ui-patterns.md")).toBe("ui v1\n")
    expect(existsSync(join(cible, ".method/sync-state.json"))).toBe(false)
  })

  it("should refuse --diff on a file neither owned nor merge, or with --apply", () => {
    expect(sync(cible, "--diff", "src/app/page.tsx").code).toBe(1)
    expect(sync(cible, "--apply", "--diff", "CLAUDE.md").code).toBe(1)
  })
})

describe("verifierManifeste", () => {
  it("should flag an owned glob alternative that matches no template file", () => {
    const errors: string[] = []
    rmSync(join(tpl, ".claude/skills/verify"), { recursive: true })
    verifierManifeste(tpl, (m: string) => errors.push(m))
    expect(errors.join("\n")).toContain("`.claude/skills/verify/**` ne matche aucun fichier")
  })

  it("should flag a template convention that is neither owned nor merge", () => {
    const errors: string[] = []
    ecrire(tpl, { ".method/conventions/nouvelle.md": "x\n" })
    verifierManifeste(tpl, (m: string) => errors.push(m))
    expect(errors).toEqual([expect.stringContaining("`.method/conventions/nouvelle.md` n'est ni owned ni merge")])
  })
})
