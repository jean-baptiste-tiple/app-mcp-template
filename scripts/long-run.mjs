#!/usr/bin/env node
/**
 * long-run — une seule commande longue à la fois sur ce checkout, partagée entre les sessions.
 *
 * Le problème : plusieurs sessions Claude travaillent dans le même dossier. Chacune lançait
 * `pnpm verify`, `build`, `test:e2e`, `ui:shots`… de son côté : les runs saturaient la machine
 * (timeouts de tests), se marchaient dessus (verrou `.next`, port 3000, `.ui-shots/` écrasé), et
 * un `verify` couvrait un arbre qu'une autre session modifiait au même moment.
 *
 * Ce que fait le wrapper :
 * - **file d'attente** : une commande longue tient le verrou `.claude/.long-run/lock.json` ; une
 *   autre attend sa fin au lieu de tourner en parallèle ;
 * - **mutualisation** : un `verify` qui a attendu celui d'une autre session ne rejoue rien si le
 *   reçu couvre désormais l'arbre courant ;
 * - **gel** (`--freeze`, pour `verify` et `build`) : avant de partir, attend que les autres
 *   sessions aient cessé d'écrire depuis `QUIET_MS` ; pendant le run, le hook
 *   `.claude/hooks/coordinate-sessions.mjs` refuse leurs écritures.
 *
 *   node scripts/long-run.mjs <tâche> [--freeze] -- <commande shell>
 *   node scripts/long-run.mjs wait     → attend la fin du run en cours (pour une session gelée)
 *   node scripts/long-run.mjs status   → affiche le run en cours et les sessions actives
 *
 * Tout l'état vit sous `.claude/.long-run/` (ignoré par git, donc hors du reçu de vérification).
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, openSync, closeSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
// `LONG_RUN_DIR` : réservé aux tests, qui exercent le verrou dans un dossier jetable.
export const DIR = process.env.LONG_RUN_DIR ?? join(ROOT, '.claude/.long-run')
const LOCK = join(DIR, 'lock.json')
const INTENT = join(DIR, 'intent.json')
const SESSIONS = join(DIR, 'sessions')

export const QUIET_MS = Number(process.env.LONG_RUN_QUIET_MS ?? 30_000) // écriture récente = session au travail
const QUIET_MAX_MS = Number(process.env.LONG_RUN_QUIET_MAX_MS ?? 5 * 60_000) // au-delà, on gèle quand même
const POLL_MS = Number(process.env.LONG_RUN_POLL_MS ?? 2_000)
const STALE_MS = 60 * 60_000 // un verrou de plus d'une heure est mort, même si son pid est réutilisé
const INTENT_MS = 30_000 // l'intention posée par le hook juste avant la commande

const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function alive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return e.code === 'EPERM' // le process existe mais appartient à un autre utilisateur
  }
}

/** Le verrou en cours, ou `null` s'il n'y en a pas ou s'il est mort (pid disparu, trop vieux). */
export function currentLock() {
  const lock = readJson(LOCK)
  if (!lock) return null
  if (!alive(lock.pid) || Date.now() - lock.startedAt > STALE_MS) {
    rmSync(LOCK, { force: true })
    return null
  }
  return lock
}

/** Session qui a lancé cette commande : posée par le hook PreToolUse juste avant. */
function launchingSession() {
  const intent = readJson(INTENT)
  return intent && Date.now() - intent.at < INTENT_MS ? intent.session : null
}

/** Sessions (autres que `self`) qui ont écrit un fichier depuis moins de `QUIET_MS`. */
export function busySessions(self) {
  if (!existsSync(SESSIONS)) return []
  return readdirSync(SESSIONS)
    .map((f) => readJson(join(SESSIONS, f)))
    .filter((s) => s && s.session !== self && Date.now() - s.lastWriteAt < QUIET_MS)
}

function tryAcquire(entry) {
  try {
    mkdirSync(DIR, { recursive: true })
    const fd = openSync(LOCK, 'wx') // création exclusive : atomique, deux sessions ne gagnent pas ensemble
    writeFileSync(fd, JSON.stringify(entry, null, 2))
    closeSync(fd)
    return true
  } catch (e) {
    if (e.code === 'EEXIST') return false
    throw e
  }
}

const describe = (l) =>
  `« ${l.task} » lancé par ${l.session ? `la session ${l.session.slice(0, 8)}` : 'un terminal'} il y a ${Math.round((Date.now() - l.startedAt) / 1000)} s`

async function waitForFree(log) {
  let announced = false
  for (let l = currentLock(); l; l = currentLock()) {
    if (!announced) log(`⏳  Une commande longue tourne déjà : ${describe(l)}. Attente de sa fin…`)
    announced = true
    await sleep(POLL_MS)
  }
  return announced
}

/**
 * Le reçu couvre l'arbre ET déclare un verify complet. Un reçu doc (`scope: "docs"`, seul
 * `check:framework` a tourné) ne dispense pas d'un `verify` : le gate le demande justement quand
 * le commit touche du code (décision JB, 2026-11-26).
 */
export async function receiptCovers() {
  try {
    const { checkReceipt } = await import('./verify-receipt.mjs')
    const { valid, receipt } = checkReceipt()
    return valid && receipt?.scope !== 'docs'
  } catch {
    return false
  }
}

async function run(task, freeze, command) {
  const log = (m) => process.stderr.write(m + '\n')
  const session = launchingSession()

  for (;;) {
    const waited = await waitForFree(log)
    // Mutualisation : le `verify` d'une autre session vient peut-être de couvrir cet arbre.
    if (waited && task === 'verify' && (await receiptCovers())) {
      log('✔  Mutualisé : les checks viennent de passer sur ce code dans une autre session. Rien à rejouer.')
      return 0
    }

    if (freeze) {
      const t0 = Date.now()
      let busy = busySessions(session)
      while (busy.length && Date.now() - t0 < QUIET_MAX_MS) {
        log(
          `⏳  Gel différé : ${busy.map((s) => `session ${s.session.slice(0, 8)} (${s.lastFile ?? 'fichier'})`).join(', ')} ` +
            `écrit encore. Prévenir ces sessions (CLAUDE.md § Plusieurs sessions sur le même checkout) ; attente…`
        )
        await sleep(POLL_MS * 5)
        busy = busySessions(session)
      }
      if (busy.length) log('⚠  Les sessions ci-dessus écrivent toujours après 5 min : gel imposé.')
    }

    const entry = { task, freeze, pid: process.pid, session, startedAt: Date.now(), command }
    if (!tryAcquire(entry)) continue // une autre session a pris le verrou entre-temps : on re-attend

    const release = () => {
      const l = readJson(LOCK)
      if (l?.pid === process.pid) rmSync(LOCK, { force: true })
    }
    for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => (release(), process.exit(130)))
    if (freeze) log(`🧊  Gel du checkout pour « ${task} » : les écritures des autres sessions sont refusées jusqu'à la fin.`)
    try {
      return await new Promise((resolve) => {
        const child = spawn(command, { cwd: ROOT, shell: true, stdio: 'inherit' })
        child.on('exit', (code) => resolve(code ?? 1))
        child.on('error', () => resolve(1))
      })
    } finally {
      release()
    }
  }
}

function status() {
  const l = currentLock()
  console.log(l ? `Run en cours : ${describe(l)}${l.freeze ? ' (gel)' : ''}.` : 'Aucun run long en cours.')
  const busy = busySessions(null)
  console.log(busy.length ? `Sessions qui écrivent : ${busy.map((s) => s.session.slice(0, 8)).join(', ')}.` : 'Aucune session en écriture.')
}

async function main() {
  const [task, ...rest] = process.argv.slice(2)
  if (task === 'status') return status(), 0
  if (task === 'wait') return (await waitForFree((m) => process.stderr.write(m + '\n'))), 0
  const sep = rest.indexOf('--')
  if (!task || sep < 0 || sep === rest.length - 1) {
    process.stderr.write('usage : long-run.mjs <tâche> [--freeze] -- <commande> | wait | status\n')
    return 2
  }
  return run(task, rest.slice(0, sep).includes('--freeze'), rest.slice(sep + 1).join(' '))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then((code) => process.exit(code))
}
