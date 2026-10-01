// ⚠️ Le dossier est bien `src/app/api/[transport]` (PAS `src/app/api/mcp/[transport]`) :
// avec basePath "/api", mcp-handler sert le transport Streamable HTTP NATIVEMENT sur
// /api/mcp — l'URL canonique donnée aux hosts. Un niveau de dossier en trop = 404 même
// avec un token valide (bug vécu). Les routes statiques (/api/…) restent prioritaires.
import { createMcpHandler, getPublicOrigin } from "mcp-handler"

import { initializeMcpServer, mcpServerOptions } from "@/mcp/server"

// maxDuration : couvrir la plus longue opération d'un tool (jamais > 60 s → pattern
// "job + tool de statut", voir mcp-patterns §7).
export const maxDuration = 60
export const dynamic = "force-dynamic"

// ── Transport : STATELESS (défaut) ou STATEFUL — décision à figer par ADR au cadrage ──
// STATELESS (défaut ci-dessous) : pas de session, pas de Redis, chaque requête reconstruit
//   le serveur. Tout l'état métier en Postgres. Simple, scale-to-zero, parfait Vercel.
// STATEFUL (si le projet en a besoin : notifications server→client, subscriptions de
//   resources, elicitation, sessions `Mcp-Session-Id`) : fournir un Redis et retirer
//   `disableSse` — mcp-handler y stocke l'état de session/SSE entre invocations serverless.
//   → remplacer le bloc config par :
//   {
//     basePath: "/api",
//     maxDuration: 60,
//     redisUrl: process.env.REDIS_URL, // ex: rediss://… (Upstash/Vercel KV compatible)
//     verboseLogs: process.env.NODE_ENV !== "production",
//   }
//   et documenter le choix dans docs/decisions/ (ADR transport).
const handler = createMcpHandler(initializeMcpServer, mcpServerOptions, {
  basePath: "/api", // → endpoint exposé sur /api/mcp
  maxDuration: 60,
  disableSse: true, // stateless : pas de flux SSE ni de session
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

export { anonymousGuard as GET, anonymousGuard as POST, anonymousGuard as DELETE }
