#!/usr/bin/env node
/**
 * Preuve visuelle d'un écran : captures pleine page à 375, 768 et 1280 px, en clair et en
 * sombre, écrites dans `.ui-shots/` pour que la review les lise.
 *
 * Usage : pnpm ui:shots [route…]   (défaut : /)
 * Base : UI_SHOTS_BASE_URL (défaut http://localhost:3000). Un serveur qui répond déjà est
 * réutilisé ; sinon `pnpm dev` est démarré puis arrêté à la fin.
 *
 * Le thème suit l'émulation `colorScheme` : le ThemeProvider de `src/app/layout.tsx` est en
 * `defaultTheme="system"`, donc next-themes pose la classe `dark` d'après prefers-color-scheme.
 */
import { spawn, spawnSync } from "node:child_process"
import { mkdir, rm } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"

const ROOT = fileURLToPath(new URL("..", import.meta.url))
const OUT_DIR = path.join(ROOT, ".ui-shots")
const BASE_URL = process.env.UI_SHOTS_BASE_URL ?? "http://localhost:3000"
const WIDTHS = [375, 768, 1280]
const SCHEMES = ["light", "dark"]
// La première compilation turbopack d'une route à froid dépasse souvent 30 s.
const SERVER_TIMEOUT_MS = 90_000

async function isUp(url) {
  try {
    await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5_000) })
    return true
  } catch {
    return false
  }
}

function startDevServer() {
  const port = new URL(BASE_URL).port || "3000"
  // Commande en une chaîne via le shell : résout `pnpm.cmd` sous Windows sans DEP0190 ;
  // detached hors Windows pour tuer tout le groupe de process à l'arrêt.
  return spawn("pnpm dev", {
    cwd: ROOT,
    env: { ...process.env, PORT: port },
    shell: true,
    detached: process.platform !== "win32",
    stdio: "ignore",
  })
}

function stopDevServer(child) {
  if (child.exitCode !== null) return
  // `child.kill()` ne tue que le shell : next dev survivrait et garderait le port.
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" })
  } else {
    process.kill(-child.pid, "SIGTERM")
  }
}

async function waitForServer(child) {
  const deadline = Date.now() + SERVER_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`pnpm dev s'est arrêté (code ${child.exitCode})`)
    if (await isUp(BASE_URL)) return
    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }
  throw new Error(`${BASE_URL} ne répond pas après ${SERVER_TIMEOUT_MS / 1000} s`)
}

function slugOf(route) {
  const slug = route.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  return slug || "home"
}

async function shootRoute(page, route, name) {
  const response = await page.goto(new URL(route, BASE_URL).href, {
    waitUntil: "networkidle",
    timeout: SERVER_TIMEOUT_MS,
  })
  if (response && response.status() >= 400) {
    process.stderr.write(`attention : ${route} répond ${response.status()}\n`)
  }
  await page.evaluate(() => document.fonts.ready)
  const file = path.join(OUT_DIR, `${slugOf(route)}__${name}.png`)
  await page.screenshot({ path: file, fullPage: true, animations: "disabled" })
  return path.relative(ROOT, file).split(path.sep).join("/")
}

async function shoot(browser, routes) {
  const files = []
  for (const width of WIDTHS) {
    for (const scheme of SCHEMES) {
      const context = await browser.newContext({ viewport: { width, height: 800 }, colorScheme: scheme })
      const page = await context.newPage()
      for (const route of routes) files.push(await shootRoute(page, route, `${width}__${scheme}`))
      await context.close()
    }
  }
  return files
}

async function main() {
  const routes = process.argv.slice(2)
  if (routes.length === 0) routes.push("/")

  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })

  const server = (await isUp(BASE_URL)) ? null : startDevServer()
  let browser
  try {
    if (server) await waitForServer(server)
    browser = await chromium.launch()
    const files = await shoot(browser, routes)
    process.stdout.write(files.join("\n") + "\n")
  } finally {
    await browser?.close()
    if (server) stopDevServer(server)
  }
}

main().catch((error) => {
  process.stderr.write(`ui:shots : ${error.message}\n`)
  process.exit(1)
})
