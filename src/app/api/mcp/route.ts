// Endpoint MCP `/api/mcp` (mcp-patterns §7) : mcp-handler 2 ne lit pas le pathname, il sert
// toute requête qu'on lui passe. C'est donc ce dossier qui fixe l'URL canonique donnée aux
// hosts (`MCP_RESOURCE_URL`, src/mcp/config.ts) : le déplacer, c'est changer cette URL.
import { createMcpHandler, getPublicOrigin } from "mcp-handler"

import { initializeMcpServer, mcpServerOptions } from "@/mcp/server"

// maxDuration : couvrir la plus longue opération d'un tool (jamais > 60 s → pattern
// "job + tool de statut", voir mcp-patterns §7).
export const maxDuration = 60
export const dynamic = "force-dynamic"

// ── Transport : STATELESS — décision à figer par ADR au cadrage ──
// mcp-handler 2 est stateless natif (spec 2026-07-28, repli Streamable HTTP sans session pour
// les clients 2025) : pas de session, pas de Redis, chaque requête reconstruit le serveur. Tout
// l'état métier en Postgres. Un besoin de sessions ou de notifications server→client passe par
// le transport Node du SDK (`@modelcontextprotocol/node`) et un ADR (docs/decisions/).
const handler = createMcpHandler(initializeMcpServer, {
  ...mcpServerOptions,
  verboseLogs: process.env.NODE_ENV !== "production",
})

// ── Garde-fou tant que l'auth est DÉSACTIVÉE (mcp-patterns §6 : jamais de mode anonyme en prod) ──
// En production, /api/mcp répond 401 + WWW-Authenticate (RFC 9728) au lieu de servir les tools
// sans compte. `next dev` reste ouvert. MCP_ALLOW_ANONYMOUS=true lève le garde-fou pour le smoke
// test local sur `next start` (scripts/smoke-mcp.mjs) — JAMAIS en production réelle.
// MCP_ALLOW_ANONYMOUS est lu à chaque requête : le smoke le pose au lancement de `next start`.
async function anonymousGuard(req: Request): Promise<Response> {
  if (process.env.NODE_ENV === "production" && process.env.MCP_ALLOW_ANONYMOUS !== "true") {
    const resourceMetadata = `${getPublicOrigin(req)}/.well-known/oauth-protected-resource`
    return Response.json(
      {
        error: "unauthorized",
        error_description:
          "MCP auth is not enabled: anonymous access is refused in production. Enable auth: see src/mcp/README.md.",
      },
      {
        status: 401,
        headers: { "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadata}"` },
      }
    )
  }
  return handler(req)
}

// ── Auth OAuth 2.1 (activer avec le starter supabase-auth — voir src/mcp/README.md) ──
// TODO(S01) : décommenter après install de supabase-auth + config OAuth Server côté Supabase.
// Activer ce bloc SUPPRIME le garde-fou `anonymousGuard` ci-dessus et son export : withMcpAuth
// le remplace, en dev comme en prod.
// `withMcpAuth` renvoie 401 + WWW-Authenticate (RFC 9728) sur toute requête non authentifiée,
// ce qui déclenche le flow OAuth chez Claude et ChatGPT (§6.2). Jamais de mode anonyme en prod.
// `verifyToken(req, bearerToken)` rend un `AuthInfo` (ou `undefined` → 401) ; les tools le
// lisent dans `ctx.http?.authInfo` (`requireAuthContext`, src/mcp/auth.ts).
//
// import { withMcpAuth } from "mcp-handler"
// import { verifyToken } from "@/mcp/auth"
// import { MCP_RESOURCE_URL } from "@/mcp/config"
//
// const authHandler = withMcpAuth(handler, verifyToken, {
//   required: true,
//   resourceMetadataPath: "/.well-known/oauth-protected-resource",
//   resourceUrl: MCP_RESOURCE_URL,
// })
// export { authHandler as GET, authHandler as POST, authHandler as DELETE }

// Un corps JSON illisible : mcp-handler 2 répond lui-même 400 `-32700` (1.1.0 laissait la
// requête pendre jusqu'à `maxDuration`, mcp-patterns §7) ; scripts/smoke-mcp.mjs le vérifie.
export { anonymousGuard as GET, anonymousGuard as POST, anonymousGuard as DELETE }
