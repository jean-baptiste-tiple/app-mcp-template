---
name: design
description: "Vision produit pour tout changement visible : brief de design par le sous-agent designer AVANT le code (existant capturé, zoom arrière, options dont la plus petite, spécification), puis critique sur captures par le sous-agent design-critic APRÈS, en boucle courte jusqu'à APPROVED."
when_to_use: "Dès l'échelle Standard, avant d'implémenter un changement visible : écran ou route nouvelle, fonctionnalité ajoutée à un écran existant (bouton, colonne, encart, champ, onglet), écran ou parcours repensé, story avec écran. Aussi sur demande : 'design', 'repense', 'intègre au mieux', 'comment l'intégrer', 'propose une UI'. NE PAS déclencher en Micro (libellé, espacement, couleur d'un composant existant : une ligne de lecture de design suffit, ui-patterns.md § Lecture de design), ni sur un changement sans rendu (service, Server Action seule, tool MCP sans widget)."
argument-hint: "[E01-S03 | description de la fonctionnalité ou de l'écran]"
---

# design — penser le produit avant de le coder, le juger après

L'agent qui code une fonctionnalité lui cherche une place ; il ne se demande pas si l'écran la
supporte encore, et il juge ses propres captures avec l'intention qu'il avait en tête. Ce skill
sépare les trois rôles : un **designer** pense avant, un **implémenteur** code (skill `dev`), un
**critique** à contexte neuf juge après. Aucun des deux sous-agents n'écrit de code ni de fichier.

Il complète `dev` et `revue`, il ne les remplace pas : `revue` confronte le code aux conventions,
`design` confronte l'expérience à la tâche de l'utilisateur et à l'existant.

## Étape 1 — Brief (avant la première ligne de code)

1. **Entrées** : la demande ou la story ; les routes touchées (route neuve : l'écran voisin le
   plus proche). Si `docs/design/system.md § Direction` est vide, le dire au designer : il
   travaille alors sur la direction du thème neutre.
2. **Lancer l'agent `designer`** (`Agent`, `subagent_type: "designer"` ; modèle et outils fixés
   par `.claude/agents/designer.md`) avec : la demande telle que formulée, la story si elle existe, les routes, et ce que le pilote
   sait déjà du contexte produit. Il capture l'existant lui-même.
3. **Relire le brief** contre `.method/templates/design-brief.tmpl.md` : existant capturé et
   inventorié, verdict de zoom arrière motivé, au moins deux options dont la plus petite, texte
   exact, critères d'acceptation design vérifiables sur capture. Un brief incomplet repart au
   designer (`SendMessage`), une fois.
4. **Arbitrages** : verdict `repenser l'écran`, options qui mènent à un travail matériellement
   différent, ou écart à la § Direction : question via `AskUserQuestion` (une option par
   proposition du brief, conséquence et coût, recommandation en premier). Jamais tranché en
   prose (`CLAUDE.md § Avant de coder`).
5. **Écrire le brief** :
   - mode story : section « Design » de la story (`docs/stories/`) ;
   - mode live : dans le plan proposé, puis transmis **tel quel** au lot qui implémente.

## Étape 2 — Implémentation

Par le skill `dev` (ou un agent `implementer` si le pilote délègue). Le lot reçoit le brief en entier, avec la consigne : tout écart au brief se
justifie dans le rapport, il ne se fait pas en silence. Ses captures après restent dues
(`CLAUDE.md § Qui exécute`).

## Étape 3 — Critique (après le rendu)

1. **Lancer l'agent `design-critic`** (`Agent`, `subagent_type: "design-critic"`) avec : le brief complet, les routes, les chemins des captures avant, la liste
   des fichiers modifiés. **Ne pas lui transmettre** le raisonnement de l'implémenteur : son
   contexte neuf est ce qui le rend utile.
2. **CHANGES REQUESTED** : HAUTE et MOYENNE corrigées par l'implémenteur (même lot, `SendMessage`),
   puis nouvelle critique. Un finding qui met en cause le brief lui-même repart au `designer`,
   et devient une question si le verdict d'intégration change.
3. **Deux cycles au plus.** Au-delà, s'arrêter et poser la question à l'utilisateur avec les
   findings restants. Les BASSE sont listées à l'utilisateur, jamais appliquées d'office.

## Trace

- Le rapport de `revue` porte la ligne `Design : <verdict du critique>, <n> cycle(s), brief en
  <story § Design | plan>` (`code-review.md § Preuve visuelle`).
- Mode story : la section « Post-implémentation » note les écarts au brief et leur raison.
- Une règle de design inventée en route s'écrit dans `ui-patterns.md` ou
  `checklists/design-review.md` et s'annonce (`CLAUDE.md § Après une erreur`).
