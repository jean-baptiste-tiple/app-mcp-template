import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Configuration minimale — personnaliser par projet

  // Next 16 écrit sinon un AGENTS.md (règles Next pour les agents IA) à chaque `next dev` : les
  // règles de ce dépôt vivent dans CLAUDE.md et .method/, un second fichier d'instructions
  // non versionné les contredirait sans que personne ne le relise.
  agentRules: false,

  // Variantes d'URL RFC 9728 tentées par certains hosts MCP → metadata unique (mcp-patterns §6).
  // Le transport MCP lui-même est servi par la route src/app/api/mcp/route.ts : pas de rewrite
  // pour lui (mcp-handler 2 ne lit pas le pathname).
  async rewrites() {
    return [
      {
        source: "/api/mcp/.well-known/oauth-protected-resource",
        destination: "/.well-known/oauth-protected-resource",
      },
      {
        source: "/.well-known/oauth-protected-resource/api/mcp",
        destination: "/.well-known/oauth-protected-resource",
      },
    ]
  },
}

export default nextConfig
