# Design System — thème neutre, à personnaliser par projet

> Preview interactive : `/design-system` (route Next.js)
> Source unique des tokens : `src/app/globals.css` — Tailwind v4 **CSS-first** : il n'y a **pas**
> de `tailwind.config.ts`. Variante `dark`, plugin `tailwindcss-animate`, keyframes et tokens
> vivent dans le CSS (`@custom-variant`, `@plugin`, `@theme inline`).

## Identité visuelle

- **Thème par défaut : neutre.** Palette neutral de shadcn en oklch ; `--primary` quasi-noir en
  clair, quasi-blanc en sombre. Aucune identité de marque : elle se pose à la story de setup
  (§ Personnaliser le thème).
- **Police :** une seule sans-serif, chargée par `next/font` dans `src/app/layout.tsx` et exposée
  en variable `--font-sans` sur `<html>` (Inter par défaut). Aucune police mono n'est chargée :
  `font-mono` retombe sur la pile système.
- **Icônes :** Phosphor (`@phosphor-icons/react`) pour toute icône applicative —
  `@phosphor-icons/react/dist/ssr` dans un Server Component. lucide-react reste réservé aux
  composants Shadcn de `src/components/ui/`.
- **Dark mode :** class-based (next-themes + `@custom-variant dark`), toggle ou système.
- **Logo :** `AppLogo` (`src/components/logo.tsx`) est un placeholder dessiné avec les tokens
  `primary` ; la favicon `src/app/icon.svg` est un aplat neutre. Les deux se remplacent à la story
  de setup.

## Personnaliser le thème (story de setup)

### 1. Le bloc à éditer

Dans `src/app/globals.css`, le bloc balisé **« THÈME PROJET — à personnaliser à la story de
setup »** en tête de `:root` (thème clair) **et** de `.dark` (thème sombre). C'est le seul endroit
où vit la marque :

| Token | Rôle |
|-------|------|
| `--primary` | Fills, bordures, états actifs, bouton principal |
| `--primary-foreground` | Texte posé sur `--primary` |
| `--primary-dark` | **Texte d'accent** (liens, spinner, radio) — voir la règle de contraste |
| `--ring`, `--sidebar-ring` | Anneau de focus (souvent = primary une fois la marque posée) |
| `--radius` | Arrondi de base (clair uniquement : il ne dépend pas du thème) |
| `--chart-1` … `--chart-5` | Palette des graphiques |

Le reste — neutres, `destructive`, `success`, `warning`, `sidebar` — est commun à tous les projets
et déjà mesuré AA. Ne le retoucher que pour teinter les neutres (chauds, froids), et re-mesurer.

### 2. La police

Dans `src/app/layout.tsx`, remplacer l'import `Inter` par la police du projet (`next/font/google`
ou `next/font/local`) en gardant `variable: "--font-sans"` et la classe sur `<html>` : la variable
remplace la valeur par défaut de Tailwind, donc `font-sans` et le texte de base suivent sans autre
modification. Une seule police ; n'en ajouter une mono que si un composant l'utilise réellement.

### 3. La règle de contraste

Toute paire **texte/fond réellement utilisée** passe AA dans **les deux thèmes** : 4.5:1 pour le
texte, 3:1 pour le grand texte et les éléments d'interface (anneau de focus, icône seule)
(`accessibility-patterns.md § Couleurs & Contraste`).

- **Une primary qui échoue AA en texte fin** (couleur claire ou vive : vert, jaune, cyan…) reste
  sur les fills, bordures et états actifs. Le texte d'accent passe alors par `--primary-dark` :
  une variante de la marque assez sombre pour tenir 4.5:1 sur fond clair — et, dans `.dark`, sa
  variante claire. **Tout texte d'accent s'écrit `text-primary-dark`, jamais `text-primary`.**
- `--primary-foreground` se choisit pour tenir 4.5:1 sur `--primary` : texte sombre sur une
  primary claire.
- `--ring` tient 3:1 contre `--background` et `--card`.

Paires mesurées pour le thème neutre livré (ratios WCAG, palette oklch convertie en sRGB) :

| Paire | Clair | Sombre |
|-------|-------|--------|
| `foreground` / `background` | 19.8 | 19.0 |
| `primary-foreground` / `primary` | 17.2 | 14.2 |
| `muted-foreground` / `muted` (pire cas du muted) | 5.3 | 5.8 |
| `destructive-foreground` / `destructive` | 4.8 | 6.8 |
| `destructive` en texte / `card` | 4.8 | 6.2 |
| `success-foreground` / `success` | 4.9 | 11.2 |
| `success` en texte / `card` | 4.9 | 10.1 |
| `warning-foreground` / `warning` | 8.3 | 8.3 |
| `primary-dark` en texte / `background` | 17.9 | 15.7 |
| `sidebar-foreground` à 70 % / `sidebar` | 7.5 | 8.8 |
| `ring` (= `primary`) / `card` (élément d'interface, 3:1) | 17.9 | 14.2 |
| `input` / `background` (bordure de champ, 3:1) | 3.4 | 3.8 |
| `input` / `card` et `popover` (bordure de champ, 3:1) | 3.4 | 3.4 |

`--input` délimite un champ (bordure des inputs, selects, textareas, boutons `outline`, piste
du switch décoché) : c'est un élément d'interface, tenu à 3:1. `--border`, purement décoratif
(séparateurs, cartes), reste clair.

`--muted-foreground` clair est à 0.51 et non à la valeur shadcn 0.556 : celle-ci tombe à 4.34:1
sur `--muted` (onglets inactifs, avatar), sous AA.

### 4. Tester les deux thèmes

Après toute modification du bloc : parcourir `/design-system` avec le toggle de thème, puis les
écrans réels, dans les deux thèmes. Avant mise en production, `pnpm audit:lh` mesure le contraste
sur les pages buildées (audit `color-contrast`).

### 5. Le reste de l'identité

Remplacer `AppLogo` et `src/app/icon.svg`, et le nom « Mon App » (sidebar et barre mobile de
`src/app/(dashboard)/layout.tsx`, `metadata` de `src/app/layout.tsx`).

## Tokens

### Couleurs

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | oklch(1 0 0) | oklch(0.145 0 0) | Fond de page |
| `--foreground` | oklch(0.145 0 0) | oklch(0.985 0 0) | Texte principal |
| `--primary` | oklch(0.205 0 0) | oklch(0.922 0 0) | Fills, CTA, états actifs (**THÈME PROJET**) |
| `--primary-foreground` | oklch(0.985 0 0) | oklch(0.205 0 0) | Texte sur primary (**THÈME PROJET**) |
| `--primary-dark` | oklch(0.205 0 0) | oklch(0.922 0 0) | Texte d'accent AA (**THÈME PROJET**) |
| `--secondary` | oklch(0.97 0 0) | oklch(0.269 0 0) | Boutons secondaires, badges |
| `--muted` | oklch(0.97 0 0) | oklch(0.269 0 0) | Fonds neutres, zones inactives |
| `--muted-foreground` | oklch(0.51 0 0) | oklch(0.708 0 0) | Texte secondaire |
| `--accent` | oklch(0.97 0 0) | oklch(0.269 0 0) | Hover, sélection, surbrillance |
| `--destructive` | oklch(0.577 0.245 27.325) | oklch(0.704 0.191 22.216) | Erreurs, actions irréversibles |
| `--destructive-foreground` | oklch(1 0 0) | oklch(0.145 0 0) | Texte sur destructive |
| `--success` | oklch(0.527 0.154 150.069) | oklch(0.792 0.209 151.711) | Succès, validations |
| `--warning` | oklch(0.769 0.188 70.08) | oklch(0.769 0.188 70.08) | Avertissements |
| `--card` / `--popover` | oklch(1 0 0) | oklch(0.205 0 0) | Fond des cards, popovers, dropdowns |
| `--border` | oklch(0.922 0 0) | oklch(1 0 0 / 10%) | Bordures |
| `--input` | oklch(0.64 0 0) | oklch(0.53 0 0) | Bordure des champs, piste du switch (≥ 3:1) |
| `--ring` | `var(--primary)` | `var(--primary)` | Anneau de focus, distinct de la bordure `--input` (**THÈME PROJET**) |

En sombre, `destructive` et `success` sont des teintes claires portant un texte sombre : un rouge
assez foncé pour porter du blanc échoue AA quand il sert lui-même de texte sur fond sombre
(message d'erreur, item « Supprimer »).

#### Couleurs Sidebar

| Token | Usage |
|-------|-------|
| `--sidebar` | Fond du sidebar et de la barre mobile |
| `--sidebar-foreground` | Texte du sidebar (liens inactifs et sous-titre à 70 %) |
| `--sidebar-accent` / `--sidebar-accent-foreground` | Hover et item actif |
| `--sidebar-border` | Bordures du sidebar |
| `--sidebar-ring` | Anneau de focus des liens du sidebar |

Le sidebar suit le thème (clair en clair, sombre en sombre).

#### Couleurs Charts (5 niveaux)

`--chart-1` à `--chart-5` — palette catégorielle par défaut de shadcn, à remplacer par celle de la
marque dans le bloc « THÈME PROJET ».

### Typographie

| Style | Classes Tailwind | Usage |
|-------|------------------|-------|
| H1 | `text-2xl font-bold tracking-tight` | Titre de page (rendu par `PageContainer`) |
| H2 | `text-3xl font-semibold tracking-tight` | Sections |
| H3 | `text-2xl font-semibold tracking-tight` | Sous-sections |
| H4 | `text-xl font-medium` | Sous-titres |
| Body | `text-base leading-7` | Corps de texte |
| Small | `text-sm text-muted-foreground` | Descriptions, labels |
| Caption | `text-xs text-muted-foreground` | Métadonnées, timestamps |
| Font | `--font-sans` (`next/font`, Inter par défaut) | Tout le texte |

### Spacing

Utilise l'échelle Tailwind standard (multiples de 4px) :

| Token | Valeur | Tailwind |
|-------|--------|----------|
| space-1 | 4px | `p-1`, `gap-1` |
| space-2 | 8px | `p-2`, `gap-2` |
| space-3 | 12px | `p-3`, `gap-3` |
| space-4 | 16px | `p-4`, `gap-4` |
| space-6 | 24px | `p-6`, `gap-6` |
| space-8 | 32px | `p-8`, `gap-8` |
| space-10 | 40px | `p-10`, `gap-10` |
| space-12 | 48px | `p-12`, `gap-12` |

### Radius

La forme des composants suit `--radius` : aucun arrondi de marque n'est codé en dur dans les
composants (pas de bouton « pilule » imposé).

| Token | Valeur | Tailwind | Usage |
|-------|--------|----------|-------|
| `--radius` | 0.625rem (10px) | `rounded-lg` | Valeur de base (**THÈME PROJET**) |
| sm | radius - 4px | `rounded-sm` | Badges, tags |
| md | radius - 2px | `rounded-md` | Inputs, boutons |
| lg | radius | `rounded-lg` | Cards, modals |
| xl | radius + 4px | `rounded-xl` | Panels larges |
| full | 9999px | `rounded-full` | Avatars |

### Shadows

Utilise les shadows Tailwind standards :

| Classe | Usage |
|--------|-------|
| `shadow-sm` | Boutons, badges |
| `shadow` | Cards surélevées |
| `shadow-md` | Dropdowns, popovers |
| `shadow-lg` | Modals, sheets |

### Breakpoints

| Nom | Valeur | Usage |
|-----|--------|-------|
| sm | 640px | Mobile landscape |
| md | 768px | Tablette — le sidebar apparaît |
| lg | 1024px | Desktop |
| xl | 1280px | Large desktop |

## Composants UI (Shadcn/ui)

Tous installés dans `src/components/ui/`. Style **new-york**.

### Formulaires
| Composant | Fichier | Notes |
|-----------|---------|-------|
| Button | `button.tsx` | 6 variants (default, secondary, destructive, outline, ghost, link), 4 sizes — `link` en `text-primary-dark` |
| Input | `input.tsx` | Focus ring `--ring` |
| Textarea | `textarea.tsx` | Multi-lignes |
| Select | `select.tsx` | Radix Select complet |
| Checkbox | `checkbox.tsx` | Radix Checkbox |
| Switch | `switch.tsx` | Radix Switch |
| RadioGroup | `radio-group.tsx` | Radix RadioGroup — bordure et point en `primary-dark` |
| Label | `label.tsx` | Radix Label |
| Form | `form.tsx` | Intégration react-hook-form |
| Slider | `slider.tsx` | Range input stylisé |
| Calendar | `calendar.tsx` | react-day-picker v9 |

### Layout & Navigation
| Composant | Fichier | Notes |
|-----------|---------|-------|
| Card | `card.tsx` | Header, Title, Description, Content, Footer |
| Separator | `separator.tsx` | Horizontal/vertical |
| Tabs | `tabs.tsx` | Radix Tabs |
| Accordion | `accordion.tsx` | Radix Accordion, animation chevron |
| Breadcrumb | `breadcrumb.tsx` | Navigation fil d'ariane |
| ScrollArea | `scroll-area.tsx` | Radix ScrollArea |

### Feedback
| Composant | Fichier | Notes |
|-----------|---------|-------|
| Badge | `badge.tsx` | 6 variants (default, secondary, destructive, outline, success, warning) |
| Alert | `alert.tsx` | Default + destructive |
| Progress | `progress.tsx` | Barre animée, couleur primary |
| Skeleton | `skeleton.tsx` | Pulse animation |
| Spinner | `spinner.tsx` | SVG animé, 3 tailles, `text-primary-dark` |
| Sonner | `sonner.tsx` | Toast notifications (thème-aware) |

### Overlays
| Composant | Fichier | Notes |
|-----------|---------|-------|
| Dialog | `dialog.tsx` | Radix Dialog modal |
| AlertDialog | `alert-dialog.tsx` | Confirmation destructive |
| Sheet | `sheet.tsx` | Panneau latéral (4 directions) |
| DropdownMenu | `dropdown-menu.tsx` | Radix DropdownMenu complet |
| Popover | `popover.tsx` | Radix Popover |
| Tooltip | `tooltip.tsx` | Radix Tooltip |
| Command | `command.tsx` | Palette de commandes (cmdk) |

### Data Display
| Composant | Fichier | Notes |
|-----------|---------|-------|
| Table | `table.tsx` | HTML table wrappers stylisés |
| Avatar | `avatar.tsx` | Radix Avatar avec fallback |
| Toggle | `toggle.tsx` | Bouton toggle |
| ToggleGroup | `toggle-group.tsx` | Groupe de toggles |

### Icônes animées
| Composant | Fichier | Notes |
|-----------|---------|-------|
| DeleteIcon | `delete.tsx` | lucide-animated, décoratif — l'appelant porte le label |
| SettingsIcon | `settings.tsx` | lucide-animated, décoratif — l'appelant porte le label |

## Composants métier réutilisables

Dans `src/components/` (hors `ui/`) — détail des props dans
`.method/conventions/component-registry.md` :

| Composant | Fichier | Props | Usage |
|-----------|---------|-------|-------|
| ThemeProvider | `theme-provider.tsx` | children, attribute, defaultTheme | Provider next-themes |
| ThemeToggle | `theme-toggle.tsx` | — | Bouton toggle light/dark (Phosphor) |
| PageContainer | `page-container.tsx` | heading?, description?, children | Wrapper de page avec max-width |
| EmptyState | `empty-state.tsx` | icon?, heading, description?, action? | État vide (listes, tables) |
| StatCard | `stat-card.tsx` | label, value, description?, icon?, trend? | KPI dashboard |
| DataTable | `data-table.tsx` | columns, data, emptyMessage? | Table de données générique |
| CopyButton | `copy-button.tsx` | value, label?, size?, variant? | Copie presse-papiers + feedback 2 s, annoncé aux lecteurs d'écran |
| AppLogo | `logo.tsx` | size? | Logo placeholder aux tokens `primary`, décoratif |
| SidebarNav | `sidebar-nav.tsx` | onNavigate? (items : `nav-items.ts`) | Liens du sidebar et du menu mobile, item actif `aria-current` |
| MobileNav | `mobile-nav.tsx` | — | Bouton menu de la barre mobile, ouvre `SidebarNav` dans un `Sheet` |

## Layout de l'app

- **`src/app/(dashboard)/layout.tsx`** : sidebar sticky pleine hauteur à partir de `md` (logo, nom
  du produit, `SidebarNav`), barre mobile en dessous de `md` dont le bouton menu (`MobileNav`)
  ouvre le même `SidebarNav` dans un `Sheet` — refermé au clic sur un lien, focus piégé puis
  restauré par Radix —, contenu dans `<main id="main-content">`.
- **Navigation** : une seule source, `NAV_ITEMS` dans `src/components/nav-items.ts`, lue par le
  sidebar desktop et par le menu mobile.
- **Lien d'évitement** : rendu par `src/app/layout.tsx`, il cible `#main-content`. Tout layout ou
  page hors du route group porte donc son propre `<main id="main-content">` (c'est le cas de
  `/design-system` et du layout `(auth)` du starter supabase-auth), placé **après** la navigation
  qu'il doit faire sauter.
- **Fichiers spéciaux** : `src/app/loading.tsx` (spinner annoncé `role="status"`) et
  `src/app/error.tsx` (message générique + « Réessayer », détails en console uniquement).

## Règles

- **Réutiliser avant de créer** : `.method/conventions/component-registry.md`, puis
  `src/components/ui/`.
- **Classes sémantiques uniquement** (`bg-primary`, `text-muted-foreground`, `border-border`) :
  aucune couleur Tailwind numérotée dans `src/` (contrôlé par `pnpm check:framework`), aucune
  couleur en dur dans un composant (seule la favicon SVG, hors CSS, en porte).
- **Texte d'accent = `text-primary-dark`** (§ Personnaliser le thème, règle de contraste).
- **Ne jamais transmettre une information par la couleur seule** : couleur + icône + texte.
- **Tester les deux thèmes** avant de considérer un écran terminé (`CLAUDE.md § Design system`).

## Patterns UI récurrents

### Page standard
```tsx
<PageContainer heading="Titre" description="Description">
  {/* contenu */}
</PageContainer>
```

### Dashboard avec stats
```tsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  <StatCard label="..." value="..." trend={{...}} icon={...} />
</div>
```

### Liste avec empty state
```tsx
{data.length === 0 ? (
  <EmptyState heading="..." action={<Button>Ajouter</Button>} />
) : (
  <DataTable columns={...} data={data} />
)}
```

### Formulaire avec validation
```tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField control={form.control} name="..." render={({field}) => (
      <FormItem>
        <FormLabel>...</FormLabel>
        <FormControl><Input {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  </form>
</Form>
```
