#!/usr/bin/env node
/**
 * check-framework — cohérence interne du framework.
 *
 * Ce que ça empêche : que le framework pourrisse en silence. Un tag sans fichier de
 * conventions, un skill pointant vers un fichier disparu, une commande `/xxx` citée dans la
 * doc mais inexistante, un glob qui ne matche plus rien après une réorganisation de `src/`,
 * une section citée en review qui n'existe plus — autant de cas où Claude lit une instruction
 * fausse et agit dessus sans que rien ne le signale.
 *
 * Lancé par `pnpm check:framework`, étape 1 du skill commit-push.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifierInvariants } from './check-framework-invariants.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CONV = join(ROOT, '.method/conventions')
const SKILLS = join(ROOT, '.claude/skills')
const CHECKLISTS = join(ROOT, '.method/checklists')
const INDEX = join(CONV, '_index.md')

const errors = []
const warnings = []
const err = (m) => errors.push(m)
const warn = (m) => warnings.push(m)

// CRLF normalisés : sous Windows (autocrlf), les fichiers arrivent en \r\n et toute regex
// ancrée sur \n (frontmatter des skills, notamment) ne matchait plus rien — 8 faux « absent ».
const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const walk = (dir, out = []) => {
  for (const e of readdirSync(dir)) {
    if (['node_modules', '.git', '.next', 'dist', 'coverage'].includes(e)) continue
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    // Séparateurs POSIX : toutes les comparaisons du checker (exclusions, registry ↔ src/,
    // dédup de routes) sont écrites en `/` — en `\` elles échouaient toutes sous Windows.
    else out.push(p.replaceAll('\\', '/'))
  }
  return out
}

if (!existsSync(INDEX)) {
  err('.method/conventions/_index.md est absent — le routing par tags est mort.')
  report()
}

const indexSrc = read(INDEX)
const BASE_CONVENTIONS = ['coding-standards.md']
const WORKFLOW_SKILLS = ['dev', 'design', 'plan', 'revue', 'verify', 'wrap-up', 'commit-push']
const STANDALONE_SKILLS = ['conventions', 'audit']

// ------------------------------------------------- 1. parsing de _index.md
// Parsing par NOM DE COLONNE, pas par position : ajouter une colonne au tableau ne doit pas
// décaler silencieusement la lecture des globs et tuer tout le routing sans un mot.
const tableLines = indexSrc.split('\n')
const headerIdx = tableLines.findIndex((l) => /^\|\s*Tag\s*\|/i.test(l))
if (headerIdx < 0) {
  err('_index.md : en-tête du tableau des tags introuvable (colonne `Tag` attendue).')
  report()
}
const columns = tableLines[headerIdx]
  .split('|')
  .slice(1, -1)
  .map((c) => c.trim().toLowerCase())
const COL = {
  tag: columns.indexOf('tag'),
  file: columns.indexOf('fichier'),
  globs: columns.indexOf('globs'),
}
for (const [name, idx] of Object.entries(COL)) {
  if (idx < 0) err(`_index.md : colonne « ${name} » absente de l'en-tête du tableau.`)
}
if (errors.length) report()

/** @type {{tag:string, file:string, globs:string[]}[]} */
const tags = []
for (const line of tableLines.slice(headerIdx + 2)) {
  // Un tableau markdown se termine à la première ligne qui n'en fait pas partie. Sans ce
  // `break`, le contrôle de colonnes mordait sur les tableaux suivants du fichier.
  if (!line.startsWith('|')) break
  if (/^\|[\s|:-]+\|$/.test(line)) continue
  const cells = line.split('|').slice(1, -1)
  // Une ligne au mauvais nombre de colonnes était ignorée EN SILENCE : ajouter une colonne à
  // l'en-tête sans la propager à toutes les lignes faisait disparaître 23 tags sur 24, exit 0.
  // Le parsing par nom protège de l'ajout cohérent, pas de l'ajout partiel.
  if (cells.length !== columns.length) {
    err(
      `_index.md : ligne « ${line.slice(0, 60).trim()}… » a ${cells.length} colonne(s) pour ` +
        `${columns.length} en en-tête — elle serait ignorée en silence, donc son tag ne routerait plus.`
    )
    continue
  }
  const tag = cells[COL.tag].trim().replace(/`/g, '')
  const file = cells[COL.file].trim().replace(/`/g, '')
  if (!tag || !file) continue
  if (!/^[a-z0-9-]+$/.test(tag)) {
    err(`_index.md : tag « ${tag} » — seuls [a-z0-9-] sont admis (sinon il est ignoré en silence).`)
    continue
  }
  if (!/^[a-z0-9.-]+\.md$/.test(file)) {
    err(`_index.md : tag \`${tag}\` — fichier « ${file} » invalide (nom .md sans sous-dossier attendu).`)
    continue
  }
  tags.push({ tag, file, globs: [...cells[COL.globs].matchAll(/`([^`]+)`/g)].map((g) => g[1]) })
}

if (tags.length === 0) err('_index.md : aucune ligne de tag parsée — le format du tableau a changé.')

const seen = new Set()
for (const { tag } of tags) {
  if (seen.has(tag)) err(`_index.md : tag \`${tag}\` déclaré deux fois — seule la première ligne est routée.`)
  seen.add(tag)
}

// ------------------------------------------- 2. tags → fichiers et globs vivants
for (const { tag, file, globs } of tags) {
  if (!existsSync(join(CONV, file))) err(`_index.md : tag \`${tag}\` pointe vers ${file} qui n'existe pas.`)
  if (globs.length === 0) err(`_index.md : tag \`${tag}\` n'a aucun glob — il ne sera jamais routé automatiquement.`)
}

// Un glob dont le préfixe littéral ne correspond à rien sur le disque ne matchera jamais :
// c'est ce qui arrive quand `src/lib/actions/` devient `src/features/*/actions/`. Le routing
// meurt en silence et plus aucune convention ne se charge.
const PROSPECTIFS = /## Capacités non installées([\s\S]*?)(?=\n## |$)/.exec(indexSrc)?.[1] ?? ''
const tagsProspectifs = new Set([...PROSPECTIFS.matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]))

for (const { tag, globs } of tags) {
  if (tagsProspectifs.has(tag)) continue
  const morts = globs.filter((g) => {
    const prefix = g.split(/[*?[]/)[0]
    const dir = prefix.endsWith('/') ? prefix.slice(0, -1) : dirname(prefix)
    if (!dir || dir === '.') return false
    return !existsSync(join(ROOT, dir))
  })
  if (morts.length === globs.length) {
    err(
      `_index.md : tag \`${tag}\` — aucun de ses globs ne peut matcher (${morts.join(', ')}). ` +
        `Corriger les chemins, ou déclarer le tag sous « ## Capacités non installées ».`
    )
  } else if (morts.length) {
    warn(`_index.md : tag \`${tag}\` — glob(s) sans dossier correspondant : ${morts.join(', ')}`)
  }
}

// ---------------------------------------------- 3. conventions orphelines
const declaredFiles = new Set([...tags.map((t) => t.file), ...BASE_CONVENTIONS])
for (const f of readdirSync(CONV)) {
  if (!f.endsWith('.md') || f === '_index.md') continue
  if (!declaredFiles.has(f)) warn(`Convention orpheline : ${f} n'est référencée par aucun tag de _index.md.`)
}
for (const f of BASE_CONVENTIONS) {
  if (!existsSync(join(CONV, f))) err(`Convention de base manquante : ${f}`)
}

// Un fichier de conventions trop long n'est plus lu en entier, il est survolé — et la
// dégradation est invisible. Le seuil force l'élagage ou la scission.
const MAX_LINES = 400
for (const f of readdirSync(CONV)) {
  if (!f.endsWith('.md')) continue
  const n = read(join(CONV, f)).split('\n').length
  if (n > MAX_LINES) err(`${f} : ${n} lignes (max ${MAX_LINES}). À élaguer ou scinder — au-delà, la lecture « en entier » devient une fiction.`)
}

// ------------------------------------------------------------- 4. skills
const skillDirs = readdirSync(SKILLS).filter((d) => statSync(join(SKILLS, d)).isDirectory())

for (const dir of skillDirs) {
  const file = join(SKILLS, dir, 'SKILL.md')
  if (!existsSync(file)) {
    err(`Skill ${dir} : SKILL.md manquant.`)
    continue
  }
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(read(file))
  if (!fm) {
    err(`Skill ${dir} : frontmatter absent — le skill ne se déclenchera jamais automatiquement.`)
    continue
  }
  const name = /^name:\s*(.+)$/m.exec(fm[1])?.[1].trim()
  const desc = /^description:\s*(.+)$/m.exec(fm[1])?.[1].trim()
  if (name !== dir) err(`Skill ${dir} : \`name: ${name}\` ne correspond pas au dossier.`)
  if (!desc) err(`Skill ${dir} : \`description\` absente — le déclenchement automatique repose dessus.`)
  else if (desc.replace(/^["']|["']$/g, '').length < 40)
    warn(`Skill ${dir} : description très courte (${desc.length} car.) — déclenchement peu fiable.`)

  if (![...WORKFLOW_SKILLS, ...STANDALONE_SKILLS].includes(dir)) {
    err(`Skill ${dir} : inconnu. Les skills sont les 7 de workflow + ${STANDALONE_SKILLS.join(', ')} ; le routing des conventions passe par les globs de _index.md, pas par un skill par tag.`)
  }
}
for (const s of [...WORKFLOW_SKILLS, ...STANDALONE_SKILLS]) {
  if (!skillDirs.includes(s)) err(`Skill manquant : ${s}`)
}

// Sous-agents : un skill qui lance `subagent_type: "x"` sans `.claude/agents/x.md` retombe sur
// l'agent généraliste, sans erreur — le designer ou le critique disparaîtrait en silence. Et un
// agent qu'aucun skill ne lance n'est plus maintenu par personne : il dérive comme une checklist
// orpheline.
const AGENTS = join(ROOT, '.claude/agents')
const agentsCites = new Set()
for (const dir of skillDirs) {
  const file = join(SKILLS, dir, 'SKILL.md')
  if (!existsSync(file)) continue
  for (const m of read(file).matchAll(/subagent_type:\s*"([\w-]+)"/g)) {
    agentsCites.add(m[1])
    const agentFile = join(AGENTS, `${m[1]}.md`)
    if (!existsSync(agentFile)) {
      err(`Skill ${dir} : sous-agent \`${m[1]}\` sans .claude/agents/${m[1]}.md.`)
      continue
    }
    const fm = /^---\n([\s\S]*?)\n---\n/.exec(read(agentFile))
    const name = fm && /^name:\s*(.+)$/m.exec(fm[1])?.[1].trim()
    if (name !== m[1]) err(`.claude/agents/${m[1]}.md : \`name\` absent ou différent du fichier — le sous-agent ne sera pas trouvé.`)
  }
}
for (const f of existsSync(AGENTS) ? readdirSync(AGENTS) : []) {
  const agent = f.replace(/\.md$/, '')
  if (f.endsWith('.md') && !agentsCites.has(agent)) {
    err(`Agent orphelin : .claude/agents/${f} n'est lancé par aucun skill (\`subagent_type: "${agent}"\`).`)
  }
}

// ------------------------------------- 5. commandes / skills / checklists référencés
const KNOWN_SLASH = new Set(skillDirs)

// Noms de skills supprimés ou renommés. Une référence qui subsiste dans la doc pointe vers une
// commande qui n'existe plus : c'est le mode de dérive le plus courant après un renommage.
const SLASH_OBSOLETES = [
  'tm-dev', 'tm-plan', 'tm-review', 'tm-verify', 'tm-wrap-up',
  'tm-fix', 'tm-feature', 'tm-sprint', 'tm-status', 'tm-evolve', 'tm-gate',
]
const mdFiles = walk(ROOT).filter((p) => p.endsWith('.md') && !p.includes('/docs/changelog.md'))

for (const p of mdFiles) {
  const rel = p.slice(ROOT.length + 1)
  const src = read(p)
  // Le lookbehind excluait le backtick — or la doc écrit ces commandes EXCLUSIVEMENT entre
  // backticks. Le contrôle ne pouvait donc jamais se déclencher : il coûtait de la lecture sans
  // rien attraper. On n'exclut plus que ce qui fait d'un `/xxx` un chemin, pas une commande.
  const motif = new RegExp(`(?<![\\w/~])\\/(${[...KNOWN_SLASH, ...SLASH_OBSOLETES].join('|')})\\b`, 'g')
  for (const m of src.matchAll(motif)) {
    if (!KNOWN_SLASH.has(m[1])) err(`${rel} : référence \`/${m[1]}\` qui n'existe pas dans .claude/skills/.`)
  }
}

// Une checklist que rien n'appelle dérive sans que personne le voie : c'est exactement ce qui
// est arrivé à story-done.md, resté sur une structure de review supprimée depuis.
const checklistRefs = mdFiles
  .filter((p) => !p.includes('/.method/checklists/'))
  .map((p) => read(p))
  .join('\n')
for (const f of existsSync(CHECKLISTS) ? readdirSync(CHECKLISTS) : []) {
  if (f.endsWith('.md') && !checklistRefs.includes(f)) {
    err(`Checklist orpheline : .method/checklists/${f} n'est appelée par aucun skill ni convention.`)
  }
}

// ------------------------------- 6. sections citées (`fichier.md § Section`)
// La gravité HAUTE/MOYENNE d'une review repose sur une citation. Si la section a été renommée,
// le blocage s'appuie sur une référence fantôme.
// Les 4 formes de citation qui font foi en review sont `conventions/x.md § S`,
// `CLAUDE.md § S`, `checklists/code-review.md § S` et un AC de story. Seule la première était
// indexée : les deux autres formes vérifiables passaient sans contrôle.
const headingsByFile = new Map()
const indexerTitres = (nom, chemin) => {
  if (!existsSync(chemin)) return
  headingsByFile.set(
    nom,
    [...read(chemin).matchAll(/^#{2,4}\s+(.+)$/gm)].map((m) => norm(m[1]))
  )
}
for (const f of readdirSync(CONV)) {
  if (f.endsWith('.md')) indexerTitres(f, join(CONV, f))
}
if (existsSync(CHECKLISTS)) {
  for (const f of readdirSync(CHECKLISTS)) {
    if (f.endsWith('.md')) indexerTitres(f, join(CHECKLISTS, f))
  }
}
indexerTitres('CLAUDE.md', join(ROOT, 'CLAUDE.md'))

for (const p of mdFiles) {
  const rel = p.slice(ROOT.length + 1)
  // `[A-Za-z0-9_-]` et pas `[a-z0-9-]` : `CLAUDE.md § X` ne matchait jamais, à cause des majuscules.
  for (const m of read(p).matchAll(/([A-Za-z0-9_-]+\.md)\s*§\s*([^`|\n.]+)/g)) {
    const headings = headingsByFile.get(m[1])
    if (!headings) continue
    const wanted = norm(m[2])
    // `<` couvre les gabarits `§ <section>`. La clause `includes('section')` qui l'accompagnait
    // désactivait le contrôle pour TOUT titre contenant le mot « section » — un trou, pas un garde.
    if (wanted.includes('<')) continue
    if (!headings.some((h) => h === wanted || h.startsWith(wanted) || wanted.startsWith(h))) {
      err(`${rel} : cite \`${m[1]} § ${m[2].trim()}\` — aucune section de ce nom dans le fichier.`)
    }
  }
}

// ----------------------------- 7. registry ↔ composants réellement présents
const registryPath = join(CONV, 'component-registry.md')
const componentsDir = join(ROOT, 'src/components')
if (existsSync(registryPath) && existsSync(componentsDir)) {
  const registry = read(registryPath)
  const listed = new Set([...registry.matchAll(/`(src\/[\w./-]+\.tsx?)`/g)].map((m) => m[1]))
  const actual = walk(componentsDir)
    .filter((p) => p.endsWith('.tsx'))
    .map((p) => p.slice(ROOT.length + 1))

  for (const f of actual) {
    if (!listed.has(f)) err(`component-registry.md : ${f} existe mais n'y figure pas (règle absolue n°3 — vérifier le registry avant de créer).`)
  }
  for (const f of listed) {
    if (f.startsWith('src/components/') && !existsSync(join(ROOT, f))) {
      err(`component-registry.md : référence ${f} qui n'existe plus.`)
    }
  }
}

// -------------------------------------------------- 8. hooks déclarés
const settingsPath = join(ROOT, '.claude/settings.json')
if (existsSync(settingsPath)) {
  const settings = JSON.parse(read(settingsPath))
  const hooks = (settings.hooks?.PreToolUse ?? []).flatMap((h) => h.hooks ?? [])
  for (const h of hooks) {
    const m = /\.claude\/hooks\/([\w.-]+)/.exec(h.command ?? '')
    if (m && !existsSync(join(ROOT, '.claude/hooks', m[1]))) err(`settings.json : hook déclaré mais absent — .claude/hooks/${m[1]}`)
  }
  const hooksDir = join(ROOT, '.claude/hooks')
  for (const f of existsSync(hooksDir) ? readdirSync(hooksDir) : []) {
    if (!hooks.some((h) => (h.command ?? '').includes(f))) warn(`Hook ${f} présent mais non déclaré dans settings.json — il ne s'exécute pas.`)
  }
}

// ------------------------------------- 9. chemins cités dans CLAUDE.md / README
for (const doc of ['CLAUDE.md', 'README.md']) {
  const p = join(ROOT, doc)
  if (!existsSync(p)) continue
  for (const m of read(p).matchAll(/`((?:\.method|\.claude|docs|src|scripts|tests)\/[\w./()-]+)`/g)) {
    const target = m[1].replace(/\/$/, '')
    if (target.includes('*') || target.includes('<')) continue
    if (!existsSync(join(ROOT, target))) err(`${doc} : chemin cité inexistant — ${target}`)
  }
}

// ------- 10 & 11. invariants de code + chaîne d'application (module séparé)
verifierInvariants({ ROOT, read, walk, err, warn })

report()

function norm(s) {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[`*_]/g, '')
}

function report() {
  for (const w of warnings) console.log(`⚠  ${w}`)
  for (const e of errors) console.log(`✖  ${e}`)
  if (errors.length === 0) {
    console.log(`✔  Framework cohérent — ${tags?.length ?? 0} tags, ${readdirSync(SKILLS).length} skills${warnings.length ? `, ${warnings.length} avertissement(s)` : ''}.`)
    process.exit(0)
  }
  console.log(`\n${errors.length} erreur(s) de cohérence framework.`)
  process.exit(1)
}
