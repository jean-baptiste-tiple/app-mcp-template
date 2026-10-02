# Migration v2 → v2.1 — durcissement du gate et des vérifications

> **Mode d'emploi.** Ce document est un **prompt à coller** dans une session Claude Code ouverte
> sur un projet **déjà migré en v2** (skills `dev`, `revue`, `verify`, `commit-push`, `wrap-up`,
> `conventions`, `plan`, `audit` ; routing par globs dans `_index.md` ; reçu de vérification).
> Tout ce qui suit la ligne de séparation est destiné à être lu par Claude.
>
> **Si le projet n'est pas encore en v2**, appliquer d'abord `docs/migration-v2.md`, puis
> `docs/migration-renommage.md`, puis ce document.
>
> Avant de le coller : branche dédiée (`git checkout -b chore/framework-v2-1`) et arbre propre.
> Cette migration ne touche **aucun fichier de `src/`**.

---

Tu vas appliquer la révision v2.1 du framework sur ce projet. Le template de référence est
`jean-baptiste-tiple/mcp-dev-template`, branche `main`.

## Ce que corrige cette révision

Un challenge du template sur trois axes — technique, expérience développeur, expérience agent —
a montré que la moitié supposée **déterministe** du framework était en fait la plus faible. Le
gate de commit laissait passer cinq chemins vérifiés, bloquait douze commandes légitimes, et
`check:framework` validait la cohérence *documentaire* sans jamais vérifier que la chaîne
d'application était encore branchée.

Aucun changement de méthode : les échelles, le routing et les skills sont les mêmes. Ce qui
change, c'est que ce qui était annoncé comme garanti l'est effectivement.

## Règle qui prime sur tout le reste

**Tu migres le framework, pas le projet.** Ne touche jamais à `src/`, `docs/prd.md`,
`docs/brief.md`, `docs/architecture.md`, `docs/stories/`, `docs/epics/`, `docs/decisions/`,
`supabase/migrations/`, ni au contenu du sprint status.

Si une convention a été **personnalisée** pour ce projet, préserve-la : applique la correction
décrite, ne remplace pas le fichier en bloc. En cas de doute, **demande**.

---

## Lot A — Le gate de commit (obligatoire)

C'est le cœur de la révision. Cinq contournements vérifiés, quatre faux positifs.

### A1. `.claude/hooks/enforce-git-gate.mjs`

Reprends le fichier du template **en entier** (il n'a pas de partie personnalisable). Ce qui
change :

| Trou | Ce qui passait avant | Correction |
|------|----------------------|------------|
| Verbes | `git merge`, `git revert`, `git cherry-pick`, `git rebase`, `git am` produisent des commits sans passer par `commit` — aucun n'était vu | `VERBES = 'commit|push|merge|revert|cherry-pick|rebase|am'` |
| Force agglomérée | `git push -fu origin main` — la forme la plus courante — franchissait `-f\b`, qui ne coupe pas entre `f` et `u` | `-[a-zA-Z]*f[a-zA-Z]*\b` |
| Reçu sur les verbes ajoutés | Seul `commit` réclamait un reçu ; un merge ou un cherry-pick produisait des commits sans qu'aucun contrôle ne s'applique | Reçu exigé de **tout verbe qui produit un commit**. `push` reste exclu : il ne publie que du déjà-commité, et l'exiger serait impossible à satisfaire — le commit qui vient d'avoir lieu change `HEAD`, donc invalide le reçu |
| Contenu du reçu | Le champ `checks` était écrit puis jamais relu : un reçu déclarant `aucun-check` ouvrait le gate | `CHECKS_REQUIS` : les 4 checks doivent être déclarés |
| Shell imbriqué | Le refus portait sur **tout** `bash -c` : `docker run … sh -c "ls"` était bloqué avec un message parlant de commit-push | Refus conditionné à `/\bgit\b/` dans la commande brute |

### A2. `.githooks/pre-commit` (nouveau fichier)

Le hook PreToolUse ne reçoit qu'une **chaîne de commande** : un `git commit` écrit dans un `.sh`,
un Makefile ou un script npm lui est invisible — `bash deploy.sh` est une commande anodine. Cette
limite est structurelle, pas un oubli.

1. Copie `.githooks/pre-commit` du template. **Rends-le exécutable** : `chmod +x .githooks/pre-commit`.
2. Ajoute en **première** entrée des scripts de `package.json` :
   ```json
   "prepare": "git config core.hooksPath .githooks || true"
   ```
   Le cycle `prepare` de npm/pnpm s'exécute à chaque `install` : le hook s'active tout seul sur
   chaque clone.
3. Active-le tout de suite pour la session courante : `git config core.hooksPath .githooks`.
4. Vérifie : `git config core.hooksPath` doit répondre `.githooks`.

Il ne relance pas les checks — il vérifie le reçu, ce qui revient au même et coûte 200 ms au lieu
de plusieurs secondes. Il reste franchissable par `git commit --no-verify` : c'est un garde-fou
contre l'accident, pas une barrière de sécurité, et c'est écrit dans son en-tête.

### A3. `.claude/skills/commit-push/SKILL.md`

Ajoute une section « Merge, rebase, revert, cherry-pick » à la fin, avant ou après « Règles » :
ces commandes suivent désormais le même protocole (`pnpm verify`, puis ` # checks-ok`), y compris
`git rebase --continue` au milieu d'une résolution de conflit.

Corrige aussi l'étape 6 si elle annonce `CI : pnpm build en cours` : la CI ne tourne que sur
`main` et les pull requests. Sur une branche de travail sans PR, ne rien annoncer.

## Lot B — Le hook de règles Bash (obligatoire)

`.claude/hooks/enforce-bash-rules.mjs` — reprends le fichier du template. Deux corrections :

1. **La règle `run_in_background` est SUPPRIMÉE.** Elle bloquait tout check lancé en arrière-plan,
   au motif que « sa sortie serait invisible ». C'est faux : le harness notifie à la fin de la
   commande et sa sortie reste récupérable. Surtout, ce n'est pas la lecture de la sortie qui
   atteste qu'un check est passé — c'est le **reçu**, que `pnpm verify` écrit en arrière-plan
   comme au premier plan, et que le gate de commit relit dans les deux cas. La garantie est
   intacte ; le coût, lui, était réel (une suite de tests ou un build long monopolisait la
   session). Au passage, la règle était en plus évaluée *avant* le filtre CHECK et bloquait donc
   `pnpm dev`, `npx supabase start` et `sleep`.
   Les trois autres règles (troncature, redirection, polling) restent actives, y compris sur une
   commande en arrière-plan.
2. **Le motif CHECK est ancré en position de commande** (`^`, `\n`, `;`, `&&`, `||`, `|`). Sans
   ancre, le simple mot `eslint` ou `vitest` n'importe où déclenchait la règle : `which vitest`,
   `ls node_modules/.bin | grep eslint`, `rg "pnpm test" docs/` étaient bloqués. Le motif couvre
   maintenant `verify` et `verify:cached` — les seules commandes réellement utilisées par le
   workflow, et justement celles qui y échappaient.

## Lot C — Le reçu de vérification (obligatoire)

`scripts/verify-receipt.mjs` — reprends le fichier du template.

- **`core.quotePath=false`** sur chaque appel git. Sans ça, git échappe les noms non-ASCII en
  octal (`"src/caf\303\251.ts"`), `hash-object` échoue sur ce chemin et le fallback renvoie une
  constante : **tout fichier accentué devenait aveugle au contenu**. Trois versions différentes
  produisaient la même empreinte — donc un reçu valide sur du code modifié. À vérifier en
  priorité si le projet a des fichiers accentués.
- **Garde hors dépôt git** : `worktreeHash()` lève un message lisible au lieu d'une stack, et
  seulement après avoir constaté qu'on n'est pas dans un dépôt.
- **`component-registry.md` ajouté aux `EXCLUS`** : `dev` l'écrit à l'étape 8, après le
  `pnpm verify` de l'étape 6 — il invalidait donc systématiquement le reçu qu'il venait de
  produire. Contrepartie assumée : la cohérence registry ↔ `src/components/` glisse d'un commit.
- **Diagnostics distincts** : reçu illisible, reçu daté dans le futur (horloge décalée), reçu
  périmé avec la limite affichée. Avant, les trois donnaient « reçu périmé (NaN min) » — refus
  correct, diagnostic faux, donc inactionnable.
- **`VERIFY_RECEIPT_ROOT`** : seam de test. Le script pointe git sur *sa propre* racine, pas sur
  le cwd — sans cette variable, les tests sur dépôt jetable hachaient le dépôt réel et passaient
  sans rien vérifier.

⚠️ Le reçu doit rester **hors du périmètre hashé**. Vérifie que `.gitignore` contient
`.claude/.verify-receipt.json` : dedans, il serait un fichier non suivi compté dans sa propre
empreinte, et l'écrire l'invaliderait aussitôt.

## Lot D — `check:framework` (obligatoire)

Jusqu'ici il ne contrôlait que la cohérence **documentaire**. On pouvait vider `settings.json`
de ses hooks, réduire `enforce-git-gate.mjs` à `process.exit(0)` ou remplacer `type-check` par
`echo ok` : exit 0 dans les trois cas. **Toutes les garanties étaient désactivables sans que le
propre check du framework bronche.**

1. Copie `scripts/check-framework-invariants.mjs` (**nouveau fichier**).
2. Reprends `scripts/check-framework.mjs` du template. Il importe le module ci-dessus et l'appelle
   avec `{ ROOT, read, walk, err, warn }`. La séparation n'est pas cosmétique : elle distingue
   « le framework se décrit-il correctement ? » de « ses garanties sont-elles branchées ? ».

Ce que le vérificateur couvre en plus :

- **RLS** : toute `CREATE TABLE` dans `supabase/migrations/*.sql` sans
  `ENABLE ROW LEVEL SECURITY` dans la même migration → erreur.
- **Routes dupliquées** : deux `page.tsx` qui résolvent le même chemin une fois les segments
  `(...)` retirés. Next ne le signale pas, il en choisit un en silence — le template lui-même
  s'y était fait prendre.
- **Couleurs Tailwind numérotées** dans `src/` (`bg-emerald-500`) → erreur, avec `fichier:ligne`.
- **Scripts de `package.json`** : chacun lance-t-il ce qu'il annonce ? `lint` porte-t-il
  `--max-warnings 0` ?
- **Hooks** : présents, et contenant au moins un `process.exit(2)`.
- **`.githooks/pre-commit`** : présent et référençant `verify-receipt`.
- **Citations `fichier.md § Section`** : validées aussi contre `CLAUDE.md` et
  `.method/checklists/` (avant, seulement contre les conventions), et y compris quand la
  référence est entre backticks.
- **Colonnes de table mal alignées** dans `_index.md` : erreur au lieu d'un `continue` silencieux.

**Ce lot va probablement échouer au premier passage sur un projet réel.** C'est son intérêt :
il révèle des invariants annoncés dans `CLAUDE.md` et jamais tenus. Traite chaque erreur au cas
par cas, ne désactive pas le check. Si une RLS manquante est délibérée, elle doit avoir un ADR —
c'est la règle 4 de `CLAUDE.md`.

Aligne aussi `package.json` : `"lint": "eslint . --max-warnings 0"`. Un `warn` ESLint ne bloquait
rien alors que les conventions l'annoncent « appliqué par l'outillage ».

## Lot E — Routing des conventions (obligatoire)

`.method/conventions/_index.md` :

1. **Section « Capacités non installées »** — ajoute une colonne **Vérifiable par** et la règle :
   *un tag de ce tableau ne s'active pas tant que sa capacité n'est pas installée, même si un
   glob matche.* Sans elle, `supabase` — routé sur `src/lib/actions/**` — chargeait 300 lignes
   sur Storage, realtime et codes PGRST pour **toute** Server Action d'un projet sans base de
   données.
   Reporte-la aussi en **règle de routing n°2** (les suivantes se décalent).
   ⚠️ Si ce projet **a** Supabase, le glob `src/lib/actions/**` doit rester sur le tag `supabase` :
   `api-patterns.md` y référence `handleSupabaseError`. C'est l'activation qui est conditionnée,
   pas le routing. Et si la capacité est installée, **retire le tag du tableau** — il redevient
   soumis à la vérification des globs.
2. **Tag `nextjs`** — ajoute aux globs : `src/app/**/global-error.tsx`,
   `src/app/**/unauthorized.tsx`, `src/app/**/forbidden.tsx`, `src/app/**/route.ts`. Quatre
   fichiers spéciaux de l'App Router ne chargeaient aucune convention.
3. **Tag `performance`** — ajoute `src/app/**/page.tsx`. Une page est le premier endroit où se
   jouent le code splitting et les Web Vitals ; le tag ne s'activait que sur un `loading.tsx`.

## Lot F — Déclenchement des skills (obligatoire)

Trois collisions et un trou faisaient dépendre le routage du hasard.

1. **`wrap-up`** — déplace les conditions de déclenchement de `description` vers un champ
   `when_to_use`, en y **incluant les quatre exclusions** (session lecture seule, micro-modif,
   refus déjà exprimé, `commit-push` lancé directement). Elles ne vivaient que dans le corps du
   skill, qui n'est lu qu'**après** le déclenchement : elles ne décidaient donc rien.
2. **`dev`** — retire `audit` de la liste de mots-clés du mode lecture : ce mot appartient au
   skill `audit`. Ajoute `où est`. Dans `when_to_use`, exclus explicitement « audite »
   et « passe le projet en revue ».
3. **`revue` / `verify`** — `'vérifie le code'` déclenchait les deux. Tranche sur la nature de
   l'acte : `revue` = **relire** (`review`, `relis`, `c'est correct ?`), `verify` = **exécuter**
   (`vérifie`, `ça compile ?`, `lance les tests`). Chacun renvoie explicitement vers l'autre.

## Lot G — `CLAUDE.md` (obligatoire, à fusionner avec l'existant)

⚠️ Ce fichier est **personnalisé par projet**. N'écrase pas — ajoute deux sections.

1. **`## Règles absolues` → sous-section « Ce qui est appliqué, et ce qui ne l'est pas »**
   Un tableau à deux colonnes : *garanti par une machine* (type-check, lint, test,
   `check:framework`, le gate) contre *tenu par jugement* (conventions réellement lues, registry
   consulté, ADR posé, échelle estimée). Rien ne vérifie qu'une convention a été **lue** —
   seulement qu'elle a été **annoncée**. L'annonce est donc la seule trace, et la produire fausse
   est un mensonge, pas un raccourci.
   Sans cette distinction, les sept règles se lisent comme également garanties. Elles ne le sont
   pas, et croire le contraire fait sauter les vérifications de la colonne de droite en premier.

2. **`## Modifications documentaires`** (juste avant `## Vérifier, commiter, pousser`)
   Éditer `docs/`, `.method/` ou `README.md` sans toucher au code ne déclenche **aucun skill** :
   `dev` s'en exclut, `revue` ne review pas de la prose, `conventions` répond mais n'écrit pas.
   C'est volontaire, mais trois règles restent dues et personne d'autre ne les porte : (a) pas
   d'écriture dans `.method/conventions/`, `docs/decisions/` ou `CLAUDE.md` sans accord explicite ;
   (b) `pnpm check:framework` reste dû — un glob mort ou un `§` inexistant ne se voit que là ;
   (c) une entrée de changelog seulement si la modification change ce qu'un lecteur doit faire.

## Lot H — Tests (recommandé)

Reprends `tests/unit/hooks.test.ts` du template si le projet n'a pas modifié ce fichier ; sinon
ajoute les cas manquants. 23 tests, dont ceux qui couvrent les corrections ci-dessus :

- verbes `merge` / `revert` / `cherry-pick` / `rebase` / `am` bloqués nus
- `git push -fu` et `-uf` bloqués même marqués
- reçu exigé de tout verbe qui produit un commit, mais pas du `push`
- reçu déclarant un seul check → refusé
- `bash -c "ls"` sans git → autorisé
- `run_in_background` autorisé sur tout, y compris `pnpm test` / `pnpm verify` / `pnpm build`
- `pnpm verify | tail` et `pnpm verify:cached > out` → bloqués
- `which vitest`, `grep eslint` → autorisés ; check derrière `&&` ou `\n` → bloqué

**Le test de renommage a été réécrit.** Sa version v2 créait la fixture dans le dépôt courant et
se contentait d'un `git add` : le chemin d'origine n'ayant jamais existé dans `HEAD`, git
n'émettait aucune ligne `R` et `--no-renames` ne changeait rien. **Le test passait sans jamais
exercer la régression qu'il documente.** La nouvelle version crée un dépôt jetable avec un vrai
commit, et pose `VERIFY_RECEIPT_ROOT` — indispensable, sinon le script hache le dépôt réel.
Même correction pour le test « dépôt sans commit », inerte pour la même raison.

## Lot I — Documents (facultatif)

- `docs/migration-v2.md` : ligne « `dev.md` et `dev.md` » → `tm-fix.md` et `tm-feature.md` ;
  « 7 skills v2 » → **8**, en ajoutant `audit` à la liste.
- `README.md` : `plan` a **4** niveaux (refus, story seule, évolution ciblée, initial), pas 3.
- `.method/conventions/testing-strategy.md` : la colocalisation des tests est **découragée** — un
  fichier de test sous `src/` matche en plus les globs `registry`, `a11y` et `nextjs`, donc charge
  des conventions qui ne le concernent pas, et l'exemption `max-lines` d'`eslint.config.mjs` ne
  couvre que `tests/**`.

---

## Vérification finale

```
pnpm install          # active core.hooksPath via `prepare`
git config core.hooksPath      # doit répondre .githooks
pnpm verify
pnpm build
```

Puis les quatre contrôles manuels que rien n'automatise :

1. `git push` nu dans une session Claude → **bloqué**.
2. `git merge une-branche` nu → **bloqué** (c'est le trou principal de la v2).
3. `pnpm test` **et** `pnpm dev` en arrière-plan → **autorisés** (`run_in_background` n'est plus
   bloqué du tout).
4. `SKIP_VERIFY_RECEIPT=1 git commit` → passe. C'est l'échappement documenté du hook git, pas
   une régression.

Si `pnpm check:framework` échoue sur des invariants du lot D, **liste les erreurs et remonte-les
avant de corriger** : une RLS manquante ou une route dupliquée est un bug du projet, pas un bug
de la migration. C'est précisément ce que la révision est censée révéler.

## Rapport attendu

```
Lots appliqués : A, B, C, D, E, F, G, H, I
Fichiers nouveaux : .githooks/pre-commit, scripts/check-framework-invariants.mjs
Fichiers repris du template : <liste>
Fichiers fusionnés (personnalisations préservées) : CLAUDE.md, _index.md
Invariants révélés par le lot D : <liste, ou « aucun »>
pnpm verify : OK
pnpm build  : OK
Contrôles manuels 1-4 : <résultat>
```
