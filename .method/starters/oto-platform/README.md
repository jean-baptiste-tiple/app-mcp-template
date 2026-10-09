# Starter : plateforme Otomata (`@otomata_tech/oto_platform`)

Ajoute à l'application la plateforme MCP d'entreprise d'Otomata : pages, tableaux, procédures,
équipes et accès, en écrans montés dans l'ERP, et un serveur MCP à six outils figés (`context`,
`find`, `read`, `call`, `write`, `feedback`) où les fonctions métier de l'ERP s'inscrivent.

**Quand l'activer :** l'ERP doit héberger des contenus éditables (procédures, pages, tableaux)
lus par les assistants, ou servir ses fonctions métier par un MCP au catalogue partagé. Décision
de cadrage (`/plan`), jamais par défaut. **Il remplace le MCP du template** :
`docs/decisions/ADR-001-oto-platform-remplace-mcp-template.md`.

Source qui fait foi : le `README.md` et `peerDependencies` du paquet installé
(`node_modules/@otomata_tech/oto_platform/`), et l'application de base du dépôt
[`otomata-tech/oto-pkg`](https://github.com/otomata-tech/oto-pkg) pour les routes à monter. Ce
starter ne recopie pas le paquet : il dit **ce qui change dans ce template**. Vérifié sur la
version 1.4.0 (2026-10-06).

## Prérequis

- Starter `supabase-auth` installé (mode Supabase), **ou** Postgres + émetteur OIDC
  (Logto, Keycloak) : README du paquet, « Émetteur d'identité : trois combinaisons ».
- Un domaine par organisation, ou une fonction `ServedHost` (preview, ERP sur un seul domaine) :
  README du paquet, « Choisir l'adresse servie au MCP ».

## 1. Dépendances

```bash
pnpm add @otomata_tech/oto_platform@<version exacte>
```

| Peer du paquet | État du template |
|---|---|
| `@hookform/resolvers` ^5 | Déjà en ^5 |
| `zod` ^3.25 | 3.25.x, schémas en `zod/v4` (ESLint refuse `"zod"`) ; ne pas passer à zod 4 (`@modelcontextprotocol/ext-apps` 1.7.4, `tech-stack.md`) |
| `@supabase/supabase-js` | Déjà posé par `supabase-auth` |
| `vite`, `vite-plugin-singlefile`, `@vitejs/plugin-react`, `@tailwindcss/postcss`, `@modelcontextprotocol/ext-apps` | Déjà en `devDependencies` : servent au build des vues de l'ERP |

`pnpm-workspace.yaml` (pnpm 12 refuse une version trop récente) :

```yaml
minimumReleaseAgeExclude:
  - "@otomata_tech/oto_platform"
```

Une fois `src/mcp/` retiré (§ 2), plus rien dans l'application n'importe le serveur du template :

```bash
pnpm remove mcp-handler @modelcontextprotocol/sdk jose
pnpm peers check
```

Mettre à jour `tech-stack.md` (ligne du paquet, version exacte et raison) dans la même story.

## 2. Ce qui sort du template

Le paquet sert `/api/mcp` en dur (`MCP_RESOURCE_PATH`). Une route statique `src/app/api/mcp/route.ts`
masquerait `src/app/api/[transport]/` sans erreur de Next : `pnpm check:framework` refuse les deux
ensemble. Retirer l'un avant de poser l'autre.

| Retiré | Remplacé par |
|---|---|
| `src/app/api/[transport]/` | `src/app/api/mcp/route.ts` → `handleMcpPost` (modèle : oto-pkg) |
| `src/app/.well-known/oauth-protected-resource/route.ts` et les `rewrites()` de `next.config.ts` | `handleResourceMetadata` sur les routes de métadonnées de l'hôte de référence |
| `src/mcp/` (server, tools, auth, config, widgets) | Le paquet ; les capacités métier deviennent des fonctions ERP (§ 4) |
| `widgets/` et `widgets:build` | Vues de l'ERP dans `src/widgets/*.tsx` (§ 5) |
| `tests/unit/mcp-route.test.ts`, `tests/unit/mcp-server.test.ts` | Tests des fonctions ERP (services + `run`) ; `fonctions-metier-imports-test.ts` de ce starter → `tests/unit/fonctions-metier-imports.test.ts` (chaque route qui monte une porte importe `@/lib/fonctions-metier`) |
| `scripts/smoke-mcp.mjs` | `smoke-mcp.mjs` de ce starter : montage des portes **sans jeton** (401 + `WWW-Authenticate`, 405 en GET, 401 sur `/api/platform/*`, `/` → `/login`). À étendre avec un compte : `tools/list` doit rendre les six outils du paquet, `call` une fonction ERP |
| `src/lib/schemas/status.ts`, `src/lib/services/status-service.ts` (domaine démo) | Les schémas et services du produit |
| Scripts `build` (`pnpm widgets:build &&`) et `type-check` (`-p widgets/tsconfig.json`), `"widgets"` dans `exclude` de `tsconfig.json` | `next build` et `tsc --noEmit` seuls, tant qu'aucune vue de l'ERP n'existe (§ 5) |
| `.next/` | Rien : ses types générés citent les routes retirées et font échouer `type-check` jusqu'au build suivant |
| Page `/oauth/consent` du starter `supabase-auth` | `consentRequest` du paquet (mode Supabase) ; en OIDC, consentement chez l'émetteur |

Garder `src/lib/services/` : c'est là que vit la logique, appelée par le web et par le MCP.

`pnpm check:framework` échoue tant que `CLAUDE.md § Projet` et la section « Canal MCP » de
`README.md` citent `src/mcp/` : les réécrire dans la même story, avec la table « Helpers MCP » de
`component-registry.md` et les globs des tags `mcp` et `selfhost` de `_index.md`.

Constaté le 2026-10-03 sur un clone du template, paquet 1.4.0, hôte de référence copié **en
entier** (`src/` d'oto-pkg au tag `v1.4.0`, coque du template retirée) : `verify`, `build`,
`mcp:smoke` et `migrations check` passent. Rien d'authentifié n'a été éprouvé (pas de base), ni le
montage partiel décrit au § 6.

## 3. Configuration

`next.config.ts` :

```ts
transpilePackages: ["@otomata_tech/oto_platform"],
experimental: { optimizePackageImports: ["@otomata_tech/oto_platform/ui"] },
```

`src/app/globals.css`, après `@import "tailwindcss";` :

```css
@source "../../node_modules/@otomata_tech/oto_platform/ui";
@import "@otomata_tech/oto_platform/ui/styles.css";
```

`.env.example` (serveur seulement, jamais `NEXT_PUBLIC_`) : `PLATFORM_DATABASE_URL` (pooler mode
transaction, rôle `platform_app`, après `pnpm exec oto-platform db prepare`) ; en option les cinq
`PLATFORM_STORAGE_*` (fichiers joints) ; en OIDC les `PLATFORM_OIDC_*`, `PLATFORM_SESSION_SECRET`,
`PLATFORM_SMTP_URL`, `PLATFORM_MAIL_FROM`. Retirer `MCP_RESOURCE_URL` et `MCP_ALLOW_ANONYMOUS`.

Routes à monter, copiées de l'hôte de référence : `src/app/api/mcp/route.ts`,
`src/app/api/platform/[...route]/route.ts`, `src/app/api/mcp-admin/route.ts`, et les écrans choisis
(§ 6). Le middleware de `supabase-auth` laisse déjà `/api` et `/.well-known` publics ; y ajouter
`/p/` (lecture publique) et `/opengraph-image` si le partage public est monté.

## 4. Fonctions métier : la parité passe par `defineErpFunction`

Invariant 5 de `CLAUDE.md` inchangé : la logique vit dans `src/lib/services/`. Seul l'adaptateur
MCP change : une **fonction ERP** au lieu d'un tool.

```ts
// src/lib/fonctions-metier.ts — importé pour son effet en tête des trois routes du paquet
import * as z from "zod/v4"
import { defineErpFunction, registerFunctions } from "@otomata_tech/oto_platform/server"

import { readCustomer } from "@/lib/services/customer-service"
import { readCustomerSchema } from "@/lib/schemas/customer"
import { supabaseFor } from "@/lib/supabase/for-token" // à écrire : client Supabase de l'ERP, en-tête Authorization = jeton

registerFunctions([
  defineErpFunction({
    name: "crm.read_customer",
    class: "read",
    description: "Reads one customer by id: identity, contacts, open quotes.",
    schema: readCustomerSchema,                       // z.strictObject de zod/v4
    examples: [{ customer_id: "C-001" }],
    run: (ctx, args) => readCustomer(supabaseFor(ctx.accessToken), ctx.identity.org, args),
  }),
])
```

- **Un schéma, deux canaux** : le schéma partagé par le formulaire et la fonction est en `zod/v4`
  comme tout schéma du template ; `defineErpFunction` exige en plus `z.strictObject` à chaque
  niveau (`z.object` du template à durcir à l'activation).
- **Données de l'ERP** sous le jeton de l'appelant (`ctx.accessToken`, RLS de l'ERP) ; `ctx.db`
  ne sert qu'aux services du paquet. Organisation = `ctx.identity.org` (l'adresse appelée).
- **Écriture qui envoie, supprime ou paie** : `class: "sensitive"` + `summarize`.
- **Erreurs** : `PlatformError` pour un refus servi au modèle ; `fromDatabaseError` pour la base.
- Un besoin nouveau devient une fonction, jamais un outil. Un contrat qui change = un nouveau nom.

## 5. Vues de l'ERP dans la conversation (facultatif)

`handleMcpPost(request, { …, widgets: true })` allume les vues du paquet (tableau, fiche, page).
Une vue propre à l'ERP : `src/widgets/<vue>.tsx` (export par défaut `ErpView`), puis
`"widgets:build": "oto-platform widgets build --views src/widgets --out src/lib/widgets.generated.ts"`,
`registerWidgetViews(WIDGET_BUNDLE)` avant `registerFunctions`, et `view: "<vue>"` dans la fonction.

## 6. Écrans dans l'ERP : trois niveaux

Sous `CoquilleOto`, avec `ContexteDeLHote` (lien `next/link`, `usePathname`, `router.push`,
déconnexion, `apparence` branchée sur next-themes) et `ContexteDeRafraichissement` dans un
composant client.

| Niveau | Quand | Ce qui se monte |
|---|---|---|
| 1. Coque entière | Section « Plateforme » à part dans l'ERP | `Desk` + `RailApplication` + `Content`, dans un layout de route group dédié |
| 2. Morceaux du rail | Pages et procédures dans la navigation de l'ERP | `EntrepriseDuRail`, `RechercheDuRail`, `SectionsDuRail`, `PiedDuRail` dans `src/components/sidebar-nav.tsx` |
| 3. Écran seul | Un tableau ou une procédure dans une fiche métier | `TableauDuNoeud`, `EcranDeNoeud`… dans la page, données lues par la page |

Le design system du paquet vit sous la racine `.oto` (ses jetons, ses polices) : il ne remplace pas
le thème du template. Vérifier les deux thèmes sur chaque écran monté (`CLAUDE.md § Design system`).

## 7. Base de données et CI

```bash
pnpm exec oto-platform migrations sync --to supabase/migrations
pnpm exec oto-platform migrations check
```

`check` va dans le workflow `supabase-migrations.yml` avant `db push`. Après chaque montée de
version : `sync`, puis le workflow. Schéma `platform` retiré des schémas exposés de la Data API.
Montées de version : Renovate, preset `github>otomata-tech/oto-pkg//renovate/preset`.

## Critères de fin de la story de setup

- `pnpm verify` et `pnpm build` verts.
- `src/app/api/[transport]/` absent ; `pnpm mcp:smoke` vert (`POST /api/mcp` sans jeton → 401 + `WWW-Authenticate`).
- `tools/list` (jeton valide) → les six outils du paquet ; `find` trouve chaque fonction ERP.
- `pnpm exec oto-platform migrations check` → code 0.
- Chaque écran monté vérifié en clair et en sombre.
