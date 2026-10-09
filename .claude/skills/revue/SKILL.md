---
name: revue
description: "Code review adossée aux conventions : route .method/conventions/ par globs sur le diff, confronte le code aux règles lues, et indexe la gravité sur la source citée."
when_to_use: "Après une implémentation qui dépasse 2 fichiers ou crée une nouvelle surface — route, table, Server Action, composant, ou fonction exportée — avant la finalisation. Et à toute demande de RELECTURE : 'review', 'relis', 'c'est correct ?', 'ça respecte les conventions ?'. Un 'vérifie' seul, 'ça compile ?', 'lance les tests' demande d'exécuter des commandes, pas de relire : c'est verify. NE PAS déclencher en lecture seule, sur une modification purement documentaire, ni sur un changement micro d'1-2 fichiers sans nouvelle surface — une relecture inline du diff suffit."
allowed-tools: Read, Grep, Glob, Bash
---

# revue — Code review adossée aux conventions

**Principe : la review ne juge pas à l'instinct, elle confronte le code aux règles écrites.**
Chaque problème remonté doit pointer une règle existante dans `.method/conventions/`, dans
`CLAUDE.md` ou dans les critères d'acceptation de la story. Sans source citée, ce n'est pas
un défaut — c'est une suggestion, et elle ne bloque pas.

Cette review tourne dans le contexte courant (pas d'agent isolé). La contrepartie de cette
perte de recul est **la mécanique** : on ne demande pas au reviewer d'avoir des idées, on lui
demande de dérouler des règles lues juste avant. Ne jamais reviewer de mémoire.

**Échelle.** Ce protocole complet s'applique à partir de l'échelle Standard (≥ 3 fichiers, ou
création d'une surface : route, table, Server Action, composant, fonction exportée). Sur un
changement micro, `dev`
fait une relecture inline du diff contre les conventions chargées — mêmes règles, sans rapport
formaté. La vérification ne disparaît jamais ; seul le cérémonial s'adapte.

## Étape 1 — Périmètre

```
git status --short
git diff --name-only
git diff --name-only --cached
```

Si le travail est déjà commité sur la branche : `git diff --name-only origin/main...HEAD`.

Produire la liste des fichiers **créés ou modifiés**. Les fichiers supprimés sont notés à part
(vérifier qu'aucune référence ne subsiste).

## Étape 2 — Routing (obligatoire, avant toute lecture de code)

1. Lire `.method/conventions/_index.md`.
2. Pour chaque fichier du périmètre, matcher la colonne **Globs** → liste de tags actifs.
3. Résoudre les tags en fichiers de conventions, dédupliquer.
4. Charger **en entier** :
   - la convention de base : `coding-standards.md`
   - chaque fichier de conventions dont un tag est actif
5. **Annoncer le routing avant de continuer :**

```
Périmètre      : 6 fichiers
Tags actifs    : api, forms, registry, security, testing, a11y
Conventions    : coding-standards, api-patterns, forms-patterns, component-registry,
                 security-patterns, testing-strategy, accessibility-patterns
```

La liste des conventions doit se **déduire** des tags actifs, sans en ajouter ni en omettre :
un fichier annoncé sans tag correspondant signale que le routing n'a pas été appliqué.

Si aucun tag n'est actif, le dire explicitement — c'est une information, pas un échec.

## Étape 3 — Contexte de la demande

- **Mode story** : lire la story dans `docs/stories/` — AC, tests attendus, référence UI, scope.
- **Mode libre** (fix/feature/refacto) : reprendre la demande initiale de l'utilisateur telle
  qu'elle a été formulée. C'est elle qui définit le périmètre légitime du diff.
- Lire `docs/architecture.md` uniquement si le diff touche un invariant.

## Étape 4 — Lecture

Lire **chaque fichier du périmètre en entier**, pas seulement le diff. Un diff correct dans un
fichier incohérent reste un problème.

**Si le tag `ui` est actif** : lire aussi les captures. `pnpm ui:shots <routes touchées>`
(ou les captures déjà produites par `dev`), puis ouvrir avec l'outil Read, pour chaque route,
au minimum 375 et 1280 px en clair et en sombre. Noter en une phrase par capture ce qu'elle
montre. Sans capture, la review d'un diff UI est incomplète et le verdict est ❌
(`code-review.md § Preuve visuelle`).

## Étape 5 — Confrontation règle par règle

Pour **chaque fichier de conventions chargé**, dérouler ses règles et les confronter aux
fichiers du périmètre qui ont activé ce tag. Une règle non applicable est ignorée
silencieusement — ne pas la lister comme « OK ».

Puis passer `.method/checklists/code-review.md` — elle ne couvre que le transverse
(périmètre du diff, hygiène, documentation de méthode). Tout le reste est déjà couvert par
les conventions chargées : **ne pas re-vérifier, ne pas dupliquer**.

Enfin, vérifier les AC de la story (mode story) ou l'adéquation à la demande (mode libre).

## Étape 6 — Gravité (indexée sur la source, pas sur le ressenti)

**Sources citables** — une seule de ces quatre formes fait foi :
`conventions/<fichier>.md § <section>` · `CLAUDE.md § <section>` ·
`checklists/code-review.md § <section>` · un AC de la story.

| Gravité | Condition — les deux doivent être vraies |
|---------|------------------------------------------|
| 🔴 **HAUTE** | Une source citable est violée **ET** l'impact est sécurité, perte de données, build cassé, AC non livré, ou livraison qui ne correspond pas à la demande |
| 🟠 **MOYENNE** | Une source citable est violée, sans impact immédiat (dette, incohérence, test manquant) |
| 🔵 **BASSE** | Aucune source citable — c'est un avis. **Non bloquant, jamais corrigé d'office.** |

En mode libre (sans story), « ce qui est livré ne correspond pas à ce qui a été demandé »
(`code-review.md § Conformité à la demande`) est un motif de HAUTE au même titre qu'un AC non
livré. Sans cette source, la complétude fonctionnelle ne serait jamais bloquante : aucune
convention ne dit qu'un export CSV doit respecter les filtres actifs.

**Règle absolue : pas de citation → pas de HAUTE ni de MOYENNE.** Si une règle te semble
manquante dans les conventions, remonte-la en BASSE avec la mention « convention à créer »
— c'est le rôle de `wrap-up`, pas de la review, de l'ajouter.

**Vérifier que la section citée existe** avant de l'écrire : une citation vers une section
renommée fait reposer un blocage sur une référence fantôme. `pnpm check:framework` valide les
citations présentes dans les fichiers versionnés, pas celles produites à la volée.

## Étape 7 — Sortie

```
## Review — [Story ID | Mode libre : <demande>]

Périmètre   : <n> fichiers
Conventions : <liste>
Arbitrage   : <option d'un cran plus simple écartée> — <raison de l'écarter>
Captures    : <chemins .ui-shots/ lus, une phrase par largeur> — ou « tag ui inactif »

### Problèmes

| # | Gravité | Fichier:ligne | Règle violée | Problème | Fix |
|---|---------|---------------|--------------|----------|-----|
| 1 | 🔴 HAUTE | src/lib/actions/x.ts:12 | api-patterns.md § Pattern Server Action standard | Pas de vérification auth avant la mutation | Ajouter le guard `getUser()` en tête d'action |
| 2 | 🟠 MOYENNE | src/components/y.tsx:40 | coding-standards.md § Naming | Fichier en camelCase | Renommer en `y-list.tsx` |
| 3 | 🔵 BASSE | src/lib/utils/z.ts:8 | — | Nom peu explicite | Suggestion : `formatAmount` |

### Verdict

HAUTE : 1 · MOYENNE : 1 · BASSE : 1
❌ CHANGES REQUESTED
```

La ligne **Arbitrage** est due dès l'échelle Standard : elle nomme l'option d'un cran plus
simple qui a été écartée et pourquoi. `— aucune surface nouvelle` est une réponse valable ; une
ligne absente, ou remplie d'un « pas d'alternative » sans option nommée, vaut MOYENNE au titre de
`code-review.md § Arbitrage de complexité` — aucun arbitrage n'a été rendu.

Verdict = ✅ **APPROVED** si 0 HAUTE et 0 MOYENNE. Les BASSE ne bloquent jamais.

S'il n'y a aucun problème, écrire le tableau vide et `✅ APPROVED` — ne pas inventer de
findings pour justifier la review, et ne pas produire de résumé décoratif par section.

## Étape 8 — Suite

- **❌ CHANGES REQUESTED** → appliquer les fix HAUTE et MOYENNE, relancer `pnpm verify`, puis
  relancer cette review. Les BASSE sont mentionnées à l'utilisateur, jamais appliquées sans son
  accord.
- **✅ APPROVED** → continuer vers la finalisation (changelog, registry, story, sprint status).

Plus de 2 cycles de review sans converger → s'arrêter et remonter le blocage à l'utilisateur.
