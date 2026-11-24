#!/usr/bin/env node
/**
 * Hook PreToolUse — aucune écriture git en dehors du skill commit-push.
 *
 * Exit 0 = autorisé, exit 2 = bloqué (stderr renvoyé à Claude).
 *
 * Pourquoi un hook plutôt qu'un skill : le déclenchement d'un skill est un jugement du modèle,
 * donc probabiliste. Acceptable pour charger des conventions, pas pour un gate de push.
 *
 * Pourquoi Node plutôt que bash : le payload est du JSON, et toute extraction du champ
 * `command` à coups de grep/sed est fausse dans un sens ou dans l'autre — soit elle tronque la
 * commande au premier guillemet échappé, soit elle matche le JSON brut. `JSON.parse` supprime
 * la classe de bug entière.
 *
 * CE QUE CE HOOK NE PEUT PAS VOIR — limite structurelle, pas un oubli.
 * Il ne reçoit qu'une chaîne de commande. Un `git commit` écrit dans un `.sh`, un Makefile ou
 * un script npm lui est invisible : `bash deploy.sh` est une commande parfaitement anodine.
 * C'est le hook git `.githooks/pre-commit` qui couvre ce chemin — lui s'exécute quel que soit
 * l'appelant. Les deux sont complémentaires et aucun ne remplace l'autre.
 *
 * Échappement : ` # checks-ok` **en fin de commande**, posé par le skill commit-push une fois
 * `pnpm verify` passé. Le marqueur seul ne suffit pas : le reçu doit couvrir l'état exact du
 * code ET déclarer les 4 checks. C'est un garde-fou contre l'oubli, pas une barrière de
 * sécurité — quelqu'un de déterminé écrira le reçu à la main.
 */

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const MARKER = /#\s*checks-ok\s*$/

/**
 * Le dépôt que la commande VISE : `cd <dir> &&` en tête, puis `git -C <dir>`, depuis le cwd de
 * la session. Le hook tourne depuis le dossier de la session ; sans ce calcul, un commit lancé
 * dans un worktree était jugé sur le reçu du checkout principal — refusé même après un `pnpm
 * verify` vert, ou accepté sur un arbre jamais vérifié (E05-S01). `undefined` : racine du script.
 */
function racineVisee(command, cwd) {
  const chemin = (m) => (m ? (m[1] ?? m[2] ?? m[3]) : undefined)
  // Git Bash écrit `/c/apps/…` ; git.exe lancé par Node attend `c:/apps/…`.
  const natif = (p) => (process.platform === 'win32' ? p.replace(/^\/([a-zA-Z])(?=\/|$)/, '$1:') : p)
  const ARG = `(?:"([^"]+)"|'([^']+)'|([^\\s;&|]+))`
  let dir = cwd
  const cd = chemin(new RegExp(`^\\s*cd\\s+${ARG}\\s*&&`).exec(command))
  if (cd) dir = resolve(dir, natif(cd))
  const c = chemin(new RegExp(`\\bgit\\s+(?:-{1,2}[^\\s]+(?:\\s+[^-\\s][^\\s]*)?\\s+)*?-C\\s+${ARG}`).exec(command))
  if (c) dir = resolve(dir, natif(c))
  if (!cd && !c) return undefined
  try {
    return execFileSync('git', ['-C', dir, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return undefined
  }
}

/** Les 4 checks que `pnpm verify` enchaîne. Un reçu qui n'en déclare pas la totalité est refusé. */
const CHECKS_REQUIS = ['check:framework', 'type-check', 'lint', 'test']

const BLOCK_MESSAGE = `BLOQUÉ: écriture git directe interdite.

Passer par le skill \`commit-push\` (.claude/skills/commit-push/SKILL.md) :
  1. pnpm verify:cached   (les 4 checks, sans les rejouer s'ils viennent de passer)
  2. mise à jour de docs/changelog.md
  3. commit + push

Le skill pose lui-même le marqueur d'échappement une fois \`pnpm verify\` réellement passé.`

const deny = (msg) => {
  process.stderr.write(msg + '\n')
  process.exit(2)
}

let raw = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (c) => (raw += c))
process.stdin.on('end', async () => {
  let command = ''
  let cwd = process.cwd()
  try {
    const payload = JSON.parse(raw)
    command = payload?.tool_input?.command ?? ''
    if (typeof payload?.cwd === 'string') cwd = payload.cwd
  } catch {
    process.exit(0) // payload illisible : ne pas bloquer un appel qu'on ne comprend pas
  }
  if (typeof command !== 'string' || !command.trim()) process.exit(0)

  const marked = MARKER.test(command)

  // Neutraliser les chaînes entre quotes : sans ça, `--force` écrit dans un message de commit
  // déclencherait l'interdit absolu, et `grep "git push"` serait bloqué.
  const bare = command
    .replace(MARKER, '')
    .replace(/'[^']*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')

  // Un shell imbriqué remet la commande dans une chaîne, que la neutralisation ci-dessus efface :
  // `bash -c "git commit -m x"` passerait sans être vu. On ne refuse que si la commande BRUTE
  // mentionne git — sinon `docker run … sh -c "ls"` et `timeout 5 bash -c "echo"` étaient
  // bloqués avec un message parlant de commit-push, ce qui est absurde et fait désactiver le hook.
  const SHELL_IMBRIQUE = /(?:^|[;&|\s])(?:sh|bash|zsh|env)\s+(?:-\S+\s+)*-c\b|(?:^|[;&|\s])eval\b|\|\s*(?:sh|bash|zsh)\b/
  if (/\bgit\b/.test(command) && SHELL_IMBRIQUE.test(command)) {
    deny(
      "BLOQUÉ: commande git dans un shell imbriqué (`bash -c`, `eval`, pipe vers un shell). Son contenu n'est pas analysable : lancer la commande git directement, via le skill commit-push."
    )
  }

  // Verbes qui créent ou publient des commits. `merge`, `revert`, `cherry-pick`, `rebase` et
  // `am` produisent des commits sans passer par `commit` : les exclure laissait un chemin
  // complet pour publier du code jamais vérifié. `commit-tree` écrit un commit par la plomberie.
  const VERBES_COMMIT = 'commit|commit-tree|merge|revert|cherry-pick|rebase|am'
  const VERBES = `${VERBES_COMMIT}|push`
  // `git` peut porter des options globales avant la sous-commande : -C <path>, -c k=v, --no-pager…
  // Le verbe finit sur un blanc ou une ponctuation, jamais sur un tiret : `merge-file` et
  // `merge-base` ne créent aucun commit.
  const motif = (verbes) =>
    new RegExp(`(?:^|[;&|\\n]|\\s)git((?:\\s+-{1,2}[^\\s]+(?:\\s+[^-\\s][^\\s]*)?)*)\\s+(${verbes})(?![\\w-])`)

  if (!motif(VERBES).test(bare)) process.exit(0)

  // Dépôt visé qui n'utilise pas cette méthode (ni `scripts/verify-receipt.mjs`, ni reçu) : une
  // session ouverte ici travaille aussi dans d'autres dépôts, qui ont leur propre gate. Leur
  // appliquer celui-ci, sans reçu possible, refusait tout commit et ne laissait que le contournement
  // (2026-11-24). Les interdits absolus (--no-verify, --force) restent appliqués partout ; le dépôt
  // de la session, lui, est toujours gardé.
  const vise = racineVisee(command, cwd)
  const methode = (root) =>
    existsSync(join(root, 'scripts/verify-receipt.mjs')) || existsSync(join(root, '.claude/.verify-receipt.json'))
  const etranger = vise !== undefined && !methode(vise)

  if (/\s--no-verify\b/.test(bare)) {
    deny(
      'BLOQUÉ: --no-verify est interdit, sans échappement possible. Les hooks git font partie du gate.'
    )
  }
  // `-[a-z]*f[a-z]*` et pas `-f\b` : `git push -fu origin main` — la forme la plus courante d'un
  // push forcé — franchissait l'interdit, parce que `\b` ne coupe pas entre `f` et `u`.
  if (/\s(?:--force\b|--force-with-lease\b|-[a-zA-Z]*f[a-zA-Z]*\b)/.test(bare)) {
    deny(
      "BLOQUÉ: --force est interdit, sans échappement possible. Si le push est refusé (conflit, divergence), remonter le problème à l'utilisateur au lieu de le forcer."
    )
  }
  if (/\s--amend\b/.test(bare) && !marked) {
    deny(
      "BLOQUÉ: --amend interdit sans demande explicite de l'utilisateur. Si l'utilisateur l'a demandé et que `pnpm verify` est passé, ajouter ' # checks-ok' en fin de commande."
    )
  }

  if (etranger) process.exit(0)

  if (!marked) deny(BLOCK_MESSAGE)

  // Le marqueur est une déclaration ; le reçu est une preuve. Il n'est exigé que des verbes qui
  // PRODUISENT un commit.
  //
  // `push` en est exclu, et ce n'est pas un trou : il ne publie que du déjà-commité, et chaque
  // verbe capable de produire un commit passe désormais lui-même par ce contrôle — c'est ce qui
  // manquait en v2, où seul `commit` était couvert. L'exiger aussi du push le rendrait de toute
  // façon impossible à satisfaire : le commit qui vient d'avoir lieu change HEAD, donc invalide
  // le reçu. Il faudrait relancer `pnpm verify` entre le commit et le push — soit exactement la
  // double exécution que le reçu existe pour supprimer.
  if (!motif(VERBES_COMMIT).test(bare)) process.exit(0)

  let receipt
  try {
    receipt = await import('../../scripts/verify-receipt.mjs').then((m) =>
      m.checkReceipt(racineVisee(command, cwd))
    )
  } catch {
    process.exit(0) // outillage absent ou illisible : ne pas bloquer sur le framework lui-même
  }

  if (!receipt.valid) {
    deny(
      `BLOQUÉ: marqueur posé mais ${receipt.reason}.\n\n` +
        `Le marqueur atteste que les 4 checks sont passés sur CE code. Lancer :\n` +
        `  pnpm verify\n\n` +
        `puis relancer la commande. Ne pas contourner en supprimant le reçu.`
    )
  }

  // Le champ `checks` du reçu était écrit puis jamais relu : un reçu déclarant
  // « aucun-check-na-tourne » ouvrait le gate. Le reçu prouvait l'identité de l'arbre, pas que
  // quoi que ce soit avait été vérifié.
  const declares = Array.isArray(receipt.receipt?.checks) ? receipt.receipt.checks : []
  const manquants = CHECKS_REQUIS.filter((c) => !declares.includes(c))
  if (manquants.length) {
    deny(
      `BLOQUÉ: le reçu ne déclare pas tous les checks — manquant(s) : ${manquants.join(', ')}.\n\n` +
        `Reçu trouvé : ${declares.join(', ') || '(aucun)'}\n` +
        `Lancer \`pnpm verify\`, qui les enchaîne tous les quatre et écrit le reçu.`
    )
  }

  process.exit(0)
})
