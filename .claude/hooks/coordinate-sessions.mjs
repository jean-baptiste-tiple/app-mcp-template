#!/usr/bin/env node
/**
 * Hook PreToolUse — coordination de plusieurs sessions Claude sur le MÊME checkout.
 *
 * Exit 0 = autorisé, exit 2 = bloqué (stderr renvoyé à Claude).
 *
 * Trois rôles, tous adossés à `scripts/long-run.mjs` (état sous `.claude/.long-run/`) :
 * 1. Écriture de fichier (Edit, Write, MultiEdit, NotebookEdit) pendant un GEL posé par une autre
 *    session (`verify`, `build`) → refusée : un reçu de vérification doit couvrir un arbre stable.
 * 2. Écriture autorisée → la session est notée active (`sessions/<id>.json`) : `long-run` attend
 *    qu'elle se taise avant de geler, et ne fige pas un fichier à moitié écrit.
 * 3. Bash qui lance une commande longue → l'intention (session, heure) est posée pour que
 *    `long-run` sache quelle session tient le verrou, et donc qui a le droit d'écrire pendant le gel.
 *
 * Limite assumée : une écriture faite par Bash (`sed -i`, redirection) n'est pas vue. Le gate
 * de commit rattrape le cas : le reçu ne couvre plus l'arbre, le commit est refusé.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? join(dirname(fileURLToPath(import.meta.url)), '../..')
const DIR = process.env.LONG_RUN_DIR ?? join(ROOT, '.claude/.long-run')

const WRITE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
// Les commandes qui passent par `long-run` (scripts de package.json).
const LONG_RUN =
  /(?:^|[\s;&|])(?:pnpm|npm|yarn)\s+(?:run\s+)?(?:verify|verify:cached|build|test:e2e|ui:shots|mcp:smoke)(?![\w.-])/

const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}
const alive = (pid) => {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return e.code === 'EPERM'
  }
}
const write = (path, data) => {
  try {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(data))
  } catch {
    // Coordination best-effort : ne jamais bloquer le travail parce que l'état n'est pas écrivable.
  }
}

let raw = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (c) => (raw += c))
process.stdin.on('end', () => {
  let input
  try {
    input = JSON.parse(raw)
  } catch {
    process.exit(0)
  }
  const session = typeof input?.session_id === 'string' ? input.session_id : null
  const tool = input?.tool_name

  if (WRITE_TOOLS.has(tool)) {
    const lock = readJson(join(DIR, 'lock.json'))
    const frozen = lock?.freeze && alive(lock.pid) && Date.now() - lock.startedAt < 60 * 60_000
    if (frozen && (!session || lock.session !== session)) {
      const since = Math.round((Date.now() - lock.startedAt) / 1000)
      process.stderr.write(
        `BLOQUÉ : checkout gelé par « ${lock.task} » (${lock.session ? `session ${lock.session.slice(0, 8)}` : 'un terminal'}, depuis ${since} s). ` +
          "Une écriture maintenant invaliderait sa vérification. Attendre la fin : `node scripts/long-run.mjs wait`, " +
          'puis réessayer. Règle : CLAUDE.md § Plusieurs sessions sur le même checkout ; hook .claude/hooks/coordinate-sessions.mjs.\n'
      )
      process.exit(2)
    }
    if (lock && !alive(lock.pid)) rmSync(join(DIR, 'lock.json'), { force: true }) // verrou d'un run tué
    if (session) {
      const file = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path ?? null
      write(join(DIR, 'sessions', `${session}.json`), { session, lastWriteAt: Date.now(), lastFile: file })
    }
    process.exit(0)
  }

  if ((tool === 'Bash' || tool === 'PowerShell') && session && LONG_RUN.test(String(input?.tool_input?.command ?? ''))) {
    write(join(DIR, 'intent.json'), { session, at: Date.now() })
  }
  process.exit(0)
})
