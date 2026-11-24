# Design review — grille du `design-critic`

<!--
  Lue par le sous-agent `design-critic` (skill `design`, étape critique), et citée par `revue`.
  Elle juge une UI LIVRÉE, sur captures, contre le brief et l'existant : pas le code (c'est
  `revue`, conventions routées), pas la conformité mécanique (c'est `check:framework`).
  Chaque finding cite `checklists/design-review.md § <section>`, une règle de `ui-patterns.md`,
  ou un critère d'acceptation design du brief. Sans source : BASSE, non bloquant.
-->

## Tâche et hiérarchie

- [ ] En 5 secondes sur la capture 1280, on dit à quoi sert l'écran et quelle est son action principale
- [ ] Une seule action primaire visible par écran ou par zone autonome (dialog, sheet)
- [ ] L'ordre de lecture (haut-gauche vers bas-droite, puis mobile de haut en bas) suit l'ordre d'usage
- [ ] Ce qui sert la tâche fréquente est plus visible que ce qui sert la tâche rare ou destructive

## Intégration

- [ ] La fonctionnalité ajoutée ne crée pas une zone qui duplique une donnée ou une action déjà présente
- [ ] Aucun seuil de `ui-patterns.md § Intégrer une fonctionnalité` n'est franchi sans réorganisation
- [ ] L'action se trouve à côté de l'objet qu'elle modifie, pas dans une barre générique éloignée
- [ ] Ce que le brief disait de retirer ou déplacer a disparu de l'ancien emplacement (capture avant/après)
- [ ] L'écran après n'est pas l'écran avant plus une boîte : si c'est le cas, le verdict du brief était faux et le finding le dit

## Cohérence avec l'existant

- [ ] Un même concept a la même représentation que dans le reste de l'app : composant, libellé, icône, position
- [ ] Aucun pattern nouveau quand un pattern de l'app ou de `/design-system` couvre le besoin
- [ ] Espacements, tailles de titres et densité identiques aux écrans voisins (comparer aux captures avant)
- [ ] Le type d'écran suit son pattern de `docs/design/system.md § Patterns de page`

## États et retours

- [ ] Vide, chargement, erreur, pending existent et sont conçus (texte utile, action pour sortir de l'état)
- [ ] Toute action a un retour visible à l'endroit où l'utilisateur regarde
- [ ] Ce qui ne peut pas réussir est empêché avant d'échouer (contrainte, désactivation avec raison visible)

## Texte

- [ ] Libellés dans le vocabulaire de l'utilisateur, pas du modèle de données ni du code
- [ ] Une intention = un libellé sur tout l'écran ; boutons en verbe d'action concret
- [ ] Aucun texte de remplissage, aucune signature de `ui-patterns.md § Signatures IA`

## Mobile et thèmes

- [ ] À 375 : aucune troncature qui cache une information utile, action primaire atteignable au pouce
- [ ] En sombre : même hiérarchie qu'en clair (rien ne disparaît, rien ne crie)

## Conformité au brief

- [ ] Chaque critère d'acceptation design du brief est vérifié sur une capture citée
- [ ] Tout écart au brief est soit justifié par l'implémenteur, soit un finding

## Gravité

| Gravité | Quand |
|---------|-------|
| HAUTE | Critère d'acceptation du brief non tenu, tâche principale illisible, action primaire absente ou concurrencée, duplication d'une donnée ou d'une action |
| MOYENNE | Une autre case de cette grille cochée « non », avec sa section citée |
| BASSE | Avis sans source : proposé, jamais bloquant |

Verdict : `APPROVED` si 0 HAUTE et 0 MOYENNE, sinon `CHANGES REQUESTED`.
