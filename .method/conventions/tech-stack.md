# Stack Technique

> Dernière MAJ : [date init]

| Techno | Version | Rôle | Justification |
|--------|---------|------|---------------|
| Next.js | 15 (App Router) | Framework fullstack | SSR/SSG, Server Components, Server Actions, routing fichiers |
| TypeScript | ~5.8.3 (strict mode) | Typage | Sécurité du code, autocomplétion, refactoring. **Épinglé 5.8.x** — les versions 5.9+ causent des hangs de `tsc --noEmit`. |
| Supabase | Cloud (défaut) ou self-hosted | Backend-as-a-Service | Auth, DB PostgreSQL, RLS, Realtime, Storage. Option souveraine : `deployment-scaleway.md` (ADR) |
| Tailwind CSS | 4.x | Styling | Utility-first, **CSS-first** : tokens, dark variant et plugins dans `src/app/globals.css` — pas de `tailwind.config.ts` (v4 ne le lit pas) |
| Shadcn/ui | latest | Composants UI | Copy-paste, personnalisables, accessibles, basés sur Radix |
| @phosphor-icons/react | 2.1.x | Icônes de l'app | `/dist/ssr` en Server Component ; lucide-react reste réservé aux internes Shadcn |
| Zod | 3.x | Validation | Schemas partagés front/back, inférence TypeScript |
| React Hook Form | 7.x | Formulaires | Performance, intégration Zod via resolver |
| Vitest | latest | Tests unit/integ | Rapide, compatible ESM, API Jest-like |
| Testing Library | latest | Tests composants | Test du comportement user, pas de l'implémentation |
| Playwright | latest | Tests E2E | Cross-browser, fiable, auto-wait |
| pnpm | 9.x | Package manager | Rapide, strict, disk-efficient |

<!-- PERSONNALISER : ajouter les libs spécifiques au projet (ex: @tanstack/query, date-fns, etc.) -->

## Canal MCP (installé par défaut)

> Code : `src/mcp/`, `src/app/api/[transport]/`, `widgets/` — mode d'emploi : `src/mcp/README.md`.
> Versions figées à la fusion du canal MCP dans le template (2026-10-01).

| Techno | Version | Rôle | Justification |
|--------|---------|------|---------------|
| @modelcontextprotocol/sdk | 1.26.0 | Serveur MCP (tools, resources) | SDK TypeScript officiel — **épinglé sur le peer de `mcp-handler`** |
| mcp-handler | 1.1.0 | Endpoint MCP dans Next.js (`/api/mcp`) | Transport Streamable HTTP sur route handler (`src/app/api/[transport]`), stateless par défaut, stateful via `redisUrl` — compatible Vercel |
| MCP Apps (GA 2026-01-26) — resources `ui://` | via SDK | Widgets visuels dans Claude/ChatGPT | Bundles `ui://` en `text/html;profile=mcp-app` + variante `-skybridge` (`text/html+skybridge`, ChatGPT), triple méta (`ui.resourceUri` + alias plat déprécié + `openai/outputTemplate`). Pas de dépendance `@mcp-ui/*` |
| @modelcontextprotocol/ext-apps | 1.7.4 (**figé**) | SDK officiel côté widget (bridge MCP Apps) | Le bridge `widgets/shared/bridge.ts` en dépend entièrement (handshake `ui/initialize`, tool-result, thème, autoResize) — ne PAS réimplémenter le protocole. Entrée `app-with-deps` : contourne son peer `sdk ^1.29` (warning `pnpm peers check` connu et assumé) |
| Vite + vite-plugin-singlefile | 7.3.x + 2.3.x | Build des widgets en HTML single-file (`widgets/build.mjs` → `generated.ts` inliné) | CSP des hosts = zéro requête externe, zéro fs à runtime. **Vite 7, pas 8** : `@vitejs/plugin-react` 4 n'accepte pas Vite 8 en peer |
| jose | 6.2.x | Validation JWT (JWKS Supabase) dans `src/mcp/auth.ts` | OAuth 2.1 resource server, RLS au JWT utilisateur |
