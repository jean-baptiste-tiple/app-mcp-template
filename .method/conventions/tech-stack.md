# Stack Technique

> Dernière MAJ : [date init]

| Techno | Version | Rôle | Justification |
|--------|---------|------|---------------|
| Next.js | 15 (App Router) | Framework fullstack | SSR/SSG, Server Components, Server Actions, routing fichiers |
| TypeScript | ~5.8.3 (strict mode) | Typage | Sécurité du code, autocomplétion, refactoring. **Épinglé 5.8.x** — les versions 5.9+ causent des hangs de `tsc --noEmit`. |
| Supabase | Cloud | Backend-as-a-Service | Auth, DB PostgreSQL, RLS, Realtime, Storage |
| Tailwind CSS | 4.x | Styling | Utility-first, design system via config, purge auto |
| Shadcn/ui | latest | Composants UI | Copy-paste, personnalisables, accessibles, basés sur Radix |
| Zod | 3.x | Validation | Schemas partagés front/back, inférence TypeScript |
| React Hook Form | 7.x | Formulaires | Performance, intégration Zod via resolver |
| Vitest | latest | Tests unit/integ | Rapide, compatible ESM, API Jest-like |
| Testing Library | latest | Tests composants | Test du comportement user, pas de l'implémentation |
| Playwright | latest | Tests E2E | Cross-browser, fiable, auto-wait |
| pnpm | 9.x | Package manager | Rapide, strict, disk-efficient |

<!-- PERSONNALISER : ajouter les libs spécifiques au projet (ex: @tanstack/query, date-fns, etc.) -->

## Canal MCP (si le produit expose un serveur MCP)

> Squelette prêt : `.method/starters/mcp/` (endpoint, tool démo, widgets, bridge, test), installé par la story « Setup technique ».
> Versions exactes, installées ensemble par le README du starter : une majeure suivante casse le type-check du starter installé (raison par ligne).

| Techno | Version | Rôle | Justification |
|--------|---------|------|---------------|
| @modelcontextprotocol/sdk | 1.26.0 exacte | Serveur MCP (tools, resources) | SDK TypeScript officiel — épinglé sur le peer exact de `mcp-handler` 1.1.0 |
| mcp-handler | 1.1.0 exacte | Endpoint MCP dans Next.js (`/api/mcp`) | Transport Streamable HTTP sur route handler (`src/app/api/[transport]`), stateless par défaut, stateful via `redisUrl` — compatible Vercel. En 2.x, `createMcpHandler` ne prend plus que deux arguments |
| MCP Apps (GA 2026-01-26) — resources `ui://` | via SDK | Widgets visuels dans Claude/ChatGPT | Bundles `ui://` en `text/html;profile=mcp-app` + variante `-skybridge` (`text/html+skybridge`, ChatGPT), triple méta (`ui.resourceUri` + alias plat déprécié + `openai/outputTemplate`). Pas de dépendance `@mcp-ui/*` |
| @modelcontextprotocol/ext-apps | 1.7.4 exacte (2.x exige zod 4, le template est en zod 3) | SDK officiel côté widget (bridge MCP Apps) | Le bridge `widgets/shared/bridge.ts` en dépend entièrement (handshake `ui/initialize`, tool-result, thème, autoResize) — ne PAS réimplémenter le protocole. Entrée `app-with-deps` (évite le conflit de peer avec le SDK serveur) |
| Vite + vite-plugin-singlefile | 7.3.1 et 2.3.3 exactes (Vite 8 n'est accepté ni par `@vitejs/plugin-react` 4 ni par le typage de `vitest.config.ts`) | Build des widgets en HTML single-file (`widgets/build.mjs` → `generated.ts` inliné) | CSP des hosts = zéro requête externe, zéro fs à runtime |
| jose | 6.2.12 exacte | Validation JWT (JWKS Supabase) dans `src/mcp/auth.ts` | OAuth 2.1 resource server, RLS au JWT utilisateur |
