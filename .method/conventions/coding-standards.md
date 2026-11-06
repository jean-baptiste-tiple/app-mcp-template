# Coding Standards — Next.js 16 + Supabase

## Naming

- Fichiers : kebab-case (`user-profile.tsx`, `use-auth.ts`)
- Composants : PascalCase (`UserProfile`, `LoginForm`)
- Variables/fonctions : camelCase
- Types/Interfaces : PascalCase avec suffixe descriptif (`UserRow`, `LoginFormData`)
- Server Actions : camelCase avec suffixe `Action` (`loginAction`, `createProjectAction`)
- Zod schemas : camelCase avec suffixe `Schema` (`loginSchema`, `projectSchema`)

## Structure des fichiers

<!-- NOTE IMPORTANTE POUR CLAUDE CODE :
     Cette section définit où placer chaque type de fichier.
     La LIRE AVANT de créer tout nouveau fichier. -->

```
src/
├── app/                          # Routes Next.js (App Router)
│   ├── (auth)/                   # Groupe : pages publiques (login, signup)
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/              # Groupe : pages authentifiées
│   │   ├── layout.tsx            # Layout avec sidebar, auth check
│   │   ├── page.tsx              # Dashboard home
│   │   └── projects/
│   │       ├── page.tsx          # Liste projets
│   │       └── [id]/page.tsx     # Détail projet
│   ├── api/                      # Route handlers (webhooks/cron uniquement)
│   ├── layout.tsx                # Root layout (providers, fonts, metadata)
│   └── not-found.tsx
├── components/
│   ├── ui/                       # Composants Shadcn/ui (ne pas modifier directement)
│   ├── shared/                   # Composants métier réutilisables
│   └── [feature]/                # Composants spécifiques à une feature
├── hooks/                        # Custom hooks
├── lib/
│   ├── actions/                  # Server Actions (regroupés par domaine)
│   ├── schemas/                  # Zod schemas (PARTAGÉS front + back)
│   ├── supabase/
│   │   ├── client.ts             # Supabase browser client
│   │   ├── server.ts             # Supabase server client (cookies)
│   │   └── admin.ts              # Supabase service_role (si nécessaire)
│   └── utils/                    # Fonctions utilitaires pures
├── types/                        # Types TypeScript partagés
│   ├── database.ts               # Types générés depuis Supabase (npx supabase gen types)
│   └── index.ts                  # Types métier custom
└── proxy.ts                       # Proxy auth (ex-middleware, Next 16) : refresh de session, redirect si non connecté
```

## Server Components vs Client Components

- **Par défaut : Server Component** (pas de "use client")
- Passer en Client Component SEULEMENT si : useState, useEffect, event handlers, browser APIs, hooks custom qui utilisent du state
- Règle : pousser le "use client" le plus bas possible dans l'arbre
- Pattern : Server Component parent (fetch data) → Client Component enfant (interactivité)

## Server Actions et Supabase

Ces règles vivent dans les conventions routées, pas ici — les recopier avait déjà produit
trois traitements contradictoires du même cas (throw / return / redirect).

- Pattern Server Action, type de retour, `redirect()` dans un `try` → `api-patterns.md`
- Client browser / server / service_role, RLS, codes d'erreur → `supabase-patterns.md`
- Proxy (ex-middleware) et flows d'authentification → `auth-patterns.md`

## DRY

- Schemas Zod : UN schema par entité dans `lib/schemas/`, utilisé par le form ET par l'action
- Types : générés depuis Supabase (`database.ts`), enrichis dans `types/index.ts`
- Composants : vérifier `component-registry.md` AVANT de créer
- Factoriser à partir de 2 occurrences, pas avant (pas d'abstraction prématurée)
- Toute surface nouvelle — composant, hook, util, abstraction, prop optionnelle, option de
  config, dépendance — porte **ce qui casse sans elle aujourd'hui**
  (`CLAUDE.md § Justifier une surface nouvelle`). Pas de justification au présent → retirer la
  surface, ne pas la documenter

## Imports

Alias `@/` vers `src/`. L'ordre des groupes est appliqué par la règle ESLint `import-x/order`
(`eslint-plugin-import-x`, le seul compatible ESLint 10) — ne pas le vérifier à la main.

## Error Handling

- Jamais de catch vide
- Server Actions retournent `{ data }` ou `{ error }` — jamais de throw côté client
- Composants UI : toujours gérer loading + error + empty states
- Supabase : toujours vérifier le `.error` de la réponse

## Comments & Documentation

### Quand commenter
- **OUI :** Logique métier non-évidente, décisions d'architecture, workarounds
- **NON :** Code auto-documenté (bon naming), re-description du code

### Format
```typescript
// Bon : explique le POURQUOI
// Le rate limit est plus strict sur /login car c'est la cible principale des brute force
const LOGIN_RATE_LIMIT = 5

// Mauvais : décrit le QUOI (redondant avec le code)
// Incrémente le compteur
counter++
```

### JSDoc — uniquement sur les fonctions exportées complexes
```typescript
/**
 * Calcule le prix total avec taxes et réductions.
 * Les réductions sont appliquées AVANT les taxes.
 */
export function calculateTotal(items: CartItem[], discount?: number): number {
  // ...
}
```

## Complexité

Appliquée par ESLint, pas par la review : `max-lines` (300), `max-lines-per-function` (150),
`max-params` (4), `max-depth` (3), `no-empty`. Ne pas les revérifier à la main.

Le nombre de lignes n'est pas un critère de review. Ce qui l'est : **un composant exporté ne
cumule pas plus de 3 responsabilités** parmi fetch de données, state local, effet de bord,
branchement conditionnel de rendu, mapping de collection. Au-delà, extraire.

Les pages catalogue (`src/app/design-system/**`) et les fichiers générés sont exemptés.

## TypeScript

`prefer-const`, `no-var`, `no-explicit-any` et l'interdiction des `enum` sont appliqués par
ESLint. Le reste (utility types, unions, type guards, branded types) est dans
`typescript-patterns.md`, routé sur `src/types/**`.

**Vérifiable :** toute assertion `as` (hors `as const`) est précédée d'un commentaire
expliquant pourquoi le type ne peut pas être inféré. Un `as` nu est un défaut.
