// Enregistre les widgets buildés comme resources `ui://` (MCP Apps GA 2026-01-26).
// Chaque bundle est exposé en DEUX variantes du même HTML (mcp-patterns §5.1) :
// - standard `text/html;profile=mcp-app` (Claude & hosts MCP Apps — seul mimeType accepté),
//   ciblée par `_meta.ui.resourceUri` ;
// - alias `-skybridge` en `text/html+skybridge` (ChatGPT Apps SDK), ciblée par `openai/outputTemplate`.
// Ne registre que les bundles réellement présents (dégradation gracieuse : un tool
// reste 100% fonctionnel en texte si son widget n'est pas encore buildé).
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import {
  WIDGET_MIME_MCP_APP,
  WIDGET_MIME_SKYBRIDGE,
  WIDGET_NAMES,
  widgetResourceUri,
  widgetSkybridgeUri,
} from "../widget-meta"
import { WIDGET_HTML } from "./generated"

export function registerWidgets(server: McpServer): void {
  for (const name of WIDGET_NAMES) {
    const html = WIDGET_HTML[name]
    if (!html) continue
    const variants = [
      { id: name, uri: widgetResourceUri(name), mimeType: WIDGET_MIME_MCP_APP },
      { id: `${name}-skybridge`, uri: widgetSkybridgeUri(name), mimeType: WIDGET_MIME_SKYBRIDGE },
    ]
    for (const variant of variants) {
      server.registerResource(
        variant.id,
        variant.uri,
        { mimeType: variant.mimeType, title: `Widget ${name}` },
        async (resourceUri) => ({
          contents: [{ uri: resourceUri.href, mimeType: variant.mimeType, text: html }],
        })
      )
    }
  }
}
