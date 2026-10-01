#!/usr/bin/env node
// Smoke test MCP de bout en bout : démarre `next start` (build supposé fait), appelle
// initialize, tools/list et tools/call get_status, puis éteint. Gère les réponses SSE.
// Usage : node scripts/smoke-mcp.mjs [access_token] [base_url]
//   - sans token : serveur en mode auth OFF (défaut du template)
//   - avec token : vérifie le chemin authentifié (Bearer)
//   - avec base_url (ex: https://mon-produit.example) : teste cette cible, sans serveur local

import { spawn } from "node:child_process"

const token = process.argv[2] || null
const remote = process.argv[3]

const PORT = 3200
const BASE = remote ?? `http://localhost:${PORT}`
let server = null

async function waitReady(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url)
      if (r.status < 500) return
    } catch {
      // Serveur pas encore à l'écoute : on réessaie après la pause.
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error("Serveur non prêt")
}

function parseBody(text) {
  // Réponse JSON directe ou flux SSE (event:/data:)
  const dataLine = text.split("\n").find((l) => l.startsWith("data:"))
  return JSON.parse(dataLine ? dataLine.slice(5) : text)
}

async function rpc(method, params, id) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}/api/mcp`, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", method, id, params }),
  })
  const text = await res.text()
  return { status: res.status, body: text ? parseBody(text) : null }
}

async function main() {
  if (!remote) {
    // Windows : node_modules/.bin/next est un shim (.cmd / sh) que spawn sans shell ne sait pas
    // lancer. On exécute le JS du binaire avec le node courant : chemin de `bin.next` dans
    // node_modules/next/package.json.
    // MCP_ALLOW_ANONYMOUS : lève le garde-fou anonyme de /api/mcp (401 en production tant que
    // l'auth est désactivée) pour ce serveur local uniquement.
    server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, MCP_ALLOW_ANONYMOUS: "true" },
    })
    server.stderr.on("data", (d) => process.stderr.write(d))
    await waitReady(`${BASE}/`)
    console.log("✓ serveur local prêt")
  }

  const init = await rpc(
    "initialize",
    {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "smoke", version: "1.0" },
    },
    1
  )
  console.log(
    `initialize → HTTP ${init.status} | serverInfo:`,
    JSON.stringify(init.body?.result?.serverInfo ?? init.body?.error ?? init.body).slice(0, 200)
  )
  if (init.status !== 200) throw new Error("initialize KO")

  const list = await rpc("tools/list", {}, 2)
  const tools = list.body?.result?.tools?.map((t) => t.name) ?? []
  console.log(`tools/list  → HTTP ${list.status} | ${tools.length} tools: ${tools.join(", ")}`)
  if (!tools.includes("get_status")) throw new Error("tool get_status absent")

  const status = await rpc("tools/call", { name: "get_status", arguments: {} }, 3)
  const content = status.body?.result?.content?.[0]?.text ?? JSON.stringify(status.body?.error)
  console.log(`get_status  → HTTP ${status.status} | ${content}`)
  if (status.status !== 200 || !/status/.test(content ?? "")) throw new Error("get_status KO")

  console.log("\n✅ SMOKE TEST MCP COMPLET : OK")
}

main()
  .catch((e) => {
    console.error("✗", e.message)
    process.exitCode = 1
  })
  .finally(() => {
    if (server) server.kill("SIGTERM")
  })
