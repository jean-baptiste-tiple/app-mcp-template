// Constantes du canal MCP (resource server — ADR auth à figer au cadrage).

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

/** URL canonique du serveur MCP (RFC 9728 `resource`). */
export const MCP_RESOURCE_URL = process.env.MCP_RESOURCE_URL ?? `${SITE_URL}/api/mcp`

/** Base publique de l'app (pour resource_documentation → /connect). */
export const PUBLIC_SITE_URL = SITE_URL

/** Issuer Supabase (authorization server) — RFC 8414 / OIDC. */
export function supabaseIssuer(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return ""
  return `${url.replace(/\/$/, "")}/auth/v1`
}

export const MCP_SCOPES_SUPPORTED = ["openid", "email", "profile"]

export const MCP_SERVER_INFO = {
  name: "my-product", // TODO(S01) : nom court, stable à jamais (les hosts s'y réfèrent)
  title: "Mon Produit", // affiché dans les UI des hosts, langue des utilisateurs
  version: "0.1.0", // bump à CHAQUE évolution de surface (tools, descriptions, schemas)
} as const
