# UI Patterns : composition, responsive, anti-slop

> Tag : `ui`
> Lire ce fichier pour tout écran ou composant visible : page, layout, composant, widget,
> `globals.css`. Il complète `accessibility-patterns.md` (perception, clavier, contraste) et
> `feedback-patterns.md` (toasts, dialogs, états) ; il ne les répète pas.

Ce que ce fichier rend **citable en review** : une UI qui bypasse le design system, qui casse
sous 768 px, ou qui ressemble à un gabarit généré. Sans source, ces trois défauts restaient
BASSE, donc jamais corrigés. Les règles marquées *(mécanisé)* sont vérifiées par
`pnpm check:framework` ; les autres se contrôlent par une citation ou une capture.

## Lecture de design

Avant la première ligne d'un écran nouveau ou d'un composant visible, écrire **une ligne** dans
le plan (ou la story, section « Implémentation ») :

> Lecture : `<type d'écran>` pour `<persona>`, densité `<aérée | standard | dense>`, layout
> `<famille>`, réutilise `<composants du registry>`, sous `md` : `<comportement>`.

- **Type d'écran** : liste, fiche, formulaire, dashboard, réglages, assistant multi-étapes,
  page marketing. Chaque type a son pattern dans `docs/design/system.md § Patterns de page`.
- **Direction** : la densité, le ton et les interdits du projet vivent dans
  `docs/design/system.md § Direction`. Une lecture qui contredit la direction se pose en
  question (`AskUserQuestion`), elle ne se tranche pas en silence.
- Pas de lecture écrite = pas d'arbitrage rendu : la review le traite comme
  `code-review.md § Arbitrage de complexité`.

## Design system verrouillé

La source des tokens est `src/app/globals.css` ; leur documentation `docs/design/system.md`.

- **Toute couleur passe par un token sémantique.** Aucune couleur numérotée Tailwind, aucun
  hex, `rgb()`, `hsl()`, `oklch()` ni classe arbitraire `bg-[#…]` dans un `.tsx` *(mécanisé)*.
  Une couleur qui manque est un token à ajouter dans le bloc « THÈME PROJET », pas une valeur
  posée dans le composant.
- **Pas de `dark:` sur une couleur** *(mécanisé)* : les tokens changent déjà avec le thème.
  Un `dark:bg-…` signale un contournement. `dark:` reste libre pour une transformation
  (`dark:rotate-90`).
- **Typographie limitée aux styles de `system.md § Typographie`** : pas de `text-[13px]`
  *(mécanisé)*. Un style qui manque s'ajoute au tableau, puis au code.
- **Forme et profondeur** : `rounded-sm|md|lg|xl|full` suivent `--radius` ; pas de
  `rounded-[…]` *(mécanisé)*. Ombres : `shadow-sm` à `shadow-lg` selon `system.md § Shadows`.
- **Couches** : `z-10`, `z-20`, `z-50` des composants Shadcn ; pas de `z-[…]` *(mécanisé)*.
  Un nouvel empilement se documente dans `system.md`, il ne s'invente pas localement.
- **`widgets/**`** (bundles MCP Apps single-file) : styles inline tolérés, imposés par la CSP
  des hosts ; les valeurs reprennent les tokens de `system.md`, le tiret cadratin y est banni
  comme ailleurs.

## Responsive

Mobile d'abord : un écran se conçoit à 375 px puis s'élargit.

- **Collapse déclaré par composant.** Tout `grid-cols-N` (N ≥ 2), `flex-row`, colonnes ou
  largeur fixe porte dans le **même** composant son comportement sous `md` : empilement,
  scroll horizontal, `Sheet`, masquage. « Tailwind gère » n'est pas une déclaration.
- **Trois largeurs de référence** : 375 (mobile), 768 (tablette, apparition du sidebar),
  1280 (desktop). Aucun débordement horizontal à 375 : le smoke e2e le vérifie sur `/`.
- **Hauteur de viewport** : `min-h-dvh`, `h-dvh`, jamais `h-screen` *(mécanisé)* : la barre
  d'adresse iOS fait sauter `100vh`.
- **Tables sous `md`** : décision écrite dans la lecture de design, parmi deux : scroll
  horizontal dans un conteneur `overflow-x-auto` avec colonnes prioritaires conservées, ou
  liste de cards. Une table de 6 colonnes compressée à 375 n'est ni l'un ni l'autre.
- **Cibles tactiles** : 44 × 44 px minimum pour toute cible interactive sur mobile
  (`size="icon"` des boutons Shadcn = 36 px : ajouter `p-1` ou une zone de hit sur mobile).
  Espacement ≥ 8 px entre deux cibles adjacentes.
- **Aucune affordance au hover seul** : une action révélée au survol est aussi visible au
  focus et au tap (bouton toujours rendu sous `md`, ou menu `…`).
- **Overlays** : `Dialog` pour une confirmation courte ; un formulaire ou un contenu long
  passe en `Sheet` côté `bottom` ou `right` sous `md`, en `Dialog` au-dessus.
- **Sticky et fixed** : rien de sticky sous `md` hors la barre de navigation ; les éléments
  fixés en bas respectent `env(safe-area-inset-bottom)`.
- **Texte** : `max-w-prose` ou `max-w-[65ch]` sur les paragraphes ; les titres restent sur
  deux lignes maximum à 375 (raccourcir le texte ou la taille, pas les deux).

## Composition

- **Réutiliser avant de créer** : `component-registry.md` puis `src/components/ui/`. Une
  variante d'un composant existant s'ajoute au composant (prop `variant`), elle ne le duplique
  pas (`coding-standards.md § DRY`).
- **Page** : toute page du route group applicatif passe par `PageContainer` (titre `h1`,
  description, largeur max). Un seul `h1` par page.
- **Card seulement si l'élévation porte une hiérarchie** : regrouper des éléments pairs par
  `divide-y`, `border-t` ou de l'espace, pas par une card par item. Une grille de cards
  identiques contenant chacune un titre et deux lignes est un signal de gabarit.
- **Hiérarchie par le poids et la couleur**, pas par la taille : `font-medium` et
  `text-muted-foreground` avant `text-2xl`.
- **Densité** : celle de `system.md § Direction`. Un dashboard dense n'enferme pas chaque
  chiffre dans une card ; une page de réglages aérée ne tasse pas ses sections.
- **Espacement** : l'échelle de `system.md § Spacing` (multiples de 4). Rythme vertical
  constant entre sections d'une même page (`gap-6` ou `gap-8`, pas les deux mélangés).
- **Navigation** : une source, `NAV_ITEMS` ; l'item actif porte `aria-current`.

## États

Les trois états de `feedback-patterns.md § Quand utiliser quoi` sont dus sur tout composant
qui charge des données, plus deux souvent oubliés :

- **Loading** : skeleton de la **même forme** que le contenu final, pas un spinner centré
  (sauf action ponctuelle). `loading.tsx` au niveau page.
- **Vide** : `EmptyState` avec l'action qui permet de sortir de l'état.
- **Erreur** : inline pour un formulaire, `Alert` pour une section, `error.tsx` pour la page.
- **Pending** : bouton `disabled` + `aria-busy` pendant une Server Action ; pas de double
  soumission possible.
- **Partiel** : liste paginée ou filtrée sans résultat ≠ liste vide (message différent,
  action « réinitialiser les filtres »).

## Texte visible

- **Aucun tiret cadratin (`—`) ni demi-cadratin (`–`) dans une chaîne visible** *(mécanisé)* :
  virgule, point, deux-points ou parenthèses. Décision du 2026-10-09 : c'est le premier
  signal de texte généré, la typographie française cède.
- **Label au-dessus du champ**, jamais de placeholder en guise de label
  (`accessibility-patterns.md § Formulaires`). Texte d'aide sous le champ, erreur sous le
  texte d'aide.
- **Une intention = un libellé** sur toute la page : « Enregistrer » partout, pas
  « Sauvegarder » dans le dialog et « Valider » dans le formulaire. Verbe d'action concret,
  jamais « Soumettre », « Valider » seul ou « OK » sur une action irréversible.
- **Bouton principal sur une ligne** à 375 : trois mots maximum.
- **Données d'exemple réalistes** (seeds, fixtures, stories, captures) : noms français
  plausibles, montants non ronds, dates variées. « Jean Dupont », « Acme », « 99,99 % » et
  « 1 234 567 » sont des signaux de gabarit.
- **Pas de verbe de brochure** : « optimiser », « révolutionner », « sans effort » ; décrire
  ce que l'écran fait.

## Icônes

- **Phosphor** (`@phosphor-icons/react`, `/dist/ssr` en Server Component) pour toute icône
  applicative ; `lucide-react` reste interne à `src/components/ui/` *(mécanisé)*.
- Icône seule = `aria-label` sur le bouton et `aria-hidden` sur l'icône
  (`accessibility-patterns.md § Images`). Icône décorative à côté d'un texte = `aria-hidden`.
- **Pas d'emoji en guise d'icône**, pas de SVG dessiné à la main dans un composant (hors
  `AppLogo` et `icon.svg`).
- Une seule taille d'icône par contexte : `h-4 w-4` inline, `h-5 w-5` dans un bouton,
  `h-6 w-6` dans un `EmptyState`.

## Mouvement

- Animer **uniquement** `transform` et `opacity`. Jamais `width`, `height`, `top`, `left`.
- Toute animation au-delà d'une transition de 150 à 300 ms respecte
  `prefers-reduced-motion` : `motion-safe:` sur la classe, ou `useReducedMotion()` avec
  `motion`. Une boucle infinie décorative est interdite ; un `animate-pulse` de skeleton ou
  un spinner sont des états, pas des décorations.
- Chaque animation se justifie en une phrase (hiérarchie, retour d'action, transition
  d'état). « Pour faire vivant » n'en est pas une.
- `useEffect` d'animation : fonction de nettoyage obligatoire.

## Signatures IA

Interdits par défaut dans une UI produit. Chacun est autorisé **si la direction du projet le
nomme** (`system.md § Direction`), jamais par défaut.

- Dégradé sur du texte, halo (« glow ») coloré, ombre portée noire pure sur fond clair.
- Fond en dégradé violet/bleu, « glassmorphism » généralisé.
- Point coloré décoratif devant chaque item de liste, de navigation ou de badge. Un point
  n'existe que s'il porte un état réel (statut en ligne, disponibilité).
- Étiquette en capitales espacées (« eyebrow ») au-dessus de chaque titre de section. Un
  titre suffit.
- Badge de version ou « BETA » dans un en-tête ; compteur fictif ; pied de page « v1.4.2 ».
- Numérotation de sections (« 01 / Fonctionnalités »), séparateurs `·` en chaîne.
- Trois cards identiques en ligne pour présenter trois fonctionnalités.
- Grille « bento » avec une cellule vide ou purement décorative.
- Indicateur de scroll (« Scroll », flèche animée).
- Curseur personnalisé, texte vertical, lignes de grille décoratives.
- Capture d'écran produit reconstituée en `<div>` : une image réelle ou rien.

## Pages marketing

Une page publique (landing, tarifs, portfolio) n'est pas de l'UI produit : son modèle est
l'intention éditoriale, pas la densité d'information. Pour ces pages, et seulement elles :

- charger le skill `frontend-design` pour la direction (typographie, composition, ton) ;
- garder les règles bloquantes de ce fichier (tokens, responsive, texte, mouvement,
  signatures IA) : le skill aide, la convention tranche ;
- la section « hero » tient dans le premier viewport à 375 et à 1280 : titre deux lignes,
  sous-titre vingt mots, un bouton principal et au plus un secondaire ; preuve par capture.

Si le projet n'a aucune page marketing, cette section ne s'applique pas.

## Preuve visuelle

Une UI se juge en la regardant, pas en lisant ses classes.

- **Avant la review d'un diff UI** : `pnpm ui:shots <routes touchées>` produit, dans
  `.ui-shots/`, les captures à 375, 768 et 1280 px en clair et en sombre. Le dossier n'est
  pas versionné. Le script réutilise un serveur qui répond, sinon démarre `pnpm dev` et
  l'arrête. Sous Git Bash, `MSYS_NO_PATHCONV=1` devant la commande : sans lui, `/` est
  réécrit en chemin Windows. Le badge de dev de Next reste visible sur les captures ; c'est
  voulu, il montre aussi l'overlay d'erreur quand l'écran casse.
- **La review lit les captures** et cite leurs chemins dans son rapport
  (`code-review.md § Preuve visuelle`). Capture absente sur un diff UI = review incomplète.
- **Ce que la capture doit montrer** : aucun débordement à 375, sidebar à partir de 768,
  les deux thèmes lisibles, titres sur deux lignes maximum, bouton principal visible sans
  scroll sur un formulaire court.
- **Avant mise en production** : `pnpm audit:lh` (contraste, performance) et
  `pnpm test:e2e` (projets `chromium`, `mobile`, `dark` ; smoke de débordement et axe).

## Vérifiable

| Règle | Comment |
|-------|---------|
| Tokens seuls, pas de `dark:` couleur, pas d'arbitraire, `dvh`, pas de lucide, pas de tiret | `pnpm check:framework` |
| Collapse mobile déclaré, 3 largeurs, 2 thèmes | captures `.ui-shots/` citées en review |
| Débordement à 375, violations axe | `pnpm test:e2e` |
| Contraste des paires réelles | `pnpm audit:lh` |
| Lecture de design, réutilisation, états, libellés, signatures IA | citation de ce fichier en review |
