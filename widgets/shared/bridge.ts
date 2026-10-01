// Bridge dual-host UNIQUE (mcp-patterns §5.2) — version éprouvée en prod (mcp-cv-editor).
// Les widgets n'importent QUE ce module — jamais `window.openai` directement.
// Deux dialectes derrière une API interne unique :
//   - Standard MCP Apps GA 2026-01-26 : via le SDK OFFICIEL `@modelcontextprotocol/ext-apps`
//     (build autonome app-with-deps — découplé du SDK serveur épinglé). Le SDK gère le
//     handshake `ui/initialize` (params EXACTS : appInfo, pas clientInfo — bug vécu : un
//     initialize invalide = widget vide), les notifications tool-result/host-context, le
//     size-changed (autoResize) et répond aux requêtes du host (ping…).
//   - ChatGPT Apps SDK : `window.openai.*` (détecté à l'exécution → délégation).
// Tout est défensif (try/catch + fallbacks) : le host réel n'est pas testable ici, donc
// on ne casse jamais le rendu si une capacité manque. Chemin mock local : `window.__MCP_TOOL_OUTPUT__`.

import { App } from "@modelcontextprotocol/ext-apps/app-with-deps"

export type Theme = "light" | "dark"

// ── Typage souple du dialecte ChatGPT (jamais importé par les widgets) ───────────
interface OpenAiGlobals {
  toolOutput?: unknown
  toolInput?: unknown
  theme?: string
  displayMode?: string
  callTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>
  sendFollowUpMessage?: (arg: { prompt: string }) => void | Promise<void>
  openExternal?: (arg: { href: string }) => void
}

declare global {
  interface Window {
    openai?: OpenAiGlobals
    __MCP_TOOL_OUTPUT__?: unknown
    __MCP_THEME__?: Theme
  }
}

// ── État interne (rempli par les messages du host standard) ──────────────────────
let cachedOutput: unknown = undefined
let cachedTheme: Theme | undefined
const outputListeners = new Set<(o: unknown) => void>()
const themeListeners = new Set<(t: Theme) => void>()

// Résolution des requêtes JSON-RPC en attente (id → resolve/reject) — fallback pré-GA.
type Pending = { resolve: (v: unknown) => void; reject: (e: unknown) => void }
const pending = new Map<string, Pending>()
let rpcSeq = 0

function nextId(): string {
  rpcSeq += 1
  return `w-${Date.now()}-${rpcSeq}`
}

function hostWindow(): Window | null {
  try {
    if (typeof window === "undefined") return null
    return window.parent && window.parent !== window ? window.parent : null
  } catch {
    return null
  }
}

function postRpc(method: string, params: Record<string, unknown>): Promise<unknown> {
  const host = hostWindow()
  if (!host) return Promise.reject(new Error("no-host"))
  const id = nextId()
  return new Promise<unknown>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    try {
      host.postMessage({ jsonrpc: "2.0", id, method, params }, "*")
    } catch (e) {
      pending.delete(id)
      reject(e)
    }
    // Filet de sécurité : ne jamais rester bloqué si le host ne répond pas.
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id)
        reject(new Error(`rpc-timeout:${method}`))
      }
    }, 15000)
  })
}

function normalizeTheme(v: unknown): Theme | undefined {
  if (v === "dark" || v === "light") return v
  return undefined
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

/**
 * Certains hosts (Claude) passent au widget le CallToolResult COMPLET
 * (`{ content, structuredContent, _meta }`) et non le seul `structuredContent`.
 * On déballe pour exposer aux widgets le contrat attendu (le structuredContent du tool).
 */
function normalizeOutput(o: unknown): unknown {
  if (isRecord(o)) {
    const sc = o.structuredContent
    if (sc && typeof sc === "object") return sc
  }
  return o
}

function emitOutput(raw: unknown): void {
  const normalized = normalizeOutput(raw)
  cachedOutput = normalized
  outputListeners.forEach((cb) => {
    try {
      cb(normalized)
    } catch {
      /* noop */
    }
  })
}

function emitTheme(theme: Theme | undefined): void {
  if (!theme || theme === cachedTheme) return
  cachedTheme = theme
  themeListeners.forEach((cb) => {
    try {
      cb(theme)
    } catch {
      /* noop */
    }
  })
}

// ── Écoute legacy (réponses aux postRpc de secours + formes pré-GA) ──────────────
// Le protocole GA lui-même (tool-result, host-context, size…) est géré par le SDK.
function handleMessage(ev: MessageEvent): void {
  const msg: unknown = ev.data
  if (!isRecord(msg)) return

  // Réponse à une requête JSON-RPC émise par le fallback postRpc.
  if ("id" in msg && msg.id != null && ("result" in msg || "error" in msg)) {
    const p = pending.get(String(msg.id))
    if (p) {
      pending.delete(String(msg.id))
      if ("error" in msg && msg.error) p.reject(msg.error)
      else p.resolve(msg.result)
    }
    return
  }

  // Rétro-compat pré-GA : formes historiques acceptées en best-effort.
  const method = typeof msg.method === "string" ? msg.method : undefined
  if (method?.startsWith("ui/notifications/")) return // GA → géré par le SDK, ne pas doubler
  const params: Record<string, unknown> = isRecord(msg.params) ? msg.params : {}
  const candidateOutput =
    (method === "ui/render" || method === "render" || method === "notifications/render"
      ? (params.toolOutput ?? params.structuredContent ?? params.output ?? params.data)
      : undefined) ??
    (msg.toolOutput ?? msg.structuredContent)
  if (candidateOutput !== undefined) emitOutput(candidateOutput)

  const candidateTheme =
    normalizeTheme(params.theme) ??
    normalizeTheme(isRecord(params.globals) ? params.globals.theme : undefined) ??
    normalizeTheme(msg.theme)
  emitTheme(candidateTheme)
}

// ── Connexion au host standard via le SDK officiel ───────────────────────────────
let app: App | null = null

async function connectStandardHost(): Promise<void> {
  if (window.openai || !hostWindow()) return // dialecte ChatGPT, ou pas d'iframe (mock)
  try {
    const a = new App(
      { name: "my-product-widget", version: "1.0.0" }, // TODO(S01) : aligner sur serverInfo.name
      {},
      { autoResize: true }
    )
    // Handlers AVANT connect : le host livre tool-input/tool-result dès `initialized`.
    a.ontoolresult = (result) => emitOutput(result)
    a.onhostcontextchanged = (hostContext) => emitTheme(normalizeTheme(hostContext.theme))
    await a.connect()
    app = a
    emitTheme(normalizeTheme(a.getHostContext()?.theme))
  } catch {
    /* host pré-GA ou hors iframe : les chemins legacy/mock restent actifs */
  }
}

// ── Dialecte ChatGPT : les mises à jour (toolOutput, thème) arrivent via le
// CustomEvent `openai:set_globals` sur window — PAS par postMessage. Sans cette
// écoute, une donnée livrée APRÈS le premier render laisse le widget sur son
// loader pour toujours (bug vécu : « Chargement… » infini sur ChatGPT).
function handleSetGlobals(ev: Event): void {
  try {
    const detail = "detail" in ev ? ev.detail : undefined
    const globals = isRecord(detail) ? detail.globals : undefined
    if (!isRecord(globals)) return
    if (globals.toolOutput !== undefined) emitOutput(globals.toolOutput)
    emitTheme(normalizeTheme(globals.theme))
  } catch {
    /* noop — jamais casser le rendu */
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("message", handleMessage)
  window.addEventListener("openai:set_globals", handleSetGlobals)
  void connectStandardHost()
}

// ── API publique ─────────────────────────────────────────────────────────────────

/** Le `structuredContent` du tool (contrat §4). Retourne `null` si rien n'est encore disponible. */
export function getToolOutput<T = unknown>(): T | null {
  try {
    if (typeof window !== "undefined") {
      // `as T` : T est le contrat du structuredContent que le widget déclare (§4). Le bridge
      // transporte n'importe quel tool : il ne peut pas valider un T arbitraire, le widget lit
      // ses champs défensivement (4 états, §5.3).
      if (window.openai?.toolOutput !== undefined) return normalizeOutput(window.openai.toolOutput) as T
      // `as T` : même contrat déclaré par le widget, non validable ici (voir ci-dessus).
      if (window.__MCP_TOOL_OUTPUT__ !== undefined) return normalizeOutput(window.__MCP_TOOL_OUTPUT__) as T
    }
  } catch {
    /* noop */
  }
  // `as T` : même contrat déclaré par le widget, non validable ici (voir ci-dessus).
  return (cachedOutput as T) ?? null
}

/** S'abonne aux arrivées/mises à jour asynchrones du tool output. Retourne un unsubscribe. */
export function onToolOutput<T = unknown>(cb: (output: T) => void): () => void {
  // `as T` : contrat du structuredContent déclaré par l'abonné, non validable ici (voir getToolOutput).
  const wrapped = (o: unknown) => cb(o as T)
  outputListeners.add(wrapped)
  return () => outputListeners.delete(wrapped)
}

/** Appelle un tool MCP via le host. Résout avec le résultat du tool (best-effort). */
export async function callTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
  try {
    if (typeof window !== "undefined" && typeof window.openai?.callTool === "function") {
      return await window.openai.callTool(name, args)
    }
  } catch {
    /* tombe sur le chemin standard */
  }
  if (app) return app.callServerTool({ name, arguments: args })
  return postRpc("tools/call", { name, arguments: args })
}

/** Envoie un message de suivi au modèle (ex: « relance get_status en verbose »). */
export async function sendFollowupMessage(text: string): Promise<void> {
  try {
    if (typeof window !== "undefined" && typeof window.openai?.sendFollowUpMessage === "function") {
      await window.openai.sendFollowUpMessage({ prompt: text })
      return
    }
  } catch {
    /* tombe sur le chemin standard */
  }
  try {
    if (app) {
      await app.sendMessage({ role: "user", content: [{ type: "text", text }] })
      return
    }
    await postRpc("ui/prompt", { prompt: text })
  } catch {
    /* dernier recours : rien (le host peut ne pas supporter les prompts widget) */
  }
}

/** Ouvre une URL externe (deep link vers l'app web, lien de partage…). */
export function openExternal(url: string): void {
  try {
    if (typeof window !== "undefined" && typeof window.openai?.openExternal === "function") {
      window.openai.openExternal({ href: url })
      return
    }
  } catch {
    /* tombe sur le chemin standard */
  }
  if (app) {
    // GA : requête ui/open-link — le host décide (fallback window.open si refus).
    void app
      .openLink({ url })
      .then((r) => {
        if (r?.isError) {
          window.open(url, "_blank", "noopener,noreferrer")
        }
      })
      .catch(() => {
        try {
          window.open(url, "_blank", "noopener,noreferrer")
        } catch {
          /* noop */
        }
      })
    return
  }
  try {
    window.open(url, "_blank", "noopener,noreferrer")
  } catch {
    /* noop */
  }
}

/** Thème courant (clair/sombre). Ordre : ChatGPT → message host → mock → prefers-color-scheme. */
export function getTheme(): Theme {
  try {
    if (typeof window !== "undefined") {
      const oa = normalizeTheme(window.openai?.theme) ?? normalizeTheme(window.openai?.displayMode)
      if (oa) return oa
      if (cachedTheme) return cachedTheme
      if (window.__MCP_THEME__) return window.__MCP_THEME__
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark"
      }
    }
  } catch {
    /* noop */
  }
  return "light"
}

/** S'abonne aux changements de thème. Retourne un unsubscribe. */
export function onThemeChange(cb: (theme: Theme) => void): () => void {
  themeListeners.add(cb)
  let mq: MediaQueryList | undefined
  const mqHandler = () => cb(getTheme())
  try {
    if (typeof window !== "undefined" && window.matchMedia) {
      mq = window.matchMedia("(prefers-color-scheme: dark)")
      mq.addEventListener("change", mqHandler)
    }
  } catch {
    /* noop */
  }
  return () => {
    themeListeners.delete(cb)
    try {
      mq?.removeEventListener("change", mqHandler)
    } catch {
      /* noop */
    }
  }
}
