// Widget DÉMO — montre le contrat d'un widget MCP Apps (mcp-patterns §5.2, §5.3) :
//   - données d'entrée = le structuredContent du tool (identique Claude/ChatGPT)
//   - n'importe QUE le bridge/mount (jamais window.openai)
//   - 4 états OBLIGATOIRES : loading / data / vide / erreur — et le loader n'est
//     JAMAIS terminal (timeout ~12 s → erreur actionnable, retour agents)
//   - thème clair/sombre via le bridge
// Rappel §5.3 : si un rendu existe côté web, le widget importe le MÊME composant React.
// Mock local : poser window.__MCP_TOOL_OUTPUT__ avant le chargement du module.
import { useEffect, useState } from "react"

import { callTool, getTheme, onThemeChange } from "../shared/bridge"
import { mount, useToolOutput } from "../shared/mount"

// = structuredContent de get_status (contrat §4 — voir src/mcp/tools/get-status.ts)
interface StatusOutput {
  product: string
  version: string
  status: "ok" | "degraded"
  components?: { name: string; status: string }[]
  next_actions?: string[]
}

function StatusCard() {
  const output = useToolOutput<StatusOutput>()
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState(false)

  // Le loader n'est JAMAIS un état terminal : après 12 s sans données, erreur
  // actionnable (dire à l'utilisateur QUOI demander dans le chat) au lieu de
  // tourner pour toujours.
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    if (output != null) return
    const t = setTimeout(() => setTimedOut(true), 12000)
    return () => clearTimeout(t)
  }, [output])

  useEffect(() => {
    document.documentElement.dataset.theme = getTheme()
    return onThemeChange((t) => {
      document.documentElement.dataset.theme = t
    })
  }, [])

  async function refresh() {
    setRefreshing(true)
    setRefreshError(false)
    try {
      // Action widget → tool call via le bridge (matrice §5.4)
      await callTool("get_status", { verbose: true })
    } catch {
      // Host sans appel de tool depuis un widget, ou appel refusé : état d'erreur actionnable.
      setRefreshError(true)
    } finally {
      setRefreshing(false)
    }
  }

  if (output == null) {
    return timedOut ? (
      <p style={styles.muted}>
        Impossible de charger l&apos;état. Les données sont probablement disponibles côté
        serveur. Demandez dans le chat : « relance get_status ».
      </p>
    ) : (
      <p style={styles.muted}>Chargement…</p>
    )
  }

  return (
    <div style={styles.card}>
      <div style={styles.row}>
        {/* Pastille décorative : l'état est aussi écrit en texte (jamais la couleur seule). */}
        <span style={styles.dot(output.status === "ok")} aria-hidden="true" />
        <strong>{output.product}</strong>
        <span style={styles.mutedInline}>v{output.version}</span>
        <span style={styles.mutedInline}>{output.status === "ok" ? "opérationnel" : "dégradé"}</span>
      </div>
      {output.components?.map((c) => (
        <div key={c.name} style={styles.component}>
          {c.name} : {c.status}
        </div>
      ))}
      <button style={styles.button} onClick={refresh} disabled={refreshing}>
        {refreshing ? "…" : "Rafraîchir"}
      </button>
      {refreshError ? (
        <p role="alert" style={styles.mutedInline}>
          Rafraîchissement impossible ici. Demandez dans le chat : « relance get_status ».
        </p>
      ) : null}
    </div>
  )
}

const styles = {
  card: { padding: 16, display: "grid", gap: 8 } as const,
  row: { display: "flex", alignItems: "center", gap: 8 } as const,
  muted: { padding: 16, color: "var(--muted)" } as const,
  mutedInline: { color: "var(--muted)", fontSize: 13 } as const,
  component: { fontSize: 13, color: "var(--muted)", paddingLeft: 18 } as const,
  dot: (ok: boolean) =>
    ({
      width: 10,
      height: 10,
      borderRadius: 999,
      background: ok ? "#22c55e" : "#f59e0b",
    }) as const,
  button: {
    justifySelf: "start",
    padding: "6px 12px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--accent)",
    cursor: "pointer",
    font: "inherit",
  } as const,
}

mount(<StatusCard />)
