// `_meta` de déclaration d'un tool (annoncé dans tools/list).
// - `securitySchemes: oauth2` : exigence ChatGPT pour déclencher l'UI de connexion (§3).
//   Sans cette déclaration, ChatGPT n'affiche jamais le bouton "Se connecter".
// - méta widget : advertise la resource ui:// associée (dual-host, §5.1).
import { widgetMeta, type WidgetName } from "./widget-meta"

export function toolMeta(widget?: WidgetName): Record<string, unknown> {
  return {
    securitySchemes: [{ type: "oauth2" }],
    ...(widget ? widgetMeta(widget) : {}),
  }
}
