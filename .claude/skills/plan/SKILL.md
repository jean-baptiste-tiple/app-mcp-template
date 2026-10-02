---
name: plan
description: "Cadrage produit : brief, PRD par parcours, architecture, design, epics/stories. Quatre niveaux — refus, story seule, évolution ciblée, initial."
when_to_use: "Uniquement sur invocation explicite de l'utilisateur (/plan). Face à un besoin produit large exprimé autrement, PROPOSER un cadrage et attendre l'accord — un cadrage réécrit PRD, architecture et stories."
disable-model-invocation: true
argument-hint: "[scope / version optionnels]"
---

# plan — Cadrage

Un dialogue qui produit les documents de cadrage. Pas un formulaire, pas un pipeline
obligatoire : **une liste d'artefacts dont seuls les manquants ou les impactés sont produits.**

> **RÈGLE CRITIQUE — zéro code, zéro commande système.**
> Ce skill ne modifie que des Markdown dans `docs/` et `.method/sprint/`. Interdit pendant un
> cadrage : installer des dépendances, créer/modifier `.ts` `.tsx` `.js` `.css` `.json`, lancer
> un build/lint/test, copier des fichiers de starter, créer des dossiers dans `src/`,
> `supabase/`, `.github/`. L'installation technique est faite par `dev`, dans la story de setup.

## Étape 0 — Choisir le niveau (ou refuser)

Regarder ce qui existe déjà (`docs/prd.md`, `docs/architecture.md`, `docs/stories/`) et ce que
la demande touche :

| Niveau | Quand | Ce qui est produit |
|--------|-------|--------------------|
| **Refus** | La demande tient en quelques fichiers, sans nouveau parcours ni changement de modèle de données | **Rien.** Le dire et basculer sur `dev`. |
| **Story seule** | `dev` a détecté l'échelle Module et l'utilisateur a accepté une story — mais le parcours existe déjà au PRD | **Une story**, rien d'autre |
| **Évolution** | `docs/prd.md` est rempli et la demande ouvre ou modifie un parcours | Le parcours concerné + la cascade réellement impactée |
| **Initial** | `docs/prd.md` absent, vide ou placeholder | La chaîne complète |

**Story seule** est le niveau attendu quand `dev` propose « je cadre une story d'abord » :
écrire la story depuis `.method/templates/story.tmpl.md` — AC en Given/When/Then, fichiers à
créer, tests attendus, tags `Conventions`, **rayon d'impact** (appelants avec commande citée,
doublons, effet produit, refacto proposé ou écarté — `CLAUDE.md § Avant de coder`) — **sans
toucher au PRD ni à l'architecture**. Gate réduit à `.method/checklists/story-ready.md`. Puis
**rendre la main à `dev`** sur cette story.

Tout arbitrage rencontré pendant le cadrage — produit, périmètre, refacto — se pose via
`AskUserQuestion` avec le contexte pour trancher, **avant** d'écrire la décision dans un
document. Un cadrage qui tranche en prose fige un choix que personne n'a validé, et le document
le rend ensuite vrai pour toutes les sessions suivantes.

Ne jamais déclencher une évolution de PRD complète pour une demande qui n'ouvre pas de parcours :
c'est le piège qui rend la proposition de story dissuasive.

**Le refus est une issue normale, pas un échec.** Formuler :
> « Ça ne mérite pas un cadrage : pas de nouveau parcours, pas de changement de modèle de
> données. Je passe directement en implémentation — dis-moi si tu veux une story quand même. »

En **Évolution**, confirmer avant d'écrire :
> « `docs/prd.md` est déjà rempli. Je fais évoluer le parcours [X] et je cascade sur ce qui est
> réellement impacté — je ne recrée rien. OK ? »

### Règles absolues en Évolution

1. **Jamais de réécriture** d'un document existant — Edit, pas Write
2. Préserver le contenu existant sauf demande explicite
3. **ADR obligatoire** dans `docs/decisions/` pour tout invariant touché (structure, sécurité, modèle de données)
4. Stories et epics existants non retouchés, sauf si leur scope change (le noter dans leur historique)
5. Passer `.method/checklists/prd-evolution.md` en plus du readiness-gate

## Les artefacts

Produire **uniquement** ceux qui manquent ou que la demande impacte. Pour chacun, dire
explicitement s'il est produit, mis à jour, ou volontairement laissé de côté.

### `docs/brief.md` — comprendre le problème

Quel problème, pour qui, pourquoi maintenant · personas (nom/rôle/besoin/frustration) · scope
MVP IN/OUT explicites · contraintes (techniques, business, légales, RGPD) · KPIs concrets ·
risques. Quantifier la douleur : « perd 2h/semaine » > « c'est lent ».

En Évolution : ajouter une section de version, ne pas réécrire l'existant.
→ `.method/templates/brief.tmpl.md`

### `docs/prd.md` — le PRD par parcours

Un parcours = un objectif utilisateur complet. Pour chacun : flow Mermaid · écrans · FR
`FR-[PARCOURS]-[XX]` avec priorité MoSCoW et AC en Given/When/Then · NFR liés.

Cohérence à vérifier : chaque FR a une référence UI (maquette, description **ou `N/A`**) ·
chaque écran est dans un flow · max 60 % de Must · chaque FR est testable.

En Évolution : les nouvelles sections sont marquées 🔶 Draft, les parcours existants intacts.
→ `.method/templates/prd.tmpl.md`

### `docs/architecture.md` — le socle technique

Modèle de données (Mermaid ER) · RLS par table · Server Actions par parcours · points
performance. Commencer simple. RLS dès le jour 1. Un schema Zod = une source de vérité.

→ `.method/templates/architecture.tmpl.md` · consulter `.method/conventions/_index.md`

### `docs/design/` — le design

Trois situations, toutes valides :

- **Maquettes fournies** → vérifier qu'un fichier existe pour chaque écran du PRD, signaler les
  manquants, mettre à jour `docs/design/screens/_index.md` et `components/_index.md`
- **Pas de maquettes, thème à personnaliser** → questions ciblées (couleur primaire,
  secondaire, font, style) → mettre à jour `docs/design/system.md`. Le code (bloc « THÈME
  PROJET » de `globals.css`, police de `layout.tsx`) sera modifié par `dev` à la story de setup
- **Pas de maquettes, thème neutre gardé** → ne rien faire, le dire, passer à la suite

L'absence de maquette n'est jamais un blocage : les stories portent alors une description
textuelle ou `N/A`.

### `docs/epics/` et `docs/stories/` — le découpage

Epics (`.method/templates/epic.tmpl.md`) référençant leur parcours. Stories
(`.method/templates/story.tmpl.md`) avec contexte, AC Given/When/Then, fichiers à créer, tests
attendus, référence UI.

Chaque story déclare ses tags `Conventions` (liste dans `.method/conventions/_index.md`). Ils
s'ajoutent aux tags déduits des globs au moment du dev — les déclarer sert à couvrir ce que les
chemins de fichiers ne révèlent pas encore.

Ordonner par dépendance et priorité. Une story = un déploiement possible. Taille S/M/L, pas XL.

En Évolution : **uniquement les nouveaux** epics et stories.
→ Mettre à jour `docs/epics/_index.md`

### Starters et canal MCP — identification, jamais installation

Le projet a-t-il besoin d'une base de données et/ou d'authentification ?

**Oui** → lire `.method/starters/supabase-auth/README.md`, prévoir une story « Setup technique »
(dépendances, copie des fichiers du starter, `.env.local`, type-check), noter l'activation dans
`docs/architecture.md`. Adapter si les besoins auth sont spécifiques (ex : accès par code →
ne pas copier les pages auth du starter).

**Non** → le template fonctionne sans base de données. Ne rien prévoir.

Le canal MCP (Claude, ChatGPT) est **installé par défaut** dans `src/mcp/` : le produit est
MCP-first sauf décision contraire.

**Cas par défaut** → lire `src/mcp/README.md` et `.method/conventions/mcp-patterns.md` ; passer
`.method/checklists/mcp-design.md` pendant le brief et le PRD (phrases réelles des utilisateurs, une
fiche par outil, golden queries créées depuis `.method/templates/mcp-golden-queries.tmpl.md`) ;
remplir la section « Canal MCP » de `docs/architecture.md` ; figer par ADR l'auth, le transport et
l'absence d'IA serveur (mcp-patterns §4 bis, §6, §7). La story « Setup technique » remplace le
domaine démo et active l'auth avec `supabase-auth`.

**Aucun serveur MCP** → le poser via `AskUserQuestion` (c'est un écart au défaut), écrire `N/A`
dans la section « Canal MCP » et prévoir le retrait du canal dans la story de setup.

### Hébergement Supabase — Cloud ou souverain

Si le projet a une base de données, demander où elle vit, via `AskUserQuestion` :

- **Supabase Cloud** (défaut) → `.method/conventions/deployment-patterns.md`, rien à prévoir.
- **Self-hosted souverain** (Scaleway ou autre hébergeur, données en France, hors Supabase Cloud)
  → lire `.method/conventions/deployment-scaleway.md` ; choisir l'option A (Supabase sur
  Instance, app sur Vercel) ou B (tout chez l'hébergeur) ; figer le choix par ADR dans
  `docs/decisions/` (cet ADR active le tag `selfhost`) ; ajouter à la story de setup les 4
  réglages OAuth bloquants et la checklist de validation de ce fichier.

## Gate de sortie

Passer `.method/checklists/readiness-gate.md` (+ `prd-evolution.md` en Évolution). Vérifier la
cohérence PRD ↔ architecture ↔ design ↔ stories. Si KO, corriger avant de clore.

Initialiser ou mettre à jour `.method/sprint/status.md` : dates, epic focus, stories
sélectionnées. Puis résumer : ce qui a été produit, ce qui a été volontairement laissé de côté,
et la première story à implémenter.

**Rendre la main explicitement.** Un cadrage ne se termine pas sur un document : il se termine
sur une phrase qui relance l'implémentation, sinon la session s'arrête là et l'utilisateur doit
relancer à la main.

> « Cadrage terminé. Je reprends en `dev` sur `E0X-SYY` — conventions rechargées par globs
> plus les tags déclarés dans la story. »
