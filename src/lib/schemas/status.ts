// Schema Zod partagé = source de vérité (mcp-patterns §1) : le MÊME schema valide le form web
// (react-hook-form + zodResolver) et l'input du tool MCP. Inputs de tools = non fiables.
// Chaque champ porte un .describe() : c'est ce que le modèle lit pour remplir l'input (§3).
import { z } from "zod"

export const getStatusInputSchema = z.object({
  verbose: z
    .boolean()
    .optional()
    .describe("Include component-level details (database, integrations). Default: false."),
})

export type GetStatusInputType = z.infer<typeof getStatusInputSchema>

export const statusResultSchema = z.object({
  product: z.string(),
  version: z.string(),
  status: z.enum(["ok", "degraded"]),
  components: z.array(z.object({ name: z.string(), status: z.string() })).optional(),
})

export type StatusResultType = z.infer<typeof statusResultSchema>
