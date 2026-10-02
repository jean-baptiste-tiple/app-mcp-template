# Component Registry

> Derniere MAJ : 2026-10-01
> VERIFIER ce fichier AVANT de creer un composant/hook/util.

## UI Components (Shadcn/ui — installes)

| Composant | Path | Notes |
|-----------|------|-------|
| Accordion | `src/components/ui/accordion.tsx` | Radix, animation chevron |
| Alert | `src/components/ui/alert.tsx` | default, destructive |
| AlertDialog | `src/components/ui/alert-dialog.tsx` | Confirmation modale |
| Avatar | `src/components/ui/avatar.tsx` | Image + fallback initiales |
| Badge | `src/components/ui/badge.tsx` | 6 variants (default, secondary, destructive, outline, success, warning) |
| Breadcrumb | `src/components/ui/breadcrumb.tsx` | Fil d'ariane avec separateurs |
| Button | `src/components/ui/button.tsx` | 6 variants, 4 sizes, asChild ; `link` en `text-primary-dark` |
| Calendar | `src/components/ui/calendar.tsx` | react-day-picker v9 |
| Card | `src/components/ui/card.tsx` | Header, Title, Description, Content, Footer |
| Checkbox | `src/components/ui/checkbox.tsx` | Radix Checkbox |
| Command | `src/components/ui/command.tsx` | Palette de commandes (cmdk) |
| Dialog | `src/components/ui/dialog.tsx` | Modal Radix |
| DropdownMenu | `src/components/ui/dropdown-menu.tsx` | Menu contextuel complet |
| Form | `src/components/ui/form.tsx` | Integration react-hook-form |
| Input | `src/components/ui/input.tsx` | Focus ring `--ring` |
| Label | `src/components/ui/label.tsx` | Radix Label |
| Popover | `src/components/ui/popover.tsx` | Contenu flottant |
| Progress | `src/components/ui/progress.tsx` | Barre de progression |
| RadioGroup | `src/components/ui/radio-group.tsx` | Radix RadioGroup, `primary-dark` |
| ScrollArea | `src/components/ui/scroll-area.tsx` | Zone scrollable custom |
| Select | `src/components/ui/select.tsx` | Radix Select |
| Separator | `src/components/ui/separator.tsx` | Horizontal/vertical |
| Sheet | `src/components/ui/sheet.tsx` | Panneau lateral (4 directions) |
| Skeleton | `src/components/ui/skeleton.tsx` | Placeholder anime |
| Slider | `src/components/ui/slider.tsx` | Range input |
| Sonner | `src/components/ui/sonner.tsx` | Toast notifications |
| Spinner | `src/components/ui/spinner.tsx` | SVG anime, 3 tailles, `text-primary-dark` |
| Switch | `src/components/ui/switch.tsx` | Toggle on/off |
| Table | `src/components/ui/table.tsx` | Wrappers HTML table |
| Tabs | `src/components/ui/tabs.tsx` | Navigation par onglets |
| Textarea | `src/components/ui/textarea.tsx` | Champ multi-lignes |
| Toggle | `src/components/ui/toggle.tsx` | Bouton toggle |
| ToggleGroup | `src/components/ui/toggle-group.tsx` | Groupe de toggles |
| Tooltip | `src/components/ui/tooltip.tsx` | Info-bulle |

## Icones animees (lucide-animated)

Registry shadcn distinct de celui de Shadcn/ui, meme commande. Les fichiers atterrissent dans
`src/components/ui/` et sont vendored : ne pas les modifier a la main, les reinstaller.

```bash
pnpm dlx shadcn@latest add "https://lucide-animated.com/r/<nom>.json"
```

466 icones disponibles (`https://lucide-animated.com/r/registry.json` liste les noms). Chacune
tire `motion` et s'anime au hover ; la ref exposee (`startAnimation` / `stopAnimation`) permet
de piloter l'animation depuis le parent.

| Composant | Path | Notes |
|-----------|------|-------|
| DeleteIcon | `src/components/ui/delete.tsx` | Poubelle, couvercle qui se souleve. Client component |
| SettingsIcon | `src/components/ui/settings.tsx` | Engrenage qui tourne. Client component |

Ces composants rendent un `<div>` decoratif, sans role ni label : l'appelant porte
l'accessibilite — `<button aria-label="...">` autour, `aria-hidden` sur l'icone
(`accessibility-patterns.md` § Images).

## Composants metier partages

| Composant | Path | Props cles | Notes |
|-----------|------|------------|-------|
| ThemeProvider | `src/components/theme-provider.tsx` | children, attribute, defaultTheme | Provider next-themes (client) |
| ThemeToggle | `src/components/theme-toggle.tsx` | — | Bouton toggle light/dark, icones Phosphor (client) |
| PageContainer | `src/components/page-container.tsx` | heading?, description?, children | Wrapper page max-w-7xl |
| EmptyState | `src/components/empty-state.tsx` | icon?, heading, description?, action? | Etat vide (listes, tables) |
| StatCard | `src/components/stat-card.tsx` | label, value, description?, icon?, trend? | KPI card pour dashboards |
| DataTable | `src/components/data-table.tsx` | columns, data, emptyMessage? | Table generique typee |
| CopyButton | `src/components/copy-button.tsx` | value, label?, size?, variant? | Copie presse-papiers + feedback 2s, annonce `role="status"` (client) |
| AppLogo | `src/components/logo.tsx` | size? | Logo PLACEHOLDER neutre aux tokens `primary` (decoratif, `aria-hidden`) — a remplacer a la story de setup |
| SidebarNav | `src/components/sidebar-nav.tsx` | onNavigate? | Liens du sidebar `(dashboard)` et du menu mobile, item actif `aria-current` (client, usePathname) |
| MobileNav | `src/components/mobile-nav.tsx` | — | Barre mobile < md : bouton menu (`aria-label`) ouvrant un Sheet avec `SidebarNav`, refermé au clic sur un lien (client) |
| NavItem, NAV_ITEMS, isNavItemActive | `src/components/nav-items.ts` | — | Source unique des liens du sidebar et du menu mobile ; actif = racine exacte ou segment entier |

## Hooks

| Hook | Path | Retourne | Notes |
|------|------|----------|-------|
<!-- Ajouter ici chaque hook custom cree -->

## Server Actions

| Action | Path | Input -> Output | Notes |
|--------|------|-----------------|-------|
<!-- Ajouter ici chaque Server Action creee -->

## Shared Schemas (Zod)

| Schema | Path | Champs cles | Utilise par |
|--------|------|-------------|-------------|
| getStatusInputSchema | `src/lib/schemas/status.ts` | verbose? (boolean) | tool `get_status`, `getStatus` |
| statusResultSchema | `src/lib/schemas/status.ts` | product, version, status (`ok`\|`degraded`), components? | retour de `getStatus` (`StatusResultType`) |
<!-- Ajouter ici chaque schema Zod partage front/back -->

## Services (parite web <-> MCP)

| Service | Path | Input -> Output | Utilise par |
|---------|------|-----------------|-------------|
| getStatus | `src/lib/services/status-service.ts` | (ctx: AuthContext \| null, GetStatusInputType) -> Promise<StatusResultType> | tool `get_status` (domaine demo, a remplacer) |
<!-- Toute capacite metier = une fonction ici, appelee par la Server Action ET le tool (CLAUDE.md, invariant 5) -->

## Helpers MCP (a reutiliser, ne pas recreer)

| Helper | Path | Usage |
|--------|------|-------|
| toolMeta | `src/mcp/tool-meta.ts` | `securitySchemes` + meta widget d'un tool |
| toToolResult, toolError | `src/mcp/tool-result.ts` | Resultat deux formes (texte + structuredContent), erreurs actionnables |
| widgetMeta, WIDGET_NAMES | `src/mcp/widget-meta.ts` | Triple meta dual-host d'un widget |
| verifyToken, requireAuthContext | `src/mcp/auth.ts` | JWT Supabase -> `{userId}` ; org et role relus en base a chaque appel (auth a activer) |
| useToolOutput, mount | `widgets/shared/mount.tsx` | Donnees du tool dans un widget, montage React |

## Utils

| Util | Path | Usage |
|------|------|-------|
| cn | src/lib/utils/cn.ts | Merge Tailwind classes (clsx + tailwind-merge) |

## Types partages

| Type | Path | Usage |
|------|------|-------|
| <!-- Ajouter ici les types métier du projet --> | | |
