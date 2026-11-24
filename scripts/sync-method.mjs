#!/usr/bin/env node
/**
 * sync-method — porte la méthode du template vers un projet dérivé.
 *
 * Les projets dérivés ont été copiés sans historique git : ils ne peuvent pas « tirer » le
 * template. Ce script compare la part du template (`.method/sync-manifest.json`) au dépôt cible :
 * - `owned` : le template fait foi. Un fichier que le projet n'a pas touché depuis la dernière
 *   synchro (empreinte notée dans `.method/sync-state.json`) se remplace sans risque ; un fichier
 *   modifié par le projet ne s'écrase qu'avec `--take <chemin>` explicite.
 * - `merge` : contenu mixte (CLAUDE.md, _index.md…), jamais écrit, sauf s'il est « sans part
 *   projet » (aucune ligne propre au dérivé) et cité par `--take`. Le rapport dit ce que le
 *   template a ajouté ; la fusion reste manuelle.
 *
 *   node scripts/sync-method.mjs <dépôt-cible>                  rapport seul, rien n'est écrit
 *   node scripts/sync-method.mjs <dépôt-cible> --apply [--take <chemin>]... [--exclude <chemin>]...
 *     (`--take` et `--exclude` impliquent `--apply`)
 *   node scripts/sync-method.mjs <dépôt-cible> --diff <chemin>...  diff template → cible, rien n'est écrit
 *
 * Aucune dépendance : il voyage avec la méthode (il est lui-même `owned`).
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { analyserMerge, MERGE_SANS_PART, texte } from './sync-method-merge.mjs'

export const MANIFESTE = '.method/sync-manifest.json'
export const TAMPON = '.method/sync-state.json'
const IGNORES = new Set(['node_modules', '.git', '.next'])

export const STATUTS = {
  nouveau: 'nouveau',
  identique: 'identique',
  sur: 'à jour sûr',
  modifie: 'modifié par le projet',
  revu: 'modifié par le projet, template inchangé',
  retire: 'retiré du template',
  propre: 'propre au projet',
  exclu: 'exclu par le projet',
  doublon: 'doublon à supprimer à la main',
}

const PLAYWRIGHT = '@playwright/test'

// ------------------------------------------------------------------ globs (sans dépendance)
/** `a/{x,y}/b` → [`a/x/b`, `a/y/b`] (accolades non imbriquées : seul usage du manifeste). */
export function developperAccolades(glob) {
  const m = /\{([^{}]*)\}/.exec(glob)
  if (!m) return [glob]
  const avant = glob.slice(0, m.index)
  const apres = glob.slice(m.index + m[0].length)
  return m[1].split(',').flatMap((alt) => developperAccolades(avant + alt + apres))
}

const JOKERS = { '**/': '(?:.*/)?', '**': '.*', '*': '[^/]*', '?': '[^/]' }
const versRegex = (glob) =>
  new RegExp(`^${glob.replace(/\*\*\/|\*\*|\*|\?|[.+^$()|[\]\\]/g, (t) => JOKERS[t] ?? `\\${t}`)}$`)

/** Dossier littéral d'un glob, `/` final compris : `docs/decisions/ADR-*.md` → `docs/decisions/`. */
function base(glob) {
  const avant = glob.split(/[*?{]/)[0]
  return avant.slice(0, avant.lastIndexOf('/') + 1)
}

function lister(root, dir, out = []) {
  const abs = join(root, dir)
  if (!existsSync(abs) || !statSync(abs).isDirectory()) return out
  for (const e of readdirSync(abs)) {
    if (IGNORES.has(e)) continue
    const rel = dir + e
    if (statSync(join(root, rel)).isDirectory()) lister(root, `${rel}/`, out)
    else out.push(rel)
  }
  return out
}

/** Chemins relatifs (POSIX) de `root` qui matchent `glob`. */
export function fichiersDuGlob(root, glob) {
  return developperAccolades(glob).flatMap((g) => {
    const re = versRegex(g)
    return lister(root, base(g)).filter((p) => re.test(p))
  })
}

// ------------------------------------------------------------------ manifeste et contenus
export function lireManifeste(root) {
  const brut = JSON.parse(readFileSync(join(root, MANIFESTE), 'utf8'))
  const owned = (brut.owned ?? []).map((e) => (typeof e === 'string' ? { glob: e, dest: null } : e))
  return { owned, merge: brut.merge ?? [] }
}

/**
 * Manifeste mort (check:framework) : un glob `owned` qui ne matche plus rien ne synchronise plus
 * rien, en silence ; une convention du template absente du manifeste n'atteint jamais un dérivé.
 * Chaque alternative d'accolades est contrôlée seule : `{a,b}` avec `b` supprimé reste mort pour `b`.
 */
export function verifierManifeste(root, err) {
  if (!existsSync(join(root, MANIFESTE))) return
  const { owned, merge } = lireManifeste(root)
  for (const { glob } of owned) {
    for (const g of developperAccolades(glob)) {
      if (fichiersDuGlob(root, g).length === 0) err(`${MANIFESTE} : le glob owned \`${g}\` ne matche aucun fichier du template.`)
    }
  }
  for (const p of merge) {
    if (!existsSync(join(root, p))) err(`${MANIFESTE} : le fichier merge \`${p}\` n'existe pas dans le template.`)
  }
  const couverts = new Set([...owned.flatMap(({ glob }) => fichiersDuGlob(root, glob)), ...merge])
  for (const p of fichiersDuGlob(root, '.method/conventions/*.md')) {
    if (!couverts.has(p)) err(`${MANIFESTE} : \`${p}\` n'est ni owned ni merge — il n'atteindra aucun projet dérivé.`)
  }
  verifierCitations(root, owned, couverts, err)
}

/**
 * Un document qui voyage (owned ou merge) ne cite pas un chemin qui n'existe que dans le
 * template : le manifeste n'est pas copié, et un fichier owned à `dest` (ADR) change de dossier.
 * Le dérivé y lirait un chemin mort, et son `check:framework` échoue sur CLAUDE.md.
 */
function verifierCitations(root, owned, couverts, err) {
  const seuls = [MANIFESTE, ...owned.filter(({ dest }) => dest).flatMap(({ glob }) => fichiersDuGlob(root, glob))]
  for (const p of [...couverts].filter((f) => f.endsWith('.md') && existsSync(join(root, f)))) {
    const src = readFileSync(join(root, p), 'utf8')
    for (const s of seuls) {
      if (src.includes(s)) err(`${p} : cite \`${s}\`, absent des projets dérivés — citer le nom seul (ADR-001, « le manifeste du template »).`)
    }
  }
}

/** Chemin dans le dérivé : `dest` remplace le dossier littéral du glob (ADR → `docs/decisions/socle/`). */
const versCible = ({ glob, dest }, chemin) => (dest ? dest + chemin.slice(base(glob).length) : chemin)
const globCible = ({ glob, dest }) => (dest ? dest + glob.slice(base(glob).length) : glob)

// Dépôts sous Windows (autocrlf) : un fichier identique au CRLF près est identique.
function normalise(buf) {
  return buf.includes(0) ? buf : Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'))
}
export const empreinte = (buf) => createHash('sha256').update(normalise(buf)).digest('hex')

function lireTampon(cible) {
  const p = join(cible, TAMPON)
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : { files: {}, exclude: [] }
}

// ------------------------------------------------------------------ analyse des fichiers owned
function statutOwned(srcHash, cible, dest, tampon) {
  const abs = join(cible, dest)
  if (!existsSync(abs)) return { statut: STATUTS.nouveau }
  const h = empreinte(readFileSync(abs))
  if (h === srcHash) return { statut: STATUTS.identique }
  if (tampon.files?.[dest] === h) return { statut: STATUTS.sur }
  // Version du template contre laquelle le projet a gardé sa part (`bases`, noté à l'--apply) :
  // tant que le template n'a pas bougé, il n'y a rien à refusionner (44 fichiers dans bo-my).
  return { statut: tampon.bases?.[dest] === srcHash ? STATUTS.revu : STATUTS.modifie }
}

/**
 * Un fichier exclu (`--exclude`, noté dans le tampon) n'est plus jamais écrit. Un fichier de la
 * cible sous un glob owned sans équivalent dans le template n'est « retiré du template » que si
 * une synchro précédente l'a noté : sinon c'est le projet qui l'a ajouté (checklist, starter).
 */
export function analyserOwned(template, cible, manifeste, { tampon, exclus }) {
  const lignes = []
  for (const entree of manifeste.owned) {
    const attendus = new Set()
    for (const src of fichiersDuGlob(template, entree.glob)) {
      const dest = versCible(entree, src)
      attendus.add(dest)
      const hash = empreinte(readFileSync(join(template, src)))
      const statut = exclus.has(dest) ? { statut: STATUTS.exclu } : statutOwned(hash, cible, dest, tampon)
      lignes.push({ src, dest, hash, ...statut })
    }
    for (const dest of fichiersDuGlob(cible, globCible(entree))) {
      if (attendus.has(dest)) continue
      lignes.push({ src: null, dest, statut: tampon.files?.[dest] ? STATUTS.retire : STATUTS.propre })
    }
    if (entree.dest) lignes.push(...doublons(template, cible, entree))
  }
  return lignes
}

/**
 * Copie d'origine laissée à l'ancien chemin d'un fichier owned à `dest` (ADR directement sous
 * `docs/decisions/` alors que le template l'écrit sous `socle/`) : même contenu, CRLF normalisé.
 * Jamais supprimée par le script ; un contenu différent est une part du projet, non signalée.
 */
function doublons(template, cible, entree) {
  const memeContenu = (src) => empreinte(readFileSync(join(cible, src))) === empreinte(readFileSync(join(template, src)))
  return fichiersDuGlob(template, entree.glob)
    .filter((src) => existsSync(join(cible, src)) && memeContenu(src))
    .map((src) => ({ src: null, dest: src, copieDe: versCible(entree, src), statut: STATUTS.doublon }))
}

/**
 * Diff unifié template → cible d'un fichier owned ou merge, CRLF normalisé : les deux côtés sont
 * recopiés normalisés dans un dossier temporaire, sinon chaque ligne d'un dépôt autocrlf diffère.
 */
export function diffUnifie(template, cible, src, dest) {
  const tmp = mkdtempSync(join(tmpdir(), 'sync-method-diff-'))
  const cote = (nom, root, p) => {
    mkdirSync(dirname(join(tmp, nom, dest)), { recursive: true })
    writeFileSync(join(tmp, nom, dest), existsSync(join(root, p)) ? texte(root, p) : '')
  }
  try {
    cote('template', template, src)
    cote('cible', cible, dest)
    const args = ['diff', '--no-index', '--no-color', '--no-prefix', `template/${dest}`, `cible/${dest}`]
    execFileSync('git', args, { cwd: tmp, stdio: 'pipe' })
    return `${dest} : identique au template (CRLF normalisé)`
  } catch (e) {
    return String(e.stdout ?? '') || `${dest} : diff impossible (${e.message})`
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

// ------------------------------------------------------------------ écriture
function commitDuTemplate(template) {
  try {
    return execFileSync('git', ['-C', template, 'rev-parse', 'HEAD'], { stdio: 'pipe' }).toString().trim()
  } catch {
    return 'inconnu (template hors git)'
  }
}

/**
 * Écrit `nouveau`, `à jour sûr`, les `modifié par le projet` et les `merge sans part projet`
 * cités par `--take` ; jamais un autre fichier merge. Le tampon note l'empreinte de chaque fichier owned désormais égal au template ;
 * un fichier modifié laissé en place garde son empreinte précédente, pour qu'un retour du projet
 * à l'état synchronisé redevienne « à jour sûr ». `bases` note, pour chaque fichier modifié laissé
 * en place, la version du template à laquelle il a été confronté : `--apply` vaut « diffs lus ».
 */
export function appliquer(template, cible, lignes, { takes, exclus, merge = [] }) {
  const ancien = lireTampon(cible)
  const files = {}
  const bases = {}
  const ecrits = []
  for (const l of lignes) {
    if (!l.src || l.statut === STATUTS.exclu) continue
    const modifie = l.statut === STATUTS.modifie || l.statut === STATUTS.revu
    const ecrire = l.statut === STATUTS.nouveau || l.statut === STATUTS.sur || (modifie && takes.has(l.dest))
    if (ecrire) {
      mkdirSync(dirname(join(cible, l.dest)), { recursive: true })
      writeFileSync(join(cible, l.dest), readFileSync(join(template, l.src)))
      ecrits.push(l.dest)
    }
    if (ecrire || l.statut === STATUTS.identique) files[l.dest] = l.hash
    else if (ancien.files?.[l.dest]) files[l.dest] = ancien.files[l.dest]
    if (!ecrire && modifie) bases[l.dest] = l.hash
  }
  for (const m of merge) {
    if (m.statut !== MERGE_SANS_PART || !takes.has(m.chemin)) continue
    writeFileSync(join(cible, m.chemin), readFileSync(join(template, m.chemin)))
    ecrits.push(m.chemin)
  }
  const nom = JSON.parse(readFileSync(join(template, 'package.json'), 'utf8')).name
  const meta = { template: nom, commit: commitDuTemplate(template), date: new Date().toISOString() }
  const tampon = { ...meta, exclude: [...exclus].sort(), files, bases }
  writeFileSync(join(cible, TAMPON), `${JSON.stringify(tampon, null, 2)}\n`)
  return ecrits
}

// ------------------------------------------------------------------ CLI
function lireArgs(argv) {
  const args = { cible: null, apply: false, takes: new Set(), excludes: new Set(), diffs: new Set() }
  const listes = { '--take': args.takes, '--exclude': args.excludes, '--diff': args.diffs }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--apply') args.apply = true
    else if (listes[argv[i]] && argv[i + 1]) listes[argv[i]].add(argv[++i].replaceAll('\\', '/'))
    else if (argv[i].startsWith('-') || args.cible) return { erreur: `argument inattendu : ${argv[i]}` }
    else args.cible = resolve(argv[i])
  }
  if (!args.cible) return { erreur: 'dépôt cible manquant' }
  if (args.takes.size || args.excludes.size) args.apply = true
  if (args.diffs.size && args.apply) return { erreur: '--diff n’écrit rien : il ne se combine ni avec --apply, ni avec --take, ni avec --exclude' }
  const lesDeux = [...args.takes].filter((t) => args.excludes.has(t))
  if (lesDeux.length) return { erreur: `--take et --exclude sur le même fichier : ${lesDeux.join(', ')}` }
  return args
}

function imprimer(cible, owned, merge) {
  const ordre = [STATUTS.nouveau, STATUTS.sur, STATUTS.modifie, STATUTS.exclu, STATUTS.retire, STATUTS.propre, STATUTS.doublon]
  for (const statut of ordre) {
    const liste = owned.filter((l) => l.statut === statut)
    if (!liste.length) continue
    console.log(`\n## ${statut} (${liste.length})`)
    for (const l of liste) {
      const origine = l.copieDe ? `  (même contenu que ${l.copieDe})` : l.src && l.src !== l.dest ? `  ← ${l.src}` : ''
      console.log(`  ${l.dest}${origine}`)
    }
  }
  console.log(`\n## identique (${owned.filter((l) => l.statut === STATUTS.identique).length}) : non listés`)
  const revus = owned.filter((l) => l.statut === STATUTS.revu).length
  if (revus) console.log(`## ${STATUTS.revu} (${revus}) : non listés, rien à refusionner depuis la dernière synchro`)
  console.log('\n## fichiers merge (jamais écrits : fusion manuelle)')
  for (const m of merge) {
    console.log(`  ${m.chemin} : ${m.statut}${m.stat ? ` (${m.stat})` : ''}`)
    for (const a of m.ajouts) console.log(`      + ${a}`)
    if (m.stat) console.log(`      diff : node scripts/sync-method.mjs "${cible}" --diff ${m.chemin}`)
    if (m.statut === MERGE_SANS_PART) console.log(`      aucune ligne propre au projet : --take ${m.chemin} écrit la version du template`)
  }
}

function resume(owned, merge) {
  const n = (s) => owned.filter((l) => l.statut === s).length
  const differents = merge.filter((m) => m.statut.startsWith('différent') || m.statut.startsWith('absent')).length
  return (
    `owned : ${owned.length - n(STATUTS.doublon)} — nouveau ${n(STATUTS.nouveau)}, identique ${n(STATUTS.identique)}, ` +
    `à jour sûr ${n(STATUTS.sur)}, modifié par le projet ${n(STATUTS.modifie)} (+${n(STATUTS.revu)} template inchangé), exclu ${n(STATUTS.exclu)}, ` +
    `retiré du template ${n(STATUTS.retire)}, propre au projet ${n(STATUTS.propre)}, doublon à supprimer ${n(STATUTS.doublon)} · ` +
    `merge : ${merge.length} — à fusionner ${differents}, sans part projet ${merge.filter((m) => m.statut === MERGE_SANS_PART).length}`
  )
}

function main() {
  const template = join(dirname(fileURLToPath(import.meta.url)), '..')
  const args = lireArgs(process.argv.slice(2))
  const usage = 'Usage : node scripts/sync-method.mjs <dépôt-cible> [--apply] [--take <chemin>]... [--exclude <chemin>]... | --diff <chemin>...'
  if (args.erreur) return sortir(`✖  ${args.erreur}\n${usage}`)
  if (!existsSync(join(template, MANIFESTE))) return sortir(`✖  ${MANIFESTE} absent : ce script se lance depuis le template.`)
  if (!existsSync(join(args.cible, '.method'))) return sortir(`✖  ${args.cible} n'est pas un dépôt de la méthode (pas de .method/).`)
  if (resolve(args.cible) === resolve(template)) return sortir('✖  la cible est le template lui-même.')

  const manifeste = lireManifeste(template)
  const tampon = lireTampon(args.cible)
  const exclus = new Set([...(tampon.exclude ?? []), ...args.excludes])
  const owned = analyserOwned(template, args.cible, manifeste, { tampon, exclus })
  const merge = analyserMerge(template, args.cible, manifeste)
  const erreur = controlerChemins(args, owned, manifeste, merge)
  if (erreur) return sortir(`✖  ${erreur}`)
  if (args.diffs.size) return afficherDiffs(template, args, owned)
  const modifies = new Set(owned.filter((l) => l.statut === STATUTS.modifie).map((l) => l.dest))

  console.log(`Synchro de la méthode : ${template} → ${args.cible}${args.apply ? '' : ' (rapport seul, rien n’est écrit)'}`)
  imprimer(args.cible, owned, merge)
  console.log(`\nRésumé : ${resume(owned, merge)}`)
  if (args.apply) {
    const ecrits = appliquer(template, args.cible, owned, { takes: args.takes, exclus, merge })
    const laisses = [...modifies].filter((d) => !args.takes.has(d)).length
    console.log(`Appliqué : ${ecrits.length} fichier(s) écrit(s), ${laisses} modifié(s) par le projet laissé(s) en place, tampon ${TAMPON} écrit.`)
  }
  if (versionPlaywright(template) !== versionPlaywright(args.cible)) {
    console.log(`Après une montée de Playwright : \`pnpm exec playwright install chromium\` (${PLAYWRIGHT} diffère entre template et dérivé).`)
  }
}

/** Version déclarée de `@playwright/test` : une montée exige de retélécharger le navigateur. */
function versionPlaywright(root) {
  const p = join(root, 'package.json')
  if (!existsSync(p)) return undefined
  const pkg = JSON.parse(readFileSync(p, 'utf8'))
  return pkg.devDependencies?.[PLAYWRIGHT] ?? pkg.dependencies?.[PLAYWRIGHT]
}

/** `--take`, `--exclude` et `--diff` ne visent que des fichiers que le script connaît. */
function controlerChemins(args, owned, manifeste, merge) {
  const parStatut = (s) => new Set(owned.filter((l) => l.statut === s).map((l) => l.dest))
  const duTemplate = new Set(owned.filter((l) => l.src).map((l) => l.dest))
  const sansPart = merge.filter((m) => m.statut === MERGE_SANS_PART).map((m) => m.chemin)
  const regles = [
    [args.takes, new Set([...parStatut(STATUTS.modifie), ...parStatut(STATUTS.revu), ...sansPart]), '--take sur un fichier ni « modifié par le projet » ni « merge sans part projet »'],
    [args.excludes, duTemplate, '--exclude sur un fichier que le template ne fournit pas'],
    [args.diffs, new Set([...duTemplate, ...manifeste.merge]), '--diff sur un fichier ni owned ni merge'],
  ]
  for (const [demandes, admis, message] of regles) {
    const hors = [...demandes].filter((p) => !admis.has(p))
    if (hors.length) return `${message} : ${hors.join(', ')}`
  }
  return null
}

function afficherDiffs(template, args, owned) {
  for (const dest of args.diffs) {
    const src = owned.find((l) => l.dest === dest && l.src)?.src ?? dest
    console.log(diffUnifie(template, args.cible, src, dest))
  }
}

function sortir(message) {
  console.error(message)
  process.exitCode = 1
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main()
