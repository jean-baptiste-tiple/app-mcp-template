---
name: commit-push
description: "Commit et push : checks obligatoires (sans les rejouer s'ils viennent de passer), changelog, commit, push. Seul chemin autorisé — le hook bloque tout git commit/push direct."
when_to_use: "Dès que l'utilisateur demande d'enregistrer ou d'envoyer le travail : 'commit', 'push', 'pousse', 'envoie', 'c'est bon tu peux pousser', 'enregistre', 'sauvegarde ça'. Ou quand un chantier code est terminé et validé par une review. NE PAS déclencher au milieu d'une implémentation, ni sur une session de lecture seule."
argument-hint: "[message de commit optionnel]"
---

# commit-push — le seul chemin vers un commit

Un `git commit` ou `git push` lancé hors de ce skill est **bloqué par le hook**
`.claude/hooks/enforce-git-gate.mjs`. Ce n'est pas une convention à respecter : c'est appliqué.

## Étape 1 — Checks

```
pnpm verify:cached
```

**D'autres sessions dans ce dossier ?** Si `verify:cached` doit rejouer les checks, il gèle le
checkout : appliquer d'abord `CLAUDE.md § Plusieurs sessions sur le même checkout` (prévenir,
proposer d'inclure leur travail, envoyer le résultat). Si une autre session vient de faire passer
les checks sur l'arbre courant, `verify:cached` le constate et ne rejoue rien.

**Une seule commande, et surtout : ne pas rejouer ce qui vient de passer.** `verify:cached`
compare l'état exact du code au reçu laissé par le dernier `pnpm verify`. Identique → il
affiche « checks déjà passés » et rend la main immédiatement. Différent → il enchaîne les 4
checks puis réécrit le reçu.

| # | Commande | Si échec |
|---|----------|----------|
| 1 | `pnpm check:framework` | Corriger l'incohérence signalée, relancer |
| 2 | `pnpm type-check` | Corriger, relancer (max 3 cycles) |
| 3 | `pnpm lint` | Corriger, relancer (max 3 cycles) |
| 4 | `pnpm test` | Corriger, relancer (max 3 cycles) |

C'est ce qui évite le scénario le plus coûteux du framework : une implémentation qui se termine
par une suite complète, suivie d'un `commit-push` qui rejoue exactement la même chose sur le
même code trente secondes plus tard.

Au-delà de 3 cycles sur un même check → **s'arrêter et remonter à l'utilisateur**. Ne jamais
désactiver une règle de lint, skipper un test ou élargir un type pour faire passer un check.

## Étape 2 — Analyser le diff

```
git status --short
git diff
git log --oneline -5
```

Vérifier qu'aucun fichier sensible n'est présent (`.env`, credentials, clés, dumps).

## Étape 3 — Changelog

Ajouter une entrée en haut de `docs/changelog.md` (après le commentaire HTML) :

```markdown
## [YYYY-MM-DD] — [Scope court]
**Quoi :** Description concise de ce qui a été fait
**Pourquoi :** La raison / le contexte / la story
**Fichiers :** Chemins relatifs des fichiers créés/modifiés
```

Une entrée par chantier, pas par fichier. Un commit de typo ne mérite pas d'entrée — dans ce
cas, le dire plutôt que d'écrire une entrée vide de sens.

## Étape 4 — Commit

- `git add <fichiers explicites>` — **jamais `git add -A`**, inclure `docs/changelog.md`
- Message : préfixe `fix:` / `feat:` / `refactor:` / `docs:` / `chore:` / `perf:`, 1-2 lignes,
  centré sur le **pourquoi**
- Le marqueur `# checks-ok` atteste que les 4 checks de l'étape 1 sont réellement passés.
  Le hook ne s'en contente pas : il vérifie que le **reçu** couvre l'état exact du code. Poser
  le marqueur sans avoir lancé `pnpm verify` ne débloque donc rien.

```
git commit -m "prefixe: message concis" -m "Co-Authored-By: Claude <noreply@anthropic.com>" # checks-ok
```

## Étape 5 — Push

```
git push -u origin <branche-courante> # checks-ok
```

En cas d'échec réseau : réessayer jusqu'à 4 fois (2s, 4s, 8s, 16s). En cas de conflit ou de
divergence : **remonter à l'utilisateur**, ne jamais forcer.

## Étape 6 — Résumé

```
Framework : OK
Type-check: OK
Lint      : OK
Tests     : OK
Changelog : mis à jour
Commit    : <hash> <message>
Push      : <branche> → origin/<branche>
CI        : déclenchée seulement sur `main` et les pull requests — sur une branche
            de travail sans PR, ne rien annoncer
```

## Règles

- Les 4 checks passent **avant** le commit, sans exception
- `--no-verify`, `--force`, `--force-with-lease` : bloqués par le hook, sans échappement
- `--amend` : uniquement sur demande explicite de l'utilisateur
- Ne jamais commiter sur `main` si une branche de travail est attendue

### Merge, rebase, revert, cherry-pick

Le hook les traite **comme un commit** — ils en produisent un, et les exclure laissait un chemin
complet pour publier du code jamais vérifié. Même protocole : `pnpm verify` d'abord, puis la
commande suivie de ` # checks-ok`.

Un `git rebase --continue` au milieu d'une résolution de conflit est concerné aussi. C'est
voulu : c'est exactement le moment où l'arbre a bougé sans que rien ne l'ait revérifié.

Le `push` de l'étape 5 est le seul verbe qui exige le marqueur **sans** exiger un reçu valide :
le commit qui vient d'avoir lieu a changé `HEAD`, donc invalidé le reçu. Il ne publie que du
déjà-commité, et chaque commit est passé par le contrôle ci-dessus.
