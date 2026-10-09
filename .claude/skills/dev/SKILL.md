---
name: dev
description: "Écrire ou explorer du code en respectant les conventions du projet : conventions routées par globs, implémentation, tests, vérification, review, finalisation."
when_to_use: "Avant toute modification de code applicatif — correction de bug, ajout de fonctionnalité, réorganisation, implémentation de story — et pour toute exploration read-only du code. NE PAS déclencher pour une modification purement documentaire (docs/, .method/, README) : voir CLAUDE.md § Modifications documentaires. NE PAS déclencher pour répondre à une question sans toucher au code : c'est le skill conventions. NE PAS déclencher sur 'audite' ou 'passe le projet en revue' : c'est le skill audit."
argument-hint: "[E01-S01 | next | description de ce qu'il faut faire]"
paths:
  - "src/**"
  - "tests/**"
  - "supabase/**"
  - "*.config.{ts,js,mjs}"
  - "package.json"
---

# dev — Écrire du code

Deux modes seulement. **Lecture** (aucune écriture) ou **écriture**. Tout le reste — l'ampleur
du process — est déterminé par l'**échelle du changement**, pas par les mots employés dans la
demande.

Si la demande contient `comprends`, `explique`, `analyse`, `explore`, `lis`, `où est` → mode
lecture. Sinon, mode écriture.

`audit` n'est **pas** dans cette liste : le mot appartient au skill `audit`, qui confronte
l'existant aux conventions par lots. Ce mode-ci décrit un code, il ne le juge pas.

---

## Mode lecture — read-only strict

Aucune écriture, aucun type-check, aucune review, aucun changelog. Lire les fichiers concernés,
les conventions correspondantes (pour savoir ce qui *devrait* être respecté), puis répondre :

vue d'ensemble · entrées/sorties · flow principal avec `fichier:ligne` · dépendances internes et
externes · points d'attention (dettes, complexités, écarts aux conventions) · fichiers clés.

Si l'utilisateur veut agir ensuite, il le demandera — ne pas enchaîner sur une implémentation.

---

## Mode écriture

### 1. Déterminer l'échelle

L'échelle se lit sur **ce que le changement touche**, pas sur la façon dont il est formulé.
En cas de doute entre deux échelles, prendre la plus haute et le dire.

| Échelle | Reconnaissance | Process |
|---------|----------------|---------|
| **Micro** | 1-2 fichiers, aucune nouvelle surface (pas de route, table, Server Action ou dépendance nouvelle) | conventions → implémentation → type-check → **review inline** (pas de rapport) |
| **Standard** | 3-5 fichiers, ou création d'une fonction / composant / action | + tests écrits avec le code → **review complète** (skill `revue`) → changelog |
| **Module** | nouvelle surface (route, table, parcours), changement DB, ou ≥ 6 fichiers | **proposer une story avant de coder** → tout le Standard → registry → ADR si invariant → sprint status |

**Micro** ne veut pas dire « sans garantie » : les conventions sont chargées et le type-check
tourne. Ce qui disparaît, c'est le cérémonial (rapport de review, entrée de changelog pour un
changement invisible), pas la vérification.

**Module** : proposer une story, ne pas l'imposer. Formuler :
> « Ça touche [surface] sur [n] fichiers — je propose d'écrire une story d'abord (`plan`,
> niveau « story seule » : AC et tests attendus, sans toucher au PRD). Les AC servent ensuite
> de critère de review. Sinon je code directement. »

Si l'utilisateur refuse : **rester en Module sans story**, ne pas rétrograder en Standard.
L'échelle est déterminée par ce que le changement touche, pas par la réponse à une question.
Ce qui disparaît avec la story, ce sont les seules obligations qui en dépendent :
post-implémentation et sprint status. **Registry, ADR et changelog restent dus.**

La review perd alors ses AC : elle ne peut plus statuer « AC non livré ». Le dire à ce
moment-là, pas après.

### 2. Charger le contexte

**Toujours** — lire `.method/conventions/_index.md`, charger la convention de base
(`coding-standards.md`) puis les conventions dont un tag est activé par les **globs** des
fichiers visés. **Annoncer la liste chargée.**

Le registry (`registry`) et la stack (`stack`) sont routés comme les autres : ils se chargent
quand le diff touche ce qu'ils couvrent, pas à chaque changement d'une ligne.

**Si une story pilote le travail** (`E01-S01` ou `next` → `.method/sprint/status.md`) — lire la
story, vérifier `.method/checklists/story-ready.md`, ajouter les tags de son champ `Conventions`
(union avec les globs), lire sa référence UI **si elle n'est pas `N/A`**.

**Sinon** — reformuler la demande en **critères de succès vérifiables** (test qui reproduit,
assertion qui valide, type-check qui passe). Les ambiguïtés se posent via `AskUserQuestion`
avec le contexte pour trancher (`CLAUDE.md § Avant de coder`) : ne pas trancher en silence, ne
pas trancher en prose. À partir de l'échelle Standard, **proposer le plan avant d'éditer**.

Lire `docs/architecture.md` uniquement sur les sections concernées.

### 2 bis. Rayon d'impact — dès Standard, avant la première ligne

Dans la story (section « Rayon d'impact », gate `story-ready.md`) ou dans le plan proposé en
live. Quatre items, tous observables (`CLAUDE.md § Avant de coder`) :

1. **Appelants** — pour chaque fonction, table, colonne, composant, Server Action modifié : la
   commande de recherche citée (chemin absolu), les usages trouvés, ce qui change pour chacun.
   « Aucun autre appelant » se prouve par la commande, jamais par affirmation.
2. **Doublons** — ce qui fait déjà la même chose (`component-registry.md` + recherche sur le
   concept) ; verdict réutiliser / fusionner / laisser, et pourquoi.
3. **Effet produit** — quel parcours voit une différence hors de l'écran modifié : autre route
   ou layout partagé, Server Action appelée ailleurs, policy RLS, webhook ou cron, email
   transactionnel, export / sitemap / SEO. Un projet dérivé de ce template remplace cette liste
   par ses propres systèmes (`CLAUDE.md § Projet`).
4. **Refacto** — proposé ou écarté. Proposé ⇒ `AskUserQuestion` avec coût et conséquence de ne
   pas le faire. Le refacto reste non fait sans accord ; il n'est jamais tu.

Micro en est exempt (1-2 fichiers, aucune surface nouvelle). Un sous-agent produit ce rayon dans
son rapport et **remonte** l'item 4 sans le trancher.

### 3. Implémenter

Ordre quand plusieurs couches sont touchées : migration DB → schemas Zod → Server Actions +
tests unit → composants + tests unit → page + tests d'intégration → E2E si demandé.

**Tag `ui` actif** (composant, page, layout, widget) : écrire la **lecture de design** d'une
ligne avant le premier composant, dans le plan ou la story (`ui-patterns.md § Lecture de
design`), en lisant `docs/design/system.md` § Direction et § Patterns de page. Une fois
l'écran rendu : `pnpm ui:shots <routes touchées>`, ouvrir les captures 375 et 1280 en clair et
en sombre, corriger ce qu'elles montrent **avant** la review. Les captures sont ce que `revue`
relit (`code-review.md § Preuve visuelle`).

Placement des tests (`testing-strategy.md`) : `tests/unit/` · `tests/integration/` · `tests/e2e/`.

**Edits chirurgicaux** : chaque ligne changée trace à la demande. Pas de cleanup adjacent, pas de
reformatage opportuniste. Dead code repéré → le mentionner, pas le supprimer. Un refacto repéré
n'est pas un refacto fait : il se nomme dans le rayon d'impact (§ 2 bis) et devient une question,
pas un silence.

### 4. Garde-fous conditionnels

Ils se déclenchent sur la **nature réelle** du travail, quel que soit le vocabulaire employé.

**Le travail corrige un comportement cassé** → écrire d'abord un test qui reproduit le bug et
qui échoue. Pas de fix sans test de non-régression.

**Le travail ne doit rien changer au comportement observable** (réorganisation, extraction,
renommage) → lire les tests existants **avant** de toucher au code · les tests doivent être
**identiques avant/après** — un test modifié signifie un comportement modifié, donc ce n'est
plus une réorganisation · si la zone n'est pas testée, écrire les tests **avant**.

### 5. Vérifier

**Pendant l'implémentation :** `pnpm type-check` seul, à chaque itération. Max 3 cycles, au-delà
remonter le blocage.

**Une fois l'implémentation terminée :** `pnpm verify` (les 4 checks + écriture du reçu). Ne pas
lancer les commandes séparément — seul `pnpm verify` écrit le reçu qui évitera à `commit-push`
de tout rejouer sur du code identique.

### 6. Reviewer

- **Micro** : review inline — relire le diff contre les conventions chargées, signaler ce qui
  cloche. Pas de rapport formaté.
- **Standard et Module** : skill `revue`. ❌ CHANGES REQUESTED → corriger HAUTE et MOYENNE →
  `verify` → re-reviewer. Les BASSE sont signalées, jamais appliquées sans accord.

Au-delà de 2 cycles sans converger → s'arrêter et remonter à l'utilisateur.

### 7. Finaliser

| | Micro | Standard | Module |
|---|---|---|---|
| `docs/changelog.md` | si comportement visible | oui | oui |
| `component-registry.md` | — | si composant réutilisable | oui |
| Story post-implémentation | — | si story | si story |
| `.method/sprint/status.md` | — | si story | si story |
| ADR `docs/decisions/` | — | si invariant touché | si invariant touché |

En mode story, passer `.method/checklists/story-done.md` avant de basculer la story en ✅ Done.

Le commit et le push passent par le skill `commit-push` — un `git commit`/`git push` direct est
bloqué par le hook.

---

## Artefacts optionnels

**Aucun artefact n'est obligatoire. Son absence est déclarée, pas subie.** Pas de maquette, pas
de story, pas de Supabase, pas de design system personnalisé : le travail se fait quand même.
Une référence UI à `N/A` n'est jamais un défaut et la review ne la pénalise pas — elle retire
simplement le critère « conforme à la maquette ».

## Règles transverses

- Conventions chargées et type-check : **à toutes les échelles**, sans exception
- Vérifier le component-registry **avant** de créer un composant
- Server Components par défaut, `"use client"` poussé le plus bas possible
- Un schema Zod = une source de vérité (form + action)
- RLS sur toute nouvelle table
- Les 3 états UI gérés : loading, error, empty
- Pas d'abstraction prématurée — factoriser à partir de 2 occurrences
- Toute surface nouvelle porte ce qui casse sans elle aujourd'hui, et le récap nomme l'option
  d'un cran plus simple écartée (`CLAUDE.md § Justifier une surface nouvelle`)
