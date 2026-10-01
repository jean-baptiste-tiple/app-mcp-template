// Mise en forme des résultats de tools — mcp-patterns §4 : TOUJOURS les deux formes.
// ⚠️ CONTRAT (banc mcp-test, 2026-09-22) : claude.ai et ChatGPT montrent le `content`
// texte au modèle ; Claude Code ne lui montre QUE `structuredContent` quand il existe.
// Tout ce que le modèle doit lire ou exécuter (consignes, données source d'un
// prepare, texte brut) va dans `text` ET dans `structured` (champ `message` ou
// `instructions`), en plus de ce dont le widget a besoin.
import { widgetMeta, type WidgetName } from "./widget-meta"

interface ToolResultOptions {
  // Ce que le modèle LIT sur claude.ai et ChatGPT. Résultat simple : résumé 2-4 lignes.
  // Tool "prepare" : consignes complètes + données source.
  text: string
  // Canal du WIDGET, et seul canal lu par Claude Code : ids + résumé + next_actions
  // + le même texte que `text` (champ `message`). JAMAIS l'entité complète si le
  // widget l'affiche.
  structured: Record<string, unknown> & { next_actions?: string[] }
  widget?: WidgetName
}

export function toToolResult({ text, structured, widget }: ToolResultOptions) {
  return {
    content: [{ type: "text" as const, text }],
    structuredContent: structured,
    ...(widget ? { _meta: widgetMeta(widget) } : {}),
  }
}

// Erreur actionnable (§4) : une instruction de récupération pour l'agent, pas un stack trace.
// Ex : toolError("Aucun document trouvé pour 'X'. Utiliser search_documents pour lister.")
export function toolError(message: string, options?: { wwwAuthenticate?: string }) {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
    // Exigence ChatGPT pour afficher l'UI de connexion quand le token manque (§6.3)
    ...(options?.wwwAuthenticate
      ? { _meta: { "mcp/www_authenticate": options.wwwAuthenticate } }
      : {}),
  }
}
