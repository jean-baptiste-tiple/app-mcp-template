// Tool DÉMO — montre la forme canonique d'un tool (mcp-patterns §1, §3, §4) :
// adaptateur FIN (validation → service → mise en forme), zéro logique métier ici.
// À remplacer par les vrais tools du projet ; garder 1 fichier par tool.
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { getStatusInputSchema } from "@/lib/schemas/status"
import { getStatus } from "@/lib/services/status-service"
import { toolMeta } from "@/mcp/tool-meta"
import { toToolResult, toolError } from "@/mcp/tool-result"

// Format imposé (§3) : verbe d'abord, "Use this when…", "Do not use for…",
// l'essentiel dans la première phrase. Stable (prompt caching des hosts).
const GET_STATUS_DESC = `Returns the product's health status and version.
Use this when the user asks whether the service is up, which version is deployed,
or to verify the connection after setup. Do not use for business data (use the
domain tools instead). Returns {product, version, status} plus per-component
details when verbose is true.`

export function registerGetStatusTool(server: McpServer) {
  server.registerTool(
    "get_status", // verb_noun, domaine visible, stable À JAMAIS (§3, §10)
    {
      title: "État du service", // langue des utilisateurs (affiché dans les UI hosts)
      description: GET_STATUS_DESC,
      inputSchema: getStatusInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      // securitySchemes (exigence ChatGPT) + triple méta widget — voir src/mcp/tool-meta.ts
      _meta: toolMeta("status-card"),
    },
    async (input) => {
      try {
        // TODO(S01) avec auth : const ctx = requireAuthContext(extra) — 2e param du handler
        const result = await getStatus(null, input)

        return toToolResult({
          text: `${result.product} v${result.version} — status: ${result.status}.`,
          structured: {
            ...result,
            // Le modèle proposera la suite : lister ici les tools pertinents après celui-ci (§4)
            next_actions: [],
          },
          widget: "status-card",
        })
      } catch (error) {
        // Jamais de throw brut : instruction de récupération pour l'agent (§4)
        return toolError(
          error instanceof Error && error.message.startsWith("Authentication")
            ? "Authentication required. Connect your account, then retry get_status."
            : "Status check failed. Retry in a few seconds; if it persists, the service is down."
        )
      }
    }
  )
}
