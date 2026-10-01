# Index des conventions

> **Source de vérité unique du routing `fichier → tag → convention`.**
> Lu par le skill `dev` (avant d'écrire) et par le skill `revue` (avant de reviewer).
> Ne PAS dupliquer ce mapping ailleurs — ni dans un skill, ni dans `CLAUDE.md`.

## Convention de base (toujours lue)

| Fichier | Description |
|---------|-------------|
| `coding-standards.md` | Naming, structure des fichiers, DRY, error handling, commentaires |

Une seule, et volontairement courte. Tout le reste est **conditionnel** : `component-registry.md`
ne sert qu'au moment de créer quelque chose, `tech-stack.md` qu'au moment de toucher aux
dépendances. Les lire à chaque changement d'une ligne était du poids mort.

## Conventions par tag

La colonne **Globs** est la règle de routing : si un fichier touché (créé ou modifié) matche
un glob, le tag est actif et son fichier de conventions **doit être lu en entier**.

En mode story, les tags déclarés dans le champ `Conventions` de la story s'ajoutent aux tags
déduits des globs — c'est le seul moyen d'activer les tags marqués **non routables** ci-dessous.

| Tag | Fichier | Globs | Description |
|-----|---------|-------|-------------|
| `api` | `api-patterns.md` | `src/lib/actions/**`, `src/app/api/**`, `src/app/**/page.tsx` | Server Actions, fetch, pagination, caching, bulk |
| `forms` | `forms-patterns.md` | `src/lib/schemas/**`, `src/components/**/*form*.tsx` | RHF + Zod, formulaires progressifs, validation async |
| `tables` | `tables-patterns.md` | `src/components/**/*table*.tsx`, `src/components/**/*list*.tsx` | Tri, filtres, sélection, actions groupées |
| `uploads` | `uploads-patterns.md` | `src/components/**/*upload*.tsx`, `src/components/**/*dropzone*.tsx`, `src/lib/actions/*upload*.ts` | Upload, taille, mime, chemins de storage |
| `auth` | `auth-patterns.md` | `src/middleware.ts`, `src/app/(auth)/**`, `src/lib/actions/auth*.ts` | Signup, login, reset, session, OAuth |
| `database` | `database-patterns.md` | `supabase/migrations/**`, `supabase/seed.sql`, `src/types/database.ts` | Migrations, RLS, index, transactions, soft delete |
| `supabase` | `supabase-patterns.md` | `src/lib/supabase/**`, `supabase/**`, `src/lib/actions/**` | Storage, RLS avancé, realtime, codes d'erreur, RPC |
| `realtime` | `supabase-patterns.md` | `src/hooks/**realtime**`, `src/hooks/**subscription**`, `src/hooks/**presence**` | Subscriptions, presence, cleanup |
| `security` | `security-patterns.md` | `src/lib/actions/**`, `src/app/api/**`, `src/middleware.ts`, `.env.example` | XSS, CSRF, rate limiting, secrets, idempotence |
| `nextjs` | `nextjs-patterns.md` | `src/app/**/page.tsx`, `src/app/**/layout.tsx`, `src/app/**/loading.tsx`, `src/app/**/error.tsx`, `src/app/**/not-found.tsx`, `src/app/**/template.tsx`, `src/app/**/global-error.tsx`, `src/app/**/unauthorized.tsx`, `src/app/**/forbidden.tsx`, `src/app/**/route.ts`, `next.config.ts` | App Router, fichiers spéciaux, frontières d'autorisation |
| `state` | `state-management.md` | `src/hooks/**`, `src/components/**/*provider*.tsx`, `src/components/**/*filter*.tsx`, `src/app/**/page.tsx` | URL state, contexte, hiérarchie de state |
| `feedback` | `feedback-patterns.md` | `src/components/**/*dialog*.tsx`, `src/components/**/*confirm*.tsx`, `src/components/**/*delete*.tsx`, `src/components/**/*toast*.tsx`, `src/components/ui/sonner.tsx` | Toasts, dialogs, confirmations, empty states |
| `a11y` | `accessibility-patterns.md` | `src/components/**/*.tsx`, `src/app/**/*.tsx`, `src/app/globals.css` | WCAG, ARIA, clavier, focus, contraste |
| `performance` | `performance-patterns.md` | `next.config.ts`, `src/app/**/loading.tsx`, `src/app/**/page.tsx`, `src/components/**/*chart*.tsx`, `src/components/**/*editor*.tsx` | Code splitting, Web Vitals, images, fonts |
| `typescript` | `typescript-patterns.md` | `src/types/**`, `tsconfig.json` | Utility types, unions, branded types, type guards |
| `registry` | `component-registry.md` | `src/components/**`, `src/hooks/**`, `src/lib/utils/**`, `src/lib/actions/**`, `src/lib/schemas/**`, `src/lib/services/**`, `src/types/**` | Registry DRY — vérifier avant de créer |
| `stack` | `tech-stack.md` | `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.ts` | Versions exactes, pins et leurs raisons |
| `seo` | `seo-patterns.md` | `src/app/layout.tsx`, `src/app/**/page.tsx`, `src/app/**/sitemap.ts`, `src/app/**/robots.ts`, `src/app/**/opengraph-image.*` | Metadata API, Open Graph, sitemap, JSON-LD |
| `monitoring` | `monitoring-patterns.md` | `instrumentation.ts`, `src/instrumentation.ts`, `sentry.*.config.ts`, `src/app/**/error.tsx`, `src/app/**/global-error.tsx`, `src/app/api/health/**` | Error tracking, analytics, health checks, logs |
| `deploy` | `deployment-patterns.md` | `.github/workflows/**`, `vercel.json`, `.env.example`, `supabase/config.toml` | Environnements, rollback, migrations, secrets |
| `testing` | `testing-strategy.md` | `tests/**`, `**/*.test.ts`, `**/*.test.tsx`, `vitest.config.ts`, `playwright.config.ts` | Unit, integ, E2E, mocks, fixtures |
| `datetime` | `datetime-patterns.md` | `src/lib/utils/*date*.ts`, `src/lib/utils/*format*.ts`, `src/lib/utils/*currency*.ts` | Dates, timezones, formatage, devises |
| `i18n` | `i18n-patterns.md` | `messages/**`, `src/i18n/**`, `src/middleware.ts` | Traductions, pluriels, locale, RTL |
| `flags` | `feature-flags-patterns.md` | `src/lib/flags/**`, `src/lib/*flag*.ts` | Feature flags, A/B testing, rollouts |
| `mcp` | `mcp-patterns.md` | `src/mcp/**`, `src/app/api/[transport]/**`, `src/app/.well-known/**`, `src/lib/services/**`, `widgets/**`, `scripts/smoke-mcp.mjs` | Tools MCP, parité par services partagés, AX et découverte par les hosts, résultats, widgets dual-host, OAuth, transport, golden queries |
| `selfhost` | `deployment-scaleway.md` | `.github/workflows/supabase-migrations.yml`, `src/mcp/auth.ts`, `src/mcp/config.ts`, `.env.example` | Supabase self-hosted souverain (Scaleway ou autre) : socle, OAuth 2.1 sur GoTrue, adaptations |

### Tags non routables par chemin

`datetime`, `i18n` et `flags` portent sur des **préoccupations transverses** qu'aucun chemin de
fichier ne révèle : formater un montant, afficher une date ou gater une fonctionnalité se fait
dans n'importe quel composant. Leurs globs ne couvrent que le cas où un helper dédié existe.

À l'échelle Module, si le travail touche l'une de ces préoccupations, **déclarer le tag
explicitement** — via le champ `Conventions` de la story, ou en l'annonçant.

### Capacités non installées

Ces tags décrivent des domaines **absents du template** : dépendance non installée, ou option d'hébergement non retenue.

**Un tag de ce tableau ne s'active pas tant que sa capacité n'est pas installée**, même si un
glob matche. Sans cette règle, `supabase` — routé sur `src/lib/actions/**` — chargeait 300 lignes
sur Storage, realtime et codes PGRST pour toute Server Action d'un projet sans base de données.
La condition d'activation est dans la colonne de droite : elle se vérifie en une commande.

`check:framework` exempte aussi ces tags de la détection de globs morts.

| Tag | Activé par | Vérifiable par |
|-----|------------|----------------|
| `supabase`, `database`, `auth`, `realtime` | starter `supabase-auth` installé | `@supabase/ssr` dans `package.json` |
| `i18n` | `next-intl` ou équivalent | dépendance dans `package.json` |
| `flags` | librairie de feature flags | dépendance dans `package.json` |
| `monitoring` | Sentry ou provider d'analytics | dépendance dans `package.json` |
| `selfhost` | ADR d'hébergement Supabase self-hosted | `grep -ril "self-hosted" docs/decisions/` |

**Dès que la capacité est installée, retirer le tag de ce tableau** : il redevient soumis à la
vérification des globs, et un chemin devenu faux échouera au lieu de passer inaperçu.

## Règles de routing

1. **Un fichier peut activer plusieurs tags** — charger tous les fichiers correspondants (dédupliqués : `supabase` et `realtime` pointent vers le même).
2. **Un tag de « Capacités non installées » ne s'active pas** tant que sa dépendance est absente, même si un glob matche.
3. **Aucun glob ne matche** → seule la convention de base s'applique. Ce n'est pas une erreur.
4. **Annoncer les conventions chargées** avant d'agir : `Conventions : coding-standards, api-patterns, security-patterns`. Si rien au-delà de la base, le dire.
5. **Lire le fichier en entier**, pas un résumé. Il n'existe **pas** de skill par tag : `dev` et `revue` matchent ces globs eux-mêmes.
6. **Ajouter un tag** = une ligne ici + le fichier de conventions. Rien d'autre — créer un `.claude/skills/<tag>/` ferait échouer `pnpm check:framework`. Le check échoue aussi si le fichier manque, si les globs sont vides, si aucun glob ne peut matcher un dossier réel, ou si le fichier dépasse 400 lignes.
