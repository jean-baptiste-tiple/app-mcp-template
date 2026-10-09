# Next.js 15 App Router Patterns

> Tag : `nextjs`
> Lire ce fichier pour toute story créant des pages, layouts, routes, ou fichiers spéciaux App Router.

## Fichiers spéciaux

| Fichier | Rôle | Server/Client |
|---------|------|---------------|
| `page.tsx` | Page de la route | Server (par défaut) |
| `layout.tsx` | Layout partagé (persist entre navigations) | Server (par défaut) |
| `loading.tsx` | UI de chargement (Suspense boundary automatique) | Server |
| `error.tsx` | Error boundary de la route | **Client** (`"use client"` obligatoire) |
| `not-found.tsx` | Page 404 | Server |
| `global-error.tsx` | Error boundary du root layout (remplace `<html>`) | **Client** |
| `template.tsx` | Comme `layout.tsx` mais **remonté à chaque navigation** | Server |
| `unauthorized.tsx` | Réponse à `unauthorized()` (Next 15.1+) | Server |
| `forbidden.tsx` | Réponse à `forbidden()` (Next 15.1+) | Server |
| `route.ts` | API route handler (webhooks uniquement) | Server |

> PPR et `use cache` ne sont pas activés sur ce template. Les activer est une décision
> d'architecture → ADR. Ne pas les introduire au fil de l'eau.

## Layouts

```tsx
// app/(dashboard)/layout.tsx — chrome de l'app, PAS une frontière d'autorisation
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-dvh">
      {user ? <Sidebar user={user} /> : null}
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
```

### Un layout n'est JAMAIS une frontière d'autorisation

Un layout n'est pas ré-exécuté lors d'une navigation client entre ses pages enfant. Un
`redirect("/login")` placé uniquement dans un `layout.tsx` **n'est donc pas rejoué** : une
session expirée en cours de navigation n'est jamais détectée, et les pages enfant continuent
de rendre des données. C'est le vecteur de contournement du middleware corrigé par
CVE-2025-29927.

Le contrôle d'accès se fait à **trois** endroits, jamais un seul :
1. le middleware — pour la redirection UX, pas pour la sécurité
2. **chaque `page.tsx`** ou la couche d'accès aux données
3. **chaque Server Action** (`api-patterns.md § Pattern Server Action standard`)

**Vérifiable :** un `redirect("/login")` présent dans un `layout.tsx` sans équivalent dans les
`page.tsx` du même segment est un défaut HAUTE.

**Autres règles :**
- Les layouts **persistent** entre les navigations — ne pas y mettre de state volatile
- Les données fetchées dans un layout sont disponibles pour toutes les pages enfant
- Un route group avec un `layout.tsx` doit avoir au moins un `page.tsx`, sinon le build échoue
- **Vérifiable :** deux `page.tsx` ne doivent jamais produire le même chemin une fois les segments `(...)` retirés — Next ne le signale pas, il en choisit un en silence. Et aucun `redirect()` ne cible un chemin contenant le nom d'un route group (`(dashboard)` ne crée pas `/dashboard`).

## Loading States

```tsx
// app/(dashboard)/projects/loading.tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function ProjectsLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  )
}
```

### Suspense granulaire
```tsx
// Pour un loading plus fin que la page entière
import { Suspense } from "react"

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>
      <Suspense fallback={<RecentOrdersSkeleton />}>
        <RecentOrders />
      </Suspense>
    </div>
  )
}
```

## Error Handling

```tsx
// app/(dashboard)/projects/error.tsx
"use client" // OBLIGATOIRE pour error.tsx

export default function ProjectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <h2 className="text-lg font-semibold">Une erreur est survenue</h2>
      <p className="text-muted-foreground">
        Impossible de charger les projets.
      </p>
      <button onClick={reset} className="btn btn-primary">
        Réessayer
      </button>
    </div>
  )
}
```

## Not Found

```tsx
// app/(dashboard)/projects/[id]/not-found.tsx
import Link from "next/link"

export default function ProjectNotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <h2 className="text-lg font-semibold">Projet introuvable</h2>
      <Link href="/projects" className="text-primary underline">
        Retour aux projets
      </Link>
    </div>
  )
}
```

```tsx
// Dans la page — déclencher le not-found
import { notFound } from "next/navigation"

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single()

  if (!project) notFound()

  return <ProjectDetail project={project} />
}
```

## Route Groups

```
app/
├── (auth)/          # Pages publiques (login, signup) — pas de sidebar
│   ├── layout.tsx   # Layout minimal
│   ├── login/
│   └── signup/
├── (dashboard)/     # Pages authentifiées — avec sidebar
│   ├── layout.tsx   # Layout avec sidebar + auth check
│   ├── page.tsx     # /
│   └── projects/
└── (marketing)/     # Pages publiques (landing, pricing) — layout marketing
    ├── layout.tsx
    └── pricing/
```

**Règle :** Les route groups `(nom)` ne créent PAS de segment d'URL. `(dashboard)/projects/page.tsx` = `/projects`.

## Dynamic Routes

```tsx
// app/(dashboard)/projects/[id]/page.tsx
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // ...
}
```

### generateStaticParams (optionnel, pour SSG)
```tsx
export async function generateStaticParams() {
  const supabase = await createClient()
  const { data } = await supabase.from("projects").select("id")
  return (data ?? []).map((p) => ({ id: p.id }))
}
```

## Metadata

`metadata` statique et `generateMetadata` dynamique vivent dans
`seo-patterns.md § Metadata API`, routé sur les mêmes fichiers (`src/app/**/page.tsx`,
`src/app/layout.tsx`). Les dupliquer ici ferait lire deux fois les mêmes lignes sur le
scénario le plus lourd — et les deux versions avaient déjà divergé.

## Navigation

```tsx
// Liens
import Link from "next/link"
<Link href="/projects">Projets</Link>

// Navigation programmatique (Client Component uniquement)
"use client"
import { useRouter } from "next/navigation"
const router = useRouter()
router.push("/projects")
router.refresh() // Re-fetch les Server Components

// Redirect (Server Component / Server Action)
import { redirect } from "next/navigation"
redirect("/login")
```

## Images

```tsx
import Image from "next/image"

// Image locale
<Image src="/logo.png" alt="Logo" width={120} height={40} priority />

// Image distante (Supabase Storage)
<Image
  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`}
  alt={userName}
  width={40}
  height={40}
  className="rounded-full"
/>
```

Configurer les domaines dans `next.config.ts` :
```typescript
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
}
```

## Fonts

```tsx
// app/layout.tsx
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
```
