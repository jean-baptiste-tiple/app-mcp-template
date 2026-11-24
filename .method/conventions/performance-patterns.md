# Performance Patterns

> Tag : `performance`
> Lire ce fichier pour optimiser le chargement, le rendu et la taille du bundle.

## Principes

1. **Mesurer avant d'optimiser.** Ne pas deviner : sortie de build et Web Vitals (§ Mesurer).
2. **Server Components par défaut.** Zéro JS côté client = meilleure performance.
3. **Charger uniquement ce qui est visible.** Lazy load, code splitting, images optimisées.

## Code Splitting

```tsx
"use client"
// `ssr: false` est INTERDIT dans un Server Component : Next 15 lève une erreur de build
// ("ssr: false is not allowed with next/dynamic in Server Components"). Il n'est utilisable
// que dans un fichier "use client".
import dynamic from "next/dynamic"

const RichEditor = dynamic(() => import("@/components/rich-editor"), {
  loading: () => <Skeleton className="h-64" />,
  ssr: false, // uniquement si le composant touche window/document au montage
})
```

```tsx
// Depuis un Server Component : dynamic() sans ssr:false
const ChartDashboard = dynamic(() => import("@/components/chart"), {
  loading: () => <Skeleton className="h-80" />,
})
```

**Lazy load obligatoire pour :** éditeurs de texte riche, librairies de graphiques,
`react-day-picker`, et tout import d'une dépendance de `package.json` non utilisée au
premier rendu.

**Lazy load interdit pour :** un composant rendu par un `layout.tsx`, rendu sans condition
par un `page.tsx`, ou situé avant le premier `<Suspense>` de la page.

**Vérifiable :** tout fichier contenant `ssr: false` contient `"use client"` en première ligne.

## Images

```tsx
import Image from "next/image"

// Image au-dessus du fold → priority
<Image src="/hero.jpg" alt="Hero" width={1200} height={600} priority />

// Image en dessous du fold → lazy (défaut)
<Image src="/feature.jpg" alt="Feature" width={600} height={400} />

// Image responsive
<Image
  src="/photo.jpg"
  alt="Photo"
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="object-cover"
/>
```

**Règles :**
- Toujours utiliser `next/image` (jamais `<img>`)
- Toujours renseigner `width` + `height` ou `fill` + `sizes`
- **Exactement une image `priority` par page** : celle du LCP, au-dessus de la ligne de
  flottaison. Zéro laisse le hero en lazy — `next/image` est lazy **par défaut**, et ce défaut
  est faux pour le hero. Deux mettent les deux images en concurrence sur la même bande passante
  et dégradent le LCP au lieu de l'améliorer.
  **Vérifiable au call-site :** compter les `priority` dans le sous-arbre rendu par une `page.tsx`
- Format : laisser Next.js optimiser (WebP/AVIF automatique)

## Fonts

```tsx
// app/layout.tsx — chargement optimisé
import { Inter } from "next/font/google"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",     // Texte visible immédiatement
  variable: "--font-sans",
})
```

**Règle :** Toujours utiliser `next/font` — pas de `<link>` vers Google Fonts (bloque le rendu).

## Scripts tiers

- `next/script` avec `strategy="afterInteractive"` par défaut ; `"lazyOnload"` pour tout ce
  qui n'a aucun effet sur le premier rendu (chat support, heatmap, widget d'avis).
  `beforeInteractive` est réservé à un polyfill sans lequel la page ne s'affiche pas.
- **Analytics et tag managers : build de production réelle uniquement.** Les monter en dev ou en
  preview pollue les statistiques et fausse toute mesure ultérieure.
  Garde : `process.env.VERCEL_ENV === "production"`, pas `NODE_ENV` — une preview est un build
  de production.
- **Embed tiers lourd (YouTube, Maps, Calendly) : façade.** Miniature + bouton focusable ;
  l'`iframe` n'est montée qu'au clic. **Un seul embed lourd par page.** Une iframe YouTube tire
  ~1 Mo de JS tiers avant la moindre interaction, et ce JS n'est pas dans le bundle — il
  n'apparaît donc dans aucune analyse de bundle.

## Mesurer

Pas de Lighthouse dans une app : ses pages sont derrière une authentification, et un score de
page publique ne décrit pas l'usage réel. Lighthouse reste l'outil du socle web
(`web-framework-template`), pas de ce template. *(Décision JB 2026-11-24.)*

- **Poids JS par route** : la sortie de `pnpm build` (colonne First Load JS). C'est le chiffre
  qu'un finding « bundle trop gros » doit citer.
- **Web Vitals (LCP, INP, CLS)** : panneau Performance de Chrome DevTools sur `next start`, sur
  la page en cause, avec son chiffre. Un ressenti « la page est lente » sans mesure reste BASSE.
- **Accessibilité, contraste compris** : `pnpm test:e2e` (axe, clair et sombre,
  `accessibility-patterns.md § Couleurs & Contraste`).
- **Ce que la mesure locale ne couvre pas** — tout ce qui dépend de l'hébergeur : compression,
  cache `immutable`, HTTP/2+, chaînes de redirection. Ça se vérifie sur l'URL déployée
  (`deployment-patterns.md § Contrôles post-déploiement`).

## Bundle Size

### Analyser
```bash
# Ajouter au package.json
# "analyze": "ANALYZE=true next build"
```

### Bonnes pratiques
- **Imports nommés** : `import { Button } from "@/components/ui/button"` (pas `import * as UI`)
- **Pas de libs géantes pour un usage simple** : `date-fns` > `moment`, natif > lodash
- **Tree shaking** : vérifier que les libs sont ESM-compatible

### Tailles cibles — objectifs mesurés

> Ces seuils exigent une mesure : ils sont **hors périmètre d'une review de diff**. Ne pas
> produire de finding « bundle trop gros » sans chiffre à l'appui. Le chiffre s'obtient comme
> dit en § Mesurer.

| Métrique | Cible | Comment |
|----------|-------|---------|
| First Load JS | < 100 kB | Server Components, lazy load |
| LCP | < 2,5 s | `priority` sur l'image principale |
| INP | < 200 ms | Pas de JS lourd au load (FID est retiré des Core Web Vitals depuis mars 2024) |
| CLS | < 0,1 | `width/height` sur les images, fonts `swap` |

## Data Fetching Performance

### Parallel fetching
```tsx
// BON : requêtes parallèles
export default async function DashboardPage() {
  const [stats, orders, notifications] = await Promise.all([
    getStats(),
    getRecentOrders(),
    getNotifications(),
  ])
  return <Dashboard stats={stats} orders={orders} notifications={notifications} />
}

// MAUVAIS : requêtes séquentielles (waterfall)
export default async function DashboardPage() {
  const stats = await getStats()
  const orders = await getRecentOrders()  // attend stats
  const notifications = await getNotifications()  // attend orders
  return <Dashboard stats={stats} orders={orders} notifications={notifications} />
}
```

### Streaming avec Suspense
```tsx
// Les sections se chargent indépendamment
export default function DashboardPage() {
  return (
    <div>
      <Suspense fallback={<StatsSkeleton />}>
        <Stats />  {/* Peut prendre 500ms */}
      </Suspense>
      <Suspense fallback={<OrdersSkeleton />}>
        <RecentOrders />  {/* Peut prendre 200ms — s'affiche avant Stats */}
      </Suspense>
    </div>
  )
}
```

## React Performance

### Éviter les re-renders inutiles
```tsx
// Extraire les Client Components au plus bas
// MAUVAIS : toute la page est client
"use client"
export default function ProjectsPage({ projects }) { /* ... */ }

// BON : seule l'interactivité est client
export default function ProjectsPage({ projects }) {
  return (
    <div>
      <h1>Projets</h1>  {/* Server */}
      <ProjectList projects={projects} />  {/* Server */}
      <CreateButton />  {/* Client — "use client" ici seulement */}
    </div>
  )
}
```

## N+1 Queries Prevention

```typescript
// Voir database-patterns.md pour les détails
// Toujours utiliser les jointures Supabase
const { data } = await supabase
  .from("orders")
  .select("*, items:order_items(*, product:products(name, price))")
```
