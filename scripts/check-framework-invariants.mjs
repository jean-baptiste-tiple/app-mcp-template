#!/usr/bin/env node
/**
 * Deuxième moitié de `check-framework` : ce qui porte sur le CODE et sur l'OUTILLAGE, là où le
 * fichier principal ne vérifie que la cohérence documentaire du framework (tags, globs, skills,
 * sections citées).
 *
 * La séparation n'est pas cosmétique : ces deux blocs répondent à une question différente.
 * « Le framework se décrit-il correctement ? » d'un côté, « ses garanties sont-elles encore
 * branchées ? » de l'autre. Le second est le seul à pouvoir échouer sur un projet dont la
 * documentation est parfaite.
 */
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * @param {{ROOT: string, read: (p: string) => string, walk: (d: string, o?: string[]) => string[],
 *          err: (m: string) => void, warn: (m: string) => void}} ctx
 */
export function verifierInvariants({ ROOT, read, walk, err, warn }) {
  invariantsDeCode({ ROOT, read, walk, err })
  chaineDApplication({ ROOT, read, err, warn })
}

/** Tables créées par une migration sans que la même migration active la RLS. */
function tablesSansRls(sql) {
  const manquantes = []
  for (const m of sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."]+)/gi)) {
    const table = m[1].replace(/"/g, '').split('.').pop()
    const rls = new RegExp(
      `ALTER\\s+TABLE[^;]*\\b${table}\\b[^;]*ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
      'is'
    )
    if (!rls.test(sql)) manquantes.push(table)
  }
  return manquantes
}

// ---------------- invariants de CLAUDE.md que rien ne vérifiait
// Trois règles annoncées comme absolues et laissées au jugement. Elles sont mécanisables :
// les laisser en prose, c'est accepter qu'elles se dégradent sans trace.
function invariantsDeCode({ ROOT, read, walk, err }) {
  // « RLS activée sur toute table » (CLAUDE.md § Invariants techniques)
  const migrations = join(ROOT, 'supabase/migrations')
  if (existsSync(migrations)) {
    for (const f of readdirSync(migrations).filter((f) => f.endsWith('.sql'))) {
      for (const table of tablesSansRls(read(join(migrations, f)))) {
        err(
          `supabase/migrations/${f} : table \`${table}\` créée sans \`ENABLE ROW LEVEL SECURITY\` dans la même migration.`
        )
      }
    }
  }

  // « Deux page.tsx ne doivent jamais résoudre le même chemin » — Next ne le signale pas, il en
  // choisit un en silence. Le template s'y était fait prendre : `/` était servi par un redirect
  // vers une route inexistante, et la page du route group n'était jamais rendue.
  const appDir = join(ROOT, 'src/app')
  if (existsSync(appDir)) {
    const routes = new Map()
    for (const p of walk(appDir).filter((p) => /[\\/]page\.tsx?$/.test(p))) {
      const rel = p.slice(appDir.length + 1)
      const chemin =
        '/' +
        rel
          .replace(/\/?page\.tsx?$/, '')
          .split('/')
          .filter((s) => !/^\(.*\)$/.test(s))
          .join('/')
      if (routes.has(chemin)) {
        err(
          `Deux page.tsx résolvent \`${chemin}\` : ${routes.get(chemin)} et ${rel}. Next n'échoue pas, il en choisit un en silence.`
        )
      } else routes.set(chemin, rel)
    }
  }

  // Le paquet Otomata sert son MCP sur `api/mcp/route.ts` (statique) : posé à côté de
  // `api/[transport]/`, il masque le MCP du template sans que Next le signale (ADR-001).
  if (existsSync(join(appDir, 'api/mcp/route.ts')) && existsSync(join(appDir, 'api/[transport]'))) {
    err(
      'src/app/api/mcp/route.ts et src/app/api/[transport]/ coexistent : la route statique masque le MCP du template en silence. Plateforme Otomata activée : retirer api/[transport]/ (ADR-001).'
    )
  }

  // « Classes sémantiques uniquement, aucune couleur Tailwind numérotée » (CLAUDE.md § Design system)
  const srcDir = join(ROOT, 'src')
  if (existsSync(srcDir)) {
    const COULEUR =
      /\b(?:bg|text|border|ring|fill|stroke|from|via|to|decoration|outline|divide|shadow|accent|caret|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/
    for (const p of walk(srcDir).filter((p) => /\.tsx?$/.test(p))) {
      read(p)
        .split('\n')
        .forEach((l, i) => {
          const m = COULEUR.exec(l)
          if (m) {
            err(
              `${p.slice(ROOT.length + 1)}:${i + 1} : couleur Tailwind numérotée \`${m[0]}\` — utiliser une classe sémantique (bg-primary, text-muted-foreground…).`
            )
          }
        })
    }
  }
}

// ------------------------- la chaîne d'application est-elle encore branchée ?
// Jusqu'ici le vérificateur ne contrôlait que la cohérence DOCUMENTAIRE. On pouvait vider
// settings.json de ses hooks, réduire enforce-git-gate.mjs à `process.exit(0)` ou remplacer
// `type-check` par `echo ok` : exit 0 dans les trois cas. Toutes les garanties du framework
// étaient désactivables sans que son propre check bronche.
function chaineDApplication({ ROOT, read, err, warn }) {
  const pkgPath = join(ROOT, 'package.json')
  if (existsSync(pkgPath)) {
    const scripts = JSON.parse(read(pkgPath)).scripts ?? {}
    const ATTENDUS = {
      'check:framework': /node\s+scripts\/check-framework\.mjs/,
      'type-check': /tsc\s+--noEmit/,
      lint: /eslint/,
      test: /vitest/,
      verify: /check:framework.*type-check.*lint.*test.*verify-receipt\.mjs\s+write/s,
    }
    for (const [nom, motif] of Object.entries(ATTENDUS)) {
      if (!scripts[nom]) {
        err(`package.json : script \`${nom}\` absent — \`pnpm verify\` ne peut plus l'enchaîner.`)
      } else if (!motif.test(scripts[nom])) {
        err(`package.json : script \`${nom}\` ne lance plus ce qu'il annonce (« ${scripts[nom]} »).`)
      }
    }
    if (scripts.lint && !/--max-warnings\s+0/.test(scripts.lint)) {
      err(
        "package.json : `lint` sans `--max-warnings 0` — les règles ESLint en `warn` ne bloquent rien, alors que les conventions les annoncent « appliquées par l'outillage »."
      )
    }
  }

  // Un hook déclaré mais vidé de sa substance est pire qu'un hook absent : il donne l'illusion
  // d'une garantie. On ne valide pas le contenu ligne à ligne, seulement qu'il refuse quelque chose.
  for (const f of ['enforce-git-gate.mjs', 'enforce-bash-rules.mjs']) {
    const p = join(ROOT, '.claude/hooks', f)
    if (!existsSync(p)) {
      err(`.claude/hooks/${f} absent — la garantie qu'il porte n'existe plus.`)
      continue
    }
    if (!/process\.exit\(2\)/.test(read(p))) {
      err(`.claude/hooks/${f} ne contient aucun \`process.exit(2)\` — il ne bloque plus rien.`)
    }
  }

  // Le hook git couvre les commits lancés depuis un script, invisibles au hook PreToolUse.
  const preCommit = join(ROOT, '.githooks/pre-commit')
  if (!existsSync(preCommit)) {
    warn(".githooks/pre-commit absent — un `git commit` lancé depuis un script n'est contrôlé par rien.")
  } else if (!/verify-receipt/.test(read(preCommit))) {
    err('.githooks/pre-commit ne vérifie plus le reçu.')
  }
}
