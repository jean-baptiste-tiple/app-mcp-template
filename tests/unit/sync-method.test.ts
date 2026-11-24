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
  copyFileSync(join(process.cwd(), "scripts/sync-method-merge.mjs"), join(tpl, "scripts/sync-method-merge.mjs"))
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

  it("should list .gitattributes lines absent from the target", () => {
    // Sans `*.mjs text eol=lf`, un script à shebang extrait en CRLF ne se charge plus
    // (mon-espace-luciole, 2026-11-24) : la ligne doit apparaître au rapport.
    ecrire(tpl, {
      ".method/sync-manifest.json": JSON.stringify({ ...MANIFESTE, merge: [...MANIFESTE.merge, ".gitattributes"] }),
      ".gitattributes": "# commentaire\n*.mjs text eol=lf\n*.sh text eol=lf\n",
    })
    ecrire(cible, { ".gitattributes": "*.sh text eol=lf\n" })
    const { out } = sync(cible)
    expect(out).toContain("ligne « *.mjs text eol=lf »")
    expect(out).not.toContain("ligne « *.sh text eol=lf »")
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

  it("should refuse --exclude on a file the template does not provide", () => {
    expect(sync(cible, "--apply", "--exclude", "src/app/page.tsx").code).toBe(1)
    expect(existsSync(join(cible, ".method/sync-state.json"))).toBe(false)
  })

  it("should imply --apply with --exclude alone", () => {
    const { code } = sync(cible, "--exclude", ".claude/skills/dev/SKILL.md")
    expect(code).toBe(0)
    expect(tampon()).toMatchObject({ exclude: [".claude/skills/dev/SKILL.md"] })
    expect(lire(".method/conventions/ui-patterns.md")).toBe("ui v1\n")
  })
})

describe("sync-method — --take", () => {
  it("should imply --apply with --take alone", () => {
    const { code } = sync(cible, "--take", ".method/conventions/ui-patterns.md")
    expect(code).toBe(0)
    expect(lire(".method/conventions/ui-patterns.md")).toBe("ui v2\n")
    expect(lire(".claude/skills/dev/SKILL.md")).toBe("dev v2\n")
  })

  it("should report a merge file without project lines and let --take write the template version", () => {
    ecrire(cible, { "CLAUDE.md": "# Méthode\r\n\r\n## Projet\r\n" })
    expect(sync(cible).out).toContain("CLAUDE.md : merge sans part projet")
    const { code } = sync(cible, "--take", "CLAUDE.md")
    expect(code).toBe(0)
    expect(lire("CLAUDE.md")).toBe("# Méthode\n\n## Projet\n\n## Nouvelle section\n")
  })

  it("should refuse --take on a merge file that has project lines", () => {
    const { code, out } = sync(cible, "--take", "CLAUDE.md")
    expect(code).toBe(1)
    expect(out).toContain("ni « merge sans part projet »")
    expect(lire("CLAUDE.md")).toBe("# Méthode\n\n## Projet\n\nPart du projet.\n")
  })
})

describe("sync-method — doublons et rappels", () => {
  it("should report an original copy left at the old path of a moved owned file, same content CRLF-normalised", () => {
    ecrire(cible, { "docs/decisions/ADR-001-socle.md": "ADR du template\r\n" })
    const { out } = sync(cible)
    expect(out).toContain("doublon à supprimer à la main (1)\n  docs/decisions/ADR-001-socle.md  (même contenu que docs/decisions/socle/ADR-001-socle.md)")
    sync(cible, "--apply")
    expect(existsSync(join(cible, "docs/decisions/ADR-001-socle.md"))).toBe(true)
  })

  it("should not report as duplicate an old-path file the project has changed", () => {
    ecrire(cible, { "docs/decisions/ADR-001-socle.md": "ADR amendé par le projet\n" })
    expect(sync(cible).out).not.toContain("## doublon à supprimer à la main")
  })

  it("should remind to install chromium only when @playwright/test differs", () => {
    const rappel = "pnpm exec playwright install chromium"
    ecrire(tpl, { "package.json": JSON.stringify({ name: "t", devDependencies: { "@playwright/test": "1.64.0" } }) })
    ecrire(cible, { "package.json": JSON.stringify({ name: "c", devDependencies: { "@playwright/test": "1.60.0" } }) })
    expect(sync(cible).out).toContain(rappel)
    ecrire(cible, { "package.json": JSON.stringify({ name: "c", devDependencies: { "@playwright/test": "1.64.0" } }) })
    expect(sync(cible).out).not.toContain(rappel)
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

  it("should refuse --diff combined with --take or --exclude, which imply writing", () => {
    expect(sync(cible, "--take", ".method/conventions/ui-patterns.md", "--diff", "CLAUDE.md").code).toBe(1)
    expect(sync(cible, "--exclude", ".claude/skills/dev/SKILL.md", "--diff", "CLAUDE.md").code).toBe(1)
    expect(lire(".method/conventions/ui-patterns.md")).toBe("ui v1\n")
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

  it("should flag a travelling document that cites a template-only path (manifest, ADR before its move)", () => {
    const errors: string[] = []
    ecrire(tpl, {
      "CLAUDE.md": "Selon `.method/sync-manifest.json`.\n",
      ".claude/skills/dev/SKILL.md": "Voir `docs/decisions/ADR-001-socle.md`.\n",
    })
    verifierManifeste(tpl, (m: string) => errors.push(m))
    expect(errors).toEqual([
      expect.stringContaining(".claude/skills/dev/SKILL.md : cite `docs/decisions/ADR-001-socle.md`"),
      expect.stringContaining("CLAUDE.md : cite `.method/sync-manifest.json`"),
    ])
  })

  it("should accept a travelling document that cites a template ADR by its number alone", () => {
    const errors: string[] = []
    ecrire(tpl, { "CLAUDE.md": "Le manifeste `sync-manifest.json` du template ; ADR-001.\n" })
    verifierManifeste(tpl, (m: string) => errors.push(m))
    expect(errors).toEqual([])
  })
})
