import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import { verifierInvariants } from "../../scripts/check-framework-invariants.mjs"

const roots: string[] = []

function allErrorsFor(files: Record<string, string>): string[] {
  const root = mkdtempSync(join(tmpdir(), "invariants-"))
  roots.push(root)
  for (const [f, content] of Object.entries(files)) {
    mkdirSync(join(root, f, ".."), { recursive: true })
    writeFileSync(join(root, f), content)
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
  return errors
}

function errorsFor(files: string[]): string[] {
  return allErrorsFor(Object.fromEntries(files.map((f) => [f, "export {}\n"]))).filter((m) =>
    m.includes("api/mcp/route.ts")
  )
}

/** Erreurs remontées pour un seul fichier .tsx d'une ligne (les autres invariants sont ignorés). */
function uiErrorsFor(path: string, line: string): string[] {
  return allErrorsFor({ [path]: `${line}\n` }).filter((m) => m.startsWith(`${path}:`))
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

describe("verifierInvariants — invariants UI", () => {
  const COMPONENT = "src/components/foo.tsx"
  const SHADCN = "src/components/ui/foo.tsx"

  it("should fail on an em dash in a visible string", () => {
    const errors = uiErrorsFor(COMPONENT, "<p>Titre — sous-titre</p>")
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain("ui-patterns.md § Texte visible")
  })

  it("should fail on an en dash in a widget", () => {
    expect(uiErrorsFor("widgets/card/main.tsx", "<p>Titre – sous-titre</p>")).toHaveLength(1)
  })

  it("should ignore an em dash in a comment line", () => {
    expect(uiErrorsFor(COMPONENT, "{/* Sidebar — fixe */}")).toHaveLength(0)
  })

  it("should fail on a screen height, with or without a variant prefix", () => {
    const errors = uiErrorsFor(COMPONENT, '<div className="md:min-h-screen" />')
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain("ui-patterns.md § Responsive")
  })

  it("should skip src/components/ui/** for the screen height rule", () => {
    expect(uiErrorsFor(SHADCN, '<div className="h-screen" />')).toHaveLength(0)
  })

  it("should fail on a hard-coded hex color in a style", () => {
    const errors = uiErrorsFor(COMPONENT, '<div style={{ color: "#ff0000" }} />')
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain("ui-patterns.md § Design system verrouillé")
  })

  it("should fail on an arbitrary color class", () => {
    expect(uiErrorsFor(COMPONENT, '<div className="bg-[var(--brand)]" />')).toHaveLength(1)
  })

  it("should not report a size arbitrary value as a color", () => {
    expect(uiErrorsFor(COMPONENT, '<div className="border-[3px]" />')).toHaveLength(0)
  })

  it("should skip widgets/** for the hard-coded color rule", () => {
    expect(uiErrorsFor("widgets/card/main.tsx", 'const dot = { background: "rgb(0, 128, 0)" }')).toHaveLength(0)
  })

  it("should fail on an arbitrary text size, radius or z-index", () => {
    const errors = uiErrorsFor(COMPONENT, '<div className="rounded-[10px]" />')
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain("ui-patterns.md § Design system verrouillé")
  })

  it("should skip src/components/ui/** for the arbitrary value rule", () => {
    expect(uiErrorsFor(SHADCN, '<div className="text-[15px] z-[60]" />')).toHaveLength(0)
  })

  it("should fail on a dark: variant applied to a color utility", () => {
    const errors = uiErrorsFor(COMPONENT, '<div className="bg-card dark:hover:bg-background" />')
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain("`dark:`")
  })

  it("should allow a dark: variant on a non-color utility", () => {
    expect(uiErrorsFor(COMPONENT, '<Sun className="dark:rotate-90 dark:scale-0" />')).toHaveLength(0)
  })

  it("should fail on a lucide-react import outside src/components/ui/**", () => {
    const errors = uiErrorsFor(COMPONENT, 'import { X } from "lucide-react"')
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain("ui-patterns.md § Icônes")
  })

  it("should allow a lucide-react import inside src/components/ui/**", () => {
    expect(uiErrorsFor(SHADCN, 'import { X } from "lucide-react"')).toHaveLength(0)
  })

  it("should fail on outline-none without a focus-visible style", () => {
    const errors = uiErrorsFor(COMPONENT, '<input className="focus:outline-none" />')
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain("accessibility-patterns.md § Ordre de focus")
  })

  it("should allow outline-none paired with focus-visible on the same line", () => {
    expect(
      uiErrorsFor(COMPONENT, '<input className="outline-none focus-visible:ring-1 focus-visible:ring-ring" />')
    ).toHaveLength(0)
  })

  it("should fail on onClick on a div", () => {
    const errors = uiErrorsFor(COMPONENT, '<div className="p-2" onClick={toggle}>')
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain("accessibility-patterns.md § Ordre de focus")
  })

  it("should allow onClick on a button", () => {
    expect(uiErrorsFor(COMPONENT, "<button onClick={toggle}>")).toHaveLength(0)
  })
})
