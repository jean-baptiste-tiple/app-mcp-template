// SEUL endroit du code qui manipule les clés de méta widget (mcp-patterns §5.1).
// MCP Apps GA 2026-01-26 : méta nested `ui.resourceUri` + mimeType `text/html;profile=mcp-app`
// (tout autre mimeType est rejeté par les hosts standard — Claude renvoie
// "Unsupported UI resource content format"). ChatGPT (Apps SDK) consomme l'alias
// `openai/outputTemplate` et attend `text/html+skybridge` → variante dédiée du même bundle.
// Quand ChatGPT aura convergé vers le standard, la variante skybridge se supprime ICI.

// Un type fermé = impossible de référencer un widget qui n'existe pas.
// Doit rester aligné avec widgets/build.mjs (WIDGET_NAMES).
export const WIDGET_NAMES = ["status-card"] as const

export type WidgetName = (typeof WIDGET_NAMES)[number]

/** MimeType imposé par MCP Apps GA pour les resources ui:// (Claude, Goose, VS Code). */
export const WIDGET_MIME_MCP_APP = "text/html;profile=mcp-app"

/** MimeType attendu par ChatGPT (Apps SDK / skybridge). */
export const WIDGET_MIME_SKYBRIDGE = "text/html+skybridge"

export function widgetResourceUri(name: WidgetName): string {
  return `ui://widgets/${name}.html`
}

/** Variante skybridge du même bundle, ciblée par `openai/outputTemplate`. */
export function widgetSkybridgeUri(name: WidgetName): string {
  return `ui://widgets/${name}-skybridge.html`
}

/** Triple méta : `ui.resourceUri` (standard GA), alias plat déprécié (hosts pré-GA), alias Apps SDK. */
export function widgetMeta(name: WidgetName): Record<string, unknown> {
  const uri = widgetResourceUri(name)
  return {
    ui: { resourceUri: uri },
    "ui/resourceUri": uri,
    "openai/outputTemplate": widgetSkybridgeUri(name),
  }
}
