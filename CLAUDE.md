# CLAUDE.md — Méthode de développement

## Projet
<!-- À REMPLIR : nom du projet, description en 1 ligne -->

Stack : Next.js 15 (App Router) · TypeScript strict · Tailwind · Shadcn/ui.
Canal MCP **installé par défaut** (Claude, ChatGPT) : `src/mcp/`, endpoint `/api/mcp`, widgets dans
`widgets/` ; mode d'emploi `src/mcp/README.md`, règles dans le tag `mcp`. Un produit sans serveur
MCP est un écart, décidé au cadrage.
IA : **zéro IA serveur par défaut** — les opérations intelligentes passent par le modèle de l'host
(`prepare → modèle → save validé`, `mcp-patterns.md` § 4 bis). Un appel LLM serveur se décide par ADR.
Base de données et auth optionnelles via `.method/starters/supabase-auth/`. Supabase Cloud par
défaut ; option souveraine self-hosted (Scaleway ou autre) par ADR, tag `selfhost`.
Option plateforme Otomata (pages, tableaux, procédures dans l'ERP) via `.method/starters/oto-platform/` :
activée, elle **remplace** le MCP du template, et les capacités métier deviennent des fonctions ERP
(ADR-001, `docs/decisions/`).

## Style de réponse

- Réponses courtes, droit au but. Le minimum de mots possible.
- Pas de récap de ce que l'utilisateur vient de dire. Pas de tableau décoratif ni d'emoji sauf demande.
- Pas de « voici ce que j'ai fait », pas de phrase d'introduction ni de transition. L'état du résultat, rien d'autre.

## Avant de coder

- **Toute décision qui revient à l'utilisateur passe par `AskUserQuestion`, jamais par une phrase dans un récap.** Demande à plusieurs lectures, arbitrage produit, refacto proposé, option écartée qui coûterait à rattraper : la question porte le contexte nécessaire pour trancher — par option, sa conséquence et son coût — et la recommandation en premier. Le filtre reste « des lectures différentes mènent à un travail matériellement différent » ; le reste se tranche seul et s'écrit dans le récap. Un **sous-agent ne tranche pas** : il s'arrête et remonte l'arbitrage au pilote, qui pose la question ; la consigne se met dans son prompt. Contrôlable sur la trace : un arbitrage rendu en prose (« j'ai choisi X », « à toi de voir ») sans appel à l'outil est une violation. *(Demande JB 2026-08-28.)*
- **Edits chirurgicaux.** Chaque ligne changée trace à la demande. Pas de cleanup adjacent, pas de reformatage opportuniste, pas de refacto non demandé. Dead code repéré : le mentionner, pas le supprimer. Un refacto **repéré** n'est pas un refacto **fait** : il se nomme dans le rayon d'impact et devient une question (§ ci-dessus), pas un silence.
- **Rayon d'impact avant d'éditer, dès l'échelle Standard.** Le plus petit changement local, répété N fois sans regarder autour, produit un Frankenstein : doublons, appelants oubliés, effets de bord que personne n'a nommés. Avant la première ligne — dans la story (section « Rayon d'impact ») ou dans le plan proposé en live — quatre items, chacun observable : **(1) Appelants** : pour chaque fonction, table, colonne, composant ou Server Action modifié, les usages trouvés (**commande de recherche citée**, chemin absolu) et ce qui change pour chacun ; « aucun autre appelant » se prouve par la commande, jamais par affirmation. **(2) Doublons** : ce qui fait déjà la même chose (`component-registry.md` + recherche sur le concept), avec le verdict réutiliser / fusionner / laisser et sa raison. **(3) Effet produit** : quel parcours voit une différence hors de l'écran modifié — autre route ou layout partagé, Server Action appelée ailleurs, policy RLS, webhook ou cron, email transactionnel, export / sitemap / SEO ; **un projet dérivé de ce template remplace cette liste par ses propres systèmes** (§ Projet). **(4) Refacto** : proposé ou écarté, écrit ; s'il est proposé, il est posé en question avec son coût et ce qui se passe sans lui. Contrôlable : un plan ou une story Standard+ sans ces quatre items, ou un item (1) sans commande citée, est une violation. Micro en est exempt — sinon plus personne ne le fait. *(Demande JB 2026-08-28.)*
- **Critères de succès vérifiables d'abord.** Reformuler la tâche en checks concrets : test qui reproduit le bug, assertion qui valide la feature, type-check qui passe. Pas de « make it work » flou.
- **Push back quand c'est justifié.** Approche plus simple disponible ou dette évidente créée : le dire avant d'exécuter.
- **Base à jour avant un chantier documentaire.** `git fetch` et écart avec `origin/main` constatés avant d'écrire dans `docs/`, `.method/` ou `CLAUDE.md`. Une règle écrite sur une base périmée cite des chemins morts.

## Justifier une surface nouvelle

Est une **surface** tout ce qui devra ensuite être lu, maintenu ou désappris : fichier,
composant, hook, util, abstraction, prop optionnelle, option de config, table, colonne,
feature flag, dépendance.

1. **Toute surface nouvelle porte ce qui casse sans elle aujourd'hui.** Une phrase, écrite dans
   le récap de livraison — dans le rapport de `revue` dès l'échelle Standard : quel comportement
   demandé n'existe pas si la surface n'existe pas. Un besoin au futur — « on pourrait vouloir »,
   « pour rester générique », « ce sera utile quand » — n'est pas une justification : **la surface
   se retire, elle ne se documente pas.**
2. **Au-delà d'un changement Micro, le récap nomme l'option d'un cran plus simple qui a été
   écartée, et la raison de l'écarter.** Un cran plus simple = la même livraison avec une surface
   en moins : valeur en dur au lieu d'une option, composant existant étendu au lieu d'un nouveau,
   code en ligne au lieu d'une abstraction, aucune dépendance ajoutée. **Une seule solution
   présentée = aucun arbitrage rendu**, et la review le traite comme tel
   (`checklists/code-review.md § Arbitrage de complexité`).

Ces deux obligations ne remplacent ni « réutiliser avant de créer »
(`.method/conventions/component-registry.md`) ni « factoriser à partir de 2 occurrences »
(`coding-standards.md § DRY`) : elles en sont la **trace**. Sans elles, rien ne permet de dire,
en relisant un diff, si l'arbitrage a eu lieu ou si personne n'y a pensé.

## Après une erreur

- **Corriger l'instance ne solde pas l'erreur** — qu'elle soit commise par l'agent, repérée dans le code ou signalée par l'utilisateur. Après le fix, s'arrêter avant de reprendre le fil : qu'est-ce qui a rendu l'erreur possible, et qu'est-ce qui l'empêchera de revenir ? Tant que la seconde question n'a pas de réponse **écrite**, la récidive est garantie — sous une autre forme, dans un contexte où personne ne fera le lien.
- **L'apprentissage s'écrit là où il sera relu au bon moment**, pas là où c'est commode. Une garde posée dans une convention routée ou une checklist devient **citable en review** (`conventions/<fichier>.md § <section>`) — c'est ce qui la fait relire au bon moment.

| Apprentissage | Emplacement |
|---|---|
| Invariant d'architecture absent, flou ou violé | ADR dans `docs/decisions/` (`.method/templates/adr.tmpl.md`) + màj `docs/architecture.md` |
| Règle technique manquante ou fausse | Fichier du tag dans `.method/conventions/` (globs : `_index.md`) |
| Point de contrôle absent de la review | `.method/checklists/code-review.md` |
| Story acceptée alors qu'elle était floue | `.method/checklists/story-ready.md` |
| Composant recréé au lieu de réutilisé | `.method/conventions/component-registry.md` |
| Règle de travail globale / gotcha projet | `CLAUDE.md` |
| Contexte de l'erreur sur la story concernée | Section « Post-implémentation », `docs/stories/` |

L'écriture ne se demande pas et ne s'ajourne pas : la garde s'écrit dans la foulée du fix, et le
récap dit **quel fichier, quelle section, quelle règle en une phrase** (§ Modifications
documentaires).

- **Une erreur avérée vaut occurrence suffisante.** Le seuil « 2+ occurrences » de `wrap-up` vise les patterns observés, pas les gardes anti-récidive. Le plafond de 400 lignes par fichier de conventions s'applique en revanche à l'identique : si la garde fait déborder, élaguer plutôt qu'empiler. `wrap-up` reste le filet de fin de chantier ; il ne remplace pas cette boucle immédiate.
- **Trois écueils :**
  1. **Ne rien écrire parce que « ça ne se reproduira pas ».** La bonne foi n'est pas un mécanisme.
  2. **Repousser l'écriture à plus tard.** « Je le noterai au wrap-up » laisse la garde à l'état d'intention. Elle s'écrit dans la foulée du fix, et cette écriture est annoncée — c'est l'annonce, pas un accord préalable, qui la rend relisible.
  3. **Écrire une règle qui décrit l'erreur au lieu de la rendre détectable.** « Faire attention à X » ne vaut rien. Test avant d'écrire : en relisant la règle, peut-on contrôler si elle a été tenue — par une machine (`pnpm verify`) ou par une citation en review ? « Toute affirmation porte sa source ou est marquée hypothèse » se contrôle ; « être rigoureux » non.

## Règles absolues

1. **Conventions chargées + `pnpm type-check` : à toute échelle, sans exception** — y compris pour un changement d'une ligne.
2. Lire avant de coder : la story si applicable, sa référence UI si elle n'est pas `N/A`, `docs/architecture.md`, et les conventions routées.
3. Ne jamais créer un composant, hook ou util sans avoir vérifié `.method/conventions/component-registry.md`. S'il existe, le réutiliser.
4. Ne jamais modifier un invariant d'architecture sans ADR dans `docs/decisions/`.
5. Les tests s'écrivent AVEC le code : unit, puis intégration, puis e2e si applicable.
6. **Aucun artefact n'est obligatoire ; son absence est déclarée, pas subie.** Pas de maquette, pas de story, pas de base de données : le travail se fait quand même. Une référence UI à `N/A` n'est jamais un défaut et la review ne la pénalise pas.
7. **Cadrage = documentation uniquement.** Pendant un `/plan` : aucune dépendance installée, aucun fichier de code créé, aucun build lancé. Seuls `docs/` et `.method/sprint/` sont modifiés.

### Ce qui est appliqué, et ce qui ne l'est pas

Ces règles n'ont pas la même force, et confondre les deux fait croire à des garanties qui
n'existent pas.

| Garanti par une machine | Tenu par jugement |
|---|---|
| `type-check`, `lint`, `test`, `check:framework` (`pnpm verify`) | Conventions réellement **lues** avant d'écrire (règles 1-2) |
| Le gate de commit : reçu obligatoire, `--no-verify` / `--force` bloqués | Registry consulté avant de créer (règle 3) |
| Routing, citations, globs morts, RLS, routes dupliquées (`check:framework`) | ADR posé sur un invariant touché (règle 4) |
| | Échelle du changement correctement estimée |

Rien ne vérifie qu'une convention a été lue — seulement qu'elle a été **annoncée**. L'annonce
est donc la seule trace : la produire avant d'implémenter, et la produire fausse est un
mensonge, pas un raccourci. Quand un doute existe sur la colonne de droite, le dire plutôt que
de laisser supposer que la colonne de gauche le couvre.

## Échelle du changement

L'ampleur du process dépend de **ce que le changement touche**, jamais des mots employés dans la
demande. En cas de doute entre deux échelles, prendre la plus haute et le dire.

| Échelle | Reconnaissance | Process |
|---------|----------------|---------|
| **Micro** | 1-2 fichiers, aucune nouvelle surface | conventions → implémentation → type-check → **review inline** |
| **Standard** | 3-5 fichiers, ou création d'une fonction / composant / action | + tests → skill `revue` → changelog |
| **Module** | nouvelle surface (route, table, parcours), changement DB, ou ≥ 6 fichiers | **proposer une story avant de coder** → tout le Standard → registry → ADR si invariant → sprint status |

Micro ne veut pas dire « sans garantie » : ce qui disparaît est le cérémonial (rapport de review,
entrée de changelog pour un changement invisible), pas la vérification.

À l'échelle Module, la story se **propose**, ne s'impose pas. Sa raison d'être est précise : c'est
le seul endroit où les AC sont écrits avant le code, donc le seul moyen pour la review de statuer
« AC non livré » au lieu de donner un avis. Si l'utilisateur refuse, **rester en Module sans
story** — registry, ADR et changelog restent dus ; seuls post-implémentation et sprint status
tombent.

### Garde-fous conditionnels

Déclenchés par la **nature réelle** du travail, quel que soit le vocabulaire employé.

- **Correction d'un comportement cassé** → écrire d'abord un test qui reproduit le bug et échoue.
- **Changement qui ne doit rien modifier au comportement observable** (réorganisation, extraction, renommage) → lire les tests existants avant · tests **identiques** avant/après · si la zone n'est pas testée, écrire les tests avant.

## Conventions routées par globs

Le routing `fichier touché → tag → convention` a **une seule source de vérité** : la colonne
**Globs** de [`.method/conventions/_index.md`](.method/conventions/_index.md).

- **Base, toujours lue :** `coding-standards.md` — une seule, volontairement courte.
- **Par globs :** chaque fichier créé ou modifié active des tags ; les fichiers correspondants sont lus **en entier**.
- **Mode story :** les tags du champ `Conventions` s'ajoutent (union avec les globs). C'est le seul moyen d'activer `datetime`, `i18n` et `flags`, qu'aucun chemin ne révèle.
- **Annoncer la liste chargée** avant d'implémenter et avant de reviewer.

Registry et stack sont **routés**, pas systématiques : vérifier le registry n'a de sens qu'en
créant un composant, la stack qu'en touchant aux dépendances.

Ne jamais déduire ce mapping de mémoire ni le recopier ailleurs. Il n'existe **pas** de skill par
tag : `dev` et `revue` matchent les globs eux-mêmes.

**Ce qu'ESLint ou TypeScript applique n'est jamais répété en prose.** Une règle mécanisée est
vérifiée à chaque `pnpm lint` ; la recopier n'ajoute que du volume à lire.

## Skills

Tout vit dans `.claude/skills/`. Un skill se déclenche **sur l'intention** et reste invocable en
`/<nom>`.

| Skill | Déclenchement | Rôle |
|-------|---------------|------|
| `dev` | auto — modification de `src/`, `tests/`, `supabase/`, config | 2 modes (lecture / écriture) × 3 échelles |
| `revue` | auto — fin d'implémentation dès l'échelle Standard | Conventions routées, confrontées au diff |
| `verify` | auto — « vérifie », « ça compile ? », après un fix | `pnpm verify` : 4 checks + reçu |
| `commit-push` | auto — « commit », « push », « envoie » | Checks (sans les rejouer) + changelog + commit + push |
| `wrap-up` | auto — « on a fini », « c'est bouclé » | Capture les apprentissages de fin de chantier : conventions, ADR, registry |
| `conventions` | auto — question sur une règle, sans fichier touché | Répond depuis `.method/conventions/` en citant la source |
| `audit` | demande explicite d'audit large | Confronte la **codebase existante** aux conventions, par lots |
| `plan` | **explicite uniquement** | Cadrage : refus / story seule / évolution / initial |

`revue` audite un **diff**, `audit` audite **l'existant** — du code écrit avant les conventions,
que personne n'a relu depuis. Mêmes sources citables, même barème de gravité.

`plan` ne s'auto-déclenche jamais (`disable-model-invocation`) : un cadrage réécrit PRD,
architecture et stories. Face à un besoin produit large, le **proposer** et attendre l'accord.

## Qui exécute : Fable pilote, Opus écrit

Le **modèle de la session** décide du rôle, pas la taille de la demande.

- **Session Fable** — Fable ne modifie **jamais** `src/` ni `tests/` lui-même. Il découpe le
  travail en lots indépendants, écrit pour chacun les critères vérifiables, lance des `Agent`
  avec `model: "opus"` — tous dans le même message quand les lots ne se touchent pas, pour
  qu'ils tournent en parallèle — puis relit les diffs, arbitre, et porte la finalisation :
  review, changelog, registry, `commit-push`. Restent à sa main : `docs/`, `.method/`, les
  vérifications, les décisions.
- **Session Opus** — pas de délégation imposée : Opus écrit lui-même, et délègue quand un lot
  est réellement parallélisable, pas par principe.
- **`model: "opus"` s'écrit explicitement** sur chaque `Agent` lancé depuis une session Fable :
  sans ce champ le sous-agent hérite du modèle du parent, et le pilotage ne sert à rien.
- **Un sous-agent reçoit la méthode, pas seulement la tâche** : échelle annoncée, conventions
  routées à charger, critères de succès, interdiction de commiter, **interdiction de trancher un
  arbitrage** — il s'arrête et le remonte, le pilote pose la question via `AskUserQuestion`
  (§ Avant de coder). Dès l'échelle Standard, il produit son **rayon d'impact** dans son rapport.
  Le commit reste au pilote.
- **Un lot UI reçoit en plus** : la convention `ui-patterns.md` et `docs/design/system.md`
  (§ Direction, § Patterns de page) à lire, le registry, les AC par largeur d'écran, et
  l'obligation de lancer `pnpm ui:shots <routes>` et de décrire chaque capture (375 et 1280,
  clair et sombre) dans son rapport. Un rapport de lot UI sans captures décrites est incomplet.

## Modifications documentaires

Éditer `docs/`, `.method/` ou `README.md` sans toucher au code ne déclenche **aucun skill** :
`dev` s'en exclut, `revue` ne review pas de la prose, `conventions` répond mais n'écrit pas.
C'est volontaire — mais trois règles s'appliquent quand même, et personne d'autre ne les porte :

1. **Écrire dans `.method/`, `docs/` et `CLAUDE.md` ne demande aucun accord préalable** —
   conventions, checklists et ADR compris. En contrepartie, **aucune écriture n'est silencieuse** :
   le récap nomme le fichier, la section, et la règle en une phrase. Sans cette annonce, une règle
   ajoutée sera lue comme vraie par toutes les sessions suivantes sans que personne ne l'ait vue
   passer. Une règle qui en contredit une existante la **remplace** ; elle ne s'empile pas à côté.
2. **`pnpm check:framework`** reste dû : le routing, les citations et les références de skills se
   vérifient sur les documents, pas sur le code. Un glob mort ou un `§` inexistant ne se voit
   qu'ici.
3. **Une entrée de changelog** seulement si la modification change ce qu'un lecteur doit faire.
   Une reformulation n'en mérite pas.

`docs/changelog.md`, `.method/sprint/`, `docs/stories/`, `docs/decisions/` et le registry sont
exclus du reçu de vérification : les éditer n'invalide pas des checks déjà passés.

## Vérifier, commiter, pousser

- **Pendant l'implémentation :** `pnpm type-check` seul, à chaque itération.
- **Une fois terminé :** `pnpm verify` — les 4 checks (`check:framework`, `type-check`, `lint`, `test`) **et** l'écriture du reçu. Ne jamais lancer les 4 commandes séparément.
- **Diff UI :** `pnpm ui:shots <routes touchées>` avant la review, hors reçu (il démarre un serveur). Les captures sont lues et citées par `revue`, elles ne sont pas versionnées.
- **Pour commiter :** skill `commit-push`. Il lance `pnpm verify:cached`, qui ne rejoue les checks que si le code a bougé depuis le dernier passage.
- **C'est un gate appliqué, pas une convention.** `.claude/hooks/enforce-git-gate.mjs` bloque tout `git commit` / `git push` direct, et refuse un commit dont le reçu ne couvre pas l'état exact du code. `--no-verify` et `--force` sont bloqués sans échappement possible.
- **Worktree.** Le gate juge un commit sur le reçu du dépôt que la commande vise (`cd <dir> &&` en tête, ou `git -C <dir>`) : lancer `pnpm verify` puis `git commit` DANS le worktree. Le hook qui s'exécute est celui du checkout de la session : si sa copie est antérieure à ce correctif, ouvrir la session dans le worktree. Pour une branche sans commit, avancer par `git stash -u` → `git reset --hard main` → `git stash pop`.
- La CI ne lance que `pnpm build` — validation Vercel et erreurs spécifiques à Linux. Pas de duplication avec le local.

## Invariants techniques

Le détail vit dans les conventions routées ; ces cinq points s'appliquent partout et ne se
déduisent d'aucun chemin de fichier.

1. **Server Components par défaut.** `"use client"` seulement pour state, effets ou event handlers, et poussé le plus bas possible dans l'arbre.
2. **Server Actions pour les mutations.** Pas de Route Handler sauf webhook ou cron. Chaque action : auth → Zod → exécution → revalidation → `{data}` ou `{error}`.
3. **Un schema Zod = une source de vérité**, partagé entre le formulaire et l'action.
4. **RLS activée sur toute table**, sans exception non documentée par un ADR. Auth revérifiée dans chaque Server Action — le middleware ne suffit pas.
5. **Parité web ↔ MCP par services partagés.** Toute capacité métier = une fonction dans `src/lib/services/`, appelée par le canal web (Server Action pour une mutation, Server Component pour une lecture) ET par le tool MCP, adaptateurs fins. Jamais de logique métier dans un tool ni dans une action.

Route groups : un groupe (`(dashboard)`) avec un `layout.tsx` doit avoir au moins un `page.tsx`,
et **deux `page.tsx` ne doivent jamais résoudre le même chemin** une fois les segments `(...)`
retirés — Next ne le signale pas, il en choisit un en silence.

## Design system

Thème **neutre, à personnaliser par projet** : bloc « THÈME PROJET » de `src/app/globals.css`
(story de setup). Tailwind v4 CSS-first (pas de `tailwind.config.ts`), dark mode class-based
(next-themes), icônes Phosphor. Documentation dans `docs/design/system.md`, preview sur la route
`/design-system`.

- **Réutiliser avant de créer** : `.method/conventions/component-registry.md` puis `src/components/ui/`.
- **Classes sémantiques uniquement** (`bg-primary`, `text-muted-foreground`, `border-border`). Aucune couleur Tailwind numérotée (`bg-emerald-500`), aucun hex, aucun `dark:` de couleur dans `src/` (`check:framework`).
- **Mobile d'abord, trois largeurs, deux thèmes.** Un écran est terminé quand ses captures à 375, 768 et 1280 px, en clair et en sombre (`pnpm ui:shots <route>`), ont été lues et citées en review. Composition, responsive, texte et signatures IA : convention `ui-patterns.md`, tag `ui`, routée sur tout composant et toute page.
- **Aucun tiret cadratin dans une chaîne visible** (`check:framework`). *(Décision JB 2026-10-09.)*

## Workflow

1. Déterminer l'échelle (Micro / Standard / Module).
2. Charger les conventions routées par globs, plus les tags de la story si applicable. **Annoncer la liste.**
3. Story : la lire entièrement, passer `.method/checklists/story-ready.md`, lire la référence UI si ≠ `N/A`. Sinon : reformuler en critères vérifiables et, dès l'échelle Standard, proposer le plan avant d'éditer.
4. Implémenter : migration DB → schemas Zod → Server Actions + tests → composants + tests → page + tests d'intégration.
5. Appliquer les garde-fous conditionnels.
6. `pnpm verify`.
7. Review — inline en Micro, skill `revue` dès Standard. Tout problème HAUTE ou MOYENNE **cite sa source** (`conventions/<fichier>.md § <section>`, `CLAUDE.md § <section>`, `checklists/code-review.md § <section>`, ou un AC). Sans source : BASSE, non bloquant.
8. Finaliser selon l'échelle : changelog · registry · post-implémentation · sprint status · ADR.
9. `commit-push`.

## Quand le PRD évolue

1. Modifier `docs/prd.md` — parcours concerné, statut 🔶 Draft.
2. Passer `.method/checklists/prd-evolution.md`.
3. Identifier les impacts **réels** : parcours, référence UI, architecture, epics, stories, DB. Ne pas cascader par principe.
4. Mettre à jour `docs/architecture.md`, plus un ADR si un invariant est touché.
5. Mettre à jour les epics et stories impactées, créer uniquement les nouvelles.
6. Ajouter une entrée dans `docs/changelog.md`.

Un changement qui ne touche ni parcours ni modèle de données ne relève pas d'une évolution de
PRD : passer directement en implémentation.
