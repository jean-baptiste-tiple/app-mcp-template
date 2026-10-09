// @vitest-environment node
// Chaque route qui monte une porte du paquet oto importe `@/lib/fonctions-metier` pour son effet.
// L'état d'un module vit dans chaque bundle serverless : une route qui l'oublie sert un catalogue
// sans les fonctions de l'application, sans erreur (README du paquet, « Fonctions métier »).
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const root = path.resolve(__dirname, "../..")
const GATES = ["src/app/api/mcp/route.ts", "src/app/api/mcp-admin/route.ts", "src/app/api/platform/[...route]/route.ts"]

/** Une route qui monte une porte du paquet : elle importe sa face `mcp` ou `api`. */
const mountsGate = (text: string) => /from\s+["']@otomata_tech\/oto_platform\/(?:mcp|api)["']/.test(text)

/** Une route qui inscrit les fonctions de l'application : l'import de `@/lib/fonctions-metier` pour son effet. */
const registersFunctions = (text: string) => /^import\s+["']@\/lib\/fonctions-metier["']/m.test(text)

/** Les `route.ts` sous `dir`, récursivement. */
function routeFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return routeFiles(full)
    return entry.name === "route.ts" ? [path.relative(root, full).split(path.sep).join("/")] : []
  })
}

describe("fonctions métier", () => {
  it("should be imported by every API route that mounts a gate of the package", () => {
    const routes = routeFiles(path.join(root, "src/app/api")).map((file) => ({ file, text: fs.readFileSync(path.join(root, file), "utf8") }))
    const gates = routes.filter((route) => mountsGate(route.text))

    expect(gates.map((route) => route.file)).toEqual(expect.arrayContaining(GATES))
    expect(gates.filter((route) => !registersFunctions(route.text)).map((route) => route.file)).toEqual([])
  })

  it("should detect a route that forgets the import", () => {
    expect(registersFunctions('import { handleMcpPost } from "@otomata_tech/oto_platform/mcp"\n')).toBe(false)
  })
})
