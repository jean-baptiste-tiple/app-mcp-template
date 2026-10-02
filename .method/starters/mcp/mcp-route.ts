// Destination : src/app/api/[transport]/route.ts
// ⚠️ Le dossier est bien `src/app/api/[transport]` (PAS `src/app/api/mcp/[transport]`) :
// avec basePath "/api", mcp-handler sert le transport Streamable HTTP NATIVEMENT sur
// /api/mcp — l'URL canonique donnée aux hosts. Un niveau de dossier en trop = 404 même
// avec un token valide (bug vécu). Les routes statiques (/api/…) restent prioritaires.
import { createMcpHandler } from "mcp-handler"

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

// mcp-handler lit le corps d'un POST sans attendre son échec : un JSON illisible laisse la
// requête sans réponse jusqu'à `maxDuration` (mcp-patterns §7). La route le refuse avant lui.
function withReadableBody(next: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    try {
      JSON.parse(await request.clone().text())
    } catch {
      return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 })
    }
    return next(request)
  }
}

const POST = withReadableBody(handler)

// ── Auth OAuth 2.1 (activer avec le starter supabase-auth — voir README du starter mcp) ──
// TODO(S01) : décommenter après install de supabase-auth + config OAuth Server côté Supabase.
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
// const authPost = withReadableBody(authHandler)
// export { authHandler as GET, authPost as POST, authHandler as DELETE }

export { handler as GET, POST, handler as DELETE }
