# Canal MCP (serveur + widgets dual-host)

Le canal MCP est installé par défaut : endpoint `/api/mcp` (Streamable HTTP, stateless), un tool
démo câblé selon les patterns (`schema Zod partagé → service → adaptateur tool → résultat structuré`),
les widgets MCP Apps GA (triple méta + variante skybridge, bundles inlinés), le bridge officiel
`ext-apps`, l'auth OAuth 2.1 (désactivée tant que `supabase-auth` n'est pas installé), le test unit
`InMemoryTransport` et un smoke test HTTP.

Chaque fichier implémente une section de `.method/conventions/mcp-patterns.md` — lire les deux en parallèle.
Code issu de `mcp-cv-editor`, **éprouvé en prod** (fixes dual-host inclus). Versions figées et leurs
raisons : `.method/conventions/tech-stack.md`.

## Où vit quoi

| Fichier | Rôle | mcp-patterns |
|---------|------|--------------|
| `src/app/api/[transport]/route.ts` ⚠️ pas `api/mcp/…` | Endpoint natif `/api/mcp`, stateless ou stateful, garde-fou anonyme + activation auth | §7, §6 |
| `src/mcp/config.ts` | URL canonique, issuer Supabase, `serverInfo` | §2.1 |
| `src/mcp/server.ts` | `instructions`, enregistrement tools/widgets — SEUL endroit qui les liste | §2.1 |
| `src/mcp/auth.ts` | JWKS Supabase → `AuthInfo` → `{userId, orgId, role}` | §6 |
| `src/mcp/tool-meta.ts` | `securitySchemes` + méta widget par tool | §3 |
| `src/mcp/tool-result.ts` | Résultats deux formes + erreurs actionnables | §4 |
| `src/mcp/widget-meta.ts` | Triple méta + mimeTypes profilés — SEUL endroit qui manipule ces clés | §5.1 |
| `src/mcp/widgets/index.ts` | 2 resources par bundle (mcp-app + skybridge) | §5.1 |
| `src/mcp/widgets/generated.ts` | Bundles inlinés — GÉNÉRÉ, versionné, ne pas éditer | §5.3 |
| `src/mcp/tools/get-status.ts` | Tool démo : description « Use this when… », annotations, `next_actions` | §3, §4 |
| `src/lib/schemas/status.ts` | Schema Zod partagé = source de vérité | §1 |
| `src/lib/services/status-service.ts` | Logique métier, appelée par la Server Action ET le tool | §1 |
| `src/app/.well-known/oauth-protected-resource/route.ts` | Metadata RFC 9728 (+ 2 variantes d'URL en rewrites dans `next.config.ts`) | §6 |
| `widgets/build.mjs`, `widgets/vite.config.ts` | Build Vite single-file par widget → régénère `generated.ts` | §5.3 |
| `widgets/shared/bridge.ts` | Bridge SDK officiel `ext-apps`, TOUS les canaux de données | §5.2 |
| `widgets/shared/mount.tsx` | Hook `useToolOutput` (subscription + polling filet) + `mount()` | §5.2 |
| `widgets/status-card/` | Widget exemple : 4 états, thème | §5.3 |
| `tests/unit/mcp-server.test.ts` | Contrat AX via `InMemoryTransport` | §10 |
| `tests/unit/mcp-route.test.ts` | Garde-fou anonyme de la route (401 en production) | §6 |
| `scripts/smoke-mcp.mjs` | Smoke HTTP : initialize + tools/list + get_status | §10 |

`widgets/` a son propre `tsconfig.json` (DOM + `vite/client`) : il est exclu du `tsconfig.json`
racine, donc de `pnpm type-check`. ESLint, lui, le couvre.

### Scripts et variables d'environnement

- `pnpm widgets:build` — rebuild des bundles + régénération de `src/mcp/widgets/generated.ts`.
  Le fichier est versionné (type-check et tests passent sur un clone frais) : le commiter après
  toute modification d'un widget.
- `pnpm build` = `pnpm widgets:build && next build` — la prod ne livre jamais un bundle périmé.
- `pnpm mcp:smoke` — démarre `next start` sur le port 3200 (build supposé fait), avec
  `MCP_ALLOW_ANONYMOUS=true`, et appelle `/api/mcp`. `node scripts/smoke-mcp.mjs <token> <url>`
  teste une cible déployée (sans auth active, une cible de production répond 401 : attendu).
- `pnpm mcp:inspect` — MCP Inspector.

```
MCP_RESOURCE_URL=http://localhost:3000/api/mcp   # URL canonique (prod : https://<domaine>/api/mcp)
# REDIS_URL=rediss://…                           # UNIQUEMENT si transport stateful (voir ci-dessous)
# MCP_ALLOW_ANONYMOUS=true                        # smoke local sur `next start` — JAMAIS en production réelle
```

## Transport : stateless (défaut) ou stateful — À CHOISIR AU CADRAGE (ADR)

Le canal démarre **stateless** : pas de session, pas de Redis, chaque requête reconstruit le
serveur, tout l'état métier en Postgres. C'est le bon défaut Vercel (simple, scale-to-zero).

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

Le canal démarre **auth désactivée** (dev local, MCP Inspector sans token). Tant qu'elle l'est, un
garde-fou de la route (`anonymousGuard`) fait répondre `/api/mcp` en **401** + `WWW-Authenticate` en
production ; `next dev` reste ouvert, et `MCP_ALLOW_ANONYMOUS=true` le lève pour le smoke local
uniquement. L'activation est un bloc commenté dans `src/app/api/[transport]/route.ts`
(`withMcpAuth` + `verifyToken` de `src/mcp/auth.ts`) :

1. Installer le starter `.method/starters/supabase-auth/` (Supabase = authorization server OAuth 2.1, DCR activé).
2. Décommenter le bloc auth de la route en supprimant `anonymousGuard` et son export, décommenter
   les blocs `supabase` de `src/mcp/auth.ts`, puis appeler `requireAuthContext(extra)` en tête de
   chaque tool et passer le contexte au service (`TODO(S01)` dans `src/mcp/tools/get-status.ts`).
3. Dashboard Supabase : activer OAuth Server + DCR, configurer le hook Custom Access Token
   (claims `org_id`, `user_role`), autoriser les redirect URIs
   `https://claude.ai/api/mcp/auth_callback` et `https://chatgpt.com/connector/oauth/*`.
4. Vérifier `/.well-known/oauth-protected-resource` (+ les 2 variantes en rewrites) : sans
   `NEXT_PUBLIC_SUPABASE_URL`, `authorization_servers` vaut `[""]`.
5. Figer le choix par ADR (`docs/decisions/`) — exigé par mcp-patterns §6.

**Ne jamais** livrer un serveur MCP public en "mode dégradé anonyme" : 401 + `WWW-Authenticate` partout.

## Vérification

1. `pnpm verify` — `tests/unit/mcp-server.test.ts` (triple méta, 2 resources, structuredContent)
   et `tests/unit/mcp-route.test.ts` (401 en production sans auth) doivent passer.
2. `pnpm widgets:build` — bundles single-file générés + `generated.ts` régénéré.
3. `pnpm build` puis `pnpm mcp:smoke` — initialize + tools/list + get_status en HTTP réel.
4. `pnpm dev` puis `pnpm mcp:inspect` → connecter `http://localhost:3000/api/mcp` :
   tool `get_status` visible, resources `ui://widgets/status-card.html` (profile=mcp-app)
   ET `…-skybridge.html` listées.
5. Matrice dual-host (mcp-patterns §5.4) sur Claude + ChatGPT developer mode.
6. Créer `docs/mcp-golden-queries.md` depuis `.method/templates/mcp-golden-queries.tmpl.md` (§8).

## Après le squelette

Remplacer le domaine démo "status" par les vrais tools du projet : dupliquer la chaîne
`schema (src/lib/schemas/) → service (src/lib/services/) → tool (src/mcp/tools/)` par capacité
métier, plus la Server Action qui appelle le même service ; enregistrer le tool dans
`src/mcp/server.ts`, ajouter le nom du widget dans `WIDGET_NAMES` de `src/mcp/widget-meta.ts`
ET de `widgets/build.mjs` ; maintenir `instructions` et bump `MCP_SERVER_INFO.version`
(`src/mcp/config.ts`) à chaque évolution de surface (§10). Les `TODO(S01)` marquent le nom du
produit à poser (`src/mcp/config.ts`, `src/lib/services/status-service.ts`, `widgets/shared/bridge.ts`).
La page d'onboarding `/connect` (`src/app/(dashboard)/connect/page.tsx`, cible de
`resource_documentation`) se personnalise en même temps : nom du produit, prompts d'exemple (§9).

> Pièges déjà payés (ne pas re-déboguer) : route dans `src/app/api/[transport]` et PAS `api/mcp/[transport]`
> (404 avec token valide sinon) ; mimeType `text/html;profile=mcp-app` obligatoire (sinon Claude
> rejette la resource) ; bridge = SDK officiel ext-apps (un `ui/initialize` fait main avec
> `clientInfo` au lieu d'`appInfo` = widget vide, sans erreur) ; ChatGPT = variante skybridge
> ET updates via le CustomEvent `openai:set_globals` (pas postMessage — sinon loader infini) ;
> consignes et données d'un prepare vont dans le `content` TEXTE (lu par claude.ai et ChatGPT)
> ET dans `structuredContent` (seul canal lu par Claude Code quand il existe, mcp-patterns §4) ;
> le loader d'un widget n'est jamais terminal (timeout 12 s → erreur actionnable).
