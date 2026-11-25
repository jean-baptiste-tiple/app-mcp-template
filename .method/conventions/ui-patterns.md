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

**Dès l'échelle Standard**, tout changement visible (écran nouveau, fonctionnalité intégrée à un
écran existant, écran repensé) passe par le skill `design` : un brief écrit par le sous-agent
`designer` avant le code (`.method/templates/design-brief.tmpl.md`), puis une critique sur
captures par le sous-agent `design-critic` (`checklists/design-review.md`). La ligne ci-dessous
ne suffit qu'en **Micro** (libellé, espacement, couleur d'un composant existant).

Avant la première ligne d'un changement visible Micro, écrire **une ligne** dans le plan :

> Lecture : `<type d'écran>` pour `<persona>`, densité `<aérée | standard | dense>`, layout
> `<famille>`, réutilise `<composants du registry>`, sous `md` : `<comportement>`.

- **Type d'écran** : liste, fiche, formulaire, dashboard, réglages, assistant multi-étapes,
  page marketing. Chaque type a son pattern dans `docs/design/system.md § Patterns de page`.
- **Direction** : la densité, le ton et les interdits du projet vivent dans
  `docs/design/system.md § Direction`. Une lecture qui contredit la direction se pose en
  question (`AskUserQuestion`), elle ne se tranche pas en silence.
- Pas de lecture écrite = pas d'arbitrage rendu : la review le traite comme
  `code-review.md § Arbitrage de complexité`.

## Intégrer une fonctionnalité

Le défaut d'un agent qui code une fonctionnalité est de lui trouver une place sur l'écran, pas de
se demander si l'écran la supporte encore. Répété N fois, cela produit un écran Frankenstein :
une boîte de plus à chaque story, plus personne ne sait à quoi sert la page.

- **Partir de l'écran réel** : captures avant (`pnpm ui:shots <route>`) et inventaire de ce que
  l'écran fait déjà (tâche principale, action primaire, zones, composants) avant toute
  proposition. Une route neuve se compare à l'écran voisin le plus proche.
- **Zoom arrière** : la question n'est pas « où caser le bouton » mais « l'écran dit-il encore en
  une phrase à quoi il sert, une fois la fonctionnalité ajoutée ». Le brief rend un verdict :
  - `ajouter` : la fonctionnalité est une variante d'une action ou d'une donnée existante ; elle
    entre dans une zone ou un composant existant (colonne, filtre, entrée de menu, champ) ;
  - `réorganiser l'encart` : la zone d'accueil franchit un seuil ci-dessous ; la zone est
    redessinée, pas complétée ;
  - `repenser l'écran` : l'écran franchit un seuil, ou la fonctionnalité change sa tâche
    principale ; l'écran est redessiné, et ce verdict se pose en question à l'utilisateur
    (`AskUserQuestion`, coût et alternative), jamais en silence.
- **Seuils qui imposent de réorganiser**, contrôlables sur capture :
  - plus d'une action primaire visible dans l'écran ou dans une zone autonome ;
  - plus de 5 actions au même niveau dans une barre ou une rangée : regrouper (menu `…`, onglets) ;
  - plus de 7 champs sans regroupement : sections ou étapes ;
  - l'action principale hors du premier écran à 1280 ;
  - une zone nouvelle qui affiche une donnée déjà présente ailleurs sur l'écran ;
  - une card ou une section dont le titre ne décrit plus tout son contenu ;
  - une seconde liste d'objets ou une seconde entité que le brief ne justifie pas
    (`§ Principes UX`, un objet par écran).
- **L'option la plus petite est toujours évaluée** : passer par un composant existant, ou ne
  rien ajouter de visible (raccourci, action contextuelle, valeur par défaut). Le brief l'écrit,
  même pour l'écarter.
- **Intégrer, c'est aussi retirer** : le brief dit ce qui est déplacé, fusionné ou retiré. Une
  intégration qui n'enlève jamais rien empile.
- **Coller à l'existant** : un même concept garde la même représentation partout (composant,
  libellé, icône, position relative). Avant d'introduire un pattern, chercher celui de l'app
  (`rg` sur le composant ou le concept) et celui de `/design-system`.

## Principes UX

La grille de base que le `designer` applique et que le `design-critic` vérifie
(`checklists/design-review.md`).

- **Une tâche principale par écran, une action primaire** (`Button` variant `default`) ; le reste
  en `secondary`, `ghost` ou menu.
- **Un objet par écran**, celui que l'utilisateur pense (un client, une facture, un accès),
  jamais la structure du moteur (table de liaison, tâche de fond, état de synchronisation). Le
  brief le nomme ; toute seconde liste ou entité visible y est justifiée, sinon elle devient un
  geste sur l'objet ou une étape d'un parcours.
- **Ordre de lecture = ordre d'usage** : ce qui sert la tâche fréquente vient en premier et pèse
  le plus ; le rare, l'avancé et le destructif se replient (menu, accordion, sheet). Un geste
  rare, d'administration ou destructif n'est jamais au niveau de l'usage courant (en-tête de
  page, rangée de l'action primaire) : il vit sur l'objet (`§ Fiches et gestes sur l'objet`).
- **Seule l'exception se marque** : aucun badge, icône ni couleur pour l'état par défaut
  (« Actif », « Synchronisé », « OK » sur chaque ligne) ; un marqueur visible signale un écart.
- **Proximité** : un label avec son champ, une action à côté de l'objet qu'elle modifie, des
  éléments liés groupés et séparés des autres par de l'espace plutôt que par des boîtes.
- **Reconnaissance plutôt que rappel** : valeurs et choix visibles, défauts pertinents
  pré-remplis, aucun identifiant technique à mémoriser. À la création, rien n'est demandé qui a
  un bon défaut et se change après.
- **Prévenir avant de signaler** : contraintes de saisie, action désactivée avec sa raison
  visible, confirmation réservée à l'irréversible (`feedback-patterns.md`).
- **Retour immédiat** de chaque action, à l'endroit où l'utilisateur regarde.
- **Le vide, le premier usage et l'erreur se conçoivent** comme des écrans : texte utile et
  action pour en sortir.
- **Coût d'interaction proportionnel à la fréquence** : la tâche fréquente en un geste, la rare
  peut en demander plusieurs.
- **Le vocabulaire est celui de l'utilisateur**, pas celui du modèle de données ni du code :
  aucun état interne (`pending_sync`), nom de fonction ou de table, identifiant, ni compteur sans
  son objet (« 3 », « 12 traités »). Un terme décidé (brief, ou déjà affiché ailleurs) ne se
  renomme pas sans arbitrage posé (`AskUserQuestion`) avec son coût : écrans, documents et tools
  MCP qui le portent.

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
  focus et au tap (bouton toujours rendu sous `md`, ou menu `…`). Révélé ou non, il occupe déjà
  sa place : il apparaît par `opacity`, jamais par ajout au flux, et rien ne bouge au survol
  (captures avec et sans survol superposables).
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
  `text-muted-foreground` avant `text-2xl`. Le muted sert au texte secondaire, jamais à un
  titre : un titre de section est en `text-foreground`, `font-semibold` ou plus, au moins à la
  taille du corps ; pas de sur-titre pâle au-dessus (`§ Signatures IA`).
- **Densité** : celle de `system.md § Direction`. Un dashboard dense n'enferme pas chaque
  chiffre dans une card ; une page de réglages aérée ne tasse pas ses sections.
- **Espacement** : l'échelle de `system.md § Spacing` (multiples de 4). Rythme vertical
  constant entre sections d'une même page (`gap-6` ou `gap-8`, pas les deux mélangés).
- **Navigation** : une source, `NAV_ITEMS` ; l'item actif porte `aria-current`.

## Fiches et gestes sur l'objet

Écran de gestion d'objets : une liste, puis la fiche de l'objet choisi.

- **Geste rare, d'administration ou destructif** : sur l'objet, là où il apparaît (ligne, en-tête
  de fiche), discret : icône révélée au survol et au focus clavier (`§ Responsive`), infobulle
  qui nomme l'effet (« Retirer l'accès », pas « Gérer »), confirmation qui liste ce qui sera
  perdu ou changé (quand confirmer : `feedback-patterns.md § Dialogs de confirmation`).
- **Gestes d'une fiche** : un geste principal ; les autres groupés (une rangée ou un menu `…`) ;
  les destructifs dans une zone à part, en bas de la fiche.
- **Tiroir de détail** : `Sheet` à droite, de l'ordre de 560 px à 1280 (`sm:max-w-xl` ; le
  `sm:max-w-sm` par défaut du composant est trop étroit). En-tête : visuel (icône, logo ou
  avatar), nom, une ligne de contexte, état ; rien d'autre avant le premier contenu.
- **Une information = une ligne** quand elle tient à la largeur du tiroir. Propriétaire et
  partage par `Avatar` ou icône avec infobulle, pas par une phrase grise.
- **Listes de capacités** (droits, fonctions, outils d'un objet) : une ligne par groupe (icône,
  libellé, résumé, nombre aligné à droite), repliable (`Accordion`), fermée par défaut ; jamais
  une grille de cards étroites où le texte passe à la ligne.
- **Choix à 2 ou 3 options exclusives** : contrôle segmenté (`ToggleGroup` `type="single"`),
  option active marquée sobrement (fond `secondary` ou `muted`, pas `primary`), libellés qui
  disent ce qu'on choisit (« Moi seul », « Toute l'équipe », pas « Oui » ou « Mode A »), aide
  d'une ligne, exacte. Une seule option possible pour cet objet : pas de contrôle, la valeur
  s'écrit en texte.

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
- **Plafond et bloqué** : limite atteinte (quota, nombre maximal) et action refusée (droit
  absent, prérequis manquant) affichent la raison et ce qui débloque.

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
- **Aucune contradiction dans une vue** : deux textes visibles ensemble ne promettent pas
  l'inverse, un état vide ne s'affiche pas avec une liste non vide, un compteur égale le nombre
  d'éléments qu'il annonce et l'état qu'ils montrent.
- **Aucune promesse que le moteur ne tient pas** : un texte qui décrit un comportement (partage,
  suppression, synchronisation, délai, visibilité) s'écrit après lecture du service ou de la
  policy qui le porte, chemin cité dans le brief.
- **Moins de texte** : pas d'explication de l'évidence (étapes « comment ça marche », titre
  au-dessus d'un champ déjà labellisé, phrase qui répète le bouton) ; au plus une phrase courte
  près du bouton qu'elle éclaire.
- **Accords calculés** : « 1 outil », « 3 outils », « aucun outil » ; jamais « outil(s) ».
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
- **Bouton d'action = icône + libellé.** L'icône seule est réservée aux contrôles d'interface
  (menu, thème, fermer) et aux gestes sur l'objet révélés au survol, toujours avec infobulle.
- **Badges d'état en grille dense** : icône seule, une forme distincte par état (jamais la même
  icône en deux couleurs), sens en infobulle et dans le nom accessible.
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
- **Avant mise en production** : `pnpm test:e2e` (projets `chromium`, `mobile`, `dark` ; smoke
  de débordement, axe dont le contraste des paires réelles).
- **Mesurer sur le bon serveur** : avant une mesure ou une capture sur `next start`, vérifier que
  le PID qui écoute sur le port est celui qu'on vient de lancer (un serveur orphelin sert
  l'ancien build et fausse la mesure), et l'arrêter ensuite par PID, jamais « par port ». Vu le
  2026-11-06 : deux mesures sur un build périmé avant de s'en apercevoir. Avant de juger une
  capture, un élément propre au diff (texte, composant) y est repéré : version servie = version
  attendue, sinon la critique porte sur un autre écran.
- **Captures du design séparées** : `pnpm ui:shots` vide `.ui-shots/` à chaque run. Le
  `designer` et le `design-critic` copient leurs captures, juste après chaque run, dans leur
  dossier propre, `.claude/design-shots/<sujet>/brief/` ou `.../critique/` (non versionné), et
  y mettent tout script de capture ad hoc (survol, tiroir ouvert) ; aucun n'écrit dans le
  dossier de l'autre ni dans `scripts/`. Le brief et la critique citent ces chemins.

## Vérifiable

| Règle | Comment |
|-------|---------|
| Tokens seuls, pas de `dark:` couleur, pas d'arbitraire, `dvh`, pas de lucide, pas de tiret | `pnpm check:framework` |
| Collapse mobile déclaré, 3 largeurs, 2 thèmes | captures `.ui-shots/` citées en review |
| Débordement à 375, violations axe, contraste des paires réelles | `pnpm test:e2e` |
| Lecture de design, réutilisation, états, libellés, signatures IA, objet et gestes | citation de ce fichier en review |
