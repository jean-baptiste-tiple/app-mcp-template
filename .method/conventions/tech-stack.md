# Stack Technique

> Dernière MAJ : 2026-11-06 (majeures passées : Next 16, ESLint 10, TypeScript 6, Vite 8, Vitest 5,
> zod 4, SDK MCP 2 ; ADR-002)
> Mises à jour : Dependabot propose mineures et patchs (`deployment-patterns.md § Dependabot`) ;
> une majeure se décide ici, ligne par ligne, avec sa raison. Tout pin exact ou tilde de ce
> fichier a son entrée `ignore` sur les mineures dans `.github/dependabot.yml` (contrôlé par
> `check:framework`). Une version retenue en deçà de la dernière publiée porte sa raison.

| Techno | Version | Rôle | Justification |
|--------|---------|------|---------------|
| Next.js | 16 (App Router), `^16.4` | Framework fullstack | SSR/SSG, Server Components, Server Actions, routing fichiers. Turbopack par défaut ; `proxy.ts` remplace `middleware.ts` (`auth-patterns.md § Proxy (ex-middleware)`) ; `next typegen` est lancé par `pnpm type-check` (`next-env.d.ts` n'est plus versionné) ; `agentRules: false` dans `next.config.ts` (les règles vivent dans `CLAUDE.md`) |
| TypeScript | `~6.0.3` (strict mode) | Typage | Sécurité du code, autocomplétion, refactoring. **Tilde** : typescript-eslint 8.72 (embarqué par `eslint-config-next`) accepte `< 6.1`, et TypeScript 7 (compilateur natif) n'expose plus d'API JS, donc ni lint ni `next build`. Le hang de `tsc --noEmit` attribué à 5.9 ne se reproduit plus |
| ESLint | `^10` + `eslint-config-next` 16 + `eslint-plugin-import-x` | Lint | Flat config native (`defineConfig`, plus de `@eslint/eslintrc`). `eslint-plugin-import` 2.x plante sur ESLint 10 (`getTokenOrCommentBefore`) : `import-x/order` le remplace, mêmes groupes. `pnpm peers check` signale `eslint` 10 pour `eslint-plugin-import`, `jsx-a11y` et `react` (tirés par `eslint-config-next`, peers ≤ 9) : écart accepté, ces règles tournent et remontent leurs violations ; `pnpm peers check` n'est donc pas un gate |
| Supabase | Cloud (défaut) ou self-hosted | Backend-as-a-Service | Auth, DB PostgreSQL, RLS, Realtime, Storage. Option souveraine : `deployment-scaleway.md` (ADR) |
| Tailwind CSS | 4.x | Styling | Utility-first, **CSS-first** : tokens, dark variant et plugins dans `src/app/globals.css` — pas de `tailwind.config.ts` (v4 ne le lit pas). `tailwind-merge` 3 (la v2 ne connaissait pas les classes v4) |
| Shadcn/ui | latest (Radix 1.x/2.x mineures courantes, `react-day-picker` 10, `motion` 14) | Composants UI | Copy-paste, personnalisables, accessibles, basés sur Radix |
| @phosphor-icons/react | 2.1.x | Icônes de l'app | `/dist/ssr` en Server Component ; lucide-react reste réservé aux internes Shadcn |
| Zod | `^4.6`, import `zod/v4` | Validation | Schemas partagés front/back, inférence TypeScript. Un seul chemin d'import, `zod/v4` (ESLint refuse `"zod"`) : même format pour le formulaire, le tool MCP (SDK 2 exige zod ≥ 4.2) et `defineErpFunction` (ADR-001) |
| React Hook Form | 7.x + `@hookform/resolvers` `^7` | Formulaires | Performance, intégration Zod via resolver ; resolvers 7 lit les schémas zod 4 |
| Vitest | `^5` | Tests unit/integ | Rapide, compatible ESM, API Jest-like. Config `vitest.config.mts` (ESM natif, sans avertissement Vite 8) |
| Testing Library | latest ; `@testing-library/jest-dom` `^7`, `jsdom` `^31` | Tests composants | Test du comportement user, pas de l'implémentation. jest-dom 7 exige Node ≥ 22 |
| Playwright | latest | Tests E2E, captures `pnpm ui:shots` (`scripts/ui-shots.mjs`) | Cross-browser, fiable, auto-wait. Trois projets : `chromium`, `mobile` (Pixel 7), `dark` |
| @axe-core/playwright | ^4.14.0 | Accessibilité par règle dans le smoke e2e | Liste les éléments en violation (`serious`/`critical`), là où Lighthouse ne donne qu'un score global sur un build de prod |
| @types/node | `^24` | Types Node | Aligné sur le runtime : Node 24 en CI et sur Vercel. Ne pas suivre la dernière majeure de `@types/node` sans changer le runtime |
| pnpm | 12.4.1 (`packageManager`) | Package manager | Rapide, strict, disk-efficient. `minimumReleaseAge` (1440 min par défaut en 12) : une version publiée trop récemment est refusée (exclusion par paquet dans `pnpm-workspace.yaml`). Si corepack échoue à le télécharger : `npm i -g pnpm@12.4.1` |

<!-- PERSONNALISER : ajouter les libs spécifiques au projet (ex: @tanstack/query, date-fns, etc.) -->

## Canal MCP (installé par défaut)

> Code : `src/mcp/`, `src/app/api/mcp/route.ts`, `widgets/` — mode d'emploi : `src/mcp/README.md`.
> Plages caret : les peers du SDK 2 sont en `^2`, plus aucun pin exact (ADR-002).

| Techno | Version | Rôle | Justification |
|--------|---------|------|---------------|
| @modelcontextprotocol/server | `^2.4` | Serveur MCP (tools, resources) | SDK TypeScript officiel 2.x : spec 2026-07-28 servie nativement, repli clients 2025. Remplace `@modelcontextprotocol/sdk` 1.x (fin de support sécurité janvier 2027). `registerTool` prend un objet zod (`inputSchema: schema`, plus `.shape`), le handler reçoit `(input, ctx)` et l'auth se lit dans `ctx.http?.authInfo` |
| @modelcontextprotocol/client | `^2.4` (devDependencies) | Client des tests (`InMemoryTransport`, `Client`) et peer d'`ext-apps` | `@modelcontextprotocol/core` arrive en peer auto-installé : ne pas le déclarer tant qu'aucun fichier ne l'importe |
| mcp-handler | `^2.3` | Endpoint MCP dans Next.js (`/api/mcp`) | `createMcpHandler(initialize, options)` à deux arguments, stateless natif, ne lit pas le pathname : la route `src/app/api/mcp/route.ts` fixe l'URL. Plus de `basePath`, `disableSse`, `redisUrl`, `maxDuration` ; un corps illisible reçoit 400 `-32700` sans garde maison. `withMcpAuth`, `protectedResourceHandler`, `getPublicOrigin` conservés |
| MCP Apps (GA 2026-01-26) — resources `ui://` | via SDK | Widgets visuels dans Claude/ChatGPT | Bundles `ui://` en `text/html;profile=mcp-app` + variante `-skybridge` (`text/html+skybridge`, ChatGPT), triple méta (`ui.resourceUri` + alias plat déprécié + `openai/outputTemplate`). Pas de dépendance `@mcp-ui/*` |
| @modelcontextprotocol/ext-apps | `^2.0` (devDependencies) | SDK officiel côté widget (bridge MCP Apps) | Le bridge `widgets/shared/bridge.ts` en dépend entièrement (handshake `ui/initialize`, `toolresult`, `hostcontextchanged`, autoResize) — ne PAS réimplémenter le protocole. Entrée `.` (`client` en devDependencies, `core` en peer auto-installé, résolus par pnpm depuis le dossier d'`ext-apps`) : `app-with-deps` pesait 290 Ko de plus. Peers : client ^2, zod ^4.2 |
| Vite + vite-plugin-singlefile + @vitejs/plugin-react | `^8`, `^2.3.4`, `^6` | Build des widgets en HTML single-file (`widgets/build.mjs` → `generated.ts` inliné) | CSP des hosts = zéro requête externe, zéro fs à runtime. Vite 8 (rolldown) : `rolldownOptions` et `codeSplitting: false` dans `widgets/vite.config.mts` |
| jose | `^6.2` | Validation JWT (JWKS Supabase) dans `src/mcp/auth.ts` | OAuth 2.1 resource server, RLS au JWT utilisateur |

## Option plateforme Otomata (ADR-001)

`@otomata_tech/oto_platform` 1.6.2 (dernière publiée) déclare en peers `zod ^3.25`, `next ^15`,
`vite ^7`, `@vitejs/plugin-react ^4`, `@hookform/resolvers ^5`, `@modelcontextprotocol/ext-apps ^1.7`.
Le template a dépassé ces plages (ADR-002) : **activer l'option exige une version du paquet
alignée sur ce tableau**, sinon la story de setup rétrograde ces six paquets, avec la raison ici.
`.method/starters/oto-platform/README.md § 1` porte le détail.
