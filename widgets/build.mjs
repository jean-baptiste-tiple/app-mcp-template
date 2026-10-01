// Orchestrateur de build des widgets MCP Apps (mcp-patterns §5.3).
// Pour chaque widget : `vite build` (config widgets/vite.config.ts) piloté par l'env WIDGET,
// produisant un HTML single-file. Puis regénère src/mcp/widgets/generated.ts avec les bundles
// INLINÉS (contrat Partial<Record<WidgetName,string>>) — servis en mémoire par le serveur MCP,
// zéro lecture fs à runtime, zéro souci de tracing Vercel. Idempotent, zéro requête réseau.
//
// Lancé par `pnpm widgets:build`.

import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "..")
const distDir = resolve(here, "dist")
const generatedPath = resolve(repoRoot, "src/mcp/widgets/generated.ts")

// Doit rester aligné avec src/mcp/widget-meta.ts (WIDGET_NAMES).
const WIDGET_NAMES = ["status-card"]

// Windows : node_modules/.bin/vite est un shim (.cmd / sh) que spawnSync sans shell ne sait pas
// lancer. On exécute le JS du binaire avec le node courant : chemin de `bin.vite` dans
// node_modules/vite/package.json.
const viteBin = resolve(repoRoot, "node_modules/vite/bin/vite.js")
const configPath = resolve(here, "vite.config.ts")

// Repart propre.
rmSync(distDir, { recursive: true, force: true })
mkdirSync(distDir, { recursive: true })

const bundles = {}

for (const name of WIDGET_NAMES) {
  console.log(`\n▶ build ${name}`)
  const res = spawnSync(process.execPath, [viteBin, "build", "--config", configPath], {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, WIDGET: name },
  })
  if (res.status !== 0) {
    console.error(`✗ build échoué pour ${name}`)
    process.exit(res.status ?? 1)
  }

  // Vite écrit dans dist/<name>/index.html (chemin de l'input relatif au root widgets/).
  const nested = resolve(distDir, name, "index.html")
  const flat = resolve(distDir, `${name}.html`)
  const src = existsSync(nested) ? nested : existsSync(flat) ? flat : null
  if (!src) {
    console.error(`✗ HTML introuvable pour ${name} (cherché: ${nested})`)
    process.exit(1)
  }
  const html = readFileSync(src, "utf8")
  writeFileSync(flat, html) // copie plate pour inspection/preview navigateur
  bundles[name] = html
  console.log(`  ✓ ${(Buffer.byteLength(html) / 1024).toFixed(1)} Ko`)
}

// Génère generated.ts — chaque valeur est un document HTML autonome inliné.
const entries = WIDGET_NAMES.filter((n) => bundles[n]).map(
  (n) => `  ${JSON.stringify(n)}: ${JSON.stringify(bundles[n])},`
)

const fileContent = `import type { WidgetName } from "../widget-meta"

// Bundles HTML single-file des widgets — GÉNÉRÉ par \`pnpm widgets:build\` (widgets/build.mjs).
// NE PAS ÉDITER À LA MAIN. Chaque valeur = un document HTML autonome (CSS/JS inlinés, zéro
// requête réseau). Servis en resources \`ui://\` par src/mcp/widgets/index.ts.
export const WIDGET_HTML: Partial<Record<WidgetName, string>> = {
${entries.join("\n")}
}
`

writeFileSync(generatedPath, fileContent)

const total = Object.values(bundles).reduce((a, h) => a + Buffer.byteLength(h), 0)
console.log(`\n✓ ${Object.keys(bundles).length} widget(s) · ${(total / 1024).toFixed(0)} Ko total`)
console.log(`✓ ${generatedPath} régénéré`)
