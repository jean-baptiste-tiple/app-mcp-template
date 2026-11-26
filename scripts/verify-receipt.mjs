#!/usr/bin/env node
/**
 * verify-receipt — évite de rejouer les checks déjà passés sur un arbre inchangé.
 *
 * Le problème : `dev` termine par une vérification complète, puis `commit-push` relance
 * exactement les 4 mêmes commandes trente secondes plus tard sur le même code. Sur un projet
 * réel (tests + build), c'est plusieurs minutes perdues à chaque chantier.
 *
 * Le reçu enregistre l'empreinte exacte de l'arbre de travail au moment où les checks sont
 * passés. `commit-push` ne les rejoue que si l'empreinte a changé — donc si le code a bougé.
 *
 * Effet de bord voulu : le reçu est une PREUVE que les checks ont tourné sur CE code. Le hook
 * s'en sert pour que le marqueur ` # checks-ok` ne puisse plus être posé par réflexe sur un
 * arbre jamais vérifié.
 *
 *   node scripts/verify-receipt.mjs write [check1,check2,...] [docs] → écrit le reçu (`docs` : reçu doc)
 *   node scripts/verify-receipt.mjs check [--commit]             → exit 0 si valide, 1 sinon
 *   node scripts/verify-receipt.mjs docs-only                    → exit 0 si seule la doc diffère de HEAD
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// La racine est celle du SCRIPT, pas le cwd : le reçu doit couvrir le projet entier même quand
// la commande est lancée depuis un sous-dossier. `VERIFY_RECEIPT_ROOT` la redirige — réservé aux
// tests, qui doivent pouvoir exercer un dépôt jetable (dépôt sans commit, renommage). Sans ce
// seam, ces tests hachaient le dépôt du template et passaient sans rien vérifier.
const ROOT = process.env.VERIFY_RECEIPT_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), '..')

// `VERIFY_RECEIPT_PATH` permet aux tests d'écrire un reçu ISOLÉ. Sans ça, la suite de tests
// écrivait dans le vrai reçu un document déclarant les 4 checks passés alors que seul vitest
// avait tourné : un `pnpm test` interrompu laissait derrière lui un reçu valide, et le gate
// autorisait un commit sans que type-check ni lint n'aient jamais été lancés.
//
// Une autre racine que celle du script — un worktree visé par `cd <dir> &&` ou `git -C <dir>`,
// passé par le hook — a toujours SON reçu : l'override n'y vaut pas, sinon le reçu de test ou
// celui du checkout principal validerait un arbre qu'il n'a jamais vu (E05-S01).
const memeRacine = (a, b) => {
  const norm = (p) => (process.platform === 'win32' ? resolve(p).toLowerCase() : resolve(p))
  return norm(a) === norm(b)
}
const receiptPath = (root = ROOT) =>
  memeRacine(root, ROOT) && process.env.VERIFY_RECEIPT_PATH
    ? process.env.VERIFY_RECEIPT_PATH
    : join(root, '.claude/.verify-receipt.json')
const RECEIPT = receiptPath()
const MAX_AGE_MS = 60 * 60 * 1000 // 1 h : au-delà, l'environnement a pu bouger (deps, node)

// Documents de méthode écrits APRÈS les checks, par la finalisation puis par `commit-push` :
// changelog, sprint status, stories, ADR, registry. Aucun n'influence le type-check, le lint ni
// les tests. Sans ces exclusions, le reçu serait systématiquement invalidé par les étapes qui le
// suivent — il ne servirait alors qu'aux changements Micro, c'est-à-dire là où il ne fait rien
// gagner. Le registry en fait partie : `dev` l'écrit à l'étape 8, après `pnpm verify` (étape 6).
// Contrepartie assumée : la cohérence registry ↔ `src/components/` glisse d'un commit.
const EXCLUS = [
  /^docs\/changelog\.md$/,
  /^\.method\/sprint\//,
  /^docs\/stories\//,
  /^docs\/decisions\//,
  /^\.method\/conventions\/component-registry\.md$/,
]
const estExclu = (path) => EXCLUS.some((r) => r.test(path))

const git = (args, options = {}, root = ROOT) =>
  execFileSync(
    'git',
    // `core.quotePath=false` : sinon git échappe les noms non-ASCII en octal
    // (`"src/caf\303\251.ts"`), `hash-object` échoue sur ce chemin, le fallback renvoie une
    // constante — et TOUT fichier accentué devenait aveugle au contenu : trois versions
    // différentes produisaient la même empreinte, donc un reçu valide sur du code modifié.
    ['-c', 'core.quotePath=false', ...args],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'], // sans ça, les erreurs git polluent la sortie de `pnpm verify`
      ...options, // `input` pour `hash-object --stdin-paths`
    }
  )

/**
 * Chemins qui diffèrent de HEAD (indexés ou non, non suivis, suppressions), hors `EXCLUS`.
 * Une seule énumération, partagée par l'empreinte et par `docsOnly` : deux calculs de la liste
 * finiraient par diverger, et un reçu doc couvrirait alors un chemin que l'empreinte voit.
 */
function cheminsChanges(root) {
  const g = (args, options) => git(args, options, root)
  // Hors dépôt git, aucune empreinte n'a de sens. Le cas arrive quand le template est récupéré
  // en ZIP ou via degit, sans `git init` : `ls-files` levait alors une exception APRÈS que les
  // 4 checks soient passés, et le gate refusait ensuite tout commit en boucle.
  try {
    g(['rev-parse', '--is-inside-work-tree'])
  } catch {
    throw new Error(
      "hors d'un dépôt git — le reçu ne peut pas être calculé. Lancer `git init` (le framework " +
        'suppose un dépôt : le gate de commit et le routing du diff en dépendent).'
    )
  }

  // Un dépôt fraîchement initialisé n'a pas de HEAD : c'est le cas du premier commit d'un
  // projet issu du template. Sans ce garde, `pnpm verify` mourait sur une exception APRÈS avoir
  // passé les 4 checks, et le hook refusait ensuite le commit en boucle — sans échappement,
  // puisque `--no-verify` est bloqué.
  let head = 'sans-commit'
  try {
    head = g(['rev-parse', 'HEAD']).trim()
  } catch {
    /* dépôt sans commit : tout le contenu est « non suivi », ce qui suffit à l'empreinte */
  }

  const lines = (out) => out.split('\n').map((f) => f.trim()).filter(Boolean)

  // L'empreinte doit être INDÉPENDANTE DU STAGING : `git add` déplace un fichier de la liste
  // des non-suivis vers l'index sans changer une ligne de code. Une empreinte fondée sur la
  // sortie de `git diff` ou sur l'énumération des non-suivis changerait à ce moment-là et
  // invaliderait le reçu juste avant le commit — exactement quand on en a besoin.
  // On hache donc le CONTENU de chaque chemin concerné, quel que soit son état d'indexation.
  // `--name-status` distingue les suppressions : les hacher provoquerait une erreur git par
  // fichier et ferait dépendre le résultat d'une exception.
  const supprimes = new Set()
  const modifies = []
  // `--no-renames` : sur un rename, git n'émet qu'une ligne `R100 ancien nouveau`. En ne
  // retenant que la destination, la disparition de l'ancien chemin n'était jamais enregistrée —
  // restaurer l'ancien fichier à côté du nouveau laissait le reçu valide alors que les deux
  // coexistaient. Sans détection de rename, git émet un D et un A distincts.
  if (head !== 'sans-commit') {
    for (const line of lines(g(['diff', 'HEAD', '--name-status', '--no-renames']))) {
      const [status, path] = line.split('\t')
      if (!path) continue
      if (status.startsWith('D')) supprimes.add(path)
      else modifies.push(path)
    }
  }

  const paths = [
    ...modifies, // modifié ou ajouté, indexé ou non
    ...lines(g(['ls-files', '--others', '--exclude-standard'])), // jamais commité
  ]

  const uniques = [...new Set([...paths, ...supprimes])].filter((f) => !estExclu(f)).sort()
  return { g, head, lines, uniques, supprimes }
}

// Documentation de méthode : seul `check:framework` la lit (routing, citations, références de
// skills). Type-check, lint et tests n'en dépendent pas. Tout le reste — code, `.mjs`, `.json`,
// hooks, `package.json`, `.claude/settings.json`, un README hors racine — n'en est pas.
const DOC = [/^(?:\.method|docs|\.claude\/skills|\.claude\/agents)\/.+\.md$/, /^(?:CLAUDE|README)\.md$/]
const estDoc = (path) => DOC.some((r) => r.test(path))

/** Vrai si au moins un chemin diffère de HEAD et que tous sont de la documentation. */
export function docsOnly(root = ROOT) {
  const { uniques } = cheminsChanges(root)
  return uniques.length > 0 && uniques.every(estDoc)
}

// Pour un commit : rien ne diffère de HEAD compte aussi. Après le commit de doc, un rebase ou un
// merge ne rejoue que des commits déjà passés par le gate ; exiger un verify complet pour
// rebaser sur un `main` qui avait bougé annulait le gain du reçu doc (décision JB, 2026-11-26).
const docsOuRien = (root) => cheminsChanges(root).uniques.every(estDoc)

/**
 * Empreinte de tout ce qui est susceptible de faire échouer un check : le contenu de l'arbre
 * (blob de chaque chemin suivi ou non suivi, modifications indexées ou non comprises), hors
 * documents écrits après les checks. Indépendante de HEAD : un commit du même arbre la garde.
 */
export function worktreeHash(root = ROOT) {
  const { g, head, lines, uniques, supprimes } = cheminsChanges(root)

  // Un processus git par fichier : lent (~40 ms chacun), mais isole un chemin que git ne sait
  // pas hacher (symlink cassé, socket, permission) et le signale dans l'empreinte plutôt que de
  // faire échouer toute la vérification.
  const hashUnParUn = (paths) =>
    new Map(
      paths.map((path) => {
        try {
          return [path, g(['hash-object', '--', path]).trim()]
        } catch {
          return [path, 'illisible']
        }
      })
    )

  // Un seul processus git pour tous les fichiers : `hash-object --stdin-paths` renvoie une
  // empreinte par ligne, dans l'ordre des chemins reçus — la même empreinte que fichier par
  // fichier. Sur un arbre non commité de 40 fichiers, le processus par fichier coûtait 1,5 s par
  // empreinte, et les tests du gate, qui en enchaînent plusieurs, dépassaient leur délai
  // (E01-S01, 2026-09-23). Si git refuse un chemin, il échoue en bloc : repli fichier par fichier.
  const hashEnLot = (paths) => {
    if (!paths.length) return new Map()
    try {
      const out = g(['hash-object', '--stdin-paths'], { input: `${paths.join('\n')}\n` })
      return new Map(lines(out).map((hash, i) => [paths[i], hash]))
    } catch {
      return hashUnParUn(paths)
    }
  }

  const hashes = hashEnLot(uniques.filter((path) => !supprimes.has(path)))

  // L'empreinte porte sur le CONTENU de l'arbre (chemin → blob), pas sur HEAD + diff : un commit
  // du même arbre la laisse inchangée. Sinon le commit invalidait le reçu sans changer une ligne,
  // et le rebase sur un `main` qui avait bougé exigeait de rejouer tous les checks (2026-11-24).
  // Les fichiers inchangés depuis HEAD prennent le blob de `ls-tree`, sans rien hacher.
  const contenu = new Map()
  if (head !== 'sans-commit') {
    for (const line of lines(g(['ls-tree', '-r', '--full-tree', 'HEAD']))) {
      const [meta, path] = line.split('\t')
      if (path && !estExclu(path)) contenu.set(path, meta.split(' ')[2])
    }
  }
  for (const path of uniques) {
    if (supprimes.has(path)) contenu.delete(path)
    else contenu.set(path, hashes.get(path) ?? 'illisible')
  }
  const entries = [...contenu].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([p, h]) => `${p}:${h}`)

  return createHash('sha256').update(entries.join('\n')).digest('hex')
}

function readReceipt(path = RECEIPT) {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

/**
 * `commit` : le contrôle est fait pour un commit. Un reçu doc (`scope: "docs"`) n'est alors
 * valide que si ce qui diffère de HEAD est encore de la doc seule, ou rien : l'empreinte ne dépend
 * pas de HEAD, et après un `git reset --soft` le même arbre porte du code jamais vérifié.
 * @returns {{valid: boolean, reason: string, receipt: object|null}}
 */
export function checkReceipt(root = ROOT, { commit = false } = {}) {
  const receipt = readReceipt(receiptPath(root))
  if (!receipt) return { valid: false, reason: "aucun reçu — les checks n'ont pas été lancés", receipt: null }

  // Un reçu tronqué, vide ou daté n'importe comment affichait « reçu périmé (NaN min) » :
  // le refus était correct, le diagnostic faux — donc inactionnable.
  const at = new Date(receipt.at).getTime()
  if (typeof receipt.hash !== 'string' || !Number.isFinite(at)) {
    return { valid: false, reason: 'reçu illisible ou incomplet — relancer `pnpm verify`', receipt }
  }

  const age = Date.now() - at
  if (age < 0) {
    return { valid: false, reason: `reçu daté dans le futur (${Math.round(-age / 60000)} min) — horloge décalée ?`, receipt }
  }
  if (age > MAX_AGE_MS) {
    return { valid: false, reason: `reçu périmé (${Math.round(age / 60000)} min, limite ${MAX_AGE_MS / 60000} min)`, receipt }
  }

  let current
  try {
    current = worktreeHash(root)
  } catch (error) {
    return { valid: false, reason: `empreinte de l'arbre illisible : ${error.message}`, receipt }
  }
  if (current !== receipt.hash) {
    return { valid: false, reason: 'le code a changé depuis les derniers checks', receipt }
  }
  if (commit && receipt.scope === 'docs' && !docsOuRien(root)) {
    return {
      valid: false,
      reason: 'reçu doc seule (check:framework), mais le commit touche autre chose que la documentation — lancer `pnpm verify`',
      receipt,
    }
  }
  return { valid: true, reason: `checks déjà passés il y a ${Math.max(1, Math.round(age / 60000))} min sur ce code`, receipt }
}

// Ce module est aussi importé par le hook git-gate : sans ce garde, l'import exécuterait la
// partie CLI ci-dessous, afficherait « usage » et sortirait en erreur.
const executeDirectement =
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])

if (!executeDirectement) {
  // rien : les fonctions exportées suffisent
} else runCli()

function runCli() {
const [, , command, checksArg, scopeArg] = process.argv

if (command === 'write') {
  const checks = (checksArg ?? 'check:framework,type-check,lint,test').split(',').map((c) => c.trim())
  try {
    // Un reçu doc ne s'écrit que sur un arbre de doc seule : sinon il attesterait du code que
    // seul `check:framework` a vu.
    if (scopeArg === 'docs' && !docsOnly()) throw new Error("l'arbre ne diffère pas de HEAD que par de la documentation")
    const scope = scopeArg === 'docs' ? { scope: 'docs' } : {}
    writeFileSync(
      RECEIPT,
      JSON.stringify({ hash: worktreeHash(), checks, ...scope, at: new Date().toISOString() }, null, 2) + '\n'
    )
  } catch (error) {
    // Échouer proprement plutôt que sur une stack Node : ce point du script est atteint APRÈS
    // que les 4 checks sont passés, et l'utilisateur doit comprendre pourquoi le gate le
    // refusera ensuite.
    console.error(`Reçu NON écrit — ${error.message}`)
    process.exit(1)
  }
  console.log(`Reçu écrit — ${checks.join(', ')}`)
} else if (command === 'docs-only') {
  let ok
  try {
    ok = docsOnly()
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
  console.log(ok ? 'Documentation seule : check:framework suffit.' : 'Pas de la documentation seule (ou aucun changement).')
  process.exit(ok ? 0 : 1)
} else if (command === 'check') {
  const { valid, reason, receipt } = checkReceipt(ROOT, { commit: checksArg === '--commit' })
  if (valid) {
    console.log(`✔  ${reason} : ${receipt.checks.join(', ')}. Inutile de les rejouer.`)
    process.exit(0)
  }
  console.log(`→  Checks à lancer : ${reason}.`)
  process.exit(1)
} else if (command === 'clear') {
  if (existsSync(RECEIPT)) unlinkSync(RECEIPT)
} else {
  console.error('usage: verify-receipt.mjs write|check|docs-only|clear')
  process.exit(2)
}
}
