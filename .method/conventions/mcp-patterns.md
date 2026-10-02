# MCP Patterns

> Tag : `mcp`
> Lire ce fichier avant d'écrire un tool MCP, un widget MCP Apps, ou de toucher à `src/mcp/` / `widgets/`.
> Implémentation installée par défaut : `src/mcp/` + `widgets/` (mode d'emploi : `src/mcp/README.md`) — chaque fichier référence la section qu'il implémente.
> Les exemples ci-dessous utilisent un domaine fictif (gestion de documents) — adapter au domaine du projet.
> Cibles : **Claude ET ChatGPT dès la V1** — toute règle ci-dessous s'applique aux deux hosts.

## 1. Règle d'or : parité par services partagés

Un tool MCP est un **adaptateur fin** — exactement comme une Server Action. La logique vit dans `lib/services/`.

```typescript
// ❌ Logique métier dans le tool
server.registerTool("archive_document", ..., async (input, extra) => {
  const { data } = await supabase.from("documents").select()...  // NON
})

// ✅ Tool = auth + validation + appel service + mise en forme
server.registerTool("archive_document", {
  title: "Archiver un document",
  description: ARCHIVE_DESC,                   // voir §3
  inputSchema: archiveDocumentSchema,          // Zod — même schéma que le form web (nommage : coding-standards)
  annotations: { readOnlyHint: false, idempotentHint: true },
  _meta: widgetMeta("document-preview"),       // voir §5
}, async (input, extra) => {
  const ctx = await requireAuthContext(extra)  // {userId, supabase} — org et rôle relus en base, §6
  const result = await archiveDocument(ctx, input) // lib/services/document-service.ts
  return toToolResult(result, { widget: "document-preview" })
})
```

Toute nouvelle capacité = 1 fonction service + 2 adaptateurs (action + tool). Si un des deux manque, le dire dans la story.

## 2. AX — le serveur se présente (découverte par l'agent)

L'« Agent Experience » commence à l'`initialize` : c'est là que le modèle apprend qui on est, ce qu'on sait faire et comment enchaîner. Trois niveaux, du global au local :

### 2.1 `serverInfo` + `instructions` (niveau serveur)

> Statuts ci-dessous : mesurés sur le banc `mcp-test` (Claude Code 2.1.263/2.1.278, claude.ai, Claude Desktop/Cowork, ChatGPT developer mode), format `[statut · date · scénario]`, détail dans `docs/bench/results.md` du banc.

- `serverInfo` : `name` court et stable, `title` humain, `version` (semver, bumpée à chaque évolution de tools). **Aucun host ne les montre au modèle** `[infirmé · 2026-09-22 · M6, server_identity]` : le modèle voit le nom local du serveur (Claude Code) ou le nom du connecteur saisi par l'utilisateur (claude.ai, ChatGPT), jamais `title` ni `version`. Ils servent aux interfaces et au journal ; le domaine du produit doit donc être dans les noms et les descriptions des tools (§3).
- **`instructions` est OBLIGATOIRE et maintenu**, mais ce n'est **pas un canal fiable** `[précisé · 2026-09-22 · readme_instructions, instr_len_*]` : Claude Code les injecte au démarrage de session seulement (serveur déjà connecté au premier message) et les coupe à **2 048 caractères** ; ChatGPT les transmet ; **claude.ai et Claude Desktop (chat) ne les montrent jamais au modèle**. Donc : ≤ 2 000 caractères, et **toute règle vitale est AUSSI dans la description du tool qu'elle concerne** (première phrase) ou dans son schéma (champ requis). Les instructions restent le récapitulatif : mission, entités, workflow type, conventions. À rédiger **en anglais** (robustesse cross-host ; les utilisateurs parlent leur langue, le modèle fait le pont). Structure à suivre :

```typescript
instructions: `<Product> manages <entities> for <audience> (multi-tenant).

Core concepts:
- <entité centrale, son cycle de vie, ses invariants (ex: immutabilité des versions)>
- <comment les utilisateurs désignent les entités (par nom ? les tools acceptent les noms et les résolvent)>

Typical workflows:
1. <workflow 1 : enchaînement de tools>
2. <workflow 2>

Rules:
- Prefer tool results' next_actions to decide what to propose next.
- Do not paste large entity JSON into the conversation; widgets display it.
- NEVER claim the widget visually displayed something — you cannot see the user's screen.
  If the user reports a stuck preview, do NOT retry the same call: use the fallback.
- Present signed URLs as SHORT markdown links, never raw; mention expiry.
- For prepare→save flows: produce the result and call the save tool IN THE SAME TURN.
- All operations are scoped to the authenticated user's organization.`
```

- Interdits dans `instructions` et les descriptions : date du jour, contenu par utilisateur, compteurs — tout ce qui varie casse le prompt caching de l'host et pollue la découverte.
- Les règles de l'exemple ci-dessus qui conditionnent un enchaînement (prepare → save dans le même tour, résolution par nom, pas de retry) se répètent dans la description du tool concerné : sur claude.ai, elles n'existent que là.

### 2.2 Métadonnées de tools (niveau tool)

Voir §3. Le modèle décide **uniquement** sur `name` + `title` + `description` + schéma : c'est notre "SEO agent".

### 2.3 Prompts MCP + starter prompts (niveau utilisateur)

- Exposer des **prompts MCP** (capability `prompts`) pour les parcours canoniques du produit. Rendu par host `[mesuré · 2026-09-23 · proto S07, mesure 2]` : **Claude Code** lit `prompts/list` à chaque session et en fait des commandes `/mcp__<serveur>__<prompt>` qui déroulent tout le parcours ; **claude.ai** les liste par leur `title` dans le menu « + » → Connecteurs, et un clic **attache le résultat comme fichier TXT** au message, pas comme texte ; **ChatGPT n'en affiche aucun** (aucun `prompts/list` au journal). Le `title` et la première ligne du prompt doivent donc se suffire.
- Côté ChatGPT, renseigner les starter prompts / golden queries dans les métadonnées de l'app (soumission Apps SDK).

### 2.4 Notice d'usage lue à chaque conversation (readme + ack)

Quand un protocole d'usage ne tient pas dans les descriptions (règles de domaine, ordre d'appel) et que les instructions ne suffisent pas (claude.ai ne les montre pas, §2.1), un tool `readme` sert la notice et les autres tools l'exigent `[confirmé · 2026-09-22 · readme_ack, 9 couples host × modèle]` :

- **Le levier qui marche partout : un champ `ack` REQUIS dans le schéma** de chaque tool (description : « Value returned by <readme tool>; call it first »), et le tool readme qui renvoie ce code. Mesuré : readme appelé avant le premier tool, une fois par conversation, de nouveau dans une nouvelle conversation, sur Claude Code (Opus, Sonnet, Fable), claude.ai (Opus 5, Sonnet 5, Fable 5.1, Haiku 4.5) et ChatGPT (défaut, « Analyser »). Coût : un appel et la taille du readme par conversation.
- **Levier sans contrainte, presque aussi bon** : la première phrase de la description de chaque tool dit « Requires <readme tool> first (call it once per conversation before this tool). » — suivi partout `[2026-09-22 · readme_descriptions]`.
- **Leviers qui échouent** `[2026-09-22 · readme_instructions, readme_hub, readme_name_first, readme_gate]` : la consigne dans les instructions (ignorée par claude.ai) ; le renvoi « see <readme tool> for usage » (ignoré par claude.ai et par Fable) ; le tri du readme en tête de liste (sans effet) ; le rejet côté serveur tant que l'empreinte UA + IP n'a pas appelé le readme (inutilisable : claude.ai et ChatGPT changent d'IP à chaque requête, boucle de rejets, ChatGPT finit par annoncer un résultat jamais obtenu).
- **Le serveur vérifie l'ack** (HMAC du readme et du scénario, fenêtre de validité) et rejette avec une erreur actionnable ; le tool readme reste toujours appelable.
- **Le readme informe, il ne commande pas** : Sonnet et Opus refusent d'exécuter les règles écrites dans un résultat de tool (« citer la ligne d'ack », « repasser l'ack ») et les signalent comme contenu non fiable ; toute obligation passe par les métadonnées (description, schéma).
- **Le texte du readme va aussi dans `structuredContent`** (§4) : sur Claude Code, un readme servi en texte à côté d'un `{ack}` structuré n'atteint jamais le modèle ; l'ack prouve alors l'appel, pas la lecture.
- **Code expiré en pleine conversation** `[mesuré · 2026-09-23 · proto, mesure 5]` : quand l'ack devient invalide (règles changées), le refus doit dire « call <readme tool> again **with the same request**, then retry this call ». Claude Code rappelle le readme et reprend seul (3/3) ; claude.ai et ChatGPT le rappellent avec la question du tour suivant et ne rejouent pas l'appel refusé quand le message ne le demande pas.
- **Plusieurs serveurs du même genre chez un utilisateur** (un par client, par exemple) `[mesuré · 2026-09-23 · proto, preuve 9]` : la description du readme se termine par une borne, « Call it only when the request concerns <domaine> work. Otherwise do not call it. » Sans elle, 13 conversations sur 39 appelaient le readme des deux serveurs.

## 3. Design des tools

- **Peu de tools, orientés tâche** (≤ 10). Un tool = une intention ("archiver"), pas un endpoint CRUD. La limite n'est pas l'host `[précisé · 2026-09-22 · many_tools_*]` : aucun ne refuse ni ne tronque 504 tools (≈ 47 000 tokens de liste) ; Claude Code et claude.ai les diffèrent (noms seuls, ordre alphabétique, chargement par recherche d'outils), ChatGPT les expose tous dans l'ordre du serveur. Elle tient au routage et au coût en contexte.
- **Nommage** : `verb_noun` en anglais, le domaine toujours visible dans le nom (`import_document`, `search_documents`). Les utilisateurs ont d'autres connecteurs : un nom ambigu (`search`, `list`) = mauvais routage garanti. **≤ 64 caractères, `snake_case` ASCII (lettres, chiffres, `_`)** `[mesuré · 2026-09-22 · name_len_*, name_chars]` : Claude Code préfixe `mcp__<serveur>__` et l'API refuse plus de 128 caractères — un nom de 128 **casse toute la session** (erreur 400 dès que le tool est chargé) ; Claude Code remplace `.` et les lettres accentuées par `_` ; claude.ai **retire sans message** un tool au nom non ASCII ; ChatGPT accepte tout.
- **`title` humain** dans la langue des utilisateurs (affiché dans les UI des hosts) ; `name` stable à jamais (voir §10).
- **Descriptions : format imposé** — verbe d'abord, « Use this when… », puis « Do not use for… », l'essentiel dans la première phrase. **Ce sont les hosts qui tronquent** `[confirmé et précisé · 2026-09-22 · desc_len_*]` : claude.ai (web et Desktop) ne montre que la **première phrase** tant que le tool n'est pas chargé par sa recherche d'outils ; Claude Code coupe toute description à **2 048 caractères** ; ChatGPT la livre entière (32 000 caractères testés). Une description de plusieurs milliers de caractères nuit aussi à la recherche d'outils (claude.ai ne retrouve plus le tool par son nom exact à 32 000). Viser moins de 1 000 caractères :

```typescript
const SEARCH_DESC = `Searches the organization's documents by title, author or date range.
Use this when the user asks "les documents de Cédric", "les docs de la semaine", or to resolve
a document name before get_document. Do not use to read a document's content (use get_document).
Returns a paginated list (id, title, updated_at).`
```

- **Un prérequis s'écrit en consigne impérative dans la première phrase** (« Requires X first… ») **ou en champ requis du schéma**, jamais en renvoi (« see X for usage ») `[mesuré · 2026-09-22 · readme_descriptions, readme_hub]` : la consigne impérative est suivie par les 5 modèles testés sur les 3 hosts ; le renvoi est ignoré sur claude.ai et par Fable.
- **Inputs** : Zod avec `.describe()` sur CHAQUE champ — **y compris les champs d'identifiants** (`"Document id (or pass name)"`, `"Variant id (default: the latest)"`) : un champ nu est un champ que le modèle remplit mal. Enums pour les valeurs fermées, exemples dans la description du champ, défauts explicites. Champs optionnels vraiment optionnels. Deux limites mesurées `[2026-09-22 · M3, schema_shape]` : **un champ requis sans valeur sûre est inventé** (les trois hosts ont complété un `mode` requis par `"fast"`, ChatGPT en prétendant l'inverse) → optionnel + défaut explicite ; **ChatGPT ne montre pas au modèle les descriptions des propriétés imbriquées** (structure, enums et `required` vus, 0 description sur 27) → ce qu'un champ imbriqué exige se répète dans la description du tool.
- **Annotations HONNÊTES** sur chaque tool : `readOnlyHint: true` pour les lectures **ET pour les tools "prepare" qui ne persistent rien** (un prepare est un calcul pur — le déclarer mutant fait sur-confirmer les hosts) ; `destructiveHint` si suppression ; `openWorldHint: false` sauf accès réseau externe réel (fetch d'URL, service tiers) ; `idempotentHint` quand vrai. **claude.ai classe les tools par annotations** `[mesuré · 2026-09-23 · proto S07]` : un tool sans `readOnlyHint: true` est rangé dans « Outils d'écriture/suppression » de la fiche du connecteur et déclenche une demande d'autorisation (« Toujours autoriser ») à son premier appel — un readme ou un tool de lecture non annoté coûte un clic à chaque utilisateur. Le `title` est ce que l'utilisateur voit dans cette fiche.
- **`securitySchemes` par tool** (exigence ChatGPT pour déclencher l'UI de connexion) : tools authentifiés = `oauth2`. Sans cette déclaration, ChatGPT n'affiche jamais le bouton "Se connecter". Centraliser dans un helper `toolMeta()` — jamais à la main par tool.
- **Résolution par nom** : les tools acceptent un nom en plus des ids (matching insensible casse **et accents**, métacaractères `%`/`_` échappés avant `ilike`). Ambiguïté (≥2 résultats) → retourner les candidats dans `structuredContent` **+ l'instruction explicite** « montrez la liste et demandez à l'utilisateur — ne devinez pas » (dans le message d'erreur ET dans les instructions serveur). 0 résultat → lister ce qui existe ou le tool à appeler.
- **Un tool destructif n'apparaît JAMAIS dans les `next_actions`** d'un autre tool : une suppression se demande, elle ne se propose pas. Flow 2 temps obligatoire (1er appel = récapitulatif nominatif, 2ᵉ appel `confirm: true` seulement après accord explicite de l'utilisateur). Quand une étape antérieure a déjà fait approuver le contenu (liste de brouillons montrée, « oui, envoie-les »), cette approbation **est** le récapitulatif : accepter `confirm: true` sans premier appel `[mesuré · 2026-09-23 · proto D1]` — sur trois hosts, aucun envoi n'est parti sans accord, et exiger un second récapitulatif fait redemander l'utilisateur. Le compte-rendu liste les ids de ce qui est **réellement** parti : sur ChatGPT, un appel peut être bloqué par les contrôles de sécurité d'OpenAI avant d'atteindre le serveur (message opaque, rien au journal).

## 4. Résultats de tools

Toujours retourner **les deux formes** :

```typescript
return {
  content: [{ type: "text", text: ceQueLeModèleLit }],          // lu par claude.ai et ChatGPT
  structuredContent: {                                          // canal du WIDGET, et SEUL canal lu par Claude Code
    id, title, status,
    message: ceQueLeModèleLit,                                  // même texte, pour Claude Code
    next_actions: ["archive_document", "share_document"],       // le modèle proposera la suite
  },
  _meta: widgetMeta("document-preview"),
}
```

- **⚠️ Ce que le modèle doit lire va dans le texte ET dans `structuredContent`** `[inversé · 2026-09-22 · résultat brut de bench_echo, readme_* P14]` : quand un résultat porte les deux canaux, **Claude Code ne montre au modèle que `structuredContent`** (Opus, Sonnet et Fable ont restitué `{"args":…}` mot pour mot, jamais le texte ; un readme servi en texte ne les a jamais atteints) ; **claude.ai et ChatGPT montrent le texte**. L'ancienne règle « le texte est la seule voie fiable » (leçon cv-editor) vaut pour claude.ai et ChatGPT, pas pour Claude Code. Concrètement : consignes, données source et texte brut (avec un cap de taille) dans `text`, et les mêmes dans un champ de `structuredContent` (`message`, `instructions`) ; un résultat sans widget peut se contenter du texte seul, lu partout (vérifié sur Claude Code avec les erreurs `isError`).
- **Une consigne dans un résultat de tool est une donnée, pas un ordre** `[mesuré · 2026-09-22 · readme_* P14, P15]` : Sonnet et Opus refusent d'exécuter une règle du résultat qui ne sert pas la demande de l'utilisateur (citer un code, repasser une valeur) et la signalent comme contenu non fiable. Les consignes qui servent la demande passent : les étapes d'une procédure servie par un tool et **le ton ou la signature** servis dans un résultat sont suivis sur 100 % des réponses des trois hosts `[mesuré · 2026-09-23 · proto, mesure 7]` ; une obligation (prérequis, valeur à repasser) passe par les métadonnées (§2.4, §3). Une liste de candidats dit quoi faire selon la demande : pour une question de données, « cherche et réponds » ; pour une action, « demande laquelle » — la seule consigne « demande à l'utilisateur » laisse les questions de données sans réponse sur claude.ai et ChatGPT `[mesuré · 2026-09-23 · proto, preuve 11]`.
- **Taille lue en entier** `[mesuré · 2026-09-23 · proto, mesure 3, canaris]` : Claude Code transmet un résultat entier jusqu'à **45 000 caractères** ; au-delà de ~50 000 il le range dans un fichier que le modèle ne peut pas ouvrir sans outil de fichiers ; claude.ai lit 100 000 caractères et range 200 000 dans un fichier fouillé par recherche ; ChatGPT lit 200 000. **Plafonner tout résultat à 45 000 caractères** (section, page de lignes, contrat) et paginer au-delà. Arguments : un appel porte ~47 000 caractères écrits par le modèle sur Claude Code et claude.ai (mesure 4) ; viser des morceaux de 20 000 pour une écriture longue.
- **Données en champs dans `structuredContent`** `[mesuré · 2026-09-23 · proto, frictions F7]` : au-delà du `message`, y mettre les données elles-mêmes (lignes, ids, dates, montants) ; sinon les trois modèles de Claude Code les extraient de la prose et le signalent comme friction.
- `structuredContent` alimente le widget (contrat identique sur les deux hosts) et reste citable quand l'host l'expose. Compact : ids + résumé, **jamais** l'entité complète si le widget l'affiche (économie de contexte).
- **Liens signés : jamais bruts.** Le texte du tool impose la présentation en lien markdown court (`[Ouvrir le PDF](url)`) + mention de l'expiration — sinon le modèle colle l'URL signée entière dans le chat.
- `next_actions` : liste des tools pertinents après celui-ci — c'est ce qui rend la conversation fluide et l'AX « guidée ». **Tracer le graphe complet** : chaque chaîne canonique (import → save → transformer → exporter → partager) doit être fermée, sans impasse ni tool inexistant référencé.
- **Erreurs actionnables** : pas de throw brut. `isError: true` + message qui dit quoi faire ("Aucun document trouvé pour 'X'. Utiliser search_documents pour lister."). Une erreur est une instruction de récupération pour l'agent, pas un stack trace.

## 4 bis. Pattern « zéro IA serveur » : prepare → modèle de l'host → save validé

**Le canal MCP EST une conversation avec un modèle frontier que l'utilisateur paie déjà** (son abonnement Claude/ChatGPT). Pour toute opération intelligente (structuration, réécriture, traduction, résumé), NE PAS appeler un LLM côté serveur : coût API nul, zéro clé à gérer, et l'utilisateur voit/corrige le travail en direct. À figer par ADR au cadrage. Le pattern :

1. **`prepare_x` (tool)** : le serveur fait sa part **déterministe** (extraction de texte, masquages, calculs) et retourne les données + des **consignes statiques** (constantes versionnées dans `src/mcp/prompts/` — jamais générées par utilisateur, prompt caching oblige). **Consignes ET données dans le texte ET dans `structuredContent`** (§4 : Claude Code ne lit que `structuredContent` quand il existe, claude.ai et ChatGPT lisent le texte).
2. **Le modèle travaille dans le chat** — c'est l'abonnement de l'utilisateur qui paie.
3. **`save_x` (tool)** : le serveur est le **garde-fou** — validation Zod stricte + **audits déterministes**. Rejet = erreur actionnable listant exactement quoi corriger ; le modèle réessaie.

**Enchaînement MÊME TOUR (leçon vécue)** : sans consigne explicite, l'agent appelle `prepare_x`, répond « c'est prêt »… et ne sauvegarde jamais. Toute consigne de prepare finit par : « produce the result and call `save_x` IN THIS SAME TURN — `prepare_x` alone creates nothing; do not reply to the user before the save succeeded ». À répéter dans les instructions serveur.

**Ingestion : fidélité par défaut (leçon vécue)** : « importe ce document » ≠ « réécris-le ». Les consignes de structuration imposent la transcription fidèle (ton, personne grammaticale, pas de restructuration en bullets, métadonnées/tags uniquement si explicites dans la source) ; l'« optimisation » est une 2ᵉ étape sur demande explicite, après l'import fidèle.

Règles de garde-fous éprouvées (chaque point vient d'un contournement réel trouvé en review) :

- **Ne JAMAIS faire confiance au contenu produit par le modèle** — le save revalide tout, comme un formulaire public.
- **Les paramètres de l'audit sont re-dérivés CÔTÉ SERVEUR** (préférences org mergées avec les overrides fournis, clé par clé), jamais pris tels quels du modèle : des options vides ou affaiblies = audit trivialement contournable. Rejeter un save "transformé" sans aucune transformation active. Poser un **plancher** sur les options critiques (ce qui définit l'opération ne peut pas être désactivé par un override).
- **Auditer TOUTE la surface de l'entité** (champs structurés + textes libres aplatis), pas seulement les champs "évidents" — le modèle a pu ne pas partir de la version préparée.
- **Matching d'audit à frontières de mots Unicode + insensible casse/accents**, cibles < 3 caractères exclues du matching textuel (couvertes par les checks structurels). Un audit par sous-chaîne naïve produit des faux positifs bloquants (« Ali » dans « réalisation ») ou rate « Jose Garcia » pour « José García ».
- **Anti-invention par INVARIANTS, pas par comptage** : vérifier que les éléments non-traduisibles (noms propres, dates, entités) du résultat appartiennent à l'original (membership), pas seulement que le nombre d'éléments n'a pas augmenté — renommer = inventer. Autoriser le retrait ciblé.
- **L'INTENTION change les invariants (leçon vécue)** : le validateur reçoit le `kind` de l'opération et adapte ses contrôles. Opération même langue (adaptation, anonymisation) → contrôles par contenu (appariement original↔résultat). Opération changeant la langue (traduction) → les contrôles par contenu produisent des faux positifs sans token commun (« Agents IA » → « AI agents » rejeté) : basculer sur des contrôles **structurels** (comptages par section, pas d'entrée ajoutée) + invariants **indépendants de la langue** (dates, années, noms propres).
- **Message de rejet = chaîne fautive + pourquoi + comment corriger** — un rejet opaque casse la confiance du modèle ET de l'utilisateur.
- **Parité des garde-fous entre canaux** : si le web offre la même opération en mode déterministe, il passe par LES MÊMES fonctions d'audit que le save MCP. Un trou bouché côté MCP et laissé ouvert côté web reste un trou.

Les consignes des prepare sont testées par les golden queries ; introduire un appel LLM serveur = rouvrir l'ADR. Implémentation de référence : mcp-cv-editor (import/anonymize/adapt).

## 4 ter. Économie de tokens — les éditions sont des DELTAS

Chaque token que le modèle lit ou écrit coûte à l'utilisateur (latence + contexte + risque d'erreur de recopie). Règles :

1. **Tool d'édition = opérations ciblées, jamais l'entité complète.** Exposer un paramètre `ops` (`append`/`update`/`remove` par section, élément adressé **par nom** — naturel pour le modèle et robuste aux réordonnancements — ou par index en secours) + un `patch` deep-partial pour les scalaires (avec `null` = suppression d'un champ optionnel). Chaque op est validée par le schéma de sa section, l'entité complète est revalidée après application. Ordre de grandeur : « ajoute une compétence » = 1 appel, ~40 tokens, sans lecture préalable.
2. **Lecture partielle** : le tool de lecture accepte `sections: [...]` pour ne retourner qu'un sous-ensemble (et sans widget — c'est une lecture de donnée, pas un affichage).
3. **Les instructions serveur enseignent le chemin léger** : « Edits are DELTAS — use ops addressed by name, never resend the full JSON, you usually don't need a read first ». Sans cette règle, le modèle retombe sur lire-tout/réécrire-tout.
4. **`structuredContent` compact** (ids + résumé) quand un widget affiche l'entité ; l'entité complète uniquement quand le modèle en a besoin pour travailler (résultat d'un prepare).
5. **Tout ce qui est statique doit le rester** (instructions, descriptions, consignes de prepare) — le prompt caching des hosts ne fonctionne que si rien ne varie par utilisateur ou par jour.

## 5. MCP Apps dual-host (Claude + ChatGPT) — conventions widgets

Standard : **MCP Apps (GA 2026-01-26, ex-draft SEP-1865)** — resources `ui://`, HTML sandboxé, JSON-RPC MCP over postMessage. Claude (et Goose, VS Code) parlent **uniquement** le standard ; ChatGPT parle le standard **plus** ses extensions historiques Apps SDK. D'où :

### 5.1 Déclaration — toujours les trois metas + mimeTypes profilés

```typescript
// src/mcp/widget-meta.ts — SEUL endroit où ces clés apparaissent
export function widgetMeta(name: WidgetName) {
  return {
    ui: { resourceUri: `ui://widgets/${name}.html` },     // standard MCP Apps GA 2026-01-26 (Claude, Goose, VS Code)
    "ui/resourceUri": `ui://widgets/${name}.html`,        // alias plat du draft SEP-1865 — déprécié, hosts pré-GA
    "openai/outputTemplate": `ui://widgets/${name}-skybridge.html`, // alias Apps SDK (ChatGPT)
  }
}
```

**MimeTypes (piège vécu)** : la spec GA impose `text/html;profile=mcp-app` sur la resource
(déclaration ET contents de `resources/read`) — un `text/html` nu est **rejeté** par Claude
avec `Unsupported UI resource content format`. ChatGPT attend `text/html+skybridge`.
→ chaque bundle est enregistré en DEUX resources (même HTML) : `ui://widgets/<name>.html`
(`text/html;profile=mcp-app`) et `ui://widgets/<name>-skybridge.html` (`text/html+skybridge`).
CSP : sans `_meta.ui.csp`, le host applique la CSP par défaut (aucune requête externe) — parfait
pour nos bundles single-file ; ne déclarer `csp` que si un domaine externe devient nécessaire.

Règle : **aucun fichier hors `widget-meta.ts` ne manipule ces clés**. Quand ChatGPT finira sa convergence vers le standard, on supprime la variante skybridge à UN endroit.

### 5.2 Bridge — un seul module, deux dialectes

- `widgets/shared/bridge.ts` expose une API interne unique : `getToolOutput()`, `callTool(name, args)`, `sendFollowupMessage(text)`, `openExternal(url)`, `getTheme()`.
- **Protocole GA : utiliser le SDK OFFICIEL `@modelcontextprotocol/ext-apps` (entrée
  `app-with-deps`, autonome) — ne JAMAIS réimplémenter le handshake à la main.** Deux pièges
  vécus (= widget vide, sans erreur) : (1) le host n'envoie RIEN avant `ui/notifications/initialized` ;
  (2) les params d'`ui/initialize` sont validés par schéma — c'est `appInfo`, PAS `clientInfo`,
  et un initialize invalide est rejeté silencieusement. Le SDK gère aussi : tool-result
  (CallToolResult complet → déballer `structuredContent`), host-context (thème), size-changed
  (`autoResize`), `ui/open-link`, `ui/message`, et les requêtes du host (ping). L'entrée
  `app-with-deps` évite le conflit de peer avec le SDK serveur épinglé (mcp-handler).
- Détection de `window.openai` → délégation aux équivalents Apps SDK quand présent. Les widgets n'importent QUE le bridge, jamais `window.openai` directement.
- **Écouter TOUS les canaux de données (leçon vécue — loader infini sinon)**, cumulés et défensifs : (a) SDK officiel `ext-apps` (GA) ; (b) lecture synchrone `window.openai.toolOutput` **+ écoute du CustomEvent `openai:set_globals`** — sur ChatGPT les mises à jour post-mount arrivent par LÀ, pas par postMessage ; (c) postMessage legacy pré-GA ; (d) **polling de secours dans le hook de données** (`useToolOutput` : ~400 ms × 30). Jamais casser le rendu si un canal manque.
- Données d'entrée du widget = le `structuredContent` du tool (contrat §4) — identique sur les deux hosts.

### 5.3 Contraintes de build (CSP des hosts)

- Bundle **Vite single-file** : JS/CSS inlinés, images en data-URI, **zéro requête réseau** (pas de CDN, pas de Google Fonts, pas de fetch d'API tierce). Les deux hosts sandboxent l'iframe avec une CSP stricte.
- Exception possible : un widget peut POST sur NOTRE API (même produit) avec un token court fourni par le tool — **l'URL doit être ABSOLUE** (le widget tourne dans l'iframe sandbox du host : une URL relative se résout contre la mauvaise origine et le POST échoue silencieusement sur les deux hosts). Vérifier que l'origine est autorisée par la CSP du host ; sinon prévoir un fallback texte (le tool le propose).
- **Les deep links du widget pointent les ROUTES RÉELLES de l'app** — attention aux route groups Next.js : `(dashboard)/cvs/[id]` s'atteint via `/cvs/[id]`, pas `/dashboard/cvs/[id]`. Tester chaque lien.
- Poids cible < 300 Ko par bundle ; **jusqu'à ~600 Ko / gzip < 150 Ko assumé** quand le SDK `ext-apps` + des polices embarquées s'ajoutent (mesure réelle cv-preview : ~527 Ko). Si un rendu existe côté web (composant React), le widget importe **le même composant**, pas une copie.
- Bundles **inlinés dans un module généré** (`src/mcp/widgets/generated.ts`, produit par `widgets/build.mjs`) : servis en mémoire par le serveur — zéro lecture fs à runtime, zéro config de tracing Vercel.
- Thème : lire clair/sombre via le bridge, styler les deux. **4 états obligatoires : loading / data / vide / erreur — et le loader n'est JAMAIS un état terminal** : timeout (~12 s) qui bascule vers une erreur actionnable disant QUOI demander dans le chat (« demandez le PDF / réessayez »). Un « Chargement… » infini alors que le backend a réussi est le pire ressenti possible. A11y : zones cliquables focusables au clavier (`role="button"` + `tabIndex` + `onKeyDown`), `aria-label` sur les icônes.
- **Dégradation** : tout tool doit être pleinement utilisable sans widget (le `content` texte suffit). Le widget est un bonus d'ergonomie, jamais le seul canal d'information.

### 5.3 bis. Appariement widget ↔ tool : le widget vit sur le tool dont le payload le nourrit

- Un widget se déclare sur le tool dont le `structuredContent` contient **les données qu'il affiche** — pas sur le tool "logiquement suivant". Un widget de revue d'options s'affiche sur le `prepare` (qui porte options/cibles/aperçu), pas sur le `save` (qui ne porte que des ids) : sinon widget vide avec des boutons morts.
- **Pas de widget quand il n'y a rien à afficher** (un tool qui retourne un lien ou un compteur → texte seul). Un widget « Aucun contenu » après une action réussie est pire que pas de widget.
- Tester chaque widget avec le **payload réel** de chaque tool qui le déclare (fixture = le `structuredContent` exact), pas seulement avec un payload idéal.

### 5.4 Matrice de test avant push (story taguée `mcp` + widgets)

| Check | Claude | ChatGPT (developer mode) |
|-------|--------|--------------------------|
| Tool visible + description correcte | ✅ | ✅ |
| Widget rendu (standard / alias) | `_meta.ui.resourceUri` → `text/html;profile=mcp-app` | `openai/outputTemplate` → `text/html+skybridge` |
| Actions widget → tool call | bridge standard | bridge + `window.openai` |
| Auth déclenchée si token absent | ✅ | ✅ (exige `securitySchemes` + `_meta["mcp/www_authenticate"]`) |
| Dark mode + resize | ✅ | ✅ |

## 6. Auth OAuth 2.1 (Supabase)

Notre serveur = **resource server** ; Supabase Auth = **authorization server** (OAuth 2.1 Server, DCR activé). À figer par ADR lors du cadrage du projet. Ce qui doit exister et ne jamais régresser :

1. **`/.well-known/oauth-protected-resource`** sur NOTRE domaine (RFC 9728) : `resource` (URL canonique du serveur MCP), `authorization_servers: ["https://<ref>.supabase.co/auth/v1"]`, `scopes_supported`, `resource_documentation` (→ notre page /connect). C'est LE point d'entrée de la découverte auth des deux hosts.
2. **401 + header `WWW-Authenticate`** pointant la metadata ci-dessus sur toute requête non authentifiée — c'est ce qui déclenche le flow OAuth chez l'host. Jamais de "mode dégradé anonyme". **Tant que l'auth n'est pas activée**, la route refuse déjà en production (401 + `WWW-Authenticate`, garde `anonymousGuard` de `src/app/api/[transport]/route.ts`) ; seul `MCP_ALLOW_ANONYMOUS=true` la lève, pour le smoke local sur `next start` — jamais sur un déploiement.
3. **Par tool** : `securitySchemes: oauth2` + en cas de token manquant/invalide, erreur avec `_meta["mcp/www_authenticate"]` (exigence ChatGPT pour afficher l'UI de liaison).
4. **Validation de token dans `src/mcp/auth.ts`** : signature via JWKS Supabase, `iss`, `exp`/`nbf`, scopes ; puis `userId` (le `sub`) → client Supabase **au JWT de l'utilisateur** → RLS active dans les tools comme au web. `service_role` interdit. L'organisation et le rôle ne sont **jamais** lus dans un claim (hook Custom Access Token inutile) : relus en base à chaque appel (point 7), sinon un retrait de droit attend l'expiration du jeton.
5. **Adresses de retour** `[mesuré · 2026-09-23 · E03]` : la liste « Redirect URLs » du tableau de bord ne s'applique pas aux clients enregistrés dynamiquement — chaque client est validé sur ses propres `redirect_uris` (correspondance exacte) : `https://claude.ai/api/mcp/auth_callback` (Claude, client confidentiel `client_secret_post`), `https://chatgpt.com/connector/oauth/<id>` (ChatGPT, client public, un par connecteur), `http://localhost:<port aléatoire>/callback` (Claude Code, client public, un par serveur). DCR ouvert = monitorer `auth.oauth_clients`, que les hosts ne purgent jamais (sur le banc : `pnpm oauth:admin clients`).
6. Les inputs de tools restent **non fiables** (même statut qu'un formulaire public) : Zod partout, appartenance org garantie par RLS + checks service.
7. **Découverte et enregistrement par host** `[mesuré · 2026-09-23 · E03, preuve 5]` : sur un 401 portant `WWW-Authenticate`, les trois hosts lisent la forme **suffixée** `/.well-known/oauth-protected-resource/<chemin du serveur>` (servir aussi celle-ci), s'enregistrent seuls (Claude en client confidentiel, ChatGPT et Claude Code en clients publics), consentent, puis rejouent `initialize` et `tools/list`. Claude Code : `claude mcp add` puis `claude mcp login` (retour sur `localhost`) ; une session Claude Code connectée à claude.ai reçoit aussi les connecteurs de claude.ai. ChatGPT n'affiche les tools qu'après « Actualiser » sur la fiche du connecteur, et peut lier plusieurs comptes au même connecteur (il appelle avec le compte principal). Supabase OAuth 2.1 Server suffit, aucune façade. **L'organisation vient de l'adresse appelée, pas du jeton** : le jeton dit qui appelle, la base dit s'il est membre, à chaque appel ; chez l'host, chaque organisation (adresse) est un connecteur distinct, avec son client, sa session et son jeton.
8. **Ce que le jeton ne porte pas** `[mesuré · 2026-09-23 · E03]` : `resource` (RFC 8707) est envoyé par les trois hosts mais n'entre pas dans le jeton (`aud` reste `authenticated`) : un jeton émis pour un hôte est accepté par un autre hôte du même projet ; la séparation par organisation repose sur l'appartenance revérifiée à chaque appel. Révoquer un grant ou une session n'invalide pas le jeton d'accès en cours (valable jusqu'à `exp`, 3 600 s par défaut) : la coupure se voit au rafraîchissement suivant ; couper tout de suite = retirer le membre. Une seule adresse de site par projet : la page de consentement vit sur le domaine commun, sans connaître l'hôte d'origine (seuls `client_name` et `resource` de l'autorisation en attente disent pour qui elle s'affiche).

### 6 bis. Durcissements systématiques (findings récurrents de review)

- **Fetch d'URL fournie par l'utilisateur (SSRF)** : https only, hôtes loopback/privés/link-local/métadonnées cloud bloqués (`localhost`, `127.*`, `10.*`, `172.16-31.*`, `192.168.*`, `169.254.169.254`, `*.internal`), `redirect: "error"`, `AbortSignal.timeout(15s)`, cap de taille AVANT et APRÈS lecture. Un tool qui fetch une URL est un proxy de lecture pour un attaquant (ou un document prompt-injecté).
- **Endpoint d'upload appelé par un widget** : token d'upload signé et scoppé au chemin (type `createSignedUploadUrl` Supabase) — jamais de `service_role`. MIME **requis ET** dans l'allowlist (un MIME vide ne contourne pas le contrôle), taille cappée, magic bytes re-vérifiés à l'extraction.
- **Middleware** : si `/api` entier est public (le MCP gère sa propre auth), le COMMENTER — tout nouveau route handler naît public et doit implémenter sa propre auth.
- **RGPD à la suppression** : purge Storage **paginée** (`.list()` est cappé à ~100), et rédiger les meta nominatives des logs d'activité AVANT le delete (les FK `SET NULL` rendent les lignes introuvables après) ; le log de suppression lui-même est non nominatif.
- **`ilike`** : échapper `%`/`_` des saisies utilisateur ; sels/secrets (`IP_HASH_SALT`…) : échouer bruyamment si absents en prod, jamais de fallback silencieux.

## 7. Transport : stateless (défaut) ou stateful — ADR obligatoire au cadrage

**Stateless (le défaut du template)** : Streamable HTTP **sans session** — pas de `Mcp-Session-Id` persisté, pas de Redis, chaque requête reconstruit le serveur (`disableSse: true`). Tout l'état métier est en Postgres ; l'état conversationnel appartient à l'host. Simple, scale-to-zero, parfait Vercel.
- Conséquences : pas de notifications server→client hors requête ni de subscriptions resources — ne PAS en introduire sans rouvrir l'ADR. Une opération longue tient dans la requête (`maxDuration` ajusté sur la route) ; si un jour > 60 s → pattern "job + tool de statut", pas du push.
- **Notification dans la réponse** `[précisé · 2026-09-22 · grille B, bench_mutate]` : en stateless, un tool qui modifie la surface peut écrire `notifications/tools/list_changed` dans le flux de réponse de sa propre requête (`relatedRequestId`). Claude Code la reçoit et relit la liste en 0,5 s ; claude.ai et ChatGPT l'ignorent.
- **Aucune affinité réseau** `[mesuré · 2026-09-22 · readme_gate]` : claude.ai et ChatGPT appellent depuis des pools d'IP tournants (une IP différente presque à chaque requête). Aucun état ne s'attache à une empreinte UA + IP ; un état « a déjà fait X » passe dans l'appel (champ requis, §2.4) ou dans une session OAuth.

**Stateful (si le produit l'exige)** : sessions `Mcp-Session-Id` + SSE via `redisUrl` dans la config mcp-handler (Redis Upstash/Vercel KV — y stocke sessions et flux entre invocations serverless). À choisir quand le produit a besoin de : notifications server→client, subscriptions de resources (updates temps réel, `listChanged` poussé), elicitation, état de session côté serveur.
- Conséquences : coût Redis, plus de scale-to-zero pur, gestion d'invalidation de session, tests plus lourds. Le bloc de config prêt est en commentaire dans `src/app/api/[transport]/route.ts`.

Le choix est **figé par ADR** (`docs/decisions/`) lors du cadrage — en changer = rouvrir l'ADR, pas un simple diff de config.

## 8. Golden queries — l'éval AX obligatoire

Jeu de prompts versionné dans `docs/mcp-golden-queries.md` (créé depuis `.method/templates/mcp-golden-queries.tmpl.md`), trois catégories :

- **Directs** (nomment l'action) — doivent router vers les bons tools, dans le bon ordre ;
- **Indirects** (décrivent le résultat attendu) — doivent quand même router ;
- **Négatifs** (hors périmètre) — ne doivent PAS déclencher nos tools.

Règles : seed = les prompts d'exemple du brief ; toute story qui ajoute/modifie un tool ou une description ajoute ses golden queries et **rejoue le jeu sur les deux hosts** (Claude + ChatGPT developer mode) ; en cas de mauvais routage, corriger la description — **un champ de métadonnée à la fois**, et noter la révision dans le fichier.

**Boucle de feedback agent (de l'or — leçon vécue)** : après chaque évolution significative, demander à l'agent hôte lui-même un **rapport de frictions structuré** — déroulé step-by-step de ce qu'il a fait, ressenti/points de blocage, hypothèses de cause, repro minimale — et le faire produire sur les DEUX hosts. Deux rapports d'agents ont trouvé en un test (structuredContent masqué, loader infini, prepare sans save) ce que des reviews de code n'avaient pas vu. Un rapport donne des hypothèses, pas des faits : ChatGPT réécrit l'historique (il appelle un tool au moment de la question puis affirme l'avoir appelé avant, ou annonce un résultat jamais obtenu) `[mesuré · 2026-09-22 · baseline, readme_gate]` — recouper chaque fait avec le journal du serveur.

**Voir une évolution de métadonnées : geste minimal par host** `[infirmé (le geste « déconnecter/reconnecter ») et précisé (le cache) · 2026-09-22 · grille B M1–M6, baseline 15:08–15:40]`. Sans ce geste, on évalue l'ancienne version :

| Host | Ce qui est figé | Geste minimal | Mesure |
|------|-----------------|---------------|--------|
| Claude Code | Définitions (description, schéma) des tools déjà chargés et instructions, pour toute la session ; les noms se mettent à jour par `list_changed` | Nouvelle session, serveur `connected` dans `/mcp` avant le premier message ; `/mcp` reconnect ne suffit pas | claude-code@2.1.278 |
| Cowork (Desktop) | Rien entre deux tâches : handshake complet à chaque tâche | Nouvelle tâche | claude-code@2.1.278 via Claude-User |
| claude.ai web et Desktop (chat) | Liste au niveau du connecteur, plus un **instantané local du navigateur** (`claudeai.mcpBootstrapSnapshot.v1`) qui fige une conversation dont le premier message part avant la relecture | « Actualiser la liste d'outils » (menu ⋯ de la fiche du connecteur), puis nouvelle conversation dont le premier message part **quelques secondes après** l'ouverture de la page (ou recharger) ; ne pas déconnecter/reconnecter (vide l'instantané sans le réécrire : plus aucun tool visible dans les premiers messages). `[confirmé · 2026-09-23 · proto S07]` : sans ce geste, aucun `tools/list` sur toute une campagne — une description modifiée (domaines, borne) n'arrive jamais ; le geste refait `initialize` ×2, `tools/list` et `prompts/list` | claude-ai@0.1.0, Anthropic/ClaudeAI@1.0.0 |
| ChatGPT (developer mode) | Définition du connecteur (version « dev mode ») | Bouton « Actualiser » en bas de la fiche du connecteur, puis nouvelle conversation avec le connecteur sélectionné (`@nom`) ; le commutateur et « Déconnecter / Reconnecter » n'envoient rien ; sans sélection, une question qui ne demande pas d'agir ne voit pas les tools. `[nuancé · 2026-09-23 · proto S07]` : une app ajoutée au compte est appelée **sans `@nom`** dès qu'elle a servi une fois (context premier 9/9 sans mention, avec ou sans phrase dans les instructions) ; les contrôles de sécurité d'OpenAI peuvent bloquer un appel avant qu'il parte (message opaque, rien au journal serveur) | openai-mcp@1.0.0 |

## 9. Onboarding humain (l'autre moitié de l'AX)

- Page **`/connect`** dans l'app web (installée : `src/app/(dashboard)/connect/page.tsx`, à personnaliser) : URL du serveur MCP à copier, guide pas-à-pas par host (Claude : Paramètres → Connecteurs → Ajouter ; ChatGPT : mode développeur / app), les prompts d'exemple à essayer, lien vers l'état de connexion.
- `resource_documentation` de la metadata OAuth pointe cette page ; le README produit aussi.
- **Phrase dans les préférences de l'utilisateur** `[mesuré · 2026-09-23 · proto, mesure 1]` : sur claude.ai, sans phrase, une demande qui ne nomme pas le domaine fait demander « quel outil ? » ou part vers un autre connecteur de l'utilisateur ; avec « Quand une demande concerne mon travail, commence par l'outil de contexte du connecteur « <Nom> ». », le readme est appelé en premier 15/15. Ne pas y ajouter « si rien ne correspond, dis-le au lieu de deviner » (bloque les questions de données, 0/2), ne pas nommer un connecteur quand l'utilisateur en a plusieurs du même genre (capte les demandes des autres, 0/2). Sur ChatGPT et Claude Code, aucune phrase : le readme vient déjà en premier, et sur ChatGPT la phrase le fait rappeler à chaque tour.
- Après la première connexion, le premier message de l'utilisateur est guidé par les prompts MCP (§2.3) — l'objectif : **< 2 min entre "j'ajoute le connecteur" et "premier résultat utile"**.

## 10. Tests & évolution

- **Unit** : services sans MCP ; tools via `InMemoryTransport.createLinkedPair()` + `Client` (auth mockée) — vérifier schéma, `structuredContent`, `next_actions`, erreurs actionnables, metas widget (la TRIPLE clé §5.1) et les deux resources (mcp-app + skybridge).
- **Smoke HTTP scripté** : `scripts/smoke-mcp.mjs` (`pnpm mcp:smoke`) — initialize + tools/list + tool d'appel contre `next start` local ou une URL de prod ; à lancer après chaque déploiement. Les scripts Node qui lancent un binaire (`widgets/build.mjs`, `scripts/smoke-mcp.mjs`) exécutent son fichier JS par `process.execPath`, jamais `node_modules/.bin/*` : sous Windows ce sont des shims `.cmd` qu'un `spawn` sans shell ne lance pas.
- **Manuel** : MCP Inspector sur `http://localhost:3000/api/mcp` (tools, auth, resources) + matrice §5.4.
- **Évolution** : ajouter un champ optionnel = OK. Renommer/supprimer un tool ou rendre un champ requis = **breaking** → ADR + dépréciation (le tool répond encore avec un message de migration) + notification `listChanged` (effet sur Claude Code seulement, §7). Bump `serverInfo.version` à chaque changement de surface : utile au journal, mais aucun host ne le montre et il ne rafraîchit aucun cache `[précisé · 2026-09-22 · M6, baseline 15:12]`. Un contrat modifié en place (schéma, prérequis) n'atteint pas de façon fiable les conversations claude.ai (instantané local, §8) : un changement de contrat = **nouveau nom de tool** + dépréciation de l'ancien.
- Descriptions/schemas **stables** (prompt caching des hosts) ; golden queries rejouées à chaque évolution (§8).
