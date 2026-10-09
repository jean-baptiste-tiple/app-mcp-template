#!/usr/bin/env node
// Smoke test des portes du paquet oto, sans jeton : démarre `next start` (build supposé fait),
// contrôle les réponses des routes montées, puis éteint. Il prouve le montage, pas un parcours
// authentifié : celui-ci demande une base préparée et un compte.
// Usage : node scripts/smoke-mcp.mjs [base_url]
//   - sans base_url : serveur local, variables de l'environnement puis de `.env.local`
//   - avec base_url (ex: https://mon-produit.example) : teste cette cible, sans serveur local

import { spawn } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { parseEnv } from "node:util"

const remote = process.argv[2]
const PORT = 3200
const BASE = remote ?? `http://localhost:${PORT}`
let server = null

const env = { ...(existsSync(".env.local") ? parseEnv(readFileSync(".env.local", "utf8")) : {}), ...process.env }
// Le middleware construit un client Supabase à chaque requête : sans ces deux variables il lève.
// Des valeurs factices suffisent à un contrôle sans jeton (aucune session à lire).
const placeholders = !remote && !env.NEXT_PUBLIC_SUPABASE_URL
if (placeholders) {
  env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:59999"
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "placeholder"
}
// Les métadonnées OAuth lisent l'organisation de l'adresse : elles demandent la base.
const withDatabase = Boolean(remote || env.PLATFORM_DATABASE_URL)

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

async function call(path, init) {
  return fetch(`${BASE}${path}`, { redirect: "manual", signal: AbortSignal.timeout(15_000), ...init })
}

function check(label, ok, detail) {
  console.log(`${ok ? "✓" : "✗"} ${label} | ${detail}`)
  if (!ok) throw new Error(`${label} KO`)
}

async function main() {
  if (!remote) {
    // Windows : node_modules/.bin/next est un shim que spawn sans shell ne sait pas lancer.
    server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
      stdio: ["ignore", "pipe", "pipe"],
      env,
    })
    await waitReady(`${BASE}/icon.svg`)
    console.log(`✓ serveur local prêt${placeholders ? " (variables Supabase factices)" : ""}`)
  }

  const anonymous = await call("/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
  })
  const challenge = anonymous.headers.get("www-authenticate") ?? ""
  check("POST /api/mcp sans jeton", anonymous.status === 401 && challenge.includes("resource_metadata="), `HTTP ${anonymous.status} | ${challenge}`)

  const get = await call("/api/mcp")
  check("GET /api/mcp", get.status === 405, `HTTP ${get.status}`)

  const api = await call("/api/platform/nodes")
  check("GET /api/platform/nodes sans session", api.status === 401, `HTTP ${api.status}`)

  const home = await call("/")
  const location = home.headers.get("location") ?? ""
  check("GET / sans session", home.status === 307 && location.includes("/login"), `HTTP ${home.status} → ${location}`)

  if (withDatabase) {
    const metadata = await call("/.well-known/oauth-protected-resource/api/mcp")
    const body = await metadata.json().catch(() => null)
    check("métadonnées OAuth", metadata.status === 200 && Boolean(body?.authorization_servers?.length), `HTTP ${metadata.status} | resource: ${body?.resource}`)
  } else {
    console.log("– métadonnées OAuth : non contrôlées, PLATFORM_DATABASE_URL absente")
  }

  console.log("\n✅ SMOKE TEST DES PORTES : OK")
}

main()
  .catch((e) => {
    console.error("✗", e.message)
    process.exitCode = 1
  })
  .finally(() => {
    if (server) server.kill("SIGTERM")
  })
