# API Patterns — Next.js Server Actions + Supabase

## Principe : Server Actions > Route Handlers

Utiliser les Server Actions pour toutes les mutations.
Les Route Handlers (`app/api/`) sont réservés aux : webhooks externes, cron jobs, intégrations tierces qui doivent appeler une URL.

## Type de retour standard

```typescript
type ActionResult<T> = { data: T; error?: never } | { data?: never; error: string }
```

JAMAIS de throw métier dans une Server Action appelée par un formulaire : une erreur
attendue se retourne (`{ error }`), elle ne se lance pas. Auth manquante = `redirect`.

**`redirect()` et `notFound()` SONT des throw** — ils fonctionnent en lançant `NEXT_REDIRECT`
et `NEXT_NOT_FOUND`. Un `catch` générique les avale et transforme la redirection en
« Une erreur est survenue » : la session est créée mais l'utilisateur reste sur le formulaire.

```typescript
import { unstable_rethrow } from "next/navigation"

try {
  // ...
  redirect("/dashboard")
} catch (error) {
  unstable_rethrow(error)   // relance NEXT_REDIRECT / NEXT_NOT_FOUND, avale le reste
  return { error: "Une erreur est survenue. Réessayez." }
}
```

**Vérifiable :** aucun `redirect()` ou `notFound()` à l'intérieur d'un `try` dont le `catch`
ne commence pas par `unstable_rethrow(error)`. Le plus simple reste d'appeler `redirect()`
**après** le bloc `try/catch`.

## Pattern Server Action standard

Chaque fichier dans `lib/actions/` regroupe les actions d'un domaine.
Chaque action :

1. Vérifie l'auth
2. Valide l'input (Zod)
3. Exécute la mutation (Supabase)
4. Revalide le cache (revalidatePath/revalidateTag)
5. Retourne `{ data }` ou `{ error }`

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createProjectSchema } from "@/lib/schemas/project"
import type { ActionResult } from "@/types"

export async function createProjectAction(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  // 1. Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // 2. Validation
  const parsed = createProjectSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "Données invalides" }

  // 3. Mutation
  const { data, error } = await supabase
    .from("projects")
    .insert({ ...parsed.data, user_id: user.id })
    .select("id")
    .single()

  if (error) return { error: "Impossible de créer le projet" }

  // 4. Revalidation
  revalidatePath("/projects")

  // 5. Retour
  return { data: { id: data.id } }
}
```

## Formulaires

RHF + Zod, formulaires progressifs, validation asynchrone : voir `forms-patterns.md`.

## Pattern Fetch (Server Components)

Les données sont fetchées dans les Server Components, pas dans les Client Components.

```tsx
// app/(dashboard)/projects/page.tsx
import { createClient } from "@/lib/supabase/server"
import { ProjectList } from "@/components/projects/project-list"

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false })

  return <ProjectList projects={projects ?? []} />
}
```

Le Client Component reçoit les données en props. Il ne fetch pas.

## Auth

Le proxy (`src/proxy.ts`, ex-middleware) ne suffit pas : **chaque** Server Action revérifie
l'auth en première instruction. Détail du proxy et des flows : `auth-patterns.md`. RLS et policies :
`supabase-patterns.md`.

```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect("/login")
```

## Error Handling

Le message retourné au client est **soit une constante littérale du fichier, soit le retour de
`handleSupabaseError(error)`** (`supabase-patterns.md § Error Handling`). Toute interpolation
d'un champ de l'objet `error` est un défaut : `message`, `details` et `hint` contiennent des
noms de tables et de colonnes.

Journaliser l'erreur technique côté serveur, retourner un message générique côté client.

## Pagination

### Server-side (recommandé)
```typescript
// Server Component avec query params
export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const size = Number(params.size) || 20
  const from = (page - 1) * size
  const to = from + size - 1

  const supabase = await createClient()
  const { data, count } = await supabase
    .from("items")
    .select("*", { count: "exact" })
    .range(from, to)
    .order("created_at", { ascending: false })

  return <ItemList items={data ?? []} total={count ?? 0} page={page} size={size} />
}
```

### Type de réponse paginée
```typescript
type PaginatedResult<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
```

### Cursor-based (pour l'infinite scroll)
```typescript
// Le curseur est COMPOSITE. Filtrer sur `created_at` seul saute silencieusement toute ligne
// partageant le timestamp exact de la dernière ligne de la page — garanti sur les insertions
// par batch, et invisible en infinite scroll.
const { data } = await supabase
  .from("items")
  .select("*")
  .or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`)
  .order("created_at", { ascending: false })
  .order("id", { ascending: false })
  .limit(20)
// Index requis : CREATE INDEX idx_items_cursor ON items (created_at DESC, id DESC);
```

**`count: "exact"` est un scan complet à chaque page.** Au-delà de ~50 000 lignes, utiliser
`count: "estimated"`, ou ne compter que sur la première page. `supabase/config.toml` fixe par
ailleurs `max_rows` : une page qui demande plus est **tronquée sans erreur**.

## Search & Filter

```typescript
// Server Component avec filtres en query params
export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>
}) {
  // Les searchParams viennent de l'URL : ce sont des entrées utilisateur. Un `sort` passé
  // brut à .order() laisse choisir le nom de colonne — énumération du schéma via les messages
  // d'erreur, et tri sur des colonnes non exposées par le select.
  const { q, status, sort } = itemsSearchSchema.parse(await searchParams)
  const supabase = await createClient()

  let query = supabase.from("items").select("*", { count: "exact" })

  // Recherche texte — échapper % et _ , sinon l'utilisateur pilote le motif LIKE
  if (q) query = query.ilike("name", `%${q.replace(/[%_\\]/g, "\\$&")}%`)
  if (status) query = query.eq("status", status)

  const [column, direction] = sort.split(":")
  query = query.order(column, { ascending: direction === "asc" })

  const { data, count, error } = await query
  if (error) return <ItemsError />
  return <ItemList items={data ?? []} total={count ?? 0} />
}
```

```typescript
// lib/schemas/items.ts — whitelist stricte : le tri est une énumération, pas une chaîne
export const itemsSearchSchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  sort: z
    .enum(["created_at:desc", "created_at:asc", "name:asc", "name:desc"])
    .default("created_at:desc"),
})
```

**Règles :**
- Les filtres sont dans l'URL (query params), pas dans un state local — lien partageable, back/forward fonctionnels.
- **Vérifiable :** aucune valeur issue de `searchParams` n'est passée à `.order()`, `.eq()`, `.select()` ou `.ilike()` sans être passée par un schéma Zod. Les colonnes de tri sont un `z.enum`, jamais un `z.string()`.

## Optimistic Updates

Voir `forms-patterns.md § Mise à jour optimiste`. Uploads : `uploads-patterns.md`.

## Caching & Revalidation

### Stratégies
| Stratégie | Quand | Comment |
|-----------|-------|---------|
| **revalidatePath** | Après une mutation qui change une page | `revalidatePath("/projects")` |
| **revalidateTag** | Après une mutation qui change des données taguées | `revalidateTag("projects")` |
| **Time-based** | Données qui changent rarement | `{ next: { revalidate: 3600 } }` dans fetch |
| **No cache** | Données temps réel | `{ cache: "no-store" }` dans fetch |

### Avec Supabase (Server Components)

Next.js 15 ne met en cache aucun `fetch` par défaut, et une requête portant un header
`Authorization` n'est de toute façon jamais mise en cache. Les requêtes Supabase
authentifiées ne sont donc pas cachées — c'est le comportement voulu.

**Une donnée mise en cache est par définition non authentifiée.** Ne jamais appeler
`cookies()` / `headers()` — donc jamais `createClient()` de `@/lib/supabase/server` — dans un
`unstable_cache` : Next lève `Route used "cookies" inside a function cached with
"unstable_cache(...)"`. Utiliser un client anon sans cookies, et protéger la donnée par une
policy RLS lisible par `anon`.

```typescript
import { unstable_cache } from "next/cache"
import { createClient as createAnonClient } from "@supabase/supabase-js"

const getCachedSettings = unstable_cache(
  async () => {
    const supabase = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error } = await supabase.from("settings").select("*").single()
    if (error) return null
    return data
  },
  ["settings"],
  { revalidate: 3600, tags: ["settings"] }
)
```

**`revalidatePath` ne traverse pas les frontières d'utilisateur.** Pour une donnée par
entité, préférer des tags : `revalidateTag(\`project:${id}\`)` après la mutation, et
`{ tags: [\`project:${id}\`] }` à la lecture.

## Bulk Operations

```typescript
type BulkResult = {
  succeeded: number
  failed: number
  errors: Array<{ id: string; error: string }>
}

"use server"
export async function bulkDeleteItems(ids: string[]): Promise<ActionResult<BulkResult>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // `.delete()` sans `{ count: "exact" }` renvoie count: null → succeeded valait toujours 0.
  // Et un DELETE refusé par RLS ne lève PAS d'erreur : il supprime simplement 0 ligne.
  // Sans comparer le retour à la demande, le résultat est mensonger.
  const { data: deleted, error } = await supabase
    .from("items")
    .delete()
    .in("id", ids)
    .select("id")

  if (error) return { error: "Échec de la suppression" }

  const deletedIds = new Set((deleted ?? []).map((row) => row.id))
  const refused = ids.filter((id) => !deletedIds.has(id))

  revalidatePath("/items")
  return {
    data: {
      succeeded: deletedIds.size,
      failed: refused.length,
      errors: refused.map((id) => ({ id, error: "Non autorisé ou introuvable" })),
    },
  }
}
```

**Règle :** une opération bulk compare le nombre de lignes **retournées** au nombre demandé et
signale l'écart. Un DELETE ou UPDATE refusé par RLS est silencieux.

## Webhook Pattern

```typescript
// app/api/webhooks/stripe/route.ts
import { headers } from "next/headers"

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) return new Response("Missing signature", { status: 400 })

  // Vérifier la signature
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    // Traiter l'event...
    return new Response("OK", { status: 200 })
  } catch {
    return new Response("Invalid signature", { status: 400 })
  }
}
```
