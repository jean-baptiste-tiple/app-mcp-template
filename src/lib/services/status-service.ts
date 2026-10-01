// Parité par services partagés (mcp-patterns §1) : TOUTE la logique métier vit ici.
// Ce service est appelé par 2 adaptateurs fins : la Server Action web ET le tool MCP.
// Tool démo — remplacer par les vrais services du projet dès la première story métier.
import type { GetStatusInputType, StatusResultType } from "@/lib/schemas/status"
import type { AuthContext } from "@/mcp/auth"

// ctx est null tant que l'auth n'est pas activée (dev local / avant starter supabase-auth).
// Une fois l'auth active : toute requête DB passe par ctx.supabase → RLS.
export async function getStatus(
  ctx: AuthContext | null,
  input: GetStatusInputType
): Promise<StatusResultType> {
  return {
    product: "my-product", // TODO(S01) : aligner avec serverInfo.name
    version: "0.1.0",
    status: "ok",
    ...(input.verbose
      ? {
          components: [
            { name: "database", status: ctx ? "authenticated" : "anonymous (auth off)" },
          ],
        }
      : {}),
  }
}
