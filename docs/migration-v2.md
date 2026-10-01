# Migration du framework v1 → v2

> **Mode d'emploi.** Ce document est un **prompt à coller** dans une session Claude Code ouverte
> sur un projet existant issu de l'ancienne version du template. Tout ce qui suit la ligne de
> séparation est destiné à être lu par Claude, pas par un humain.
>
> Avant de le coller : être sur une branche dédiée (`git checkout -b chore/framework-v2`) et avoir
> un arbre propre. La migration touche `.claude/`, le dossier de méthode, la config et quelques
> fichiers de
> `src/` — jamais le code métier.

---

Tu vas migrer ce projet vers la version 2 du framework. Le template de référence est
`jean-baptiste-tiple/app-mcp-template` (ex-`dev-framework-template`), branche `main`.

## Règle qui prime sur tout le reste

**Ce projet a du code métier, un PRD, des stories et peut-être des conventions personnalisées.
Rien de tout ça ne doit être écrasé.** Tu migres le *framework*, pas le *projet*.

Concrètement, ne touche jamais à : `src/` (sauf les 4 fichiers listés au lot G), `docs/prd.md`,
`docs/brief.md`, `docs/architecture.md`, `docs/stories/`, `docs/epics/`, `docs/decisions/`,
le sprint status (contenu), `supabase/migrations/`, `tests/` (sauf ajout).

Si une convention a été **personnalisée** pour ce projet (règle métier ajoutée, seuil ajusté),
tu la préserves : tu appliques les corrections décrites, tu ne remplaces pas le fichier en bloc.
En cas de doute sur un fichier, **demande** plutôt que de trancher.

## Ce qui change, et pourquoi

La v1 attachait ses garanties à un workflow qu'il fallait penser à lancer. En pratique il ne
l'était pas sur les petits changements — et le contourner faisait perdre *aussi* le chargement
des conventions et la review. La v2 attache les garanties **au changement lui-même** et fait
varier le seul cérémonial.

Quatre conséquences structurantes :

1. **Routing par globs.** `.method/conventions/_index.md` gagne une colonne `Globs`. C'est la
   seule source de vérité `fichier touché → tag → convention`, lue par `dev` avant d'écrire
   et par `revue` avant de reviewer.
2. **La review confronte le code aux règles lues**, et la gravité est indexée sur la source
   citée : pas de citation → BASSE non bloquante.
3. **Tout est skill**, plus aucune commande. Un skill s'auto-déclenche *et* reste invocable en
   `/<nom>`.
4. **Le gate de commit est appliqué par un hook**, pas par une consigne. Avec un reçu qui évite
   de rejouer les checks déjà passés.

## Phase 0 — Inventaire (lecture seule)

Avant toute modification, établis l'état des lieux et **affiche-le** :

```
git log --oneline -5
ls -R .claude
ls .tiple/conventions .tiple/checklists   # ou .method/ si déjà renommé
cat package.json
```

Réponds à ces questions avant de continuer :
- `.claude/commands/` existe-t-il ? combien de fichiers ?
- combien de skills dans `.claude/skills/` ? sont-ils des « shims » avec des invariants recopiés ?
- le dossier de méthode s'appelle-t-il `.tiple/` ou `.method/` ?
- `<methode>/conventions/_index.md` a-t-il une colonne `Globs` ?
- `scripts/check-framework.mjs` existe-t-il ?
- les hooks sont-ils en `.sh` ou en `.mjs` ?
- des conventions ont-elles été personnalisées pour ce projet (diff par rapport au template d'origine si tu peux le récupérer) ?

Si le projet est **déjà en v2** sur certains points, saute les lots correspondants et dis-le.

## Phase 1 — Récupérer les fichiers de référence

Récupère le template v2 dans un dossier temporaire hors du projet :

```
git clone --depth 1 https://github.com/jean-baptiste-tiple/app-mcp-template /tmp/framework-v2
```

Si le clone est impossible (réseau, accès), demande-moi de te fournir les fichiers et
arrête-toi là. **N'invente pas le contenu des fichiers de référence** : le détail des règles
compte, et une reconstitution approximative est pire que pas de migration.

---

## Lot A — Renommer le dossier de méthode

La v2 nomme ce dossier `.method/` : il contient les conventions, checklists, templates, starters
et le sprint status. En v1 il s'appelait `.tiple/`.

```
git mv .tiple .method
```

Puis remplace **toutes** les occurrences de `.tiple/` par `.method/` dans les fichiers versionnés
— `CLAUDE.md`, `README.md`, `.claude/`, les conventions, les checklists, les templates, les
scripts, les docs. Un chemin oublié se traduit par une convention jamais chargée, en silence.

Si ce projet a déjà `.method/`, saute ce lot.

## Lot B — Hooks et gate de commit

**Pourquoi :** en v1 les hooks étaient en bash et extrayaient le champ `command` du payload JSON
avec `grep`/`sed`. C'est faux dans les deux sens : soit la commande est tronquée au premier
guillemet échappé (et tout `git commit -m "..."` échappe aux règles), soit on matche le JSON
entier (et `grep "git commit"` est bloqué à tort). Les hooks v2 sont en Node et parsent le JSON.

1. Copie `.claude/hooks/enforce-git-gate.mjs` et `.claude/hooks/enforce-bash-rules.mjs` depuis le template.
2. Supprime `.claude/hooks/enforce-git-gate.sh` et `.claude/hooks/enforce-bash-rules.sh` s'ils existent.
3. Remplace `.claude/settings.json` par la version du template (les hooks sont appelés via `node`, plus `bash`).
4. Copie `scripts/verify-receipt.mjs`.
5. Ajoute au `.gitignore` : `.claude/.verify-receipt.json`.

Le gate refuse désormais : `git commit`/`git push` nus, les options globales de git
(`git -C`, `git --no-pager`, `git -c k=v`), les shells imbriqués (`bash -c`, `eval`),
`--no-verify` et `--force` sans échappement possible. L'échappement légitime est
` # checks-ok` **en fin de commande**, et il n'est accepté que si un reçu couvre l'état
exact du code.

## Lot C — Scripts et commandes pnpm

1. Copie `scripts/check-framework.mjs`.
2. Ajoute à `package.json` :
   ```json
   "check:framework": "node scripts/check-framework.mjs",
   "verify": "pnpm check:framework && pnpm type-check && pnpm lint && pnpm test && node scripts/verify-receipt.mjs write",
   "verify:cached": "node scripts/verify-receipt.mjs check || pnpm verify",
   ```
3. Copie `tests/unit/hooks.test.ts` (16 cas de non-régression sur les hooks et le reçu).

**`pnpm verify` remplace le lancement séparé des 4 checks.** Il écrit un reçu contenant
l'empreinte exacte du code ; `commit-push` lance `verify:cached` et ne rejoue rien si le code
n'a pas bougé. C'est ce qui supprime la suite de tests jouée deux fois de suite.

Ne lance pas encore `pnpm check:framework` : il échouera tant que les lots D et E ne sont pas
faits. C'est normal.

## Lot D — Skills

**Pourquoi :** un skill s'auto-déclenche *et* s'invoque en `/<nom>` ; une commande ne fait que
le second. Les deux artefacts faisaient doublon. Et depuis le routing par globs, les 22 skills
de tag n'étaient plus qu'un niveau d'indirection : `dev` et `revue` matchent `_index.md`
eux-mêmes.

1. **Supprime `.claude/commands/` en entier**, y compris `tm-fix.md` et `tm-feature.md` (dépréciés).
2. **Supprime les 22 skills de tag** : `a11y`, `api`, `auth`, `database`, `datetime`, `deploy`,
   `feedback`, `flags`, `forms`, `i18n`, `monitoring`, `nextjs`, `performance`, `realtime`,
   `security`, `seo`, `state`, `supabase`, `tables`, `testing`, `typescript`, `uploads`.
3. Copie les 8 skills v2 : `dev`, `plan`, `revue`, `verify`, `wrap-up`,
   `commit-push`, `conventions`, `audit`.

Après ce lot, **ne crée jamais de `.claude/skills/<tag>/`** : `check:framework` rejette tout
skill inconnu. Ajouter une convention = une ligne dans `_index.md` + le fichier, rien d'autre.

## Lot E — Conventions

C'est le lot le plus délicat : **c'est ici que les personnalisations du projet vivent.**

### E1. Routing (`_index.md`)

Reprends la structure du template : colonne `Globs`, tags `registry` et `stack` (qui ne sont
plus des conventions de base), sections « Tags non routables par chemin » et « Capacités non
installées ».

**Adapte les globs à l'arborescence réelle de CE projet.** Si le code est organisé en
`src/features/*/actions/` plutôt qu'en `src/lib/actions/`, les globs du template ne matcheront
rien — et `check:framework` te le dira. C'est le point le plus important du lot : un glob mort
désactive silencieusement le chargement d'une convention.

Retire du tableau « Capacités non installées » les tags dont la capacité **est** installée dans
ce projet (typiquement `supabase`, `database`, `auth`, `realtime` si le starter a été activé) :
ils redeviennent soumis à la vérification des globs.

### E2. Scission d'`api-patterns.md`

En v1, `api-patterns.md` (478 lignes) servait 4 tags : reviewer un composant de tableau chargeait
267 lignes de Server Actions. Copie `forms-patterns.md`, `tables-patterns.md` et
`uploads-patterns.md`, et retire d'`api-patterns.md` les sections déplacées (Pattern Form,
Optimistic Updates, File Upload) ainsi que la section Auth qui dupliquait `auth-patterns.md`.

### E3. Corrections techniques — **à appliquer même si les conventions sont personnalisées**

Ces règles de la v1 sont fausses ou dangereuses. Applique chaque correction, en préservant les
ajouts propres au projet :

| Fichier | Ce qui est faux en v1 | Correction |
|---|---|---|
| `database-patterns.md` | `transfer_funds` en `SECURITY DEFINER` sans `search_path`, sans validation de l'appelant, `EXECUTE` ouvert à `public` — **escalade de privilèges** | version sécurisée + 3 règles `SECURITY DEFINER` |
| `database-patterns.md` | policy `FOR UPDATE` avec `USING` seul | ajouter `WITH CHECK` |
| `database-patterns.md` | « Toujours idempotent : `CREATE TABLE IF NOT EXISTS` » | faux et nuisible — une migration n'est jamais rejouée |
| `auth-patterns.md` | `NextResponse.redirect` sans recopier les cookies rafraîchis | déconnexions aléatoires — recopier `response.cookies` |
| `supabase-patterns.md` | `PGRST301` = « Trop de résultats » | c'est un **JWT expiré** |
| `supabase-patterns.md` | upload 2 Mo, `upsert` sans policy `FOR UPDATE`, bucket lisible par `anon` | limite 1 Mo + policy `avatars_update` + filtre sur le dossier |
| `api-patterns.md` | `params.sort` passé brut à `.order()` | whitelist Zod (`z.enum`) |
| `api-patterns.md` | curseur de pagination sur `created_at` seul | curseur composite `(created_at, id)` |
| `api-patterns.md` | `bulkDelete` lisant `count` sans `{ count: "exact" }` | comparer les lignes retournées au demandé |
| `api-patterns.md` | `unstable_cache` appelant `createClient()` (cookies) | client anon sans cookies |
| `api-patterns.md` | `try/catch` avalant `redirect()` | `unstable_rethrow(error)` |
| `security-patterns.md` | « les Server Actions ont un token CSRF » | faux : comparaison `Origin`/`Host` |
| `security-patterns.md` | `headers()` sans `await` | ne compile pas en Next 15 |
| `security-patterns.md` | rate limiting par `Map` en mémoire, premier segment de `x-forwarded-for` | store partagé, **dernier** segment |
| `nextjs-patterns.md` | autorisation dans un `layout.tsx` | un layout n'est jamais une frontière d'autorisation |
| `state-management.md` | `router.push` par frappe, pas de `Suspense` | `replace` + `startTransition` |
| `performance-patterns.md` | `ssr: false` sans `"use client"` | erreur de build Next 15 |
| `feedback-patterns.md` | réimplémente `EmptyState` avec une API différente du composant réel | renvoyer vers le composant du registry |

**Si ce projet a du code qui suit l'une de ces règles fausses, signale-le** — notamment le
middleware auth (cookies perdus au redirect) et les Server Actions qui renvoient `error.message`
brut. Ne corrige pas le code métier sans mon accord : liste les fichiers concernés et attends.

### E4. Allègement

- `coding-standards.md` : retire les sections « Server Actions » et « Supabase Client » (elles
  **contredisaient** `api-patterns.md` — trois traitements différents de l'auth manquante),
  « Error Handling avancé », « File Size & Complexity », « Early Returns », « TypeScript Strict
  Rules ». Elles sont remplacées par des renvois et par des règles ESLint.
- **Conventions de base : 3 → 1.** Seul `coding-standards.md` est lu systématiquement.

## Lot F — Checklists

- `code-review.md` : réduit au **transverse** (périmètre du diff, hygiène, conformité à la
  demande, documentation de méthode). Les ~40 règles qui doublonnaient les conventions sont
  supprimées — elles constituaient une troisième source de vérité déjà divergente.
- `story-done.md` : ne réénumère plus les rubriques de `code-review.md` et n'exige plus une
  review « par un agent isolé » (la v2 n'en utilise pas).
- `readiness-gate.md` : les items d'infrastructure (`pnpm install`, `.env.local`, serveur
  démarré) sortent du gate — `plan` n'a pas le droit de lancer une commande système, le gate
  était donc impassable. Ils deviennent les AC de la story de setup.
- `story-ready.md` : items conditionnels pour les stories techniques (pas de parcours ni de FR).

## Lot G — Configuration

1. **`eslint.config.mjs`** : ajoute la liste `ignores` (`.next/**` en tête — sans elle,
   `pnpm lint` explose dès qu'un build a été lancé une fois, et le gate devient impassable),
   puis les règles qui remplacent la prose supprimée : `max-lines`, `max-lines-per-function`,
   `max-params`, `max-depth`, `no-empty`, `no-restricted-syntax` (enums), `import/order`.
   Installe `eslint-plugin-import`. Exempte `src/components/ui/**` d'`import/order` (généré par
   la CLI Shadcn) et `src/app/design-system/**` des limites de lignes.
2. **`vitest.config.ts`** : `setupFiles: ["./tests/setup.ts"]` si `tests/setup.ts` existe — en
   v1 il était vide alors que le fichier importe les matchers jest-dom.
3. Lance `npx eslint . --fix` pour absorber l'ordre des imports, puis vérifie le diff.

## Lot H — Code applicatif (4 fichiers seulement)

1. **Conflit de route.** Si `src/app/page.tsx` **et** `src/app/(dashboard)/page.tsx` existent
   tous les deux, ils résolvent le même chemin `/`. Next 15 n'échoue pas : il en choisit un en
   silence, et l'autre devient du code mort. Vérifie la table de routes de `pnpm build`. Si
   `src/app/page.tsx` ne fait qu'un `redirect()` vers une route qui n'existe pas, supprime-le.
   **Si ce projet a une vraie page d'accueil, ne touche à rien** et signale-le.
2. **`src/app/layout.tsx`** : monter `<Toaster />` s'il ne l'est pas (sinon tout `toast.success()`
   est silencieux) et ajouter le skip link + `<div id="main-content">`.
3. **`src/components/ui/badge.tsx`** : variants `success`/`warning` en `bg-emerald-500` /
   `bg-amber-500` en dur → `bg-success` / `bg-warning` (les tokens existent dans `globals.css`).
4. **`.env.example`** : si la variable déclarée est `NEXT_PUBLIC_APP_URL` alors que le code lit
   `NEXT_PUBLIC_SITE_URL`, aligner. Vérifie lequel des deux ce projet utilise réellement.

## Lot I — CLAUDE.md et README.md

`CLAUDE.md` est réécrit : cible < 200 lignes (recommandation officielle), sections « Échelle du
changement », « Conventions routées par globs », « Skills », « Vérifier, commiter, pousser ».

**Attention :** la section « Projet » et toute règle spécifique à ce projet (domaine métier,
contraintes, gotchas capturés par `wrap-up`) doivent être **reportées** dans le nouveau
fichier. Liste-les-moi avant d'écraser.

Retire les sections qui doublonnent les conventions routées (règles Next.js et Supabase
détaillées) : elles divergeront.

---

## Vérification

```
pnpm install
pnpm verify
pnpm build
```

`check:framework` doit passer. S'il signale des **globs morts**, c'est le signal le plus utile
de toute la migration : l'arborescence de ce projet ne correspond pas aux globs du template.
Corrige les globs dans `_index.md`, pas le code.

Teste ensuite le gate en conditions réelles :

```
git push --dry-run     # doit être BLOQUÉ
```

Puis un cycle complet : `pnpm verify` → `commit-push`. Le second doit afficher
« checks déjà passés » sans rien rejouer.

## Rapport attendu

Termine par :

1. **Fait** — les lots appliqués, avec le nombre de fichiers touchés par lot.
2. **Adapté** — ce qui a été ajusté à ce projet plutôt que copié (globs, conventions personnalisées, sections de CLAUDE.md reportées).
3. **Non fait** — les lots sautés parce que déjà en v2, et pourquoi.
4. **À arbitrer** — le code métier qui suit une règle v1 désormais reconnue comme fausse
   (middleware auth, `error.message` exposé, autorisation en layout, `headers()` sans `await`).
   Liste les fichiers, ne corrige pas sans accord.
5. **Résultat des checks** — sortie de `pnpm verify` et de `pnpm build`.

Ne commite pas tant que je n'ai pas validé le point 4.
