# Changelog

<!-- Ce fichier est mis à jour à chaque commit via /dev.
     Format de chaque entrée :

## [Date] — [Scope]
**Quoi :** Ce qui a été fait
**Pourquoi :** La raison / la story / le bug
**Problèmes :** Ce qui a bloqué et comment c'a été résolu (si applicable)
**Fichiers :** Liste des fichiers créés/modifiés
-->

## [2026-10-09] — Starter `oto-platform` : smoke et garde fournis, constats d'un essai d'installation

**Quoi :** le starter fournit `smoke-mcp.mjs` (montage des portes sans jeton) et `fonctions-metier-imports-test.ts` (chaque route qui monte une porte importe `@/lib/fonctions-metier`). Son README gagne : `pnpm remove mcp-handler @modelcontextprotocol/sdk jose`, les retraits oubliés (domaine démo `status`, scripts `build` et `type-check`, `exclude` de `tsconfig.json`, `.next/`), les documents que `check:framework` refuse après le retrait de `src/mcp/`, et la portée de l'essai. Critère de fin corrigé : c'est `POST /api/mcp` sans jeton qui répond 401, `GET` répond 405.
**Pourquoi :** le README disait « adapter » le smoke sans le fournir ; un essai d'installation du 2026-10-03 (paquet 1.4.0, clone neuf) a fait apparaître ces étapes.
**Écarté :** une convention `oto-patterns.md` et un tag `oto` — le paragraphe de `mcp-patterns.md` et l'ADR-001 portent déjà la règle (choix utilisateur).
**Fichiers :** `.method/starters/oto-platform/{README.md,smoke-mcp.mjs,fonctions-metier-imports-test.ts}`, `docs/changelog.md`

## [2026-10-06] — tech-stack : pnpm 12.4.1

**Quoi :** ligne pnpm de `tech-stack.md` alignée sur `packageManager` (9.x → 12.4.1), avec `minimumReleaseAge` et le contournement si corepack échoue.
**Pourquoi :** la convention annonçait pnpm 9 alors que le projet est en pnpm 12.
**Fichiers :** `.method/conventions/tech-stack.md`, `docs/changelog.md`

## [2026-10-06] — README : mode d'emploi en tête ; fusion sur main

**Quoi :** section « Mode d'emploi » en tête du README (pourquoi l'utiliser, comment en 6 étapes, règles qui évitent les retours en review, choix MCP du template ou Otomata) ; chiffres périmés corrigés (36 composants Shadcn, 7 templates, 6 checklists, `coding-standards.md` 137 lignes). Fusion des branches des 4 derniers jours sur `main` : `claude/trusting-darwin-g583yd` et `ccr-39a36324-gvtxgz` y étaient déjà (aucun commit propre), `claude/serene-heisenberg-4ayqhy` avance `main` en fast-forward.
**Pourquoi :** demande utilisateur : un README qui dit d'abord comment et pourquoi utiliser le template.
**Fichiers :** `README.md`, `docs/changelog.md`

## [2026-10-06] — Template aligné sur les peers d'Otomata : resolvers 5, schémas `zod/v4`, garde de route MCP

**Quoi :** `@hookform/resolvers` ^3 → ^5 ; tous les schémas en `import * as z from "zod/v4"` (`src/lib/schemas/status.ts`, starter `schemas-auth.ts`, exemples de `auth-patterns`, `datetime-patterns`, `typescript-patterns`), règle ESLint `no-restricted-imports` sur `"zod"`, règle écrite dans `forms-patterns.md` (Principe) et `tech-stack.md` ; `check:framework` échoue si `src/app/api/mcp/route.ts` et `src/app/api/[transport]/` coexistent (test `tests/unit/check-framework-invariants.test.ts`). Starter Otomata, ADR-001 et README mis à jour.
**Pourquoi :** les trois écarts relevés entre le template et `@otomata_tech/oto_platform` : peer resolvers 5, schémas `zod/v4` exigés par `defineErpFunction`, route `/api/mcp` qui masquait le MCP du template en silence. Choix utilisateur : les régler dans le template, avant toute activation.
**Écarté :** règle en prose seule pour `zod/v4` (rien ne la contrôlerait) ; passer à zod 4 (exclu par `@modelcontextprotocol/ext-apps` 1.7.4).
**Fichiers :** `package.json`, `pnpm-lock.yaml`, `eslint.config.mjs`, `src/lib/schemas/status.ts`, `scripts/check-framework-invariants.mjs`, `tests/unit/check-framework-invariants.test.ts`, `.method/starters/supabase-auth/schemas-auth.ts`, `.method/starters/oto-platform/README.md`, `.method/conventions/{forms-patterns,tech-stack,auth-patterns,datetime-patterns,typescript-patterns}.md`, `docs/decisions/ADR-001-oto-platform-remplace-mcp-template.md`, `README.md`, `docs/changelog.md`

## [2026-10-06] — Option plateforme Otomata : starter, ADR-001, README

**Quoi :** starter `.method/starters/oto-platform/` (installation de `@otomata_tech/oto_platform` 1.4.0 dans ce template : dépendances, ce qui sort du template, configuration, fonctions ERP, vues, écrans à trois niveaux, migrations, critères de fin) ; ADR-001 : activée, la plateforme remplace le MCP du template et les capacités métier deviennent des fonctions ERP ; README : section « Plateforme Otomata (option) » (apports, faces, intégration ERP, options) ; renvois dans `CLAUDE.md § Projet`, `/plan` (identification) et `mcp-patterns.md` section 1 (dérogation).
**Pourquoi :** le paquet sert `/api/mcp` en dur ; sa route statique masquerait `src/app/api/[transport]/` sans erreur. Choix utilisateur : Otomata remplace.
**Écarté :** écrans seuls (les assistants ne liraient pas les procédures) ; deux MCP sur deux chemins (deux connecteurs, deux OAuth).
**Fichiers :** `.method/starters/oto-platform/README.md`, `docs/decisions/ADR-001-oto-platform-remplace-mcp-template.md`, `README.md`, `CLAUDE.md`, `.claude/skills/plan/SKILL.md`, `.method/conventions/mcp-patterns.md`, `docs/changelog.md`

## [2026-10-02] — Fusion de main : correctifs MCP reportés dans `src/`, nom `app-mcp-template`

**Quoi :** les correctifs du starter MCP poussés sur `main` en parallèle sont reportés dans le code installé : versions exactes dans `package.json` (jose 6.2.12, Vite 7.3.1, vite-plugin-singlefile 2.3.3, sans `^`) et `tech-stack.md § Canal MCP` avec la raison de chaque borne ; `src/app/api/[transport]/route.ts` refuse un corps JSON illisible avant mcp-handler (`withReadableBody`, 400 `-32700`), garde-fou anonyme compris, et `scripts/smoke-mcp.mjs` le vérifie ; `mcp-patterns.md` § 5.2 (jamais de `confirm` depuis un widget) et § 7 (corps illisible). Le renommage `mcp-dev-template` est remplacé par `app-mcp-template` (choix utilisateur).
**Pourquoi :** deux sessions travaillaient le template ; le starter MCP qu'elles corrigeaient est désormais installé dans `src/`.
**Fichiers :** `package.json`, `src/app/api/[transport]/route.ts`, `scripts/smoke-mcp.mjs`, `.method/conventions/{tech-stack,mcp-patterns}.md`, `docs/migration-v2*.md`, `docs/changelog.md`

## [2026-10-02] — Auth du canal MCP : organisation hors du jeton, page de consentement, middleware

**Quoi :**
- `src/mcp/auth.ts` ne lit plus `org_id` ni `user_role` dans le jeton : `{userId}` seulement ; organisation (adresse appelée) et rôle relus en base à chaque appel (`mcp-patterns` §6.4, §6.7). Plus de hook Custom Access Token à configurer (README MCP, `deployment-scaleway.md` : 4 réglages bloquants au lieu de 5).
- Starter `supabase-auth` : page `/oauth/consent` + `decideConsentAction` (lecture de la demande, Autoriser/Refuser, retour vers l'assistant en http(s) seulement) ; middleware : `/api` et `/.well-known` publics (le MCP répond 401 lui-même), retour sur la page demandée via `/login?redirect=`, POST du consentement laissé passer ; `loginAction` et le callback valident le retour par un seul `redirectPathSchema` (ferme aussi `/\hote`) ; test `auth-routing-test.ts`.

**Pourquoi :** trois défauts latents du template (sans effet tant que l'auth MCP était désactivée) : le code lisait l'organisation dans un claim alors que la convention la déduit de l'adresse ; aucune page de consentement alors que le serveur OAuth de Supabase en exige une ; le middleware redirigeait `/api/mcp` et `/.well-known` vers `/login` au lieu de laisser le 401 déclencher OAuth chez les hosts. Vérifié en installant le starter dans une copie du template : type-check, lint, tests, build, et routage du middleware sur l'app buildée.

**Écarté :** approuver la demande sans page (appel direct à `approveAuthorization`) — l'utilisateur ne verrait jamais quel assistant obtient l'accès ; dépendre de `@otomata_tech/oto_platform` pour son consentement — tout le paquet pour deux appels de SDK ; garder le claim `user_role` — un retrait de droit attendrait l'expiration du jeton (choix utilisateur : rôle lu en base).

**Fichiers :** `src/mcp/auth.ts`, `src/mcp/README.md`, `.method/starters/supabase-auth/{middleware.ts,auth-actions.ts,auth-callback-route.ts,login-page.tsx,schemas-auth.ts,oauth-consent-page.tsx,oauth-consent-actions.ts,auth-routing-test.ts,README.md}`, `.method/conventions/{mcp-patterns,deployment-scaleway,component-registry}.md`, `.method/templates/architecture.tmpl.md`, `.claude/skills/plan/SKILL.md`, `docs/changelog.md`

## [2026-10-01] — Fusion avec mcp-template : app-mcp-template (MCP par défaut, thème neutre, option souveraine)

**Quoi :**
- **Canal MCP installé dans le code** (ex-starter `.method/starters/mcp/`, supprimé) : `/api/mcp` (stateless), tool démo `get_status` câblé schéma → service → tool, widget dual-host buildé en single-file (`pnpm build` enchaîne `widgets:build`), metadata RFC 9728 + rewrites, test `InMemoryTransport`, smoke HTTP, mode d'emploi `src/mcp/README.md`. Auth OAuth désactivée tant que `supabase-auth` n'est pas installé ; **en production, `/api/mcp` répond 401** tant qu'elle l'est (`MCP_ALLOW_ANONYMOUS=true` pour le smoke local uniquement). Page d'onboarding `/connect` (URL à copier, guide par host). Schémas Zod au nommage de coding-standards, scripts lancés par `process.execPath` (Windows), widgets inclus dans `pnpm type-check`.
- **Thème neutre à personnaliser** : structure UI de mcp-template portée (Tailwind v4 CSS-first, `tailwind.config.ts` mort supprimé, Phosphor, sidebar + menu mobile en Sheet, `/design-system` en sections, `error.tsx`, `loading.tsx`, AppLogo, CopyButton) ; valeurs de marque regroupées dans le bloc « THÈME PROJET » de `globals.css` ; contraste AA mesuré (texte 4.5:1, `--input` et `--ring` ≥ 3:1) ; lien d'évitement sur le `<main>` de chaque layout.
- **Méthode** : invariant 5 « parité web ↔ MCP par services partagés » dans `CLAUDE.md` ; `plan` traite MCP comme défaut et pose le choix d'hébergement Supabase Cloud / self-hosted ; `audit` gagne les lots UI/UX et AX (ex-`/tm-audit`) ; section « Canal MCP » au template d'architecture ; versions MCP figées dans `tech-stack.md`.
- **Option souveraine** : `deployment-scaleway.md` (repris de mcp-template, PR #1) — Supabase self-hosted sur Scaleway ou autre, 5 réglages OAuth 2.1 bloquants pour le canal MCP, checklist curl — routé par le nouveau tag `selfhost`, activé par ADR.
- Starter `supabase-auth` : redirections vers `/` (et non `/dashboard`, 404), icônes Phosphor, `<main id="main-content">`, README aligné sur « un layout n'est jamais une frontière d'autorisation ». Template renommé `app-mcp-template`.

**Pourquoi :** tous les projets sont désormais MCP-first ; les deux templates divergeaient et chaque correctif se reportait à la main. mcp-template est archivé.

**Écarté :**
- Garder MCP en starter copié à la story de setup — ni buildé ni testé tant qu'il n'est pas installé, il pouvait pourrir en silence.
- Garder `/api/mcp` anonyme avec un simple avertissement — écarté par l'utilisateur (premier vrai tool public si l'auth est oubliée).
- Un starter `supabase-selfhosted/` avec compose et kong.yml à copier — ils suivent le compose officiel, qu'on dupliquerait ; une convention suffit.
- Porter tel quel le design mint Tiple — choix utilisateur : thème neutre, la marque se pose par projet.

**Fichiers :** `src/mcp/**`, `src/app/api/[transport]/route.ts`, `src/app/.well-known/oauth-protected-resource/route.ts`, `src/lib/schemas/status.ts`, `src/lib/services/status-service.ts`, `widgets/**`, `scripts/smoke-mcp.mjs`, `src/app/(dashboard)/connect/page.tsx`, `src/app/{globals.css,layout.tsx,error.tsx,loading.tsx,icon.svg}`, `src/app/(dashboard)/**`, `src/app/design-system/**`, `src/components/{logo,copy-button,sidebar-nav,mobile-nav,nav-items,theme-toggle}.tsx`, `src/components/ui/{button,dialog,radio-group,sheet,spinner}.tsx`, `tests/**`, `package.json`, `tsconfig.json`, `next.config.ts`, `components.json`, `.env.example`, `tailwind.config.ts` (supprimé), `.method/starters/mcp/` (supprimé), `.method/starters/supabase-auth/**`, `.method/conventions/{_index,mcp-patterns,tech-stack,deployment-patterns,deployment-scaleway,accessibility-patterns,component-registry}.md`, `.method/templates/architecture.tmpl.md`, `.claude/skills/{plan,audit}/SKILL.md`, `CLAUDE.md`, `README.md`, `docs/design/system.md`, `docs/migration-v2*.md`, `docs/changelog.md`

## [2026-10-02] — Starter MCP : versions figées, corps illisible refusé par la route

**Quoi :**
- Le README du starter installe des versions exactes : sdk 1.26.0, mcp-handler 1.1.0, jose 6.2.12, ext-apps 1.7.4, Vite 7.3.1 et vite-plugin-singlefile 2.3.3. `tech-stack.md § Canal MCP` les porte, avec la raison de chaque borne.
- `mcp-route.ts` refuse un corps JSON illisible avant mcp-handler (`withReadableBody`, 400 `-32700`), en mode sans auth comme dans le bloc auth commenté. `smoke-mcp.mjs` le vérifie.
- `mcp-patterns.md` :
  - § 5.2 : un appel parti du widget ne porte jamais `confirm`, et une suite proposée part en message à l'assistant ;
  - § 7 : le corps illisible.
- Correction d'une fausse affirmation du README (le template n'exclut pas `widgets` du tsconfig).

**Pourquoi :** installé à la lettre au 2026-10-02, le starter ne compilait plus. Sans version, pnpm tirait ext-apps 2.0.3 (exige zod 4), Vite 8.3.1 (refusé par `@vitejs/plugin-react` 4 et par le typage de `vitest.config.ts`) et mcp-handler 2.2.0 (`createMcpHandler` à deux arguments). Résultat : `tsc` en échec sur la route et sur `vitest.config.ts`. Un POST au JSON illisible restait sans réponse (20 s sans octet, jusqu'à `maxDuration` en vrai), défaut déjà corrigé sur oto-platform. La règle `confirm` vient de son widget routeur : un clic dans un widget ne vaut pas l'accord de l'utilisateur dans la conversation.

**Vérifié :** le starter installé par son README dans une copie neuve du template passe type-check, lint, tests, `check:framework`, `widgets:build`, `next build` et le smoke HTTP. Le smoke couvre maintenant le corps illisible refusé en 400. La variante auth de la route compile.

**Écarté :**
- Passer à ext-apps 1.7.5, la version d'oto-platform : 1.7.4 est celle éprouvée en production et compile à l'identique.
- Porter le widget routeur d'oto-platform (un widget sur plusieurs outils, aiguillé par `view`) : son ADR n'est pas encore validé par un banc.

**Fichiers :** `.method/starters/mcp/{README.md, mcp-route.ts, smoke-mcp.mjs}`, `.method/conventions/{tech-stack.md, mcp-patterns.md}`, `docs/changelog.md`

## [2026-09-23] — Gate git : le reçu du dépôt visé ; `.gitattributes` en LF

**Quoi :** le gate (`.claude/hooks/enforce-git-gate.mjs`) juge un commit sur le reçu du dépôt que la commande vise — `cd <dir> &&` en tête ou `git -C <dir>`, chemins Git Bash `/c/…` compris — et non plus toujours sur celui du checkout de la session ; `scripts/verify-receipt.mjs` prend la racine en paramètre. `.gitattributes` force LF sur `*.mjs`, `*.sh` et `.githooks/*`. Ligne « Worktree » dans CLAUDE.md.
**Pourquoi :** constaté sur oto-platform (E05-S01, commit 5e541d1, repris tel quel). Un commit dans un worktree était refusé après un `pnpm verify` vert, et aurait été accepté sur un arbre jamais vérifié si le reçu du checkout principal était frais. Un checkout Windows (`autocrlf=true`) cassait le shebang des scripts `.mjs`.
**Fichiers :** `.claude/hooks/enforce-git-gate.mjs`, `scripts/verify-receipt.mjs`, `tests/unit/hooks.test.ts`, `.gitattributes`, `CLAUDE.md`, `docs/changelog.md`.

## [2026-09-23] — mcp-patterns : mesures des bancs E04 et E03

**Quoi :** report dans `mcp-patterns.md` des mesures du banc E04 (serveur proto, 23/09/2026 : prompts par host, code expiré à rappeler « avec la même demande », borne de description entre plusieurs serveurs, annotations et autorisations claude.ai, `confirm` accepté après approbation du contenu, blocages OpenAI, plafond de 45 000 caractères lus en entier, données en champs dans `structuredContent`, ton suivi à 100 %, consigne des candidats question/action, geste de rafraîchissement confirmé, phrase de préférences) et du banc E03 (OAuth, 23/09 : découverte par la forme suffixée, enregistrement par host, Supabase suffit, organisation par l'adresse et appartenance à chaque appel, jeton non lié à la ressource, révocation au rafraîchissement). Checklist de conception `mcp-design.md` mise à jour en conséquence, lien vers la nouvelle page Recette.

**Pourquoi :** les conventions `mcp` portent les faits mesurés par les deux campagnes du dépôt `mcp-test`, datés et statués.

**Écarté :** réécrire les sections existantes ; seuls des ajouts datés et statués.

**Fichiers :** `.method/conventions/mcp-patterns.md`, `.method/checklists/mcp-design.md`, `docs/changelog.md`

## [2026-09-23] — Starter supabase-auth : schémas partagés, suffixe Action, callback sans redirection ouverte ; reçu en un seul appel git

**Quoi :** quatre correctifs reportés depuis oto-platform (E01-S01). (1) `scripts/verify-receipt.mjs` hache tous les fichiers en un seul `git hash-object --stdin-paths` (repli fichier par fichier si git refuse un chemin) ; le helper `git` accepte des options (`input`). (2) `auth-callback-route.ts` n'accepte `next` que s'il commence par `/` et pas par `//`, sinon `/dashboard`. (3) Nouveau `schemas-auth.ts` (→ `src/lib/schemas/auth.ts`) : `loginSchema`, `signupSchema`, `forgotPasswordSchema`, `resetPasswordSchema` (mot de passe 8 à 72 caractères, confirmation par `.refine`) ; `auth-actions.ts` et les quatre pages font le même `safeParse`, les règles recopiées à la main dans les pages disparaissent. (4) Actions renommées `loginAction`, `signupAction`, `forgotPasswordAction`, `resetPasswordAction`, `logoutAction`. (5) `signupAction` et `forgotPasswordAction` renvoient `{ data: { message } }` au lieu de `{ success }` ; les pages signup et forgot-password lisent `result.data`. (6) `auth-patterns.md` : l'exemple du callback valide `next` (§ Auth Callback) ; les schémas d'exemple bornent l'email à 255 et le mot de passe à 72 (§ Schemas de validation Auth), regex majuscule/chiffre inchangées.

**Pourquoi :** trouvés en review de E01-S01 d'oto-platform. `next` concaténé à `origin` faisait du callback une redirection ouverte (`//hote`, `@hote`) — `security-patterns.md § XSS Prevention` sur la validation des URL. Schémas inline dans l'action et longueur du mot de passe recopiée dans les pages : violation de l'invariant n°3 (`CLAUDE.md § Invariants techniques`, `forms-patterns.md § Principe`). Noms d'actions sans suffixe : `coding-standards.md § Naming`. Reçu : un processus git par fichier coûtait 1,5 s par empreinte sur un arbre non commité de 40 fichiers, et les tests de `tests/unit/hooks.test.ts` dépassaient leur délai. `{ success }` contredisait `coding-standards.md § Error Handling` et `api-patterns.md § Type de retour standard`, et la page forgot-password copiée ne compilait pas (TS2339 sur `result.error`). La convention `auth` montrait encore le callback vulnérable et des schémas sans borne (`security-patterns.md § Validation des inputs`).

**Fichiers :** `scripts/verify-receipt.mjs`, `.method/starters/supabase-auth/{schemas-auth.ts (créé), auth-actions.ts, auth-callback-route.ts, login-page.tsx, signup-page.tsx, forgot-password-page.tsx, reset-password-page.tsx, README.md}`, `.method/conventions/auth-patterns.md`, `docs/changelog.md`

## [2026-09-23] — Starter MCP et convention `mcp`, avec les mesures du banc

**Quoi :** port depuis `mcp-template` (commit `e1d2f3d`), sans code applicatif.

- **Starter** `.method/starters/mcp/` : endpoint MCP, tool démo, résultats, widgets dual-host,
  auth OAuth 2.1, tests. Identifié par `plan`, installé par la story « Setup technique ».
- **Convention** `mcp-patterns.md`, tag `mcp` routé sur les dossiers MCP et déclaré sous
  « Capacités non installées » tant que `mcp-handler` n'est pas dans `package.json`. Elle porte
  les mesures du banc MCP du 22/09/2026 (notice serveur non fiable, troncatures par host,
  contenu en texte ET structuré, levier « mode d'emploi » + code exigé, geste de rafraîchissement
  par host) et remplace les règles MCP numérotées du `CLAUDE.md` de l'ancien template.
- **Gabarit** des golden queries, **checklist** `mcp-design.md` tirée de la « Recette : concevoir
  un bon MCP », section « Canal MCP » de `tech-stack.md`, bloc MCP dans `plan`, une ligne dans
  `CLAUDE.md` et le README.

**Pourquoi :** les ERP et la plateforme MCP d'entreprise partent de ce template ; sans le starter
ni la convention, chaque projet MCP repartait de `mcp-template` ou de rien.

**Problèmes :** ce template lint aussi `.method/`, contrairement à `mcp-template` : le `catch {}`
vide de `smoke-mcp.mjs` (attente du serveur) échouait sur `no-empty` ; il porte désormais un
commentaire qui dit pourquoi l'erreur est ignorée.

**Écarté :** copier aussi les neuf règles MCP dans `CLAUDE.md`, comme `mcp-template` — écarté : ce
template charge les règles par les fichiers touchés, et la convention les détaille déjà toutes.
Porter les lignes `@anthropic-ai/sdk` et PDF de la pile MCP — écarté : options de produit, pas
dépendances du starter.

**Fichiers :** `.method/starters/mcp/**` (nouveau), `.method/conventions/mcp-patterns.md`
(nouveau), `.method/templates/mcp-golden-queries.tmpl.md` (nouveau),
`.method/checklists/mcp-design.md` (nouveau), `.method/conventions/_index.md`,
`.method/conventions/tech-stack.md`, `.claude/skills/plan/SKILL.md`, `CLAUDE.md`, `README.md`,
`docs/changelog.md`

## [2026-08-28] — Méthode : rayon d'impact avant d'éditer, arbitrages posés en question

**Quoi :** deux règles de méthode portées depuis `app-pmo-luciole`, sans code.

- **Rayon d'impact** (`CLAUDE.md § Avant de coder`, `dev § 2 bis`, `story.tmpl.md`,
  `story-ready.md`, `plan`) : dès l'échelle Standard, avant la première ligne, quatre items
  observables — appelants avec **commande de recherche citée**, doublons avec verdict, effet
  produit hors de l'écran modifié, refacto proposé ou écarté. Micro reste exempt.
- **Décisions via `AskUserQuestion`** (`CLAUDE.md § Avant de coder`, `dev § 2`, `plan`,
  consignes sous-agents) : tout arbitrage qui revient à l'utilisateur se pose avec l'outil —
  contexte par option, coût, recommandation en premier — jamais en prose dans un récap. Un
  sous-agent ne tranche pas, il remonte.

**Ce que ça change pour un lecteur :** une story ou un plan d'échelle Standard qui n'a pas ses
quatre items, ou dont l'item « Appelants » affirme sans citer la commande, n'est pas prêt — la
checklist `story-ready.md` le bloque. Et « j'ai choisi X » ou « à toi de voir » écrit dans un
récap n'est plus une décision rendue : c'est une violation visible sur la trace. La règle
« edits chirurgicaux » est amendée en conséquence — un refacto **repéré** n'est pas un refacto
**fait**, il se nomme dans le rayon d'impact et devient une question, pas un silence.

**Pourquoi :** « edits chirurgicaux » appliqué N fois sans regarder autour produit un
Frankenstein — doublons, appelants oubliés, effets de bord jamais nommés. « Prendre du recul »
ne se contrôle pas ; la trace d'un rayon d'impact, si.

**Fichiers :** `CLAUDE.md`, `.claude/skills/dev/SKILL.md`, `.claude/skills/plan/SKILL.md`,
`.method/templates/story.tmpl.md`, `.method/checklists/story-ready.md`

## [2026-08-25] — SEO/GEO agentic + audit Lighthouse contrôlé

**Quoi :** Portage des acquis de `web-framework-template` (commit `931fbba`), adaptés à Next 15.
- `seo-patterns.md` : sections **GEO — moteurs génératifs** (TL;DR autonome, FAQ en JSON-LD
  `FAQPage`, entités nommées, `app/llms.txt/route.ts` dérivé de la même source que
  `app/sitemap.ts`) et **Agentic readiness** (aucun crawler IA exclu de `robots.ts` sans ADR,
  404 réelle, mesure `npx is-agentic <domaine> --json`). Trois règles SEO rendues contrôlables :
  canonical à forme unique, preview jamais indexable, 301 via `next.config.ts`.
- `performance-patterns.md` : **exactement une image `priority` par page** (vérifiable au
  call-site), section **Scripts tiers** (`next/script`, analytics en prod réelle uniquement,
  façade pour les embeds lourds), section **Audit Lighthouse**.
- `accessibility-patterns.md` : le contraste passe d'un tableau de ratios à un contrôle machine
  (`pnpm audit:lh`, audit `color-contrast`), portant sur les **paires réellement utilisées en
  markup**, à relancer après tout changement de token de couleur.
- `deployment-patterns.md` : section **Contrôles post-déploiement** (404 réelle, preview
  `noindex`, Lighthouse sur l'URL de prod, en-têtes servis, `is-agentic`).
- Outillage : `pnpm audit:lh` (`npx --yes @lhci/cli`, aucune dépendance ajoutée) +
  `lighthouserc.json` — seuils ≥ 0.95 en assertion. `/design-system` est exempté de la
  catégorie performance (page catalogue), jamais de l'accessibilité.

**Pourquoi :** les cibles de performance et de contraste étaient déclarées « hors périmètre d'une
review » faute de mesure — donc tenues par personne. Le GEO et l'agentic readiness n'existaient
nulle part alors que les moteurs génératifs et les agents lisent déjà les pages publiques.

**Problèmes :** premier passage de l'audit → `/` verte sur les 4 catégories ;
`/design-system` **rouge en accessibilité (0.87)**, 4 défauts réels non corrigés ici :
contraste du token `--success` (`#008e3e` sur blanc = 4.25:1, et `#f6f9f7` sur `#008e3e` =
4.01:1 — sous 4.5:1, et le token touche toutes les pages qui l'utilisent), boutons icône sans
nom accessible, `Progress` sans `aria-label`, ordre de titres non séquentiel.

**Fichiers :** `.method/conventions/seo-patterns.md`,
`.method/conventions/performance-patterns.md`,
`.method/conventions/accessibility-patterns.md`,
`.method/conventions/deployment-patterns.md`, `lighthouserc.json`, `package.json`,
`.gitignore`

## [2026-08-21] — Arbitrage de complexité + rôles d'exécution + écriture documentaire sans accord

**Quoi :** Trois changements de méthode.
1. Nouvelle section `CLAUDE.md § Justifier une surface nouvelle` : toute surface créée (fichier,
   composant, hook, util, abstraction, prop optionnelle, option de config, table, colonne, flag,
   dépendance) porte **ce qui casse sans elle aujourd'hui**, et, au-delà du Micro, le récap nomme
   **l'option d'un cran plus simple écartée**. Son point de contrôle est
   `checklists/code-review.md § Arbitrage de complexité`, et le rapport de `revue` porte une
   ligne `Arbitrage` — absente ou vide, elle vaut MOYENNE.
2. Nouvelle section `CLAUDE.md § Qui exécute : Fable pilote, Opus écrit` : en session Fable, le
   code passe par des `Agent` en `model: "opus"` ; en session Opus, pas de délégation imposée.
3. L'accord préalable pour écrire dans `.method/`, `docs/` et `CLAUDE.md` est supprimé, et
   remplacé par une obligation d'**annonce** (fichier, section, règle en une phrase). `wrap-up`
   écrit puis annonce au lieu de proposer et d'attendre.

**Pourquoi :** « Ne pas over-engineerer » et « s'autochallenger » ne se contrôlent pas en
relisant un diff : ce qui se contrôle est la **trace de l'arbitrage** — la justification au
présent, et l'option plus simple nommée. Symétriquement, l'accord préalable freinait l'écriture
des gardes sans rien garantir : ce qui protège les sessions suivantes est que l'ajout soit **vu**,
donc annoncé.

**Fichiers :** `CLAUDE.md`, `.method/conventions/coding-standards.md`,
`.method/checklists/code-review.md`, `.claude/skills/revue/SKILL.md`,
`.claude/skills/dev/SKILL.md`, `.claude/skills/wrap-up/SKILL.md`,
`.claude/skills/conventions/SKILL.md`, `README.md`

## [2026-08-05] — Icônes animées (lucide-animated)

**Quoi :** Ajout de la dépendance `motion` (^13) et des deux premières icônes animées tirées du
registry shadcn de lucide-animated : `DeleteIcon` (poubelle, couvercle qui se soulève) et
`SettingsIcon` (engrenage qui tourne). Nouvelle section « Icones animees » dans le registry de
composants, avec la commande d'ajout et la règle d'accessibilité qui incombe à l'appelant.

**Pourquoi :** Besoin d'icônes animées au hover, épurées et cohérentes avec `lucide-react` déjà
en place. lucide-animated retenu parce qu'il s'installe par le registry shadcn — une icône à la
fois, copiée dans le repo, sans barrel de 466 composants ni dépendance d'icônes supplémentaire.

**Problèmes :** Les composants sont `"use client"` (motion) — ils ne s'utilisent qu'en feuille
d'arbre, sous une frontière client déjà existante (`CLAUDE.md` § Invariants techniques, point 1).

**Fichiers :** `package.json`, `pnpm-lock.yaml`, `src/components/ui/delete.tsx`,
`src/components/ui/settings.tsx`, `.method/conventions/component-registry.md`

## [2026-07-28] — CLAUDE.md : section « Après une erreur »

**Quoi :** Boucle « erreur → correction de ce qui l'a rendue possible » : deux questions à
réponse écrite après chaque fix (qu'est-ce qui l'a rendue possible, qu'est-ce qui l'empêchera
de revenir), table apprentissage → emplacement de capture (ADR, conventions, checklists,
registry, story) avec accord requis aligné sur § Modifications documentaires, et trois écueils
nommés (ne rien écrire, contourner l'accord, règle non contrôlable). Ajout d'un garde « base à
jour avant un chantier documentaire » dans § Avant de coder.

**Pourquoi :** Une erreur soldée par la seule correction de son instance revient sous une autre
forme, là où personne ne fera le lien. Le garde « base à jour » sort de cette session même : la
première version de la section a été écrite sur une arborescence 15 commits derrière
`origin/main`, et citait des chemins que la v2 avait supprimés.

**Fichiers :** `CLAUDE.md`

## [2026-07-28] — check-framework : portabilité Windows

**Quoi :** `read()` normalise les CRLF et `walk()` renvoie des chemins en `/`. Sous Windows
(`autocrlf=true`), le frontmatter des 8 skills était déclaré absent (regex ancrée sur `\n`) et
toutes les comparaisons de chemins échouaient : exclusion du changelog morte (8 fausses
références `/tm-*`), registry ↔ `src/components/` entièrement en erreur (40 faux positifs),
dédup de routes de l'invariant Next inopérante en silence. 56 erreurs au total — `pnpm verify`
impossible, donc aucun commit possible depuis Windows.

**Pourquoi :** La v2 a été écrite et vérifiée sous Linux ; la machine principale du projet est
sous Windows. Le gate bloquait tout commit tant que le checker se bloquait lui-même.

**Problèmes :** Pas de test ajouté : le checker n'a pas de seam de racine (contrairement à
`VERIFY_RECEIPT_ROOT`) et un fixture complet pour 2 lignes serait disproportionné. Critère de
succès : `pnpm verify` passe sur les deux OS.

**Fichiers :** `scripts/check-framework.mjs`

## [2026-07-27] — `run_in_background` autorisé sur les checks

**Quoi :** Suppression de la règle 1 de `enforce-bash-rules.mjs`, qui bloquait tout check lancé
en arrière-plan. Les trois autres règles (troncature, redirection, polling) restent actives, y
compris sur une commande en arrière-plan.

**Pourquoi :** Sa prémisse — « sa sortie serait invisible » — est fausse : le harness notifie à
la fin de la commande et la sortie reste récupérable. Surtout, ce n'est pas la lecture de la
sortie qui atteste qu'un check est passé, c'est le **reçu** : `pnpm verify` l'écrit en
arrière-plan comme au premier plan, et le gate de commit le relit dans les deux cas. La garantie
est intacte ; le coût, lui, était réel — une suite de tests ou un build long monopolisait la
session.

**Fichiers :** `.claude/hooks/enforce-bash-rules.mjs`, `tests/unit/hooks.test.ts`, `README.md`,
`docs/migration-v2.1.md`

## [2026-07-27] — Framework v2.1 : durcissement du gate et des vérifications

**Quoi :** Exécution du challenge à trois axes (technique / DX / AX) et correction de tout ce
qu'il a révélé. Gate de commit : 5 contournements fermés (`merge`/`revert`/`cherry-pick`/
`rebase`/`am` non couverts, `-fu` agglomérée, `push` exempté de reçu, champ `checks` du reçu
jamais relu) et 4 faux positifs supprimés. Nouveau `.githooks/pre-commit` pour les commits
lancés depuis un script, invisibles au hook PreToolUse. `check:framework` vérifie désormais la
chaîne d'application elle-même (scripts, hooks, `--max-warnings 0`) et trois invariants de
`CLAUDE.md` (RLS, routes dupliquées, couleurs Tailwind numérotées). Routing : gate d'activation
des capacités non installées, globs `nextjs` et `performance` complétés. Déclenchement des
skills : 3 collisions tranchées, `when_to_use` de `wrap-up` porteur de ses exclusions.
Nouveau `docs/migration-v2.1.md` pour les projets déjà en v2.

**Pourquoi :** Le challenge a montré que la moitié supposée déterministe du framework était la
plus faible. `check:framework` validait la cohérence documentaire sans jamais vérifier que les
garanties étaient encore branchées : on pouvait remplacer `type-check` par `echo ok` et sortir
en 0. Deux tests passaient sans exercer la régression qu'ils documentent.

**Problèmes :** Retirer `src/lib/actions/**` du tag `supabase` aurait cassé les projets qui ont
Supabase (`api-patterns.md` y référence `handleSupabaseError`) — l'activation est donc
conditionnée à la dépendance plutôt que le glob supprimé. `check-framework.mjs` dépassait
`max-lines` : sections 10-11 extraites dans un module plutôt qu'exemption de la règle.

**Fichiers :** `.claude/hooks/enforce-git-gate.mjs`, `.claude/hooks/enforce-bash-rules.mjs`,
`.githooks/pre-commit` (nouveau), `scripts/verify-receipt.mjs`, `scripts/check-framework.mjs`,
`scripts/check-framework-invariants.mjs` (nouveau), `.method/conventions/_index.md`,
`.method/conventions/testing-strategy.md`, `.claude/skills/{dev,revue,verify,wrap-up,commit-push}/SKILL.md`,
`CLAUDE.md`, `README.md`, `package.json`, `tests/unit/hooks.test.ts`,
`docs/migration-v2.1.md` (nouveau), `docs/migration-v2.md`

## [2026-07-26] — Prompt de challenge du framework (technique · DX · AX)
**Quoi :** `docs/challenge-framework.md` — prompt pour auditer **le framework lui-même**, là où `audit` audite le code applicatif. Trois axes distribuables à trois agents parallèles.

- **Technique** — les hooks tiennent-ils face à des payloads construits (et pas relus) · les scripts résistent-ils aux cas dégradés (dépôt sans commit, renommage, chemin illisible) · le vérificateur de cohérence détecte-t-il ce qu'il prétend, et surtout **que rate-t-il** · les seuils annoncés « appliqués par l'outillage » le sont-ils vraiment, ou configurés en avertissement.
- **DX** — la question centrale n'est pas « est-ce bien conçu » mais **« où se fait-il contourner, et pourquoi »**. Coût d'entrée, rapport cérémonial/valeur sur le changement le plus fréquent, qualité des messages d'échec (un blocage qui n'indique pas la sortie enseigne le contournement), et capacité du framework à **se refuser** quand il n'apporte rien.
- **AX** — l'angle le plus déterminant, parce qu'un agent ne se plaint pas : il dérive en silence. Budget de contexte avant la première ligne de code · **observabilité de la conformité** : lister les instructions dont on ne peut pas vérifier l'exécution (annoncer les conventions chargées est visible, les avoir lues ne l'est pas) · tri des garanties entre celles qui survivent à un agent compacté (hook, script, test, type) et celles qui reposent sur son raisonnement · contradictions entre deux conventions chargées par le même glob · fiabilité et chevauchement des descriptions de déclenchement · reprise après perte de contexte · instructions invérifiables (« le plus bas possible », « si nécessaire », « complexe ») à reformuler en binaire ou à supprimer.

**Contraintes du prompt :** mesurer plutôt qu'opiner — un jugement sans chiffre ni scénario reproductible est refusé · six scénarios à **dérouler**, pas à relire (jour 1, micro, module, session interrompue, douze mois, refus de story) · étape adversariale où les contournements sont **exécutés** · **cinq propositions maximum**, classées par gain/coût, chacune devant nommer **ce qu'elle casse** — toute modification du framework en dégrade un autre point.

Une section « à supprimer » est demandée séparément : retirer 40 lignes périmées vaut souvent mieux qu'en ajouter 10 justes.

**Pourquoi un document et pas un skill :** c'est un exercice périodique — après un chantier structurant, avant diffusion, ou quand quelqu'un cesse de se servir du framework. Une neuvième description de déclenchement permanente en contexte pour deux passages par an coûte plus qu'elle ne rapporte.

**Fichiers :** `docs/challenge-framework.md`

## [2026-07-26] — Skill `audit` : auditer l'existant, pas seulement le diff
**Quoi :** `revue` ne sait auditer qu'un diff. Sur une codebase déjà écrite — reprise d'un projet, code antérieur aux conventions, préparation d'une mise en production — il n'y avait aucun outil. `audit` comble ce trou en réutilisant exactement la même mécanique : routing par globs, sources citables, barème de gravité identique.

Ce qu'il apporte au-delà de `revue` :

- **Étape 1 — contraintes du projet, avant tout le reste.** Lire les ADR, la config d'exemptions ESLint, les tokens de design réellement définis, `.env.example`. Trois questions doivent avoir une réponse explicite avant de commencer : *où se joue l'autorisation réelle* (une garde d'ergonomie UI n'est jamais une frontière de sécurité — mais l'inverse compte aussi : ne pas signaler comme non protégée une action qui l'est côté serveur), *le schéma de base est-il partagé* (si oui, toute évolution est additive et un `DROP` est HAUTE d'office), *quelle dette est gelée* (un fichier exempté n'est pas un défaut, c'est une décision écrite).
- **Découpage en lots par frontière technique**, pas par volume : au-delà de ~15 fichiers la lecture « en entier » devient une fiction. Chaque lot refait son routing, produit son rapport, et peut être confié à un agent séparé — sans jamais supposer qu'un autre lot a déjà vérifié quelque chose.
- **Étape d'auto-réfutation obligatoire.** Chaque finding candidat doit survivre à une tentative de le détruire : le chemin d'échec existe-t-il vraiment ou l'ai-je supposé · une garde en amont le rend-elle impossible · la section citée dit-elle littéralement ce qu'on lui fait dire · un test couvre-t-il déjà le cas · est-ce déjà attrapé par ESLint ou TypeScript. Dans le doute, le finding est supprimé et bascule en « angle mort ».
- **Grille de 10 axes** — sécurité et autorisation, intégrité des données, frontières Next.js, robustesse, contrats de types, tests, accessibilité, performance, duplication, opérations. Chaque axe liste ce qu'il faut chercher concrètement, pas une checklist décorative.
- **Section « Angles morts » obligatoire** dans la sortie : ce que le lot n'a pas pu couvrir, et pourquoi. Un audit qui ne déclare aucune limite ment sur sa couverture.

**Principe directeur :** un audit qui produit 40 findings dont 12 sont faux vaut moins qu'un audit qui en produit 15 tous vrais. Un faux positif ne coûte pas un finding, il coûte la confiance dans toute la liste.

**Lecture seule, sans exception.** Aucun fix appliqué, aucun commit. Les corrections se décident après, par gravité, et passent par `dev` qui rechargera les conventions sur les fichiers réellement touchés.

**Fichiers :** `.claude/skills/audit/SKILL.md` (créé) · `scripts/check-framework.mjs` (`audit` ajouté aux skills connus) · `CLAUDE.md`, `README.md`

## [2026-07-26] — Renommage : `.tiple/` devient `.method/`
**Quoi :** le nom commercial du framework disparaît de l'arborescence et du code. Il ne subsiste que dans le `README.md`, seul endroit où il est assumé.

- `.tiple/` → **`.method/`** (`git mv`, historique préservé) — conventions, checklists, templates, starters, sprint status
- marqueur d'échappement du gate : ` # tiple-gate-ok` → ` # checks-ok`
- variable d'environnement : `TIPLE_RECEIPT_PATH` → `VERIFY_RECEIPT_PATH`
- `package.json` : `tiple-method-template` → `dev-framework-template`
- prose « Tiple Method » → « le framework » / « la méthode » dans `CLAUDE.md`, les skills, les conventions, les checklists et les templates
- `docs/migration-tiple-v2.md` → `docs/migration-v2.md`, avec un **lot A « Renommer le dossier de méthode »** ajouté en tête et les lots suivants décalés (9 au lieu de 8)
- `docs/migration-renommage.md` (créé) : prompt court pour les projets **déjà migrés en v2** qui portent encore `.tiple/` — le guide v1→v2 fait désormais le renommage en une passe, ce second document ne sert qu'aux instances migrées avant ce changement

**Points d'attention traités :** trois fichiers contiennent le chemin **à l'intérieur d'expressions régulières**, où le point est échappé — un remplacement naïf de `.tiple/` les rate. `scripts/check-framework.mjs` (motif de validation des chemins cités), `scripts/verify-receipt.mjs` (liste `EXCLUS`) et `.claude/hooks/enforce-git-gate.mjs` (constante `MARKER`). Vérifiés un par un.

**Le préfixe `tm-` disparaît aussi** (il signifiait « Tiple Method ») : `tm-dev` → **`dev`**, `tm-plan` → **`plan`**, `tm-review` → **`revue`**, `tm-verify` → **`verify`**, `tm-wrap-up` → **`wrap-up`**. `commit-push` et `conventions` étaient déjà sans préfixe.

`review` n'était pas utilisable : `/review` est une slash command intégrée à Claude Code, et `/code-review` aussi — un skill projet portant l'un de ces noms entre en collision. Le framework étant rédigé en français, `revue` lève l'ambiguïté sans introduire d'incohérence.

`scripts/check-framework.mjs` gagne une liste **`SLASH_OBSOLETES`** contenant les anciens noms (`tm-*`, plus les commandes supprimées en v2). Une référence oubliée dans la doc échoue au check au lieu de pointer en silence vers une commande disparue — c'est le mode de dérive le plus courant après un renommage. Vérifié en injectant `/tm-dev` dans une checklist : détecté, exit 1.

**Non renommés, volontairement :** `.claude/` (imposé par Claude Code) · `commit-push` et `conventions` (déjà neutres) · le dépôt GitHub et son propriétaire, qui sont une URL.

**Pourquoi :** un nom de produit dans un chemin de dossier ou un préfixe de commande est une dette de nommage — il se propage dans chaque import, chaque citation de convention et chaque message de hook, et devient coûteux à retirer plus tard.

**Fichiers :** 5 skills renommés · `.tiple/` → `.method/` · ~40 fichiers dont le contenu cite l'un ou l'autre · `scripts/check-framework.mjs` · `docs/migration-renommage.md` créé

## [2026-07-26] — Guide de migration v1 → v2 pour les projets existants
**Quoi :** `docs/migration-v2.md` — prompt à coller dans une session Claude Code ouverte sur un projet issu de l'ancienne version du template. Découpé en 9 lots (renommage, hooks, scripts, skills, conventions, checklists, config, code, docs), chacun expliquant *pourquoi* le changement a eu lieu, pour que les décisions puissent être adaptées au projet cible.

Trois garde-fous y sont posés en tête : ne jamais écraser le code métier ni les documents produits (`docs/prd.md`, stories, epics, ADR) ; préserver les conventions personnalisées en appliquant les corrections plutôt qu'en remplaçant les fichiers ; et **adapter les globs à l'arborescence réelle du projet** — un glob qui ne matche rien désactive silencieusement le chargement d'une convention.

Le lot E3 liste les 17 règles de la v1 techniquement fausses ou dangereuses, avec leur correction. Le document demande explicitement de **signaler sans corriger** le code métier qui suit l'une d'elles (middleware auth perdant les cookies rafraîchis, Server Actions exposant `error.message`, autorisation placée dans un layout) : c'est une décision qui revient au propriétaire du projet.

**Pourquoi :** la v2 change la structure de `.claude/` et de `.method/`, ce qu'aucun merge du template ne peut résoudre seul sur un projet qui a divergé.

**Fichiers :** `docs/migration-v2.md`

## [2026-07-26] — Régressions de la refonte, trouvées par contre-audit
**Quoi :** un audit indépendant a été passé sur le résultat de la refonte précédente, avec pour consigne de chercher ce qu'elle avait cassé. Douze findings, tous vérifiés avant correction.

- **Instructions devenues fausses, qui faisaient échouer le check.** `_index.md` et `wrap-up` disaient encore « ajouter un tag = ligne + convention + `.claude/skills/<tag>/` » alors que `check:framework` **rejette** désormais un skill par tag. Suivre la doc cassait le gate de commit. Reproduit puis corrigé des deux côtés.
- **Le gate était contournable par shell imbriqué.** `bash -c "git commit -m x"` et `eval "git push"` passaient : la neutralisation des chaînes entre quotes — nécessaire pour ne pas bloquer `grep "git commit"` — effaçait la commande. Le hook refuse maintenant tout shell imbriqué, faute de pouvoir l'analyser.
- **Le reçu plantait sur un dépôt sans commit.** `git rev-parse HEAD` échouait, donc `pnpm verify` mourait **après** avoir passé les 4 checks, et le hook refusait ensuite le commit en boucle — sans échappement, `--no-verify` étant bloqué. Le premier commit d'un projet issu du template était impossible. Garde ajouté, plus un fallback par fichier pour les chemins que git ne sait pas hacher.
- **Les tests écrivaient dans le vrai reçu.** Un `pnpm test` interrompu laissait derrière lui un reçu déclarant les 4 checks passés alors que seul vitest avait tourné — le gate autorisait alors un commit sans type-check ni lint. Les tests écrivent désormais dans un reçu isolé (`VERIFY_RECEIPT_PATH`).
- **Renommage non détecté.** `git diff --name-status` n'émet qu'une ligne `R100 ancien nouveau` ; en ne retenant que la destination, la disparition de l'ancien chemin n'était pas enregistrée. Restaurer l'ancien fichier à côté du nouveau laissait le reçu valide alors que les deux coexistaient. Résolu par `--no-renames`.
- **Le reçu ne servait qu'en Micro.** Il n'excluait que le changelog, alors que la finalisation écrit ensuite dans le sprint status, les stories et les ADR — tout chantier Standard ou Module invalidait donc le reçu et rejouait les 4 checks, c'est-à-dire exactement ce que le mécanisme prétendait supprimer. Exclusions étendues.
- **Trous de routing.** Le tag `api` n'était pas routé sur `src/app/**/page.tsx`, alors que trois sections d'`api-patterns.md` sont du code de page — dont la règle sur les `searchParams` validés par Zod, jamais chargée sur le fichier qu'elle vise. Et `supabase-patterns.md` n'était pas chargé sur `src/lib/actions/**` alors qu'`api-patterns.md` y impose `handleSupabaseError`.
- **`max-lines` et `max-lines-per-function` étaient en `warn`** alors que `coding-standards.md` annonçait « appliquée par ESLint, ne pas revérifier à la main » : la règle avait disparu des deux côtés. Passées en `error`.
- **Divers** : `readiness-gate.md` exigeait `pnpm check:framework`, que `plan` n'a pas le droit d'exécuter · renvoi vers un pattern `useOptimistic` qui n'existait nulle part (section écrite dans `forms-patterns.md`) · `generateMetadata` dupliqué et déjà divergent entre `nextjs-patterns.md` et `seo-patterns.md` · sortie d'exemple de `revue` listant des conventions absentes de ses propres tags actifs · `enforce-bash-rules` prenait `eslint.config.mjs` pour un lancement d'ESLint.
- **`wrap-up` gagne une phase « ce qui doit disparaître »** : sans mécanisme inverse, les conventions ne faisaient que croître, et le volume redevenait le problème.

**Pourquoi :** une refonte de cette ampleur introduit ses propres régressions, et les plus dangereuses sont celles qui rendent une garantie inopérante sans rien signaler. Trois des quatre HAUTE touchaient le gate de commit ou le reçu — c'est-à-dire précisément ce qui doit être infaillible.

**Fichiers :** `.claude/hooks/enforce-git-gate.mjs`, `enforce-bash-rules.mjs` · `scripts/verify-receipt.mjs` · `tests/unit/hooks.test.ts` (16 cas) · `.method/conventions/_index.md`, `api-patterns.md`, `forms-patterns.md`, `nextjs-patterns.md` · `.claude/skills/wrap-up/SKILL.md`, `revue/SKILL.md` · `.method/checklists/readiness-gate.md` · `eslint.config.mjs`, `README.md`

## [2026-07-26] — Refonte issue de l'audit : conventions corrigées, volume divisé par 2, reçu de vérification
**Quoi :**

**Sécurité — les conventions enseignaient des patterns dangereux.**
- `database-patterns.md` : le pattern de transaction de référence était une escalade de privilèges (`SECURITY DEFINER` sans `search_path`, sans validation de l'appelant, `EXECUTE` ouvert à `public` par défaut). Réécrit avec garde `auth.uid()`, verrouillage ordonné, `REVOKE`/`GRANT` explicites, et trois règles vérifiables. Ajout du `WITH CHECK` manquant sur la policy `FOR UPDATE` — sans lui, un utilisateur peut réassigner `user_id` et donner sa ligne à un tiers.
- Starter `auth-actions.ts` : renvoyait `error.message` brut, donc « User already registered » à l'inscription — énumération de comptes en clair. Réécrit avec Zod et messages constants ; `forgotPassword` répond désormais à l'identique que le compte existe ou non.
- `auth-patterns.md` et starter `middleware.ts` : `NextResponse.redirect` ne recopiait pas les cookies rafraîchis par `getUser()`. Le refresh token était consommé côté Supabase et le nouveau jeté — déconnexions aléatoires et boucles de redirection (footgun n°1 de `@supabase/ssr`).
- `nextjs-patterns.md` : l'exemple canonique plaçait le contrôle d'autorisation dans un `layout.tsx`, que le même fichier décrit comme non ré-exécuté en navigation client. Remplacé par la règle « un layout n'est jamais une frontière d'autorisation ».
- `api-patterns.md` : `params.sort` était injecté brut dans `.order()` — énumération du schéma et tri sur colonnes non exposées. L'exemple valide désormais les `searchParams` par un `z.enum`.
- `security-patterns.md` : « les Server Actions ont un token CSRF » est faux (c'est une comparaison `Origin`/`Host`) ; `headers()` était appelé sans `await`, donc ne compilait pas en Next 15 ; le rate limiter en `Map` mémoire ne limite rien sur Vercel et lisait le mauvais segment de `x-forwarded-for`. Ajout d'une section idempotence / lost update.
- `supabase-patterns.md` : `PGRST301` était documenté « Trop de résultats » alors qu'il signifie **JWT expiré** — une session expirée s'affichait comme une erreur de requête. Table d'erreurs complétée (`23514`, `40001`, `57014`, `PGRST202`, `PGRST204`) et signature élargie aux erreurs Storage et Auth.
- Uploads : la limite de 1 Mo des Server Actions rendait les exemples (2 et 5 Mo) inopérants ; `upsert: true` sans policy `FOR UPDATE` renvoyait 403 au deuxième changement d'avatar ; le bucket était lisible par `anon`.
- `api-patterns.md` : le curseur de pagination filtrait sur `created_at` seul — perte silencieuse de lignes en infinite scroll. `bulkDelete` lisait `count` sans `{ count: "exact" }`, donc `succeeded` valait toujours 0 et un DELETE refusé par RLS était compté comme un succès.
- `redirect()` et `notFound()` sont des `throw` : le pattern `try/catch` recommandé les avalait. Règle `unstable_rethrow` ajoutée.

**Volume — le corpus n'était pas lisible en une passe.**
- Mesuré avant : 923 lignes de conventions pour une ligne changée dans une Server Action, 2 640 pour un module — **lues deux fois**, par `dev` puis par `revue`.
- `api-patterns.md` (478 lignes, servant 4 tags) scindé en `api-patterns.md` (352), `forms-patterns.md`, `tables-patterns.md`, `uploads-patterns.md`. Reviewer un composant de tableau ne charge plus 267 lignes de Server Actions.
- `coding-standards.md` : 240 → 133 lignes. Les sections Server Actions et Supabase, qui **contredisaient** les conventions routées (trois traitements différents de l'auth manquante : `throw`, `return`, `redirect`), sont supprimées au profit de renvois.
- **Conventions de base : 3 → 1.** `component-registry.md` et `tech-stack.md` deviennent des tags routés — vérifier le registry n'a de sens qu'en créant un composant, la stack qu'en touchant aux dépendances.
- Ce qu'ESLint peut appliquer sort de la prose : `max-lines`, `max-lines-per-function`, `max-params`, `max-depth`, `no-empty`, interdiction des `enum`, `import/order`. Une règle mécanisée est vérifiée à chaque lint, la recopier n'ajoutait que du volume.
- Globs resserrés ou élargis selon les mesures : `feedback`, `state` et `performance` ne matchaient quasiment rien (un composant de filtres ne chargeait pas `state-management.md`) ; `seo` payait 147 lignes sur chaque layout imbriqué pour 17 lignes utiles une seule fois.

**Les 22 skills de tag supprimés, remplacés par un seul.**
Depuis le routing par globs, `dev` et `revue` matchent `_index.md` eux-mêmes : les 22 skills n'étaient plus qu'un niveau d'indirection. Il restait un cas — la question posée sans qu'aucun fichier soit touché — désormais couvert par le skill `conventions`.

**Reçu de vérification — plus de suite de tests jouée deux fois.**
`pnpm verify` enregistre l'empreinte exacte du code (HEAD + diff complet + contenu des fichiers non suivis, hors changelog). `commit-push` lance `pnpm verify:cached` : code identique → aucun check rejoué. Effet de bord voulu : le reçu est une **preuve** que les checks ont tourné sur ce code, et le hook refuse un commit dont le reçu ne couvre pas l'état courant — le marqueur d'échappement ne peut plus être posé par réflexe.

**Trous de process comblés.**
- `plan` gagne un niveau **« story seule »** : accepter la proposition de story de `dev` déclenchait une évolution de PRD complète, ce qui rendait la proposition dissuasive. Le cadrage rend maintenant la main explicitement à `dev`.
- Sur refus de la story en Module, `dev` rétrogradait en Standard — registry, ADR et sprint status disparaissaient en silence, en contradiction avec « l'échelle est déterminée par ce que le changement touche ». Il reste en Module ; seules les obligations liées à la story tombent.
- `checklists/code-review.md` devient une **source citable** par `revue`. Sans cela, aucun de ses items ne pouvait dépasser BASSE : « ce qui est livré ne correspond pas à ce qui a été demandé » n'était structurellement jamais bloquant.
- `readiness-gate.md` exigeait `pnpm install`, `.env.local` et un serveur démarré — impossible, puisque `plan` s'interdit toute commande système. Ces points deviennent les AC de la story de setup. `story-ready.md` marque conditionnels les items qu'une story technique ne peut pas satisfaire.

**`check:framework` durci** — il ne détectait aucun des modes de pourrissement réels.
Ajout : parsing de `_index.md` **par nom de colonne** (ajouter une colonne tuait le routing en silence), détection des **globs morts** (une réorganisation de `src/` désactivait le routing sans un mot), tags dupliqués, budget de 400 lignes par convention, **sections citées inexistantes** (`fichier.md § Section` — la gravité HAUTE repose sur ces citations), checklists orphelines, et comparaison `component-registry.md` ↔ `src/components/` dans les deux sens.

**Divers.** `<Toaster>` et skip link ajoutés au root layout (tout `toast.success()` était silencieux, et le template violait sa propre convention a11y) · `badge.tsx` passait par `bg-emerald-500` en dur au lieu des tokens · `.env.example` déclarait `NEXT_PUBLIC_APP_URL`, inutilisée, alors que tout le template lit `NEXT_PUBLIC_SITE_URL` · `CLAUDE.md` ramené de 201 à 149 lignes (cible officielle : < 200), sans les sections qui doublonnaient les conventions routées · `plan` porte `disable-model-invocation`, `dev` un filtre `paths`, et les skills un champ `when_to_use` séparé de `description`.

**Pourquoi :** neuf audits indépendants ont convergé sur le même diagnostic — le framework demandait de lire trop pour que la lecture soit réelle, et ce qu'il donnait à lire contenait des règles fausses. Corriger l'un sans l'autre n'aurait servi à rien.

**Fichiers :** 8 conventions réécrites, 3 créées (`forms`, `tables`, `uploads`), 22 skills supprimés, `conventions` créé · `scripts/verify-receipt.mjs` et `scripts/check-framework.mjs` · `eslint.config.mjs`, `package.json`, `.gitignore` · `src/app/layout.tsx`, `src/components/ui/badge.tsx` · `CLAUDE.md`, `README.md` · 3 checklists · starter `auth-actions.ts` et `middleware.ts`

## [2026-07-26] — Correctifs issus de l'audit multi-agents : gate git réparé et testé, 404 au premier lancement, lint impassable
**Quoi :** neuf audits indépendants (4 scénarios d'usage, 4 lots de conventions, 1 sur l'architecture des skills) ont été passés sur le framework. Cette entrée ne couvre que les défauts **vérifiés et corrigés** ; le reste est arbitré séparément.

- **Gate git réparé — c'était une régression introduite le jour même.** Le hook cherchait le marqueur d'échappement dans le payload JSON brut : `git commit -m "docs: expliquer checks-ok"` passait le gate sans qu'aucun check n'ait tourné. Trois autres contournements : `git -C /repo commit`, `git --no-pager push`, `git -c k=v push` (le motif exigeait `git` suivi immédiatement de la sous-commande). Et deux faux positifs : `grep -rn "git commit" docs/` était bloqué, et un message de commit contenant `--force` était bloqué définitivement.
- **Les deux hooks passent de bash à Node.** La cause racine était unique : bash ne sait pas parser du JSON. Toute extraction du champ `command` par grep/sed est fausse dans un sens (troncature au premier guillemet échappé) ou dans l'autre (matching du JSON entier). `JSON.parse` supprime la classe de bug. Les chaînes entre quotes sont neutralisées avant analyse, et le marqueur n'est accepté qu'**en fin de commande**.
- **`tests/unit/hooks.test.ts`** : 18 cas de non-régression sur les deux hooks, exécutés par `pnpm test`, donc par `commit-push`. Le gate ne peut plus se casser en silence.
- **404 au premier lancement.** `src/app/page.tsx` et `src/app/(dashboard)/page.tsx` résolvaient tous les deux `/`. Next 15 n'échoue pas : il en choisit un silencieusement. `app/page.tsx` gagnait et redirigeait vers `/dashboard`, route qu'aucun fichier ne produit — un clone frais tombait donc sur un 404, et la page du route group ainsi que son layout n'étaient jamais rendus. `src/app/page.tsx` supprimé.
- **`pnpm lint` impassable après un build.** `eslint.config.mjs` n'avait aucune liste `ignores` : `eslint .` parcourait `.next/`, remontait des milliers d'erreurs sur du code généré, et rendait le gate `commit-push` infranchissable dès qu'un `pnpm build` avait été lancé une fois.
- **`vitest.config.ts` : `setupFiles` vide** alors que `tests/setup.ts` importe les matchers jest-dom. Le premier `expect(...).toBeInTheDocument()` écrit selon `testing-strategy.md` aurait échoué sur « is not a function ».
- **`story-done.md` réécrit.** Checklist orpheline (référencée nulle part), elle avait échappé à la refonte : elle exigeait une review « par un agent reviewer isolé » que `revue` interdit explicitement, et cochait 7 rubriques de `code-review.md` supprimées depuis. Elle ne vérifie plus que livraison, review et traçabilité, et `dev` la référence désormais.
- **Contradiction sur les starters** : `README.md` annonçait une installation automatique par `/plan`, alors que `plan` s'interdit toute commande système et que l'installation revient à `dev`. Aligné, et les mentions d'une « Phase 0 » qui n'existe plus sont supprimées.

**Pourquoi :** le gate git est la seule garantie non probabiliste du framework — un contournement silencieux vaut pire que pas de gate, puisqu'il donne une fausse assurance. Les trois autres défauts cassaient l'expérience du premier jour sur un clone neuf.

**Fichiers :**
- `.claude/hooks/enforce-git-gate.mjs`, `.claude/hooks/enforce-bash-rules.mjs` (créés) — versions `.sh` supprimées
- `.claude/settings.json`, `tests/unit/hooks.test.ts` (créé), `eslint.config.mjs`, `vitest.config.ts`
- `src/app/page.tsx` (supprimé), `.method/checklists/story-done.md`, `.claude/skills/dev/SKILL.md`
- `CLAUDE.md`, `README.md`, `.claude/skills/commit-push/SKILL.md`, `.claude/skills/verify/SKILL.md`

## [2026-07-26] — Ménage : suppression des documents morts et des références obsolètes
**Quoi :**
- **`plan.md` supprimé** — plan d'implémentation ponctuel d'un chantier terminé (restructuration du PRD en parcours), laissé à la racine où Claude le lisait comme normatif.
- **`files/` supprimé** (2 341 lignes) — PRD, architecture, stories et guide de migration de la méthode elle-même. Ces documents décrivaient une version passée de la méthode, citaient trois commandes qui n'ont jamais existé dans le template (`/tm-evolve`, `/tm-status`, `/tm-sprint`) et n'étaient référencés par rien de normatif. Historique conservé dans git.
- **`.gitignore`** : suppression de l'exception `!.claude/commands/` — le dossier n'existe plus.
- **Références « phase N » de `/plan` remplacées** dans les 4 templates, les 2 checklists, `.method/sprint/status.md` et les 6 placeholders de `docs/` : `plan` ne fonctionne plus par phases numérotées mais par artefacts produits à la demande.
- **`check:framework`** : l'exclusion de `files/` disparaît, seul le changelog reste exclu (son rôle de journal est de citer des commandes supprimées).

**Pourquoi :** ces fichiers étaient lus comme source de vérité par Claude alors qu'ils décrivaient un état révolu du framework. Un template qui embarque 2 400 lignes de méta-documentation périmée fait porter cette dette à chaque projet cloné.

**Fichiers :**
- Supprimés : `plan.md`, les 4 documents d'archive de `files/`
- Modifiés : `.gitignore`, `scripts/check-framework.mjs`, `.method/templates/{brief,prd,architecture,epic,story}.tmpl.md`, `.method/checklists/readiness-gate.md`, `.method/sprint/status.md`, `docs/{brief,prd,architecture}.md`, `docs/epics/_index.md`, `docs/design/{screens,components}/_index.md`

## [2026-07-26] — Simplification dev / plan : échelles au lieu de modes, cadrage à la carte
**Quoi :**
- **`dev` : 5 modes → 2 modes × 3 échelles.** La détection par verbes français (`corrige`, `ajoute`, `nettoie`…) est supprimée : elle était fragile et ne changeait quasiment rien (fix et feature ne différaient que par une phrase de « review focus »). Restent 2 modes réels — lecture (read-only) et écriture — et 3 **échelles** déterminées par ce que le changement touche : **Micro** (1-2 fichiers, aucune nouvelle surface) · **Standard** (3-5 fichiers, ou création d'une fonction/composant/action) · **Module** (nouvelle surface, changement DB, ou ≥ 6 fichiers).
- **Les garanties ne dépendent plus du chemin choisi.** Conventions chargées + type-check s'appliquent à toute échelle, y compris sur un changement d'une ligne. Ce qui s'échelonne est le cérémonial : rapport de review, changelog, registry, story. Avant, le workflow en 5 phases était contourné sur les petits changements — et en le contournant on perdait aussi le chargement des conventions et la review.
- **Story proposée, pas imposée** — uniquement à l'échelle Module, avec sa justification : c'est le seul endroit où les AC sont écrits avant le code, donc le seul moyen pour la review de statuer « AC non livré » au lieu de donner un avis.
- **2 garde-fous conditionnels** remplacent les modes fix/refacto : correction d'un comportement cassé → test qui reproduit d'abord ; changement sans effet sur le comportement observable → tests identiques avant/après. Ils se déclenchent sur la nature réelle du travail, pas sur le vocabulaire.
- **`plan` : pipeline → artefacts à la carte.** Les 6 phases séquentielles deviennent une liste d'artefacts dont seuls les manquants ou les impactés sont produits. Trois niveaux : **initial**, **évolution ciblée**, et **refus** — le cadrage peut désormais se déclarer inutile et basculer en implémentation, ce que rien ne l'autorisait à faire.
- **Principe des artefacts optionnels écrit noir sur blanc** : aucun artefact n'est obligatoire, son absence est déclarée et non subie. Une référence UI à `N/A` n'est jamais un défaut et la review ne la pénalise pas.

**Pourquoi :** en rythme de croisière, le workflow lourd n'était pas utilisé — donc les garanties de qualité ne s'appliquaient presque jamais. En attachant les garanties au changement plutôt qu'au workflow, et en faisant varier le seul cérémonial, il n'y a plus de chemin à contourner.

**Fichiers :**
- `.claude/skills/dev/SKILL.md`, `.claude/skills/plan/SKILL.md`, `.claude/skills/revue/SKILL.md`
- `CLAUDE.md`, `README.md`

## [2026-07-26] — Refonte du système d'agent : skills auto-déclenchés, review conventions-driven, gate git par hook
**Quoi :**
- **Routing unique par globs.** `.method/conventions/_index.md` gagne une colonne **Globs** — seule source de vérité `fichier → tag → convention`, consommée par `dev` et `revue`. Le mapping en prose (7 tags sur 22) qui vivait dans `dev.md` est supprimé.
- **Review adossée aux conventions.** Nouveau skill `revue` : il route les conventions par globs sur le diff, les lit **en entier**, puis confronte le code aux règles. La gravité est indexée sur la source — HAUTE/MOYENNE seulement si le finding cite `conventions/<fichier>.md § <section>` ou un AC de la story ; sans citation, c'est BASSE et non bloquant. Avant, la review ne lisait que 2 fichiers de conventions sur 22.
- **`code-review.md` réduit au transverse** (périmètre du diff, hygiène, conformité à la demande, documentation de méthode). Les ~40 règles qui doublonnaient les conventions sont supprimées — fin de la 3ᵉ source de vérité.
- **Suppression de l'agent isolé.** La review tourne dans le contexte courant. La perte de recul est compensée par la mécanique : on ne demande plus au reviewer d'avoir des idées, mais de dérouler des règles lues juste avant.
- **`.claude/commands/` supprimé, tout devient skill.** Un skill s'auto-déclenche sur l'intention *et* reste invocable en `/<nom>` ; une command n'offrait que le second. `dev`, `plan`, `revue`, `verify`, `wrap-up`, `commit-push` migrent. `dev` et `dev` (dépréciés) sont supprimés.
- **Gate git déterministe.** `enforce-git-gate.sh` bloque tout `git commit`/`git push` hors du skill `commit-push` (échappement explicite par le marqueur ` # checks-ok`, posé après les checks). `--no-verify` et `--force` bloqués sans échappement. Le déclenchement d'un skill est probabiliste : acceptable pour charger des conventions, pas pour un gate de push.
- **22 skills de tag réduits à des pointeurs.** Les 3 invariants recopiés dans chacun sont supprimés : ils divergeaient de la convention et donnaient l'illusion d'être informé sans lire la source.
- **`pnpm check:framework`.** Valide tags ↔ conventions ↔ skills ↔ hooks ↔ références croisées. A détecté 8 incohérences existantes au premier run (`/tm-evolve`, `/tm-gate`, `/tm-sprint`, `/tm-status` référencés partout, inexistants) — toutes corrigées.
- **`enforce-bash-rules.sh` réparé** : ne bloque plus `git log | head` (les règles ne ciblent plus que les commandes de check) et ne renvoie plus vers une section de `CLAUDE.md` supprimée en mai.
- **`files/*.md` marqués ARCHIVE** — ces documents citaient des commandes disparues et étaient lus comme normatifs.

**Pourquoi :** le système d'agent avait trois sources de vérité divergentes (conventions, checklist, skills), aucune review ne lisait les conventions, et les règles de qualité n'étaient appliquées que si Claude pensait à les appliquer. Les garanties sont maintenant soit mécaniques (routing par globs, citation obligatoire), soit appliquées par un hook.

**Fichiers :**
- `.method/conventions/_index.md`, `.method/checklists/code-review.md`, `.method/checklists/prd-evolution.md`, `.method/checklists/readiness-gate.md`, `.method/sprint/status.md`, `.method/templates/epic.tmpl.md`, `.method/templates/story.tmpl.md`
- `.claude/skills/{dev,plan,revue,verify,wrap-up,commit-push}/SKILL.md` (créés) + 22 skills de tag réécrits
- `.claude/commands/` (supprimé), `.claude/hooks/enforce-git-gate.sh` (créé), `.claude/hooks/enforce-bash-rules.sh`, `.claude/settings.json`
- `scripts/check-framework.mjs` (créé), `package.json`, `CLAUDE.md`, `README.md`, `files/*.md`

## [2026-05-02] — CLAUDE.md : ajout section "Avant de coder (CRITIQUE)"
**Quoi :** Ajout d'une section "Avant de coder" en tête du CLAUDE.md avec 4 règles : surfacer les hypothèses (pas trancher en silence), edits chirurgicaux (chaque ligne trace à la demande), critères de succès vérifiables, push back quand justifié. Suppression de la référence orpheline à "Règles d'exécution Bash" dans "Règles avant push" (section déjà retirée).
**Pourquoi :** cadrer le comportement de Claude en amont du code : éviter les implémentations trop larges, les refactos non demandés, et le "make it work" flou. Pousse l'agent à clarifier au lieu d'inventer.
**Fichiers :**
- `CLAUDE.md`

## [2026-05-02] — Tests rapatriés en local : CI = build only
**Quoi :**
- `/commit-push` exécute désormais 3 checks locaux : type-check + lint + tests (au lieu de 2).
- CI GitHub réduite à `pnpm build` uniquement (validation Vercel + erreurs Linux). Plus de duplication local/CI.
- CLAUDE.md "Règles avant push" mises à jour : suppression de l'interdiction "Ne JAMAIS lancer pnpm test localement".

**Pourquoi :** la séparation "lint/test sur CI uniquement" n'avait plus de sens depuis que l'environnement local est stable (TS 5.8.3 pin + hook PreToolUse). Lancer les tests en local accélère le feedback (plus besoin d'attendre la CI pour voir un test cassé), simplifie le mental model, et la CI reste un filet de sécurité Linux/build via `pnpm build`.

**Fichiers :**
- `.claude/commands/commit-push.md`
- `.github/workflows/ci.yml` (renommé "CI — Build", suppression des steps lint/tests)
- `CLAUDE.md` (section "Règles avant push")

## [2026-04-30] — CLAUDE.md : retrait de la section "Règles d'exécution Bash"
**Quoi :** Suppression de la section "Règles d'exécution Bash (TOUTES les commandes)" du CLAUDE.md (7 règles : pas de background, pas de pipe, pas de redirection, pas de boucle d'attente…).
**Pourquoi :** ces règles sont désormais appliquées par le hook `PreToolUse` (`.claude/hooks/enforce-bash-rules.sh`) au niveau système, plus besoin de les répéter dans le prompt. Réduit le bruit au chargement de chaque conversation et évite la duplication source de divergence.
**Fichiers :**
- `CLAUDE.md`

## [2026-04-30] — CLAUDE.md : règle de style de réponse (concis, pas de récap)
**Quoi :** Ajout d'une section "Style de réponse (CRITIQUE)" en tête du CLAUDE.md imposant des réponses courtes, sans récap qui répète l'user, sans tableaux décoratifs ni emojis non demandés, sans phrases d'intro/transition.
**Pourquoi :** réduire le bruit dans les réponses Claude pendant les workflows framework, particulièrement utile dans les sessions longues où chaque tour répétait inutilement le contexte.
**Fichiers :**
- `CLAUDE.md` (nouvelle section au début)

## [2026-04-19] — Consolidation : /dev absorbe /dev et /dev, ajoute modes refacto et explore
**Quoi :**
- `/dev` devient le **point d'entrée unique** pour toute action code avec 5 modes auto-détectés depuis l'argument : **story** (ID/`next`), **fix** (bug/corrige/cassé…), **feature** (ajoute/implémente…), **refacto** (nettoie/factorise, tests identiques avant/après), **explore** (comprends/analyse, **read-only**).
- `/dev` et `/dev` deviennent des **alias rétro-compatibles dépréciés** qui affichent un warning et exécutent le bon workflow de `/dev`. Seront supprimés dans une prochaine version.
- CLAUDE.md et README.md mis à jour : nouvelle table commandes (2 points d'entrée principaux + 5 modes), table dépréciation, détail des 5 modes.

**Pourquoi :** retirer les redondances (dev ≡ dev libre, dev ≡ plan évolution) et combler les trous (mode refacto avec garde-fous "tests identiques", mode explore read-only). Une heuristique simple pour l'utilisateur : *docs → `/plan`, code → `/dev`*.

**Fichiers :**
- `.claude/commands/dev.md` (refonte avec 5 modes + détection auto)
- `.claude/commands/dev.md` (alias déprécié avec warning)
- `.claude/commands/dev.md` (alias déprécié avec warning)
- `CLAUDE.md` (table commandes + ajustement "Mode libre")
- `README.md` (table commandes, table dépréciation, section "Les 5 modes de /dev")

## [2026-04-19] — /plan gère le mode évolution (V2) + README synchronisé
**Quoi :**
- `/plan` détecte automatiquement si c'est un cadrage initial (pas de `docs/prd.md`) ou une évolution versionnée (V2/V3). En mode évolution : Edit > Write sur les docs existants, ADR obligatoire par invariant touché, création des nouveaux epics/stories uniquement, gate avec `prd-evolution.md` en plus du readiness-gate.
- README mis à jour : table des commandes complétée (ajout de `dev`, `wrap-up`, `commit-push` qui manquaient), `/plan` décrit comme couvrant les deux modes, structure `.claude/` détaillée (commands/skills/hooks), section Qualité corrigée (type-check + lint local via `/commit-push`, tests sur CI GitHub).

**Pourquoi :** combler le trou méthodologique pour les grosses évolutions versionnées sans introduire un `/plan-v2` redondant, et aligner le README sur l'état réel du framework (3 commandes + skills auto-déclenchés n'y figuraient pas).

**Fichiers :**
- `.claude/commands/plan.md` (ajout de la section "Mode : initial ou évolution")
- `README.md` (table commandes, structure, section qualité, section V2)

## [2026-04-19] — Template : triggers bilingues, argument-hints, nouveau skill/command wrap-up
**Quoi :**
- `argument-hint` ajoutés aux 3 slash commands qui prennent des arguments (dev, dev, dev).
- Descriptions des 22 skills `.claude/skills/*/SKILL.md` enrichies avec des triggers bilingues FR+EN (mots-clés métier en français pour améliorer le déclenchement automatique).
- Nouveau workflow `/wrap-up` (hybride) : command `.claude/commands/wrap-up.md` pour le process complet + skill shim `.claude/skills/wrap-up/` qui auto-propose à l'utilisateur de capturer les apprentissages méta (conventions, ADR, registry) à la fin d'un chantier. La règle : proposer, jamais exécuter silencieusement.

**Pourquoi :** inspiré de l'analyse du repo AlexisLaporte/claude-skills. L'objectif est (a) de fiabiliser le déclenchement automatique des conventions hors des workflows `/dev` (les triggers FR couvrent la langue de travail), et (b) d'introduire un mécanisme de capture des **apprentissages méta** du projet, que le couple changelog+code ne couvre pas aujourd'hui.

**Fichiers :**
- `.claude/commands/dev.md`, `dev.md`, `dev.md` (frontmatter)
- `.claude/commands/wrap-up.md` (nouveau)
- `.claude/skills/wrap-up/SKILL.md` (nouveau)
- `.claude/skills/{a11y,api,auth,database,datetime,deploy,feedback,flags,forms,i18n,monitoring,nextjs,performance,realtime,security,seo,state,supabase,tables,testing,typescript,uploads}/SKILL.md` (descriptions bilingues)
- `CLAUDE.md` (ajout de `/wrap-up` dans la table des commandes)

## [2026-04-19] — Template : skills "shim" pour conventions
**Quoi :** Ajout de 22 skills Claude Code (un par tag de `.method/conventions/_index.md`) dans `.claude/skills/`. Chaque skill est un shim ~8 lignes (frontmatter `name`+`description` + pointeur vers `.method/conventions/<file>.md` + 2-3 invariants-clés).
**Pourquoi :** Les conventions étaient chargées uniquement par `/dev` / `/dev` via déduction de tags manuelle. Hors de ces workflows (édit libre, Q&A), elles étaient ignorées. Les skills permettent à Claude de les auto-déclencher contextuellement sans toucher à la source de vérité (`.method/conventions/` inchangé) ni aux slash commands.
**Fichiers :**
- `.claude/skills/{auth,database,supabase,api,forms,realtime,security,nextjs,typescript,state,feedback,performance,tables,uploads,seo,a11y,i18n,datetime,monitoring,flags,deploy,testing}/SKILL.md` (22 nouveaux shims)
- `.gitignore` : whitelist `!.claude/skills/`
