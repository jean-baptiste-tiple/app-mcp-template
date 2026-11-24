/**
 * sync-method : analyse des fichiers `merge` (contenu mixte template / projet), séparée de
 * `sync-method.mjs` pour la limite de lignes. Voyage avec lui (`owned`) : son import est statique.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const MERGE_SANS_PART = 'merge sans part projet'

/** Contenu texte, CRLF normalisé (dépôts Windows en autocrlf). */
export const texte = (root, p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')

const titres = (src) => [...src.matchAll(/^#{2,3}\s+(.+)$/gm)].map((m) => m[1].trim())
const estLigneDeTableau = (l) => l.startsWith('|') && !/^\|[\s|:-]+\|?$/.test(l)
const clesDeTableau = (src) => src.split('\n').filter(estLigneDeTableau).map((l) => l.split('|')[1].trim()).filter(Boolean)
const absents = (dansTemplate, dansCible) => {
  const cible = new Set(dansCible)
  return [...new Set(dansTemplate)].filter((x) => !cible.has(x))
}
const commandesDeHooks = (src) =>
  Object.values(JSON.parse(src).hooks ?? {}).flatMap((liste) => liste.flatMap((h) => (h.hooks ?? []).map((x) => x.command)))

/** Ce que le template a et que la cible n'a pas, selon la nature du fichier. */
function ajoutsDuTemplate(chemin, tpl, cib) {
  if (chemin === 'CLAUDE.md' || chemin.endsWith('_index.md')) {
    return [
      ...absents(titres(tpl), titres(cib)).map((t) => `section « ${t} »`),
      ...absents(clesDeTableau(tpl), clesDeTableau(cib)).map((k) => `ligne de tableau « ${k} »`),
    ]
  }
  if (chemin === 'package.json') {
    const [a, b] = [JSON.parse(tpl).scripts ?? {}, JSON.parse(cib).scripts ?? {}]
    return Object.keys(a)
      .filter((k) => a[k] !== b[k])
      .map((k) => (k in b ? `script \`${k}\` différent : « ${a[k]} »` : `script \`${k}\` : « ${a[k]} »`))
  }
  if (chemin === '.claude/settings.json') {
    return absents(commandesDeHooks(tpl), commandesDeHooks(cib)).map((c) => `hook « ${c} »`)
  }
  if (chemin === '.gitignore') {
    const lignes = (s) => s.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
    return absents(lignes(tpl), lignes(cib)).map((l) => `ligne « ${l} »`)
  }
  return []
}

function stat(template, cible, chemin) {
  try {
    execFileSync('git', ['diff', '--no-index', '--ignore-cr-at-eol', '--numstat', join(template, chemin), join(cible, chemin)], { stdio: 'pipe' })
    return null
  } catch (e) {
    const [plus, moins] = String(e.stdout ?? '').split(/\s+/)
    return plus ? `cible : +${plus} / −${moins} lignes par rapport au template` : null
  }
}

/**
 * Version antérieure ou égale du template, sans ligne propre au projet : toutes les lignes non
 * vides de la cible existent dans le template. Heuristique (une ligne du projet identique à une
 * ligne du template passe inaperçue) : d'où `--take` explicite, jamais d'écriture automatique.
 */
function sansPartProjet(tpl, cib) {
  const duTemplate = new Set(tpl.split('\n').map((l) => l.trimEnd()))
  return cib.split('\n').every((l) => !l.trim() || duTemplate.has(l.trimEnd()))
}

export function analyserMerge(template, cible, manifeste) {
  return manifeste.merge
    .filter((chemin) => existsSync(join(template, chemin)))
    .map((chemin) => {
      if (!existsSync(join(cible, chemin))) return { chemin, statut: 'absent de la cible', ajouts: [] }
      const [tpl, cib] = [texte(template, chemin), texte(cible, chemin)]
      if (chemin === 'package.json') {
        const ajouts = ajoutsDuTemplate(chemin, tpl, cib)
        return { chemin, statut: ajouts.length ? 'différent (scripts)' : 'identique (scripts)', ajouts }
      }
      if (tpl === cib) return { chemin, statut: 'identique', ajouts: [] }
      const statut = sansPartProjet(tpl, cib) ? MERGE_SANS_PART : 'différent'
      return { chemin, statut, ajouts: ajoutsDuTemplate(chemin, tpl, cib), stat: stat(template, cible, chemin) }
    })
}
