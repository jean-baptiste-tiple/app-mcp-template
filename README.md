# App MCP Template

Template Git réutilisable pour bootstrapper une **app MCP-first** avec la Tiple Method : structure,
templates de documents, checklists, conventions techniques routées, et skills Claude Code
auto-déclenchés. Stack de base : Next.js 15 + TypeScript strict + Tailwind + Shadcn/ui, **canal
MCP installé** (Claude + ChatGPT, widgets MCP Apps). Base de données et auth optionnelles via
starter (Supabase Cloud, ou self-hosted souverain sur Scaleway ou ailleurs).

Le principe : **les garanties de qualité s'attachent au changement, pas à un workflow qu'il faut
penser à lancer.** Les conventions se chargent depuis les fichiers touchés, la review confronte le
code aux règles écrites plutôt qu'à une opinion, et le gate de commit est appliqué par un hook —
pas par une consigne qu'on peut oublier.

## Canal MCP

Installé par défaut : endpoint `/api/mcp` (Streamable HTTP, stateless), tool démo câblé
schéma Zod → service partagé → tool, résultats texte et structurés, widget MCP Apps dual-host
(Claude + ChatGPT) buildé en single-file, test `InMemoryTransport` et smoke HTTP
(`pnpm mcp:smoke`). L'auth OAuth 2.1 s'active avec le starter Supabase + Auth ; en production,
`/api/mcp` refuse les appels tant qu'elle ne l'est pas. Mode d'emploi : `src/mcp/README.md`.

## Design System

Un design system **neutre, à personnaliser par projet**, est inclus :

- **Thème :** palette neutre (oklch) regroupée dans un bloc « THÈME PROJET » de `src/app/globals.css`, dark mode class-based (next-themes), Tailwind v4 CSS-first
- **34 composants Shadcn/ui** installés (style new-york) dans `src/components/ui/`
- **Composants métier** : PageContainer, EmptyState, StatCard, DataTable, ThemeToggle, ThemeProvider, AppLogo, SidebarNav, CopyButton
- **Icônes :** Phosphor (lucide-react réservé aux internes Shadcn)
- **Preview interactive** : route `/design-system` pour voir tous les composants
- **Documentation** : `docs/design/system.md` (dont « Personnaliser le thème »)

## Starters

Le canal MCP est installé ; le reste est minimal par défaut. Les starters dans `.method/starters/` ajoutent des fonctionnalités complètes. Ils sont **identifiés** par `/plan` (qui ne fait que documenter) et **installés** par `/dev` dans la story de setup technique.

| Starter | Dossier | Ce qu'il ajoute |
|---------|---------|-----------------|
| **Supabase + Auth** | `.method/starters/supabase-auth/` | Base de données, auth (login/signup/reset), middleware, Server Actions, pages auth, CI migrations |
| **Plateforme Otomata** | `.method/starters/oto-platform/` | Pages, tableaux, procédures, équipes et accès dans l'ERP ; MCP à six outils où s'inscrivent les fonctions métier. **Remplace le MCP du template** (ADR-001). Exige `supabase-auth` ou Postgres + OIDC |

## Plateforme Otomata (option)

[`@otomata_tech/oto_platform`](https://www.npmjs.com/package/@otomata_tech/oto_platform) (MIT,
sources TypeScript, dépôt [`otomata-tech/oto-pkg`](https://github.com/otomata-tech/oto-pkg)) est la
« plateforme MCP d'entreprise » d'Otomata en paquet npm : écrans, API, serveur MCP, services et
migrations d'un schéma Postgres `platform`. Elle s'installe dans l'application, qui monte ses
routes. Le connecteur MCP « Démo » d'Otomata en est une instance.

**Quand la choisir :** un ERP ou SaaS interne dont les équipes écrivent leur savoir-faire
(procédures, pages, tableaux) et veulent que leurs assistants le suivent et appellent les fonctions
métier de l'ERP. Sans ce besoin, le MCP du template suffit. La décision se prend au cadrage
(`/plan`) ; l'installation suit `.method/starters/oto-platform/README.md`.

### Ce qu'elle apporte

| Domaine | Contenu |
|---|---|
| Contenus | Arbre de nœuds par organisation, équipe et espace privé : **pages** (blocs : titres, listes, callouts, code, mermaid, fichiers, tâches), **tableaux** (lignes, agrégats, réclamation de lignes), **procédures** (étapes, chacune un appel de fonction), contexte servi aux assistants |
| Accès | Organisations, équipes, membres, invitations, règles par nœud (`read`, `write`, `manage`), accès général, entrée sans invitation par domaine d'email |
| Vie des contenus | Brouillons et révisions, liens `[[chemin]]` et contenus liés, impact d'un déplacement, duplication, corbeille 30 jours, journal des actions |
| Partage | Liens publics par nœud (`/p/<jeton>`, `noindex`), image de partage Open Graph |
| Fichiers joints | Stockage S3 compatible (Supabase Storage, Scaleway, MinIO) par URL présignée ; visionneuse HTML isolée ; dépôt par lien à usage unique pour un assistant |
| Administration | Marque et thème (8 thèmes), connecteurs, drapeaux par organisation, usage, retours des assistants, MCP admin (`/api/mcp-admin`) |
| MCP | Six outils figés : `context` (consignes, routage vers la bonne procédure, `ctx`), `find`, `read`, `call`, `write`, `feedback` ; vues dans la conversation (tableau, fiche, page) sur Claude et ChatGPT |

### Les faces du paquet

| Export | Rôle |
|---|---|
| `/ui` | Écrans et composants React (aucun accès base) ; styles `ui/styles.css` sous la racine `.oto` |
| `/schemas` | Schémas Zod (`zod/v4`) partagés |
| `/server` | Services : seule porte d'écriture (Zod → droits → écriture → journal) ; `defineErpFunction`, `registerFunctions`, `registerOrgLimits` |
| `/api` | Route handlers `/api/platform/*` (`handlePlateforme`) |
| `/mcp` | `handleMcpPost`, `handleResourceMetadata` |
| `/widgets` | Types d'une vue de l'ERP (`ErpView`) |
| `/migrations/*` + CLI `oto-platform` | SQL additif du schéma `platform` ; `migrations sync`/`check`, `db prepare`, `widgets build` |

### Intégrer l'ERP

- **Fonctions métier** : chaque capacité reste un service de `src/lib/services/`, appelé par une
  Server Action côté web et par une fonction ERP (`defineErpFunction`, classe `read`, `write` ou
  `sensitive`) côté MCP. Un assistant la trouve par `find` et l'exécute par `call` ; une procédure
  l'enchaîne dans ses étapes. Un besoin nouveau = une fonction, jamais un outil.
- **Écrans dans l'ERP**, trois niveaux : coque entière (section « Plateforme »), morceaux du rail
  dans la barre latérale de l'ERP, ou écran seul dans une fiche métier (`TableauDuNoeud`,
  `EcranDeNoeud`, `ProcedureDuNoeud`).
- **Vues de l'ERP dans la conversation** : un `ErpView` par vue, construit par
  `oto-platform widgets build`.

### Options

| Option | Par défaut | Comment l'activer |
|---|---|---|
| Émetteur d'identité | Supabase Auth | `PLATFORM_OIDC_ISSUER` + `PLATFORM_OIDC_AUDIENCE` (Logto, Keycloak), Postgres sans Supabase |
| Vues dans la conversation | Éteintes (texte seul) | `handleMcpPost(…, { widgets: true })` |
| Fichiers joints | Désactivés | Les cinq `PLATFORM_STORAGE_*` |
| Inscription libre (création d'organisation) | Fermée, invitation seule | `handlePlateforme(…, { signup: { orgCreation, admit? } })` |
| Entrée sans invitation | Fermée | Réglage administrateur, onglet Membres (`readOpenEntry`) |
| Capacités par organisation (offres) | Sans limite | `registerOrgLimits({ read, raiseUrl? })` |
| Adresse servie (preview, domaine unique) | Organisation = adresse appelée | Fonction `ServedHost` passée aux trois points d'entrée |
| Partage public | Monté si l'hôte sert `/p/<jeton>` | Routes et page publique de l'hôte de référence |

### Ce que l'activation change dans ce template

Le paquet sert `/api/mcp` en dur : activé, il **remplace** `src/mcp/`, `src/app/api/[transport]/` et
`widgets/` (ADR-001, `docs/decisions/`). Les conventions `mcp-patterns.md` sur les instructions, le
design de tools et les widgets ne s'appliquent plus ; la parité par services, le « zéro IA
serveur » et les golden queries restent dus. Écarts de dépendances : `@hookform/resolvers` ^5
(le template est en ^3), schémas partagés en `zod/v4` (zod 3.25 conservé). Montées de version par
Renovate, migrations recopiées par `oto-platform migrations sync` à chaque version.

## Quick Start

```bash
# 1. Cloner le template
git clone <url-du-template> mon-projet
cd mon-projet

# 2. Installer les dépendances
pnpm install

# 3. Vérifier que le template est sain (4 checks)
pnpm verify

# 4. Lancer le dev server — `/` sert le dashboard placeholder
pnpm dev
```

Puis, dans Claude Code : **`/plan`** pour cadrer le projet. C'est la seule commande à taper —
tout le reste se déclenche sur l'intention. Le cadrage identifie les starters nécessaires et
crée la story de setup ; c'est `dev` qui les installera ensuite.

Rien n'oblige à passer par `/plan` : sur un besoin qui tient en quelques fichiers, décrire ce
qu'on veut suffit, et le cadrage se refusera lui-même s'il n'apporte rien.

## Skills

Tout est un **skill** (`.claude/skills/`) : il se déclenche **tout seul** sur l'intention, et
reste invocable explicitement en `/<nom>` quand tu veux forcer le passage.

| Skill | Déclenchement | Description |
|-------|---------------|-------------|
| `dev` | auto — avant toute modif de `src/`, `tests/`, `supabase/` | 2 modes (lecture / écriture), 3 échelles (Micro / Standard / Module). |
| `revue` | auto — dès l'échelle Standard, « review », « relis » | Route les conventions par globs sur le diff et confronte le code aux règles lues. |
| `verify` | auto — « vérifie », « ça compile ? », après un fix | `check:framework` + `type-check` + `lint` + `test`. |
| `commit-push` | auto — « commit », « push », « envoie » | Les 4 checks + changelog + commit + push. **Seul chemin autorisé** (gate par hook). |
| `wrap-up` | auto — « on a fini », « c'est bouclé » | Capture les apprentissages : conventions, ADR, registry. Écrit, puis annonce chaque écriture. |
| `plan` | **explicite uniquement** (`/plan`) | Cadrage à la carte : brief, PRD par parcours, archi, design, epics/stories. 4 niveaux — **refus**, **story seule**, évolution ciblée, initial. |
| `conventions` | auto — question sur une règle, sans fichier touché | Répond depuis `.method/conventions/` en citant la source, jamais de mémoire. |
| `audit` | demande explicite (`/audit`) | Audite la **codebase existante** par lots : 10 axes, auto-réfutation avant de rendre ; plus deux lots qui exercent le produit, UI/UX (captures réelles) et AX (simulation de routage des golden queries). |

`plan` est le seul à ne jamais s'auto-déclencher : un cadrage réécrit PRD, architecture et
stories. Claude le **propose** face à un besoin produit large, il ne le lance pas.

### `revue` et `audit`

`revue` confronte un **diff** aux conventions routées sur les fichiers touchés — c'est le
cérémonial de fin d'implémentation, à partir de l'échelle Standard.

`audit` confronte **l'existant** : du code écrit avant que les conventions n'existent, ou repris
d'ailleurs. Il découpe en lots par frontière technique (actions, données, routes, composants,
tests), refait le routing pour chacun, et passe 10 axes — sécurité, intégrité des données,
frontières Next, robustesse, types, tests, accessibilité, performance, duplication, ops.

Les deux partagent la même règle : **pas de source citable, pas de gravité**. Et `audit` ajoute
une étape d'**auto-réfutation** avant de rendre — chaque finding candidat doit survivre à une
tentative de le détruire. Un faux positif ne coûte pas un finding, il coûte la confiance dans
toute la liste.

Sa première étape est de lire les **contraintes du projet** — ADR, config d'exemptions ESLint,
tokens réellement définis — parce que c'est ce qui distingue un défaut réel d'une dette assumée.

### Le gate de commit

`git commit` et `git push` directs sont **bloqués** par `.claude/hooks/enforce-git-gate.mjs`.
Tout passe par le skill `commit-push`, qui exécute d'abord `check:framework`, `type-check`,
`lint` et `test`. `--no-verify` et `--force` sont refusés sans échappement possible.

Le déclenchement d'un skill est un jugement du modèle, donc probabiliste — acceptable pour
charger des conventions, pas pour un gate de push. D'où le hook, qui lui est déterministe.

### L'échelle, pas les mots-clés

`dev` a **2 modes** — lecture (read-only) ou écriture — et l'ampleur du process est déterminée
par **ce que le changement touche**, jamais par le vocabulaire de la demande :

| Échelle | Reconnaissance | Process |
|---|---|---|
| **Micro** | 1-2 fichiers, aucune nouvelle surface | conventions → impl → type-check → review inline |
| **Standard** | 3-5 fichiers, ou création d'une fonction / composant / action | + tests → `revue` → changelog |
| **Module** | nouvelle surface (route, table, parcours), changement DB, ou ≥ 6 fichiers | **propose une story avant de coder** → tout le Standard → registry → ADR si invariant → sprint status |

Micro ne veut pas dire « sans garantie » : conventions et type-check s'appliquent **à toute
échelle**. Ce qui s'adapte, c'est le cérémonial — pas la vérification.

Deux garde-fous se déclenchent sur la nature réelle du travail, pas sur le verbe employé :
une **correction de bug** exige d'abord un test qui reproduit ; une **réorganisation sans
changement de comportement** exige des tests **identiques avant/après** (un test modifié signifie
un comportement modifié).

### Le cadrage à la carte

`/plan` regarde ce qui existe déjà et choisit son niveau :

- **Initial** — `docs/prd.md` absent → chaîne complète
- **Évolution** — PRD rempli, la demande touche un parcours → ce parcours + la cascade réellement impactée, jamais de réécriture
- **Refus** — la demande ne touche ni parcours ni modèle de données → **aucun document produit**, bascule directe en implémentation

Le refus est une issue normale : un cadrage ne doit pas se dérouler pour une demande de 20 lignes.

**Rien n'est obligatoire.** Pas de maquette, pas de story, pas de Supabase, pas de design system
custom : le travail se fait quand même. Une référence UI à `N/A` est une donnée déclarée, jamais
un défaut — la review ne la pénalise pas, elle retire simplement le critère correspondant.

Détail : [.claude/skills/plan/SKILL.md](.claude/skills/plan/SKILL.md).

### Routing des conventions

Le mapping `fichier touché → tag → convention` a **une seule source de vérité** : la colonne
**Globs** de [`.method/conventions/_index.md`](.method/conventions/_index.md). Elle est consommée
par `dev` (avant d'écrire) et par `revue` (avant de reviewer).

**Il n'y a pas de skill par tag.** `dev` et `revue` lisent `_index.md` et matchent les
globs eux-mêmes : un skill intermédiaire par domaine n'ajouterait qu'un niveau d'indirection et
une occasion de diverger. Le skill `conventions` couvre le seul cas que les globs ne peuvent pas
atteindre — une question posée sans qu'aucun fichier ne soit touché.

Une seule convention est lue systématiquement (`coding-standards.md`, 133 lignes). Le registry
et la stack sont routés comme les autres : vérifier le registry n'a de sens qu'en créant un
composant, la stack qu'en touchant aux dépendances.

`pnpm check:framework` échoue si un tag n'a pas de globs, si **aucun glob d'un tag ne peut
matcher** (le mode de pourrissement principal : une réorganisation de `src/` désactive le
routing en silence), si une section citée en review n'existe plus, si un fichier de conventions
dépasse 400 lignes, si une checklist n'est appelée par rien, si un composant de
`src/components/` manque au registry, ou si la doc référence un `/skill` inexistant.

## Structure

```
├── CLAUDE.md                    # Instructions Claude Code (Tiple Method)
├── .claude/
│   ├── skills/                  # 6 skills de workflow + conventions + audit
│   ├── hooks/                   # enforce-git-gate.mjs (gate commit/push) + enforce-bash-rules.mjs
│   └── settings.json            # Déclaration des hooks
├── scripts/
│   └── check-framework.mjs      # Cohérence tags ↔ conventions ↔ skills ↔ hooks ↔ références
├── .method/
│   ├── templates/               # 6 templates de documents
│   ├── checklists/              # 5 checklists quality gates
│   ├── conventions/             # Conventions techniques routées par globs (_index.md = routing)
│   ├── starters/                # Starters optionnels (supabase-auth, oto-platform)
│   └── sprint/status.md         # Sprint tracking
├── docs/
│   ├── brief.md                 # Brief produit
│   ├── prd.md                   # PRD
│   ├── architecture.md          # Architecture technique
│   ├── changelog.md             # Journal des évolutions
│   ├── design/                  # Design system, maquettes, flows
│   ├── epics/                   # Epics détaillées
│   ├── stories/                 # Stories implémentables
│   └── decisions/               # ADRs (Architecture Decision Records)
├── src/
│   ├── app/
│   │   ├── (dashboard)/         # Layout principal + page servant `/`
│   │   ├── api/[transport]/     # Endpoint MCP `/api/mcp`
│   │   ├── .well-known/         # Metadata OAuth (RFC 9728)
│   │   └── design-system/       # Preview du design system
│   ├── components/
│   │   ├── ui/                  # 34 composants Shadcn/ui
│   │   └── ...                  # Composants métier (PageContainer, EmptyState, etc.)
│   ├── mcp/                     # Serveur MCP : tools, auth, résultats, widgets inlinés
│   └── lib/
│       ├── schemas/             # Schemas Zod partagés (form, action, tool)
│       ├── services/            # Logique métier partagée web ↔ MCP
│       └── utils/cn.ts          # Tailwind class merge
├── widgets/                     # Sources des widgets MCP Apps (build Vite single-file)
└── tests/                       # Unit, integration, e2e
```

## Personnaliser le template

Après le clone :

1. **`CLAUDE.md`** — Section "Projet" : nom et description
2. **Thème** — bloc « THÈME PROJET » de `src/app/globals.css` + police de `src/app/layout.tsx` (procédure : `docs/design/system.md`)
3. **`.method/conventions/tech-stack.md`** — Ajouter les libs spécifiques
4. **`package.json`** — Nom du projet

Puis lancer `/plan` pour démarrer la phase de cadrage (qui activera les starters si nécessaire).

## Conventions par tags

Les conventions techniques sont dans `.method/conventions/`, chargées automatiquement :

- **Base (toujours)** : `coding-standards.md` — une seule, volontairement courte
- **Par globs** : chaque fichier créé ou modifié active des tags → les conventions sont lues **en entier**
- **Mode story** : les tags du champ `Conventions` de la story s'ajoutent (union avec les globs)

Ce qui est appliqué par ESLint ou TypeScript n'est jamais répété en prose : une règle mécanisée
est vérifiée à chaque `pnpm lint`, la recopier ne fait qu'alourdir ce qu'il y a à lire.

| Contexte | Chargement |
|---|---|
| `/dev E01-S01` | Globs du diff **∪** tags déclarés dans la story |
| `/dev` (libre) | Globs des fichiers visés |
| `revue` | Globs du diff — mêmes règles, même source |
| Question sans fichier touché | Skill `conventions` : lit `_index.md`, puis les fichiers concernés |

Trois tags — `datetime`, `i18n`, `flags` — portent sur des préoccupations transverses qu'aucun
chemin ne révèle : formater un montant ou gater une fonctionnalité se fait dans n'importe quel
composant. Ils se déclarent explicitement, via le champ `Conventions` de la story.

## Qualité & Déploiement

```bash
pnpm verify          # les 4 checks + écriture du reçu
pnpm verify:cached   # ne relance les checks que si le code a bougé
```

| Check | Où | Quand |
|---|---|---|
| `check:framework` · `type-check` · `lint` · `test` | **Local**, via `pnpm verify` | Avant chaque push |
| `pnpm build` | **CI GitHub** (`.github/workflows/ci.yml`) | Après chaque push — validation Vercel, erreurs spécifiques à Linux |

Les 4 checks locaux bloquent le push : rien de cassé ne part. La CI ne les refait pas et se
concentre sur ce qui ne peut être vérifié qu'en environnement Linux propre.

### Le reçu de vérification

`pnpm verify` enregistre l'empreinte exacte du code au moment où les checks passent. `commit-push`
compare : **code identique → il ne rejoue rien**. C'est ce qui supprime le scénario le plus
coûteux du framework — une implémentation qui se termine par une suite complète, suivie d'un
commit qui rejoue la même chose trente secondes plus tard.

L'empreinte couvre le HEAD, le diff complet et le contenu des fichiers non suivis. Elle exclut
`docs/changelog.md`, édité après les checks et sans effet sur eux.

Le reçu sert aussi de **preuve** : le hook refuse un commit dont le reçu ne couvre pas l'état
exact du code, ce qui empêche le marqueur d'échappement d'être posé par réflexe sur un arbre
jamais vérifié.

### Les deux hooks

`enforce-git-gate.mjs` — aucun commit ni push hors du skill `commit-push`.
`enforce-bash-rules.mjs` — sortie des checks jamais tronquée ni redirigée. L'arrière-plan est
autorisé : c'est le reçu qui atteste qu'un check est passé, pas la lecture de sa sortie.

Ils sont écrits en Node, pas en bash : le payload est du JSON, et toute extraction du champ
`command` par grep ou sed est fausse dans un sens (troncature au premier guillemet échappé) ou
dans l'autre (matching du JSON entier). `tests/unit/hooks.test.ts` verrouille leur comportement
sur les cas de contournement connus.

Le déploiement Vercel est automatique (connecter le repo). La CI migrations Supabase arrive avec
le starter Supabase + Auth.

**Option souveraine** : Supabase self-hosted (Scaleway ou autre hébergeur, données en France) au
lieu de Supabase Cloud — socle, réglages OAuth 2.1 bloquants pour le canal MCP et checklist de
validation dans `.method/conventions/deployment-scaleway.md`. Choisi au cadrage (`/plan`), figé par ADR.
