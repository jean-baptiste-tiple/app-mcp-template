# ADR-002 — Canal MCP sur le SDK 2.x : spec 2026-07-28, mcp-handler 2 stateless natif

| Champ | Valeur |
|-------|--------|
| **Date** | 2026-11-06 |
| **Statut** | Accepté |
| **Décideur(s)** | JB |

## Contexte

Le canal MCP du template reposait sur `@modelcontextprotocol/sdk` 1.26.0, épinglé en exact parce
que `mcp-handler` 1.1.0 l'exigeait comme peer exact, sur `@modelcontextprotocol/ext-apps` 1.7
(qui refusait zod 4) et sur zod 3.25 (import `zod/v4`). La ligne 1.x du SDK n'a plus que des
correctifs de sécurité jusqu'en janvier 2027. Le SDK 2.x est scindé en `@modelcontextprotocol/core`,
`client` et `server`, sert la spec 2026-07-28 (`server/discover`, enveloppe `_meta`, plus
d'`initialize`) et replie les clients 2025. `mcp-handler` 2 l'exige, ainsi que zod ≥ 4.2 ;
`ext-apps` 2 exige `client` 2 et zod ≥ 4.2. Les quatre montent donc ensemble ou pas du tout.

La route du template était `src/app/api/[transport]/route.ts` : le segment dynamique servait au
`basePath` de `mcp-handler` 1 (`/api/mcp`, `/api/sse`, `/api/message`). `mcp-handler` 2 ne lit plus
le pathname et n'a plus ni `basePath`, ni `disableSse`, ni `redisUrl`, ni `maxDuration`.

## Décision

1. Le canal MCP passe au SDK 2.x : `@modelcontextprotocol/server ^2.4` (serveur),
   `@modelcontextprotocol/client ^2.4` (tests, peer d'`ext-apps`), `mcp-handler ^2.3`,
   `@modelcontextprotocol/ext-apps ^2.0`, `zod ^4.6` (import `zod/v4` conservé comme chemin
   unique), `@hookform/resolvers ^7`. Plus aucun pin exact : les peers sont en `^2`.
2. La route devient `src/app/api/mcp/route.ts` : le dossier fixe l'URL `/api/mcp`, le handler est
   monté tel quel. Le contrôle `check:framework` « `api/mcp/route.ts` et `api/[transport]/`
   coexistent » est retiré avec lui (ADR-001 amendé : le starter Otomata remplace la route au lieu
   de la masquer).
3. **Transport : stateless natif.** `mcp-handler` 2 sert la spec 2026-07-28 sans session et
   replie les clients 2025 sur Streamable HTTP sans `Mcp-Session-Id` persisté. `/sse` et
   `/message` n'existent plus. Un besoin de sessions, de notifications poussées ou d'elicitation
   passe par `@modelcontextprotocol/node` (`NodeStreamableHTTPServerTransport`) monté hors
   `mcp-handler`, et rouvre cet ADR (`mcp-patterns.md § 7`).
4. Le widget importe `ext-apps` par l'entrée `.` (client et core résolus depuis les
   devDependencies) : `app-with-deps` n'a plus de raison d'être et pesait ~290 Ko de plus.
5. La garde `withReadableBody` de la route est retirée : `mcp-handler` 2 répond lui-même
   400 `-32700` à un corps illisible ; le smoke conserve le contrôle.
6. `requireAuthContext(ctx)` lit `ctx.http?.authInfo` ; `registerTool` reçoit l'objet zod
   (`inputSchema: schema`, plus `.shape`).

## Conséquences

### Positives
- Support sécurité du SDK au-delà de janvier 2027 ; spec 2026-07-28 servie aux hosts qui la
  parlent, sans rien perdre pour les autres (mesuré : `initialize` 2025-06-18 → 200 ; discover,
  tools/list, tools/call, resources/read 2026 → 200).
- Plus de pins exacts dans le canal MCP : Dependabot propose mineures et patchs
  (`deployment-patterns.md § Dependabot`).
- Bundle widget plus léger (~460 Ko / gzip ~131 Ko contre ~551 Ko avant la migration).

### Négatives
- `@otomata_tech/oto_platform` 1.6.2 déclare des peers (`zod ^3.25`, `next ^15`, `vite ^7`,
  `plugin-react ^4`, `resolvers ^5`, `ext-apps ^1.7`) que le template dépasse : activer l'option
  exige une version du paquet alignée, sinon une rétrogradation de six paquets à la story de setup
  (ADR-001 amendé, `tech-stack.md § Option plateforme Otomata`).
- Le mode stateful n'est plus une ligne de config : c'est un transport à monter et un ADR.
- Le `Client` 2.x des tests négocie 2025-11-25 par défaut ; `InMemoryTransport.createLinkedPair`
  ne couvre pas le protocole 2026.

### Neutres
- Mesures de 2026-09 sur les hosts (`mcp-patterns.md`) : le wire protocol des widgets est
  inchangé, une vue 2.x tourne dans un host 1.x.
- `/api/sse` et `/api/message` répondent 404 (Next) et non 410 : aucun host ne les appelle plus.

## Alternatives considérées

### Rester sur le SDK 1.x jusqu'à la fin du support
Rejetée : les quatre paquets sont liés, et attendre reporte la même migration à un moment où la
ligne 1.x n'a plus de correctifs.

### Garder `src/app/api/[transport]/`
Rejetée : avec `mcp-handler` 2, le segment dynamique capturait tout `/api/<x>` sans raison, et son
nom ne décrivait plus rien.

### `createMcpHandler` du SDK (`@modelcontextprotocol/server`) à la place de `mcp-handler`
Non retenue aujourd'hui : `mcp-handler` apporte `withMcpAuth`, `protectedResourceHandler` et
`getPublicOrigin`, utilisés par la route et le garde anonyme. À réévaluer si `mcp-handler` prend du
retard sur le SDK.
