// Assemblage du serveur MCP — partagé entre la route /api/mcp (mcp-handler) et les tests
// unit (InMemoryTransport). C'est le SEUL endroit qui liste tools, widgets et instructions.
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { MCP_SERVER_INFO } from "./config"
import { registerGetStatusTool } from "./tools/get-status"
import { registerWidgets } from "./widgets"

// instructions = le "system prompt" du serveur, injecté chez l'host (mcp-patterns §2.1) :
// mission, entités, workflows, règles. En ANGLAIS (robustesse cross-host). JAMAIS de contenu
// variable (date, compteurs, données user) — ça casserait le prompt caching de l'host.
const SERVER_INSTRUCTIONS = `<Product> manages <entities> for <audience> (multi-tenant).

Core concepts:
- <central entity, its lifecycle, its invariants>
- Users refer to entities by name; tools accept names and resolve them to ids.

Typical workflows:
1. <workflow 1: tool chaining, e.g. search_x then get_x>
2. <workflow 2>

Rules:
- Prefer tool results' next_actions to decide what to propose next.
- Do not paste large entity JSON into the conversation; widgets display it.
- NEVER claim the widget visually displayed something — you cannot see the user's screen.
  Say the data was returned; if the user reports a stuck preview, do NOT retry the same
  call: use the text/export fallback and mention the issue.
- Present signed URLs as SHORT markdown links ("[Open the PDF](url)"), never raw; mention expiry.
- For prepare→save flows: produce the result and call the save tool IN THE SAME TURN —
  the prepare alone creates nothing; do not reply to the user before the save succeeded.
- All operations are scoped to the authenticated user's organization.`

/** Options passées à createMcpHandler (serverInfo + instructions + capabilities). */
export const mcpServerOptions = {
  serverInfo: { name: MCP_SERVER_INFO.name, version: MCP_SERVER_INFO.version },
  instructions: SERVER_INSTRUCTIONS,
  capabilities: {
    tools: {},
    resources: {}, // widgets MCP Apps (ui://)
    // prompts: {}, // TODO(S01) : exposer les parcours canoniques comme prompts MCP (§2.3)
  },
}

/** Callback d'initialisation : enregistre tools et widgets (resources ui://). */
export function initializeMcpServer(server: McpServer): void {
  // 1 capacité métier = 1 service + 1 tool fin (§1). Ajouter chaque tool ici.
  registerGetStatusTool(server)

  // Widgets MCP Apps — bundles inlinés dans src/mcp/widgets/generated.ts (§5)
  registerWidgets(server)
}
