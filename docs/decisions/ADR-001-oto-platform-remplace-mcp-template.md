# ADR-001 — La plateforme Otomata, activée, remplace le MCP du template

| Champ | Valeur |
|-------|--------|
| **Date** | 2026-10-06 |
| **Statut** | Accepté |
| **Décideur(s)** | JB |

## Contexte

Le template installe par défaut son propre serveur MCP (`src/mcp/`, `src/app/api/mcp/route.ts`,
servi sur `/api/mcp` ; `src/app/api/[transport]/` jusqu'au 2026-11-06, ADR-002) : un tool par
capacité métier (`mcp-patterns.md`, section 1).

Le paquet `@otomata_tech/oto_platform` (option, starter `.method/starters/oto-platform/`) apporte
pages, tableaux, procédures, équipes et accès, et son propre serveur MCP à six outils figés, lui
aussi sur `/api/mcp` : le chemin est en dur dans le paquet (`MCP_RESOURCE_PATH`, métadonnées
`/.well-known/oauth-protected-resource/api/mcp`). Le template et le paquet écrivent donc le même
fichier `src/app/api/mcp/route.ts` : poser le paquet sans décision écrase le MCP du template.
(Avant ADR-002, la route du template était dynamique, `src/app/api/[transport]/`, et une route
statique du paquet la masquait sans que Next le signale ; `check:framework` refusait les deux.)

## Décision

Quand la plateforme Otomata est activée au cadrage :

1. Son MCP prend `/api/mcp`. `src/app/api/mcp/route.ts` est remplacé par la route du paquet ;
   `src/mcp/`, `widgets/` et leurs tests sont retirés dans la story de setup.
2. Chaque capacité métier reste une fonction de `src/lib/services/` (invariant 5 de `CLAUDE.md`).
   Son adaptateur MCP est une fonction ERP (`defineErpFunction`, inscrite par `registerFunctions`
   dans `src/lib/fonctions-metier.ts`), trouvée par `find`, lue par `read`, exécutée par `call` ;
   jamais un tool de plus.
3. Le schéma partagé entre formulaire et fonction ERP est en `zod/v4` (`z.strictObject`). Tous
   les schémas du template importent `zod/v4` (ESLint refuse `"zod"`). **Amendement 2026-11-06
   (ADR-002)** : le template est passé en zod 4, Next 16, vite 8, `@vitejs/plugin-react` 6,
   `@hookform/resolvers` 7 et `ext-apps` 2, hors des peers déclarés par `@otomata_tech/oto_platform`
   1.6.2 (`zod ^3.25`, `next ^15`, `vite ^7`, `plugin-react ^4`, `resolvers ^5`, `ext-apps ^1.7`).
   Activer l'option exige une version du paquet alignée ; à défaut, la story de setup rétrograde
   ces six paquets et l'écrit dans `tech-stack.md` (`§ Option plateforme Otomata`).
4. Les vues de conversation de l'ERP sont des `ErpView` (`src/widgets/*.tsx`), construites par
   `oto-platform widgets build`.

Sans la plateforme, rien ne change : le MCP du template reste le défaut.

## Conséquences

### Positives
- Un seul connecteur pour l'utilisateur, un seul OAuth.
- Les procédures, pages et tableaux écrits dans l'ERP sont lus par les assistants (`context`,
  `read`) ; les fonctions métier sont cataloguées au même endroit.
- Droits, journal, organisations, corbeille, partage public et fichiers joints viennent du paquet.

### Négatives
- `mcp-patterns.md` sections 2.1, 3, 5 (instructions, design de tools, widgets dual-host) ne
  s'appliquent plus : le paquet fige instructions et outils. Seules la section 1 (parité, lue
  avec la dérogation ci-dessus), 4 bis (zéro IA serveur) et 8 (golden queries, rejouées par
  `find`/`call`) restent dues.
- Dépendance à un paquet tiers en sources TypeScript, montées par Renovate ; une mineure demande
  une revue humaine.
- Exige Postgres (Supabase, ou Postgres nu + OIDC) et `PLATFORM_DATABASE_URL`.

### Neutres
- Le design system du paquet vit sous `.oto`, à côté du thème du template.

## Alternatives considérées

### Écrans seuls, MCP du template conservé
Pas de route `api/mcp` du paquet. Rejetée : les assistants ne liraient ni pages ni procédures,
qui sont la raison d'activer le paquet.

### Deux MCP sur deux chemins
Le template déplacé sur un autre chemin, le paquet sur `/api/mcp`. Rejetée : deux connecteurs et
deux OAuth pour l'utilisateur, chemins à modifier dans le template (rewrites, smoke, métadonnées).
