# TypeScript Patterns

> Tag : `typescript`
> Lire ce fichier pour les conventions TypeScript strictes du projet.

## Règles non-négociables

1. **`strict: true`** dans `tsconfig.json` — jamais désactivé
2. **Jamais de `any`** — utiliser `unknown` + type guard
3. **`const` par défaut** — `let` uniquement si réassignation, jamais `var`
4. **Pas de `as` assertion** sauf cas documenté (ex: Supabase types)

## Types vs Interfaces

```typescript
// Type = pour les unions, intersections, mapped types
type ActionResult<T> = { data: T; error?: never } | { data?: never; error: string }
type OrderStatus = "pending" | "confirmed" | "delivered"

// Interface = pour les objets et les contrats (extends, implements)
interface UserProfile {
  id: string
  email: string
  full_name: string
}

// Composant props = toujours type (convention projet)
type ProjectCardProps = {
  project: Project
  onDelete?: (id: string) => void
}
```

## Utility Types

```typescript
// Partial — rendre tous les champs optionnels
type UpdateProjectData = Partial<CreateProjectData>

// Pick — extraire des champs
type ProjectSummary = Pick<Project, "id" | "name" | "status">

// Omit — exclure des champs
type CreateProjectData = Omit<Project, "id" | "created_at" | "updated_at">

// Record — mapper clés → valeurs
type StatusLabels = Record<OrderStatus, string>

// NonNullable — exclure null/undefined
type RequiredUser = NonNullable<User | null>

// ReturnType — extraire le type de retour
type ActionOutput = ReturnType<typeof createProjectAction>

// Awaited — unwrap une Promise
type ResolvedData = Awaited<ReturnType<typeof fetchProjects>>
```

## Discriminated Unions

```typescript
// Pattern pour les états mutuellement exclusifs
type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string }

// Usage avec narrowing automatique
function renderState(state: AsyncState<Project[]>) {
  switch (state.status) {
    case "idle": return null
    case "loading": return <Skeleton />
    case "error": return <Alert>{state.error}</Alert>
    case "success": return <ProjectList projects={state.data} />
  }
}
```

## Branded Types

```typescript
// Empêcher de mélanger des IDs de types différents
type UserId = string & { readonly __brand: "UserId" }
type ProjectId = string & { readonly __brand: "ProjectId" }

function createUserId(id: string): UserId {
  return id as UserId
}

// Erreur de compilation :
// const project = getProject(userId) // Type 'UserId' is not assignable to 'ProjectId'
```

## Type Guards

```typescript
// Au lieu de `as`, utiliser un type guard
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "email" in value
  )
}

// Usage
const data: unknown = await fetchSomething()
if (isUser(data)) {
  // data est typé User ici
  console.log(data.email)
}
```

## Generics

```typescript
// Composant générique
type ListProps<T> = {
  items: T[]
  renderItem: (item: T) => React.ReactNode
  keyExtractor: (item: T) => string
  emptyMessage?: string
}

function List<T>({ items, renderItem, keyExtractor, emptyMessage }: ListProps<T>) {
  if (items.length === 0) return <p>{emptyMessage ?? "Aucun élément"}</p>
  return <ul>{items.map((item) => <li key={keyExtractor(item)}>{renderItem(item)}</li>)}</ul>
}

// Hook générique
function useLocalStorage<T>(key: string, initialValue: T) {
  // ...
}
```

## Const Objects (préférés aux enums)

```typescript
// Préféré
const ROLES = {
  ADMIN: "admin",
  USER: "user",
  VIEWER: "viewer",
} as const

type Role = (typeof ROLES)[keyof typeof ROLES]
// → "admin" | "user" | "viewer"

// Labels associés
const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrateur",
  user: "Utilisateur",
  viewer: "Lecteur",
}
```

## Zod ↔ TypeScript

```typescript
// Le schema Zod EST la source de vérité pour le type
import * as z from "zod/v4"

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  status: z.enum(["draft", "active", "archived"]),
})

// Inférer le type depuis le schema — pas de duplication
export type CreateProjectData = z.infer<typeof createProjectSchema>
```

## Types Supabase

```typescript
// Types auto-générés — ne pas modifier
import type { Database } from "@/types/database"

// Extraire les types de table
type ProjectRow = Database["public"]["Tables"]["projects"]["Row"]
type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"]
type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"]

// Type métier enrichi (si besoin)
type ProjectWithOwner = ProjectRow & {
  owner: Pick<UserRow, "id" | "full_name" | "avatar_url">
}
```

## Strictness helpers

```typescript
// Exhaustive check — erreur de compilation si un cas est oublié
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`)
}

// Usage
switch (status) {
  case "pending": return "En attente"
  case "confirmed": return "Confirmé"
  case "delivered": return "Livré"
  default: return assertNever(status) // Erreur si un statut est ajouté sans être géré
}
```
