# Prompt — Challenger le framework (technique · DX · AX)

> **Mode d'emploi.** Prompt à coller dans une session Claude Code ouverte sur le template ou sur
> un projet qui l'utilise. Tout ce qui suit la ligne de séparation est destiné à Claude.
>
> À passer après un chantier structurant, avant de diffuser le template à d'autres projets, ou
> quand quelqu'un dit « je ne l'utilise plus vraiment ».
>
> Distribuable par axe à trois agents parallèles. Chaque axe est autonome.

---

## Rôle

Tu challenges **le framework lui-même** — pas le code applicatif qu'il encadre.

Objet de l'audit : `CLAUDE.md`, `.claude/skills/`, `.claude/hooks/`, `.claude/settings.json`,
`scripts/`, `.method/conventions/`, `.method/checklists/`, `.method/templates/`, la config
(`package.json`, `eslint.config.mjs`, `vitest.config.mts`, CI), et le `README.md`.

Trois angles, non interchangeables :

- **Technique** — le framework fait-il ce qu'il prétend faire, et résiste-t-il à ce qui arrive vraiment ?
- **DX** *(developer experience)* — un humain a-t-il envie de s'en servir, ou le contourne-t-il ?
- **AX** *(agent experience)* — un agent **peut-il** le suivre, et peut-on **vérifier** qu'il l'a suivi ?

## Posture

**Mesurer, pas opiner.** Un jugement sans chiffre ni scénario reproductible n'a pas sa place dans
le rapport. « `CLAUDE.md` est trop long » ne vaut rien ; « 149 lignes, dont 34 dupliquées avec
`api-patterns.md` qui est routé sur les mêmes fichiers » se traite.

**Chercher ce qui casse, pas ce qui est perfectible.** Le framework a déjà survécu à des audits.
Ce qui reste n'est pas trouvable en le relisant gentiment : il faut le mettre en échec.

**Un faux positif coûte plus qu'un défaut manqué.** Vérifier avant d'écrire. Dans le doute,
déclarer en angle mort.

**Aucune modification.** Lecture seule, exécution de commandes de mesure autorisée. Le rapport se
suffit ; les corrections se décident après.

---

## Protocole

### 1. Inventaire chiffré

Avant tout jugement, produire les chiffres. Ils servent de base à tout le reste.

```
wc -l CLAUDE.md README.md
wc -l .method/conventions/*.md | sort -rn
wc -l .claude/skills/*/SKILL.md
ls .claude/skills
pnpm check:framework
git log --oneline -20
```

Établir et afficher :

| Mesure | Pourquoi elle compte |
|---|---|
| Lignes de `CLAUDE.md` | Lu à chaque tour, cible < 200 |
| Lignes par convention, triées | Au-delà de ~400, la lecture « en entier » devient une fiction |
| Nombre de skills et longueur des descriptions | Chaque description occupe le contexte en permanence |
| Nombre de tags, de globs, de conventions orphelines | Surface de routing |
| Âge du dernier changement par fichier | Un fichier jamais touché depuis 6 mois est soit stable, soit mort |

### 2. Mesurer le coût réel d'un changement

Pour **cinq changements représentatifs**, calculer ce qui est effectivement chargé :

1. une ligne dans une fonction utilitaire
2. une mutation serveur (action + schéma de validation)
3. une migration de base de données
4. une page ou une route
5. un fichier de test

Pour chacun : appliquer le routing par globs de `.method/conventions/_index.md`, lister les
conventions activées, **sommer les lignes**, et indiquer combien de fois elles sont lues dans un
cycle complet (implémentation puis review).

C'est la mesure la plus importante de l'audit. Un framework qui demande 900 lignes de lecture
pour changer une ligne ne sera pas suivi — il sera contourné, et avec lui toutes ses garanties.

### 3. Dérouler des scénarios

Ne pas relire les fichiers : **jouer** les parcours, étape par étape, en notant à chaque étape si
l'instruction est exécutable telle quelle ou si elle renvoie vers quelque chose d'absent, d'ambigu
ou de contradictoire.

| Scénario | Ce qu'il révèle |
|---|---|
| **Jour 1** — clone, install, première page | Le coût d'entrée. Un blocage ici tue l'adoption. |
| **Micro** — corriger un comportement cassé dans 1 fichier | Le rapport cérémonial / valeur au quotidien |
| **Module** — nouvelle table + routes + actions | La chaîne complète, y compris les passages de relais entre skills |
| **Session interrompue** — reprise après compaction ou nouveau contexte | Ce qui survit à la perte de mémoire |
| **Douze mois** — 200 commits, 3 conventions ajoutées, `src/` réorganisé | Ce qui pourrit et ce que rien ne détecte |
| **Refus** — l'utilisateur refuse la story proposée à l'échelle Module | Les branches non nominales, rarement testées |

### 4. Adversarial

Chercher activement les chemins de contournement, et les **exécuter** quand c'est possible :

- Quelle est la commande qui passe le gate sans avoir lancé les checks ?
- Quel est le chemin par lequel un agent respecte la lettre de chaque instruction et produit
  quand même du mauvais code ?
- Quelle instruction peut être **déclarée** faite sans avoir été faite, sans que rien ne le voie ?
- Que se passe-t-il si un check échoue au mauvais moment — après les autres, avant un commit,
  pendant une reprise ?
- Quel fichier peut-on modifier pour désactiver une garantie sans qu'aucun test ne rougisse ?

Tester les hooks avec des charges utiles construites, pas en les relisant.

### 5. Auto-réfutation

Avant d'écrire un finding : le chemin d'échec existe-t-il vraiment, ou l'ai-je supposé ? Un
mécanisme en amont le rend-il impossible ? La mesure est-elle juste ? Dans le doute, supprimer et
déclarer en angle mort.

---

## Axe technique

Ce que le framework prétend garantir, et ce qu'il garantit réellement.

- **Les hooks tiennent-ils ?** Payloads construits, pas relecture. Commande imbriquée, options
  globales, chaînes entre quotes, chaînage, caractères d'échappement. Faux négatifs **et** faux
  positifs — un hook qui bloque une commande légitime sera désactivé.
- **Les scripts résistent-ils ?** Dépôt sans commit, chemin illisible, fichier renommé, arbre
  détaché, horloge décalée, encodage inattendu, sortie volumineuse. Que se passe-t-il en cas
  d'échec : message actionnable, ou stack trace ?
- **Le vérificateur de cohérence détecte-t-il ce qu'il prétend ?** L'injecter avec des
  incohérences réelles et vérifier qu'il échoue : tag sans fichier, glob mort, section citée
  inexistante, skill inconnu, checklist orpheline. **Puis chercher ce qu'il rate.**
- **Les tests testent-ils autre chose que le mock ?** Un test qui passerait aussi avec le code
  supprimé ne protège rien.
- **Les seuils sont-ils appliqués ou décoratifs ?** Une règle annoncée « appliquée par l'outillage »
  mais configurée en avertissement a disparu des deux côtés.
- **La CI vérifie-t-elle ce que le local ne peut pas ?** Ou duplique-t-elle en plus lent ?

## Axe DX — expérience développeur

La question centrale : **où le framework se fait-il contourner, et pourquoi ?**

- **Coût d'entrée.** Combien de temps entre le clone et le premier changement livré ? Combien de
  documents à lire avant de comprendre quoi taper ?
- **Rapport cérémonial / valeur.** Sur le changement le plus fréquent — pas le plus impressionnant
  — combien d'étapes pour quel bénéfice réel ? Une étape dont personne ne peut nommer le bénéfice
  est du rite.
- **Friction sur le chemin nominal.** Combien de fois faut-il attendre ? Un check rejoué
  inutilement, un gate qui bloque à tort, une question posée deux fois.
- **Qualité des messages d'échec.** Un blocage dit-il quoi faire, ou seulement que c'est interdit ?
  Un message qui n'indique pas la sortie enseigne le contournement.
- **Réversibilité.** L'utilisateur peut-il refuser une proposition sans que le framework se
  dégrade en silence ? Peut-il sortir du chemin balisé sans tout casser ?
- **Ce qui est imposé sans être justifié.** Toute obligation dont la raison n'est écrite nulle part
  sera abandonnée à la première urgence.
- **Le framework se refuse-t-il ?** Un outil qui dit « ça ne mérite pas mon process » gagne la
  confiance qu'un outil systématique perd.

## Axe AX — expérience agent

L'angle le moins conventionnel, et le plus déterminant : un agent ne se plaint pas, il dérive
silencieusement.

- **Budget de contexte.** Combien de lignes avant la première ligne de code ? Combien de fois les
  mêmes lignes sont-elles relues dans un cycle ? Le total tient-il dans une lecture honnête ?
- **Observabilité de la conformité.** Pour chaque instruction : un observateur extérieur peut-il
  vérifier qu'elle a été suivie ? *Annoncer* la liste des conventions chargées est visible ; les
  **avoir lues** ne l'est pas. Lister toutes les instructions de cette nature — ce sont celles qui
  se dégraderont sans que personne ne le voie.
- **Actionnabilité au moment de la lecture.** Une instruction demande-t-elle une information que
  l'agent n'a pas encore ? Exemple typique : classer l'ampleur d'un changement avant de connaître
  les fichiers touchés.
- **Jugement contre mécanique.** Trier les garanties en deux colonnes : celles qui survivent à un
  agent distrait, compacté ou nouveau (hook, script, test, type) et celles qui reposent sur son
  raisonnement (déclenchement de skill, échelle, gravité). Le framework tient par la première
  colonne ; la seconde est un vœu.
- **Contradictions entre fichiers chargés ensemble.** Deux conventions activées par le même glob
  qui prescrivent des choses différentes du même cas : l'agent citera l'une **ou** l'autre selon
  l'ordre de lecture, et les deux citations seront défendables. Chercher ces paires explicitement.
- **Fiabilité du déclenchement.** Les descriptions de skills se chevauchent-elles ? Deux skills
  qui matchent la même phrase, ou une phrase courante que rien ne couvre. Vérifier aussi que les
  exclusions (« NE PAS déclencher quand… ») sont dans la **description**, pas seulement dans le
  corps — c'est la description seule qui décide.
- **Reprise après perte de contexte.** Un agent qui arrive au milieu d'un chantier peut-il savoir
  où il en est ? Qu'est-ce qui est écrit sur disque et qu'est-ce qui n'existait que dans le
  contexte perdu ?
- **Instructions invérifiables.** Repérer les formulations qu'un agent ne peut ni appliquer ni
  infirmer : « le plus bas possible », « si nécessaire », « complexe », « non-évident »,
  « éviter ». Pour chacune : reformulation binaire, ou suppression.
- **Références fantômes.** Chemin, section, commande ou fichier cité mais absent. Un agent qui
  suit une référence morte invente une réponse plausible.
- **Coût de la conformité.** Nombre d'appels d'outils imposés par le chemin nominal. Chaque appel
  est une occasion de dériver.

---

## Proposer — la partie qui compte

Un audit qui rend une liste de souhaits ne sert à rien. Chaque proposition porte :

| Champ | Contenu |
|---|---|
| **Problème** | Mesuré ou reproduit, avec le chiffre ou le scénario |
| **Proposition** | Un changement concret, pas une direction |
| **Gain** | Chiffré quand c'est possible : lignes en moins, appels évités, garantie rendue mécanique |
| **Coût** | Fichiers touchés, ce qu'il faut réapprendre, migration nécessaire sur les projets existants |
| **Ce que ça casse** | **Obligatoire.** Toute modification du framework en dégrade un autre point. Le nommer. |

Classer par **gain / coût**, pas par gravité. **Cinq propositions maximum** — au-delà, rien ne
sera fait.

Signaler séparément ce qu'il faut **supprimer** : une règle contredite par le code, une étape dont
personne ne nomme le bénéfice, un fichier que rien ne lit. Retirer 40 lignes périmées vaut souvent
mieux qu'en ajouter 10 justes.

## Sortie

```
## Challenge framework — <date>

### Mesures

| Indicateur | Valeur | Seuil | État |

### Coût de lecture par type de changement

| Changement | Tags actifs | Conventions | Lignes | × relectures |

### Défauts

| # | Axe | Fichier:ligne | Problème (mesuré ou reproduit) | Preuve |

### Propositions (max 5, classées par gain/coût)

| # | Problème | Proposition | Gain | Coût | Ce que ça casse |

### À supprimer

### Angles morts
```

## Pièges

- **Rendre un avis sans mesure.** Le rapport n'accepte que du chiffré ou du reproduit.
- **Auditer le code applicatif.** Ce n'est pas l'objet — c'est le skill `audit`.
- **Confondre « je ferais autrement » et « c'est cassé ».** Le premier n'est pas un finding.
- **Proposer une refonte.** Le framework vient d'en subir une ; ce qui manque, ce sont des
  corrections chirurgicales.
- **Oublier le coût de migration.** Chaque changement structurel doit être propagé aux projets
  existants, à la main.
- **Ne pas tester les hooks.** Les relire ne prouve rien : deux réécritures successives ont déjà
  introduit chacune une régression silencieuse.

## Fin

Terminé quand les mesures sont produites, les six scénarios déroulés, les hooks testés avec des
payloads construits, chaque finding a survécu à l'auto-réfutation, et les propositions sont
classées par gain/coût avec leur contrepartie nommée.

Aucune modification appliquée. Les décisions se prennent ensuite, avec l'utilisateur.
