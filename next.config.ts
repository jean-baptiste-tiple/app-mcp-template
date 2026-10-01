import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Configuration minimale — personnaliser par projet

  // Variantes d'URL RFC 9728 tentées par certains hosts MCP → metadata unique (mcp-patterns §6).
  // Le transport MCP lui-même est servi NATIVEMENT sur /api/mcp (basePath "/api" de mcp-handler) :
  // pas de rewrite pour lui, mcp-handler matche sur l'URL originale.
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
