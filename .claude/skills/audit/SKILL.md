---
name: audit
description: "Audit complet d'une codebase existante, confrontée aux conventions écrites du projet : sécurité, données, frontières Next, robustesse, types, tests, UI, performance, cohérence, ops."
when_to_use: "Sur demande explicite d'un audit large : 'audite la codebase', 'passe tout le projet en revue', 'où sont les risques', 'fais un état des lieux du code', reprise d'un projet existant, préparation d'une mise en production. NE PAS déclencher après une implémentation — c'est `revue` qui audite un diff. NE PAS déclencher pour une question sur une règle — c'est `conventions`."
argument-hint: "[lot : chemin, domaine, ou 'tout']"
allowed-tools: Read, Grep, Glob, Bash
---

# audit — confronter la codebase entière aux règles écrites

`revue` audite un **diff**. Ce skill audite **l'existant** : du code déjà écrit, souvent avant
que les conventions n'existent, et que personne n'a relu depuis.

**La mission n'est pas d'avoir un avis.** C'est de produire une liste de défauts que quelqu'un
d'autre peut vérifier ligne par ligne sans faire confiance à l'auditeur.

> Un audit qui produit 40 findings dont 12 sont faux vaut moins qu'un audit qui en produit 15
> tous vrais. **La précision prime sur le volume.** Un faux positif ne coûte pas un finding :
> il coûte la confiance dans toute la liste.

## Non-négociables

1. **Pas de citation → pas de gravité.** Tout défaut HAUTE ou MOYENNE pointe une source citable :
   `conventions/<fichier>.md § <section>`, `CLAUDE.md § <section>`,
   `checklists/code-review.md § <section>`, un ADR de `docs/decisions/`, ou un AC de story.
   Sans source, c'est un avis → BASSE. **Vérifier que la section citée existe** avant de l'écrire.
2. **Aucune règle citée de mémoire.** Toute règle invoquée a été lue pendant cet audit.
3. **Chaque finding est reproductible** : `fichier:ligne` + un chemin d'échec concret
   (entrée → comportement observé → comportement attendu). Sans chemin d'échec nommable, ce
   n'est pas un défaut, c'est une intuition.
4. **Zéro finding inventé.** Rien sur un axe → écrire « rien ». Ne jamais remplir pour justifier
   l'effort fourni.
5. **Lire les fichiers en entier.** Un fragment correct dans un fichier incohérent reste un problème.
6. **Lecture seule.** Aucun fichier modifié, aucun fix appliqué, aucun commit. L'audit constate.
   Seule exception : captures et rapport du lot UI/UX, écrits sous `docs/review/`.

## Étape 1 — Contraintes du projet

**À faire avant tout le reste.** Ce sont elles qui distinguent un défaut réel d'un faux positif,
et elles ne sont dans aucune convention générique.

| Source | Ce qu'on y cherche |
|--------|--------------------|
| `docs/decisions/` (tous les ADR) | invariants qu'on n'a pas le droit de violer, et **écarts déjà assumés** |
| `docs/architecture.md` | modèle de données, frontières, où vit l'autorisation réelle |
| `eslint.config.mjs` + toute config d'exemption | dette **déclarée** — un fichier exempté n'est pas un défaut |
| `.method/conventions/tech-stack.md` | versions pinées et la raison du pin |
| `src/app/globals.css` (ou équivalent) | tokens de design réellement définis |
| `.env.example` | variables attendues |

**Annoncer ces contraintes en tête du rapport.** Trois questions doivent avoir une réponse
explicite avant de commencer :

- **Où se joue l'autorisation réelle ?** Middleware, Server Action, RLS, ou une combinaison. Un
  composant de garde côté UI (`<RoleGate>` et assimilés) est une **ergonomie**, jamais une
  frontière de sécurité — mais l'inverse est vrai aussi : ne pas signaler comme non protégée une
  action qui l'est côté serveur.
- **Le schéma de base est-il partagé ?** Si une autre application lit la même base, toute
  évolution est **additive** : un `DROP`, un renommage ou un changement de type est un incident
  de production, gravité HAUTE d'office.
- **Quelle dette est gelée ?** Une liste d'exemptions dans la config ESLint est une décision, pas
  un oubli. Un fichier qui y figure ne produit pas de finding sur ce critère. En revanche, un
  fichier **hors liste** qui dépasse, ou une dégradation d'un fichier listé, se signale.

## Étape 2 — Périmètre

Établir la liste exacte des fichiers du lot avec `Glob` — jamais de mémoire. Annoncer le nombre.

### Découper en lots

Un audit de codebase entière ne tient pas dans une passe honnête : au-delà de ~15 fichiers, la
lecture « en entier » devient une fiction. Découper par **frontière technique**, pas par volume :

- `src/lib/actions/**` + `src/lib/schemas/**` — mutations et validation
- `supabase/migrations/**` + `src/lib/supabase/**` — données
- `src/app/**` — routes, layouts, frontières serveur/client
- `src/components/**` — UI, accessibilité, duplication
- `tests/**` + config — filet de sécurité et outillage

Chaque lot est **indépendant** : il refait le routing des conventions et produit son propre
rapport. Un lot peut être confié à un agent séparé. Ne jamais supposer qu'un autre lot a déjà
vérifié quelque chose.

### Lots qui exercent le produit : UI/UX et AX

À chaque jalon (fin de vague, avant livraison), deux lots s'ajoutent aux lots de code. Ils ne
lisent pas seulement le code : ils **l'exercent**. Même barème, mêmes non-négociables.

**UI/UX (web + widgets).**
1. Captures réelles : build avec env factice, un script Node unique qui lance `next start`,
   attend le ready, capture via Playwright chaque page en clair ET sombre, desktop ET mobile
   390 px, puis tue le serveur. Widgets MCP : ouvrir les bundles buildés en `file://` avec le
   `structuredContent` RÉEL du tool qui les déclare, plus l'état sans données. Captures dans
   `docs/review/screens/`.
2. Grille notée 1-5 (justification ≤ 3 lignes) : hiérarchie · états loading/empty/error ·
   feedback < 400 ms · cohérence tokens et dark · microcopy · a11y. Widgets en plus :
   glanceable (aperçu + 2-3 actions), lisible à 400 px, poids.
3. Parcours critiques déroulés sur pièces : impasses, boutons morts, liens cassés.
   Rapport dans `docs/review/ux-report.md`, findings classés QUICK WIN (≤ 1 h) ou CHANTIER.

**AX (canal MCP).** Se mettre à la place du modèle, qui ne voit QUE les métadonnées.
1. Pour chaque golden query de `docs/mcp-golden-queries.md`, lire uniquement
   name/title/description/inputSchema/annotations et les `instructions` serveur, puis prédire
   honnêtement le routage (tools, ordre, arguments). Erreur ou hésitation = finding qui nomme LE
   champ fautif et la révision prête à coller (un champ à la fois).
2. Contrats : format « Use this when… / Do not use for… », `.describe()` partout, graphe
   `next_actions` fermé, erreurs actionnables, annotations honnêtes, dual-host
   (`mcp-patterns.md` § 3 à § 5).
3. Anti-sur-déclenchement : les golden queries négatives sont-elles protégées ?
   Sortie : tableau routage prédit / attendu avec le taux, puis les findings.

Les corrections suivent la règle de fin d'audit : décidées par gravité avec l'utilisateur, faites
par `dev`, puis golden queries rejouées sur les deux hosts si une métadonnée a changé.

## Étape 3 — Routing des conventions

1. Lire `.method/conventions/_index.md`.
2. Matcher la colonne **Globs** contre les fichiers du lot → tags actifs.
3. Résoudre en fichiers de conventions, dédupliquer.
4. Lire **en entier** : `coding-standards.md` (toujours) + chaque convention dont un tag est actif.
5. Annoncer le routing :

```
Périmètre   : 14 fichiers
Tags actifs : api, forms, security, supabase, registry
Conventions : coding-standards, api-patterns, forms-patterns, security-patterns,
              supabase-patterns, component-registry
```

La liste des conventions se **déduit** des tags : une convention annoncée sans tag correspondant
signale que le routing n'a pas été appliqué. Aucun tag actif est une information valide, pas un échec.

## Étape 4 — Lecture

Lire chaque fichier du lot en entier. Noter le **chemin d'exécution réel** : qui appelle quoi,
avec quelles données, sous quelles garanties. C'est ce qui permettra de trancher à l'étape 6.

## Étape 5 — Confrontation

Pour chaque convention chargée, dérouler ses règles contre les fichiers qui ont activé son tag.
Une règle non applicable est ignorée **silencieusement** — ne pas la lister comme « OK ».

Puis passer la grille des 10 axes ci-dessous, puis
`.method/checklists/code-review.md` pour le transverse.

**Ne pas re-signaler ce que `pnpm verify` attrape déjà.** ESLint, TypeScript et les tests sont
exécutés à chaque commit : les doubler est du bruit. L'audit cherche ce qu'aucun outil ne voit.

## Étape 6 — Auto-réfutation (la seule étape qui protège la crédibilité)

Pour chaque finding candidat, essayer activement de le **détruire** :

- Le chemin d'échec existe-t-il vraiment, ou l'ai-je supposé ?
- Une garde en amont — middleware, layout, action appelante, contrainte de base — le rend-elle impossible ?
- La section citée dit-elle **littéralement** ce que je lui fais dire ?
- Un test existant couvre-t-il déjà le cas ?
- Est-ce couvert par ESLint, TypeScript, ou une exemption déclarée à l'étape 1 ?

**Dans le doute, supprimer le finding.** Le signaler en « angle mort » s'il mérite une
vérification humaine.

---

## Grille — 10 axes

Chercher ce qui produit un défaut réel. Ne pas transformer en checklist décorative.

**A. Sécurité & autorisation** — mutation sans vérification d'identité en tête · rôle contrôlé
uniquement côté UI sans équivalent serveur · clé de service utilisée hors des cas documentés par
un ADR · secret journalisé ou renvoyé au client · webhook sans validation de signature ni
idempotence · endpoint public sans limitation de débit · ressource récupérée par identifiant sans
vérifier l'appartenance · requête construite par concaténation · `dangerouslySetInnerHTML` sur une
donnée non maîtrisée · upload sans contrôle de type, de taille ou de chemin.

**B. Intégrité des données** — migration destructive ou renommage quand le schéma est partagé ·
migration dont l'horodatage précède la dernière appliquée · colonne de filtre ou de tri sans index ·
enregistrement filtré par libellé au lieu d'identifiant · écritures multiples qui devraient être
atomiques · absence de contrainte d'unicité là où le code la suppose · liste non bornée passée à un
`IN` · jointure écrite sur la clé étrangère au lieu du nom de table.

**C. Frontières Next.js** — `"use client"` trop haut dans l'arbre · import d'un module client
depuis du code serveur (les valeurs arrivent `undefined`) · action hors du contrat
`auth → Zod → exécution → revalidation → {data} | {error}` · revalidation partielle (la liste se
rafraîchit, le détail non) · Route Handler là où une Server Action suffisait · deux `page.tsx`
résolvant le même chemin une fois les route groups retirés · erreur de validation avalée ou
renvoyée brute · opération lancée sans attendre alors que son échec doit être visible.

**D. Correction & robustesse** — `await` pouvant rejeter sans traitement · `null` ou tableau vide
non géré sur un chemin réel · course entre deux mutations concurrentes · calcul monétaire en
flottant · comparaison de dates sans fuseau explicite · décalage d'un rang sur une pagination ou un
découpage · état incohérent laissé par une opération partiellement échouée · réponse d'API externe
supposée conforme sans validation.

**E. Contrats de types** — `any` ou `as` masquant une divergence réelle · type manuel divergeant du
type généré depuis la base · champ optionnel traité comme garanti · union non exhaustive sur un
`switch` de statut · schéma de validation plus permissif ou plus strict que la colonne
correspondante.

**F. Tests** — comportement critique sans aucun test (authentification, autorisation, calcul
métier, génération de document, webhook) · test qui n'assert rien de significatif ou qui teste le
mock · fixture ne correspondant plus à la forme réelle des données · bug corrigé sans test de
non-régression · fichier de la dette gelée sans filet de test — le découper est impossible sans.

**G. UI, accessibilité, responsive** — classe utilitaire inexistante (Tailwind ignore une classe
inconnue **en silence** : vérifier contre les tokens réellement définis) · action inatteignable au
clavier · focus perdu à l'ouverture ou la fermeture d'une surface modale · contraste insuffisant ·
attribut `aria-*` absent sur un contrôle custom · tableau sans conteneur scrollable · état de
chargement, d'erreur ou vide absent sur une surface qui peut l'atteindre.

**H. Performance** — requête dans une boucle · chargement complet d'une table là où une pagination
existe · absence de `loading.tsx` sur une route lente · re-render évitable sur une liste large ·
`select('*')` là où quelques colonnes suffisent · travail lourd côté client alors qu'il peut être
fait côté serveur.

**I. Cohérence & duplication** — logique déjà présente dans `component-registry.md` ·
deux implémentations divergentes de la même règle métier · nommage hors `coding-standards.md` ·
composant contournant un composant partagé existant · constante métier codée en dur à plusieurs
endroits.

**J. Opérations & configuration** — variable d'environnement utilisée mais absente de
`.env.example` · secret en dur · workflow CI pouvant échouer en silence · configuration incohérente
avec l'usage réel · dépendance dépinée dont le pin était justifié · script capable d'écrire contre
la production sans garde-fou.

---

## Gravité

| Gravité | Les deux conditions doivent être vraies |
|---------|------------------------------------------|
| 🔴 **HAUTE** | Source citable violée **ET** impact = sécurité, perte ou corruption de données, casse d'un système tiers partagé, build cassé, ou fonctionnalité annoncée non livrée |
| 🟠 **MOYENNE** | Source citable violée, sans impact immédiat : dette, incohérence, test manquant, risque latent |
| 🔵 **BASSE** | Aucune source citable — c'est un avis. Non bloquant, jamais corrigé d'office |

Une règle qui semble manquer aux conventions se remonte en **BASSE, mention « convention à
créer »**. C'est le rôle de `wrap-up` de l'écrire, après validation — pas celui de l'audit.

## Sortie

```
## Audit — <lot>

Contraintes  : <ce qui a été établi à l'étape 1 : où vit l'autorisation, schéma partagé ou non,
                dette gelée>
Périmètre    : <n> fichiers
Conventions  : <liste déduite des tags>

### Défauts

| # | Gravité | Fichier:ligne | Axe | Règle violée | Défaut | Scénario d'échec | Fix |
|---|---------|---------------|-----|--------------|--------|------------------|-----|

### Angles morts

Ce que ce lot n'a pas pu couvrir, et pourquoi : comportement runtime non observable en lecture,
dépendance externe, fichier illisible, finding supprimé à l'étape 6 mais qui mérite une
vérification humaine.

### Verdict

HAUTE : n · MOYENNE : n · BASSE : n
```

Une ligne = un défaut. Pas de résumé décoratif par section, pas de « points positifs », pas
d'emoji hors colonne gravité.

## Pièges du reviewer

- **Signaler ce qu'ESLint ou TypeScript attrape déjà** — bruit pur.
- **Traiter une dette déclarée comme un défaut** — elle est assumée, c'est écrit.
- **Citer une section qui n'existe pas** — vérifier avant d'écrire.
- **Confondre une garde d'ergonomie UI avec une frontière de sécurité** — et l'inverse : signaler
  comme non protégée une action qui l'est côté serveur.
- **Proposer un refacto non demandé** — l'audit constate, il ne redessine pas.
- **Gonfler la gravité pour être entendu** — le barème est la seule échelle.
- **Supposer un chemin d'échec sans le tracer** — si l'entrée qui casse n'est pas nommable, le
  finding n'est pas mûr.

## Fin d'audit

Terminé quand chaque fichier du lot a été lu en entier, chaque convention routée déroulée, chaque
finding a survécu à l'étape 6, et les angles morts sont déclarés.

**Aucun fix n'est appliqué.** La sortie est un rapport. Les corrections se décident ensuite, par
gravité, avec l'utilisateur — et passent alors par `dev`, qui rechargera les conventions sur les
fichiers réellement touchés.

Si plusieurs lots ont été audités, terminer par une synthèse : total par gravité, défauts
transverses apparaissant dans plusieurs lots, et l'ordre de traitement recommandé.
