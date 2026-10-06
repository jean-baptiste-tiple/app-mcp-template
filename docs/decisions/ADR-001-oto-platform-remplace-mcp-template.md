# ADR-001 — La plateforme Otomata, activée, remplace le MCP du template

| Champ | Valeur |
|-------|--------|
| **Date** | 2026-10-06 |
| **Statut** | Accepté |
| **Décideur(s)** | JB |

## Contexte

Le template installe par défaut son propre serveur MCP (`src/mcp/`, `src/app/api/[transport]/`,
servi sur `/api/mcp`) : un tool par capacité métier (`mcp-patterns.md`, section 1).

Le paquet `@otomata_tech/oto_platform` (option, starter `.method/starters/oto-platform/`) apporte
pages, tableaux, procédures, équipes et accès, et son propre serveur MCP à six outils figés, lui
aussi sur `/api/mcp` : le chemin est en dur dans le paquet (`MCP_RESOURCE_PATH`, métadonnées
`/.well-known/oauth-protected-resource/api/mcp`). Une route statique `src/app/api/mcp/route.ts`
l'emporte sur `src/app/api/[transport]/` sans que Next le signale : poser le paquet sans décision
masque le MCP du template en silence.

## Décision

Quand la plateforme Otomata est activée au cadrage :

1. Son MCP prend `/api/mcp`. `src/app/api/[transport]/`, `src/mcp/`, `widgets/` et leurs tests sont
   retirés dans la story de setup.
2. Chaque capacité métier reste une fonction de `src/lib/services/` (invariant 5 de `CLAUDE.md`).
   Son adaptateur MCP est une fonction ERP (`defineErpFunction`, inscrite par `registerFunctions`
   dans `src/lib/fonctions-metier.ts`), trouvée par `find`, lue par `read`, exécutée par `call` ;
   jamais un tool de plus.
3. Le schéma partagé entre formulaire et fonction ERP est en `zod/v4` (`z.strictObject`). Le
   template s'y aligne dès maintenant, sans attendre l'activation : tous ses schémas importent
   `zod/v4` (ESLint refuse `"zod"`), `@hookform/resolvers` est en ^5, et `check:framework` refuse
   `src/app/api/mcp/route.ts` à côté de `src/app/api/[transport]/`.
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
