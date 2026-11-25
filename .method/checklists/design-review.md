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
- [ ] Ce qui sert la tâche fréquente est plus visible que ce qui sert la tâche rare ou destructive ; aucun geste rare, d'administration ou destructif au niveau de l'usage courant (`ui-patterns.md § Principes UX`)
- [ ] Un seul objet à l'écran, celui que nomme le brief ; toute seconde liste ou entité visible est justifiée dans le brief (`ui-patterns.md § Principes UX`)
- [ ] Seule l'exception porte un marqueur : l'état par défaut n'a ni badge, ni icône, ni couleur (`ui-patterns.md § Principes UX`)
- [ ] Titres de section lisibles : couleur de premier plan, graisse visible, aucun sur-titre pâle (`ui-patterns.md § Composition`)

## Fiches et gestes

- [ ] Geste rare ou destructif sur l'objet : icône au survol et au focus, infobulle qui nomme l'effet, confirmation qui liste les effets (`ui-patterns.md § Fiches et gestes sur l'objet`)
- [ ] Un contrôle révélé au survol ne déplace rien : captures avec et sans survol superposables (`ui-patterns.md § Responsive`)
- [ ] Tout bouton d'action porte icône + libellé ; un geste principal, les autres groupés, les destructifs à part en bas de fiche (`ui-patterns.md § Icônes`, `ui-patterns.md § Fiches et gestes sur l'objet`)
- [ ] Badges d'état en grille dense : icône seule, une forme par état, sens en infobulle et nom accessible (`ui-patterns.md § Icônes`)
- [ ] Tiroir de détail de l'ordre de 560 px à 1280, en-tête avec visuel, nom, une ligne de contexte, état (`ui-patterns.md § Fiches et gestes sur l'objet`)
- [ ] Une information tient sur une ligne quand elle le peut ; propriétaire et partage en avatars ou icônes (`ui-patterns.md § Fiches et gestes sur l'objet`)
- [ ] Liste de capacités : une ligne par groupe, repliée par défaut, nombre à droite ; aucune card étroite où le texte passe à la ligne (`ui-patterns.md § Fiches et gestes sur l'objet`)
- [ ] Choix à 2 ou 3 options : contrôle segmenté, actif sobre, libellés qui disent le choix ; aucun contrôle quand une seule option existe (`ui-patterns.md § Fiches et gestes sur l'objet`)
- [ ] Formulaire de création : aucun champ qui a un bon défaut et se change après (`ui-patterns.md § Principes UX`)

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
- [ ] Le cas exact du signalement est capturé et résolu ; les parcours du brief (variantes, plafond, bloqué, recherche vide) ont chacun leur capture (`ui-patterns.md § États`)

## Texte

- [ ] Libellés dans le vocabulaire de l'utilisateur : aucun état interne, nom de fonction, identifiant ni compteur sans objet ; termes du vocabulaire décidé, aucun renommage sans arbitrage (`ui-patterns.md § Principes UX`)
- [ ] Une intention = un libellé sur tout l'écran ; boutons en verbe d'action concret
- [ ] Aucune contradiction dans la vue : promesses, état vide, compteurs et états concordent (`ui-patterns.md § Texte visible`)
- [ ] Toute phrase sur un comportement du moteur a sa règle lue, citée dans le brief (`ui-patterns.md § Texte visible`)
- [ ] Aucune explication de l'évidence ; accords singulier et pluriel justes (`ui-patterns.md § Texte visible`)
- [ ] Aucun texte de remplissage, aucune signature de `ui-patterns.md § Signatures IA`

## Mobile et thèmes

- [ ] À 375 : aucune troncature qui cache une information utile, action primaire atteignable au pouce
- [ ] En sombre : même hiérarchie qu'en clair (rien ne disparaît, rien ne crie)

## Conformité au brief

- [ ] La version servie est celle du diff : un élément propre au diff est repéré sur la capture avant toute critique (`ui-patterns.md § Preuve visuelle`)
- [ ] Chaque critère d'acceptation design du brief est vérifié sur une capture citée
- [ ] Chaque dérive entre la spécification ou la maquette validée et l'écran réel est listée ; tout écart au brief est soit justifié par l'implémenteur, soit un finding
- [ ] Les données de la maquette et des captures sont cohérentes entre elles : aucun état ni compteur qui en contredit un autre

## Gravité

| Gravité | Quand |
|---------|-------|
| HAUTE | Critère d'acceptation du brief non tenu, tâche principale illisible, action primaire absente ou concurrencée, duplication d'une donnée ou d'une action, contradiction de texte ou de données dans une vue (maquette comprise) |
| MOYENNE | Une autre case de cette grille cochée « non », avec sa section citée |
| BASSE | Avis sans source : proposé, jamais bloquant |

Verdict : `APPROVED` si 0 HAUTE et 0 MOYENNE, sinon `CHANGES REQUESTED`.
