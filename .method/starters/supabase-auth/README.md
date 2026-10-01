# Starter : Supabase + Auth

Ce starter ajoute Supabase (base de données, auth, realtime) au projet.
Il est activé automatiquement par `/plan` quand le projet nécessite une base de données ou de l'authentification.

## Ce que ce starter installe

### Dépendances
```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

### Fichiers copiés

| Source (starter) | Destination | Description |
|-----------------|-------------|-------------|
| `supabase-migrations.yml` | `.github/workflows/supabase-migrations.yml` | CI auto-deploy des migrations sur push |
| `supabase-server.ts` | `src/lib/supabase/server.ts` | Client Supabase côté serveur |
| `supabase-client.ts` | `src/lib/supabase/client.ts` | Client Supabase côté navigateur |
| `middleware.ts` | `src/middleware.ts` | Middleware auth (session refresh + protection routes) |
| `auth-actions.ts` | `src/lib/actions/auth.ts` | Server Actions : `loginAction`, `signupAction`, `forgotPasswordAction`, `resetPasswordAction`, `logoutAction` |
| `schemas-auth.ts` | `src/lib/schemas/auth.ts` | Schémas Zod partagés : formulaires et actions valident avec le même `safeParse` |
| `auth-callback-route.ts` | `src/app/auth/callback/route.ts` | Route callback OAuth/email verification — `next` accepté seulement s'il commence par `/` et pas par `//` (sinon redirection ouverte) |
| `auth-layout.tsx` | `src/app/(auth)/layout.tsx` | Layout centré pour pages auth |
| `login-page.tsx` | `src/app/(auth)/login/page.tsx` | Page de connexion |
| `signup-page.tsx` | `src/app/(auth)/signup/page.tsx` | Page d'inscription |
| `forgot-password-page.tsx` | `src/app/(auth)/forgot-password/page.tsx` | Page mot de passe oublié |
| `reset-password-page.tsx` | `src/app/(auth)/reset-password/page.tsx` | Page reset mot de passe |
| `supabase-config.toml` | `supabase/config.toml` | Config Supabase locale |
| `seed.sql` | `supabase/seed.sql` | Données de seed (template) |

### Scripts package.json mis à jour
```json
"db:types": "npx supabase gen types typescript --project-id \"$SUPABASE_PROJECT_ID\" > src/types/database.ts",
"db:migrate": "npx supabase migration new",
"db:push": "npx supabase db push",
"db:reset": "npx supabase db reset"
```

### Variables d'environnement (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Secrets GitHub (pour CI migrations)
- `SUPABASE_PROJECT_ID` — Settings > General > Reference ID
- `SUPABASE_ACCESS_TOKEN` — supabase.com/dashboard/account/tokens
- `SUPABASE_DB_PASSWORD` — mot de passe DB du projet

### Pages protégées
Un layout n'est **jamais** une frontière d'autorisation (`nextjs-patterns.md § Un layout n'est JAMAIS une frontière d'autorisation`) :
le middleware redirige pour l'UX, et **chaque `page.tsx`** protégée (ou sa couche d'accès aux
données) ainsi que chaque Server Action revérifient `supabase.auth.getUser()`.

### Règles ajoutées (CLAUDE.md)
Quand ce starter est activé, les règles Supabase s'appliquent :
- Supabase côté serveur uniquement pour les mutations
- RLS activé sur toute table
- Migrations versionnées
- Auth vérifiée dans chaque Server Action
