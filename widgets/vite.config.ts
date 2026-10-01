// Build d'UN widget en HTML single-file (mcp-patterns §5.3 : JS/CSS inlinés, zéro requête
// réseau — la CSP des hosts sandboxe l'iframe). Le widget cible est piloté par `WIDGET`.
// Orchestration de tous les widgets + génération de `src/mcp/widgets/generated.ts` :
// `pnpm widgets:build` = `node widgets/build.mjs` (lance ce config une fois par widget).
import { resolve } from "node:path"

import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

const WIDGET = process.env.WIDGET ?? "status-card"
const root = __dirname

export default defineConfig({
  root,
  // Chemins relatifs → aucun asset absolu (indispensable en iframe sandbox).
  base: "./",
  plugins: [react(), viteSingleFile()],
  resolve: {
    // Alias `@` → ../src : si un rendu existe côté web (composant React), le widget
    // importe le MÊME composant — jamais une copie (§5.3).
    alias: { "@": resolve(root, "../src") },
  },
  define: {
    "import.meta.env.VITE_APP_URL": JSON.stringify(
      process.env.NEXT_PUBLIC_APP_URL ?? process.env.VITE_APP_URL ?? ""
    ),
  },
  build: {
    outDir: resolve(root, "dist"),
    emptyOutDir: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    // Une seule entrée par build → inlineDynamicImports OK (chunk unique, tout inliné).
    rollupOptions: {
      input: resolve(root, WIDGET, "index.html"),
      output: { inlineDynamicImports: true, entryFileNames: `${WIDGET}.js` },
    },
    // Budget §5.3 : cible < 300 Ko ; jusqu'à ~600 Ko assumé avec le SDK ext-apps + polices.
    chunkSizeWarningLimit: 3000,
  },
})
