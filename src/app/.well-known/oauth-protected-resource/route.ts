// Metadata RFC 9728 — LE point d'entrée de la découverte auth des deux hosts (mcp-patterns §6.1).
// Le 401 + WWW-Authenticate renvoyé par /api/mcp pointe vers cette URL ; l'host lit ici
// où se trouve l'authorization server (Supabase) et lance le flow OAuth 2.1.
// ⚠️ Certains hosts tentent des VARIANTES d'URL — rewrites dans next.config.ts :
// /api/mcp/.well-known/… et /.well-known/…/api/mcp → ici.
// TODO(S01) : activer avec le starter supabase-auth (sans auth, cette route peut attendre).
import { generateProtectedResourceMetadata, metadataCorsOptionsRequestHandler } from "mcp-handler"

import {
  MCP_RESOURCE_URL,
  MCP_SCOPES_SUPPORTED,
  PUBLIC_SITE_URL,
  supabaseIssuer,
} from "@/mcp/config"

export const dynamic = "force-dynamic"

export function GET() {
  const metadata = generateProtectedResourceMetadata({
    // Supabase Auth = authorization server OAuth 2.1 (OAuth Server + DCR activés au dashboard)
    authServerUrls: [supabaseIssuer()],
    resourceUrl: MCP_RESOURCE_URL,
    additionalMetadata: {
      scopes_supported: MCP_SCOPES_SUPPORTED,
      resource_documentation: `${PUBLIC_SITE_URL}/connect`,
    },
  })
  return Response.json(metadata, {
    headers: { "Access-Control-Allow-Origin": "*" },
  })
}

export const OPTIONS = metadataCorsOptionsRequestHandler()
