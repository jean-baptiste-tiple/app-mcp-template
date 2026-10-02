# Starter : Canal MCP (serveur + widgets dual-host)

Ce starter installe le squelette complet du canal MCP : endpoint `/api/mcp` (Streamable HTTP, stateless par défaut), un tool démo câblé selon les patterns (`schema Zod partagé → service → adaptateur tool → résultat structuré`), les widgets MCP Apps GA (triple méta + variante skybridge, bundles inlinés), le bridge officiel `ext-apps`, l'auth OAuth 2.1, le test unit `InMemoryTransport` et un smoke test HTTP.

Il est identifié par `/plan` pour tout produit MCP-first et installé par la story « Setup technique ».
Chaque fichier implémente une section de `.method/conventions/mcp-patterns.md` — lire les deux en parallèle.
Les fichiers sont issus du code **éprouvé en prod** de `mcp-cv-editor` (fixes dual-host inclus).

## Ce que ce starter installe

### Dépendances

```bash
pnpm add --save-exact @modelcontextprotocol/sdk@1.26.0 mcp-handler@1.1.0 jose@6.2.12
pnpm add -D --save-exact @modelcontextprotocol/ext-apps@1.7.4 vite@7.3.1 vite-plugin-singlefile@2.3.3
```

> Versions exactes, celles de `.method/conventions/tech-stack.md` § Canal MCP. Sans version, pnpm
> tire des majeures que le template refuse et le type-check échoue : ext-apps 2.x exige zod 4
> (le template est en zod 3), Vite 8 n'est accepté ni par `@vitejs/plugin-react` 4 ni par le
> typage de `vitest.config.ts`, et `createMcpHandler` de mcp-handler 2.x ne prend plus que deux
> arguments. Le peer `@modelcontextprotocol/sdk` ^1.29 d'ext-apps reste non satisfait (1.26.0,
> épinglé sur le peer exact de mcp-handler), sans effet : l'entrée `app-with-deps` embarque ses
> dépendances. `zod`, `react` et `@vitejs/plugin-react` sont déjà dans le template.

### Fichiers copiés

| Source (starter) | Destination | Pattern (mcp-patterns.md) |
|-----------------|-------------|---------------------------|
| `mcp-route.ts` | `src/app/api/[transport]/route.ts` ⚠️ pas `api/mcp/…` | Endpoint natif /api/mcp, stateless ou stateful (§7) + activation auth (§6) |
| `config.ts` | `src/mcp/config.ts` | URL canonique, issuer Supabase, serverInfo |
| `server.ts` | `src/mcp/server.ts` | `instructions` (§2.1), enregistrement tools/widgets |
| `auth.ts` | `src/mcp/auth.ts` | JWKS Supabase → AuthInfo → `{userId, orgId, role}` (§6) |
| `tool-meta.ts` | `src/mcp/tool-meta.ts` | `securitySchemes` + méta widget par tool (§3) |
| `tool-result.ts` | `src/mcp/tool-result.ts` | Résultats deux formes + erreurs actionnables (§4) |
| `widget-meta.ts` | `src/mcp/widget-meta.ts` | Triple méta + mimeTypes profilés (§5.1) |
| `widgets-index.ts` | `src/mcp/widgets/index.ts` | 2 resources par bundle (mcp-app + skybridge) (§5.1) |
| `widgets-generated.ts` | `src/mcp/widgets/generated.ts` | Bundles inlinés (placeholder, régénéré au build) |
| `tool-get-status.ts` | `src/mcp/tools/get-status.ts` | Tool démo : description "Use this when…", annotations, `next_actions` |
| `schema-status.ts` | `src/lib/schemas/status.ts` | Schema Zod partagé = source de vérité (mcp-patterns §1) |
| `service-status.ts` | `src/lib/services/status-service.ts` | Parité par services partagés (§1) |
| `oauth-protected-resource-route.ts` | `src/app/.well-known/oauth-protected-resource/route.ts` | Metadata RFC 9728 (§6.1) |
| `widgets-vite.config.ts` | `widgets/vite.config.ts` | Build single-file, zéro requête externe (§5.3) |
| `widgets-build.mjs` | `widgets/build.mjs` | Orchestrateur : vite par widget + génération de generated.ts |
| `widgets-tsconfig.json` | `widgets/tsconfig.json` | tsconfig dédié widgets (DOM + vite/client) |
| `widgets-bridge.ts` | `widgets/shared/bridge.ts` | Bridge SDK officiel ext-apps, TOUS les canaux de données (§5.2) |
| `widgets-mount.tsx` | `widgets/shared/mount.tsx` | Hook `useToolOutput` (subscription + polling filet) + `mount()` |
| `widget-status-card-index.html` | `widgets/status-card/index.html` | Widget exemple |
| `widget-status-card-main.tsx` | `widgets/status-card/main.tsx` | Widget exemple : états, thème (§5.3) |
| `mcp-server-test.ts` | `tests/unit/mcp-server.test.ts` | Test contrat AX via `InMemoryTransport` (§10) |
| `smoke-mcp.mjs` | `scripts/smoke-mcp.mjs` | Smoke HTTP : initialize + tools/list + get_status + corps illisible refusé (400) |

### Ajustements config (racine du projet)

1. **`tsconfig.json`** : `"exclude": ["node_modules", "widgets"]` — les widgets ont leur
   propre tsconfig (le template n'exclut que `node_modules` : ajouter `widgets`).
2. **`package.json`**, scripts :
   ```json
   "widgets:build": "node widgets/build.mjs",
   "mcp:inspect": "npx @modelcontextprotocol/inspector",
   "mcp:smoke": "node scripts/smoke-mcp.mjs"
   ```
3. **`next.config.ts`** : variantes d'URL RFC 9728 (certains hosts les tentent) :
   ```ts
   async rewrites() {
     return [
       { source: "/api/mcp/.well-known/oauth-protected-resource",
         destination: "/.well-known/oauth-protected-resource" },
       { source: "/.well-known/oauth-protected-resource/api/mcp",
         destination: "/.well-known/oauth-protected-resource" },
     ]
   },
   ```
   NB : le transport MCP est servi NATIVEMENT sur /api/mcp (basePath "/api" du handler) —
   pas de rewrite pour lui, mcp-handler matche sur l'URL originale.

### Variables d'environnement (.env.local)

```
MCP_RESOURCE_URL=http://localhost:3000/api/mcp   # URL canonique (prod : https://<domaine>/api/mcp)
# REDIS_URL=rediss://…                           # UNIQUEMENT si transport stateful (voir ci-dessous)
```

## Transport : stateless (défaut) ou stateful — À CHOISIR AU CADRAGE (ADR)

Le starter démarre **stateless** : pas de session, pas de Redis, chaque requête reconstruit
le serveur, tout l'état métier en Postgres. C'est le bon défaut Vercel (simple, scale-to-zero).

Passer **stateful** si le projet a besoin de : notifications server→client, subscriptions de
resources (`listChanged`, updates temps réel), elicitation, ou sessions `Mcp-Session-Id`
persistantes. Dans ce cas :

1. Provisionner un Redis (Upstash/Vercel KV compatible) → `REDIS_URL`.
2. Dans `src/app/api/[transport]/route.ts` : retirer `disableSse: true` et ajouter
   `redisUrl: process.env.REDIS_URL` (bloc prêt en commentaire dans le fichier).
3. Figer le choix par ADR dans `docs/decisions/` (obligatoire — mcp-patterns §7). L'ADR note
   aussi les conséquences : coût Redis, pas de scale-to-zero pur, invalidation de session.

Ne PAS introduire de push/subscriptions en restant stateless : c'est l'ADR qui arbitre.

## Auth OAuth 2.1 — activation (avec le starter supabase-auth)

Le starter démarre **auth désactivée** (dev local, MCP Inspector sans token). L'activation est un
bloc commenté dans `mcp-route.ts` (`withMcpAuth` + `verifyToken` de `src/mcp/auth.ts`) :

1. Installer le starter `supabase-auth` (Supabase = authorization server OAuth 2.1, DCR activé).
2. Décommenter le bloc auth de la route + les blocs `supabase` de `src/mcp/auth.ts`.
3. Dashboard Supabase : activer OAuth Server + DCR, configurer le hook Custom Access Token
   (claims `org_id`, `user_role`), autoriser les redirect URIs
   `https://claude.ai/api/mcp/auth_callback` et `https://chatgpt.com/connector/oauth/*`.
4. Vérifier `/.well-known/oauth-protected-resource` (+ les 2 variantes rewrites).
5. Figer le choix par ADR (`docs/decisions/`) — exigé par mcp-patterns §6.

**Ne jamais** livrer un serveur MCP public en "mode dégradé anonyme" : 401 + `WWW-Authenticate` partout.

## Vérification après install (S01)

1. `pnpm type-check` + `pnpm lint` + `pnpm test` — le test `mcp-server.test.ts` doit passer
   (triple méta, 2 resources, structuredContent) AVANT même le premier build de widgets
   (placeholder inclus dans `generated.ts`).
2. `pnpm widgets:build` — bundles single-file générés + `generated.ts` régénéré.
3. `pnpm build` puis `pnpm mcp:smoke` — initialize + tools/list + get_status en HTTP réel, et un
   corps illisible refusé en 400 `-32700` au lieu de rester sans réponse.
4. `pnpm dev` puis `pnpm mcp:inspect` → connecter `http://localhost:3000/api/mcp` :
   tool `get_status` visible, resources `ui://widgets/status-card.html` (profile=mcp-app)
   ET `…-skybridge.html` listées.
5. Matrice dual-host (mcp-patterns §5.4) sur Claude + ChatGPT developer mode.
6. Créer `docs/mcp-golden-queries.md` depuis `.method/templates/mcp-golden-queries.tmpl.md` (§8).

## Après le squelette

Remplacer le domaine démo "status" par les vrais tools du projet : dupliquer la chaîne
`schema → service → tool` par capacité métier, enregistrer dans `server.ts`, ajouter le nom
du widget dans `widget-meta.ts` + `build.mjs`, maintenir `instructions` et bump
`serverInfo.version` à chaque évolution de surface (§10).

> Pièges déjà payés (ne pas re-déboguer) : route dans `api/[transport]` et PAS `api/mcp/[transport]`
> (404 avec token valide sinon) ; mimeType `text/html;profile=mcp-app` obligatoire (sinon Claude
> rejette la resource) ; bridge = SDK officiel ext-apps (un `ui/initialize` fait main avec
> `clientInfo` au lieu d'`appInfo` = widget vide, sans erreur) ; ChatGPT = variante skybridge
> ET updates via le CustomEvent `openai:set_globals` (pas postMessage — sinon loader infini) ;
> consignes et données d'un prepare vont dans le `content` TEXTE (lu par claude.ai et ChatGPT)
> ET dans `structuredContent` (seul canal lu par Claude Code quand il existe, mcp-patterns §4) ;
> le loader d'un widget n'est jamais terminal (timeout 12 s → erreur actionnable) ; un corps JSON
> illisible est refusé par la route avant mcp-handler, qui sinon ne répond jamais (`withReadableBody`).
