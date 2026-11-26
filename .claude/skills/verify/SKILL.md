---
name: verify
description: "Lance les 4 vérifications du projet via `pnpm verify` : cohérence framework, type-check, lint, tests — puis écrit le reçu qui évite de les rejouer au commit."
when_to_use: "Quand l'utilisateur demande d'EXÉCUTER les vérifications : 'vérifie', 'ça compile ?', 'lance les tests', 'tout passe ?'. Et après avoir appliqué des corrections issues d'une review. NE PAS déclencher pour un commit : commit-push inclut déjà ces checks et réutilise le reçu. NE PAS déclencher sur une demande de relecture — 'relis', 'review', 'c'est correct ?' — qui appelle un jugement sur le code et non l'exécution de commandes : c'est revue."
---

# verify — Vérifications projet

Utilisable seul (debug local) ou appelé par `revue` (après application des fix) et par
`commit-push` (étape 1).

## Avant de lancer : d'autres sessions travaillent-elles ici ?

`pnpm verify` gèle le checkout et passe par une file d'attente (`scripts/long-run.mjs`). Avant de
le lancer, appliquer `CLAUDE.md § Plusieurs sessions sur le même checkout` : prévenir les autres
sessions du dossier, leur proposer d'inclure leur travail, puis leur envoyer le résultat. Si une
autre session vient d'annoncer un `verify`, ne pas en lancer un second : lui demander d'inclure
ce travail et attendre son résultat.

## Une seule commande

```
pnpm verify
```

Elle enchaîne les 4 checks, puis **écrit un reçu** attestant qu'ils sont passés sur l'état exact
du code :

| # | Commande | Vérifie |
|---|----------|---------|
| 1 | `pnpm check:framework` | Cohérence : tags ↔ conventions ↔ skills ↔ globs ↔ références |
| 2 | `pnpm type-check` | `tsc --noEmit` |
| 3 | `pnpm lint` | ESLint |
| 4 | `pnpm test` | Vitest (unit + integration) |

`pnpm test:e2e` n'est pas dans la séquence — le lancer explicitement quand la story le demande.

**Ne jamais lancer les 4 commandes séparément.** `pnpm verify` est le seul chemin qui écrit le
reçu ; sans lui, `commit-push` rejouera l'intégralité de la suite quelques instants plus tard
sur du code identique, et le hook refusera le commit.

Pour vérifier sans risquer de rejouer inutilement : `pnpm verify:cached` — il ne relance les
checks que si le code a bougé depuis le dernier passage, et seulement `check:framework` si seule
de la documentation de méthode a changé (reçu doc, `CLAUDE.md § Vérifier, commiter, pousser`).

Chaque check doit passer avant de lancer le suivant. Sur un test cassé, distinguer :
**cassé par le code livré** (à corriger) vs **flaky préexistant** (à documenter et signaler,
pas à masquer).

## Sortie

```
Framework : OK
Type-check: OK
Lint      : OK
Tests     : 42 passed, 0 failed
```

En cas d'échec, afficher le check en échec et le nombre d'erreurs restantes — ne jamais
marquer OK un check qui a échoué.

## Règles

- Maximum **3 cycles** de correction par check. Au-delà → s'arrêter et remonter le blocage.
- Ne jamais faire passer un check en désactivant une règle, en skippant un test, ou en
  élargissant un type. Si c'est la seule issue, c'est une décision utilisateur.
- Exécution en foreground, sans pipe ni redirection : les erreurs sont souvent en fin de
  sortie et la troncature les masque (règle appliquée par `.claude/hooks/enforce-bash-rules.mjs`).
