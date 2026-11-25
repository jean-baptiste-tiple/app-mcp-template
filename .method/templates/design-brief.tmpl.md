# Brief de design — [fonctionnalité ou écran]

<!-- Produit par le sous-agent `designer` (skill `design`), AVANT la première ligne de code.
     Mode story : collé dans la section « Design » de la story. Mode live : dans le plan, puis
     transmis tel quel au lot qui implémente et au sous-agent `design-critic`.
     Règles : `ui-patterns.md` (§ Intégrer une fonctionnalité, § Principes UX), direction et
     patterns de `docs/design/system.md`, composants de `component-registry.md`. -->

## 1. Problème et utilisateur

- **Qui** : persona, contexte d'usage (bureau, terrain, mobile), fréquence.
- **Tâche** : ce que l'utilisateur cherche à accomplir, en une phrase, avec son verbe à lui.
- **Succès** : à quoi l'utilisateur voit que c'est fait.
- **Signalement** : le cas exact rapporté (données, état, largeur, citation ou capture), dessiné
  en premier ; « aucun » pour une fonctionnalité neuve.
- **Objet de l'écran** : l'objet unique que l'utilisateur pense ; toute seconde liste ou entité
  visible, avec sa justification (`ui-patterns.md § Principes UX`).
- **Vocabulaire décidé** : les termes affichés qui font foi, et ceux qui ne se renomment pas
  sans arbitrage.

## 2. Existant

- **Captures avant** : chemins `.claude/design-shots/<sujet>/brief/<route>__375__light.png`,
  `__1280__light.png` (ou, pour une route neuve, l'écran voisin le plus proche), copiés depuis
  `.ui-shots/` (`ui-patterns.md § Preuve visuelle`).
- **Ce que l'écran fait déjà** : tâche principale, action primaire, zones (dans l'ordre de lecture),
  composants utilisés.
- **Patterns déjà présents dans l'app** pour ce besoin (commande de recherche citée) : à réutiliser.

## 3. Zoom arrière

- **L'écran dit-il encore en une phrase à quoi il sert, une fois la fonctionnalité ajoutée ?**
- **Seuils franchis** (`ui-patterns.md § Intégrer une fonctionnalité`) : lesquels, ou « aucun ».
- **Verdict** : `ajouter` / `réorganiser l'encart` / `repenser l'écran`, et pourquoi.

## 4. Options

Au moins deux, dont l'option la plus petite (passer par un composant existant, ne rien ajouter
de visible). Pour chacune : ce que voit l'utilisateur, ce qui change à l'écran, coût, risque.

| Option | Ce que voit l'utilisateur | Ce qui est ajouté / déplacé / retiré | Coût | Risque |
|--------|---------------------------|---------------------------------------|------|--------|

**Recommandation** et raison. Si le verdict est `repenser l'écran`, ou si les options mènent à un
travail matériellement différent : **arbitrage à poser** (le pilote pose la question).

## 5. Spécification retenue

- **Hiérarchie** : zones dans l'ordre de lecture, action primaire unique, actions secondaires et
  où elles vivent (en ligne, menu `…`, sheet).
- **Ce qui est retiré ou déplacé** de l'existant.
- **Composants** : ceux du registry réutilisés ; tout composant nouveau avec ce qui casse sans lui.
- **Parcours couverts** : le cas du signalement d'abord, puis variantes, plafond, bloqué,
  chargement, vide (premier usage), erreur, pending, recherche vide : ce que chacun affiche
  (`ui-patterns.md § États`).
- **Mobile (375)** : comportement de chaque zone ; action primaire visible sans scroll si
  formulaire court.
- **Texte exact** : titres, libellés de boutons, messages vide/erreur, dans le vocabulaire de
  l'utilisateur. Toute phrase sur un comportement du moteur cite la règle lue (chemin du
  service ou de la policy, `ui-patterns.md § Texte visible`).

## 6. Critères d'acceptation design

Vérifiables sur capture, repris par le `design-critic` :

- [ ] À 1280 clair, l'œil tombe d'abord sur [élément] ; une seule action primaire visible.
- [ ] À 375, [zone] [s'empile / passe en sheet] ; [action primaire] visible sans scroll.
- [ ] L'état vide affiche [titre] et [action pour en sortir].
- [ ] [Élément déplacé ou retiré] n'apparaît plus à [ancien emplacement].

## 7. Demandes au moteur

Ce que l'écran demande et que le moteur ne fournit pas aujourd'hui (donnée, champ, règle,
droit), un par ligne, avec sa question de confidentialité : qui voit quoi, ce qui sort de
l'organisation. Vide si aucune.

## 8. Arbitrages

Décisions qui reviennent à l'utilisateur, avec par option la conséquence et le coût. Vide si aucune.
