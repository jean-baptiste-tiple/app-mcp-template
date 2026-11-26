import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

// Ces tests et leurs hooks lancent de vrais process git et dépassent les délais par défaut (5 s, 10 s) sur une machine chargée.
vi.setConfig({ testTimeout: 20_000, hookTimeout: 20_000 })

/**
 * Le gate git est la seule garantie non probabiliste du framework : si un `git push` nu passe,
 * du code non vérifié part en production. Ces tests existent parce que deux réécritures
 * successives du hook ont chacune introduit une régression silencieuse — d'abord une extraction
 * qui tronquait la commande au premier guillemet échappé, puis un matching du JSON brut qui
 * acceptait le marqueur écrit dans un message de commit.
 */

const RECEIPT_SCRIPT = join(process.cwd(), "scripts/verify-receipt.mjs")

// Les tests écrivent dans un reçu ISOLÉ, jamais dans `.claude/.verify-receipt.json`.
// Un `pnpm test` interrompu laisserait sinon un reçu déclarant les 4 checks passés alors que
// seul vitest a tourné — et le gate autoriserait un commit sans type-check ni lint.
const TEST_RECEIPT = join(tmpdir(), `verify-receipt-test-${process.pid}.json`)
const RECEIPT_ENV = { ...process.env, VERIFY_RECEIPT_PATH: TEST_RECEIPT }

const HOOKS = join(process.cwd(), ".claude/hooks")
const MARKER = "# checks-ok"

function runHook(hook: string, command: string, extra: Record<string, unknown> = {}): number {
  const payload = JSON.stringify({ tool_name: "Bash", tool_input: { command, ...extra } })
  try {
    execFileSync("node", [join(HOOKS, hook)], {
      input: payload,
      stdio: "pipe",
      env: { ...process.env, VERIFY_RECEIPT_PATH: TEST_RECEIPT },
    })
    return 0
  } catch (error) {
    return (error as { status: number }).status
  }
}

const gate = (command: string, extra?: Record<string, unknown>) =>
  runHook("enforce-git-gate.mjs", command, extra)
const bashRules = (command: string, extra?: Record<string, unknown>) =>
  runHook("enforce-bash-rules.mjs", command, extra)

const BLOCKED = 2
const ALLOWED = 0
// Gate + reçu : plusieurs process git par test ; 45 s observées sous charge (synchro 99deco).
const GIT_TIMEOUT = 60_000


function receipt(action: "write" | "check" | "clear"): number {
  try {
    execFileSync("node", [RECEIPT_SCRIPT, action], { stdio: "pipe", env: RECEIPT_ENV })
    return 0
  } catch (error) {
    return (error as { status: number }).status
  }
}

afterAll(() => {
  rmSync(TEST_RECEIPT, { force: true })
})

describe("enforce-git-gate", () => {
  // Le gate exige un reçu couvrant l'arbre courant pour laisser passer un commit marqué.
  beforeEach(() => {
    receipt("write")
  }, GIT_TIMEOUT)

  it("bloque un commit et un push nus", () => {
    expect(gate("git push")).toBe(BLOCKED)
    expect(gate('git commit -m "feat: x"')).toBe(BLOCKED)
  })

  it("bloque les options globales de git utilisées pour contourner le motif", () => {
    expect(gate("git -C /repo commit -m x")).toBe(BLOCKED)
    expect(gate("git --no-pager push")).toBe(BLOCKED)
    expect(gate("git -c user.email=a@b push")).toBe(BLOCKED)
    expect(gate("cd /tmp && git push")).toBe(BLOCKED)
  })

  it("n'accepte le marqueur qu'en fin de commande, jamais dans un message ou une description", { timeout: GIT_TIMEOUT }, () => {
    expect(gate('git commit -m "docs: expliquer checks-ok"')).toBe(BLOCKED)
    expect(gate("git push", { description: "voir checks-ok" })).toBe(BLOCKED)
    expect(gate(`git commit -m "feat: x" ${MARKER}`)).toBe(ALLOWED)
    expect(gate(`git push -u origin ma-branche ${MARKER}`)).toBe(ALLOWED)
  })

  it("refuse --force et --no-verify même marqués", () => {
    expect(gate(`git push --force ${MARKER}`)).toBe(BLOCKED)
    expect(gate(`git push --force-with-lease ${MARKER}`)).toBe(BLOCKED)
    expect(gate(`git commit --no-verify -m x ${MARKER}`)).toBe(BLOCKED)
  })

  it("ne bloque pas les commandes git en lecture ni les commandes qui citent git", () => {
    expect(gate("git status --short")).toBe(ALLOWED)
    expect(gate("git log --oneline -5")).toBe(ALLOWED)
    expect(gate("git add src/")).toBe(ALLOWED)
    expect(gate('grep -rn "git commit" docs/')).toBe(ALLOWED)
    expect(gate("ls -la", { description: "prepare le git push" })).toBe(ALLOWED)
  })

  it("ne bloque pas un message de commit qui contient le texte d'un flag interdit", { timeout: GIT_TIMEOUT }, () => {
    expect(gate(`git commit -m "fix: gerer --force" ${MARKER}`)).toBe(ALLOWED)
  })

  it("couvre les verbes qui produisent un commit sans passer par `commit`", () => {
    // `merge`, `revert`, `cherry-pick`, `rebase` et `am` écrivent des commits et peuvent les
    // publier. Les laisser hors du motif ouvrait un chemin complet pour du code jamais vérifié.
    expect(gate("git merge feature/x")).toBe(BLOCKED)
    expect(gate("git revert HEAD")).toBe(BLOCKED)
    expect(gate("git cherry-pick abc1234")).toBe(BLOCKED)
    expect(gate("git rebase main")).toBe(BLOCKED)
    expect(gate("git am patch.mbox")).toBe(BLOCKED)
  })

  it("ne prend pas une commande git voisine pour un verbe de commit", () => {
    // `git merge-file` fusionne trois fichiers sans créer de commit : `\b` coupait sur le tiret
    // et le gate le bloquait comme un merge (synchro app-fnr-luciole, 2026-11-24).
    expect(gate("git merge-file mine.md base.md theirs.md")).toBe(ALLOWED)
    expect(gate("git merge-base main HEAD")).toBe(ALLOWED)
    expect(gate("git commit-tree abc1234 -m x")).toBe(BLOCKED)
  })

  it("refuse les formes agglomérées de --force", () => {
    // `git push -fu origin main` est la forme la plus courante d'un push forcé. `-f\b` ne coupe
    // pas entre `f` et `u` : elle franchissait l'interdit.
    expect(gate(`git push -fu origin main ${MARKER}`)).toBe(BLOCKED)
    expect(gate(`git push -uf origin main ${MARKER}`)).toBe(BLOCKED)
  })

  it("exige un reçu de tout verbe qui produit un commit, mais pas du push", { timeout: GIT_TIMEOUT }, () => {
    expect(receipt("clear")).toBe(0)
    expect(gate(`git merge feature/x ${MARKER}`)).toBe(BLOCKED)
    expect(gate(`git cherry-pick abc1234 ${MARKER}`)).toBe(BLOCKED)

    // `push` ne publie que du déjà-commité, et chaque verbe qui produit un commit passe
    // désormais par le contrôle ci-dessus. L'exiger du push serait impossible à satisfaire :
    // le commit qui vient d'avoir lieu change HEAD, donc invalide le reçu — il faudrait
    // relancer `pnpm verify` entre le commit et le push.
    expect(gate(`git push -u origin ma-branche ${MARKER}`)).toBe(ALLOWED)

    expect(receipt("write")).toBe(0)
    expect(gate(`git merge feature/x ${MARKER}`)).toBe(ALLOWED)
  })

  it("refuse un reçu qui ne déclare pas les 4 checks", { timeout: GIT_TIMEOUT }, () => {
    // Le champ `checks` était écrit puis jamais relu : le reçu prouvait l'identité de l'arbre,
    // pas que quoi que ce soit avait été vérifié.
    execFileSync("node", [RECEIPT_SCRIPT, "write", "test"], { stdio: "pipe", env: RECEIPT_ENV })
    expect(gate(`git commit -m "feat: x" ${MARKER}`)).toBe(BLOCKED)
    expect(receipt("write")).toBe(0)
    expect(gate(`git commit -m "feat: x" ${MARKER}`)).toBe(ALLOWED)
  })

  it("refuse les shells imbriqués, qui rendent la commande inanalysable", () => {
    // La neutralisation des chaînes entre quotes efface le contenu de `bash -c "..."` :
    // sans ce refus, la commande git y devient invisible et le gate laisse tout passer.
    expect(gate('bash -c "git commit -m x"')).toBe(BLOCKED)
    expect(gate('sh -c "git push"')).toBe(BLOCKED)
    expect(gate('eval "git push"')).toBe(BLOCKED)
    expect(gate('echo "git push" | bash')).toBe(BLOCKED)
  })

  it("ne refuse un shell imbriqué que s'il mentionne git", () => {
    // Le refus portait sur TOUT shell imbriqué : `docker run … sh -c "ls"` était bloqué par un
    // message parlant de commit-push. Un hook qui bloque l'anodin finit désactivé.
    expect(gate('bash -c "ls -la"')).toBe(ALLOWED)
    expect(gate('timeout 5 sh -c "echo ok"')).toBe(ALLOWED)
    expect(gate('docker run alpine sh -c "cat /etc/os-release"')).toBe(ALLOWED)
  })
})

describe("verify-receipt", () => {
  const run = (args: string[]): number => receipt(args[0] as "write" | "check" | "clear")

  it("valide un reçu écrit sur l'arbre courant, l'invalide dès que le code change", () => {
    expect(run(["write"])).toBe(0)
    expect(run(["check"])).toBe(0)

    const scratch = join(process.cwd(), "src/lib/utils/.receipt-probe.ts")
    writeFileSync(scratch, "export const probe = 1\n")
    try {
      // Le reçu couvrait un arbre sans ce fichier : il ne doit plus être valide.
      expect(run(["check"])).toBe(1)
    } finally {
      rmSync(scratch, { force: true })
    }

    // Retour à l'état couvert par le reçu → de nouveau valide, sans avoir rejoué les checks.
    expect(run(["check"])).toBe(0)
  })

  it("reste valide après un `git add` — le staging ne change pas le code", () => {
    const scratch = join(process.cwd(), "src/lib/utils/.receipt-staged.ts")
    writeFileSync(scratch, "export const staged = 1\n")
    try {
      expect(run(["write"])).toBe(0)
      // `git add` fait passer le fichier de « non suivi » à « indexé » sans toucher une ligne.
      // Si l'empreinte dépendait du staging, le reçu serait invalidé juste avant le commit.
      execFileSync("git", ["add", scratch], { stdio: "pipe" })
      expect(run(["check"])).toBe(0)
    } finally {
      execFileSync("git", ["rm", "-f", "--quiet", "--ignore-unmatch", scratch], { stdio: "pipe" })
      rmSync(scratch, { force: true })
    }
  })

  it("détecte un renommage dans les deux sens", () => {
    // Ce test EXIGE un dépôt jetable avec un vrai commit. Sa version précédente créait la
    // fixture dans le dépôt courant et se contentait d'un `git add` : le chemin d'origine
    // n'ayant jamais existé dans HEAD, git n'émettait aucune ligne `R` et `--no-renames` ne
    // changeait rien. Le test passait sans jamais exercer la régression qu'il documente.
    const repo = join(tmpdir(), `rename-repo-${process.pid}`)
    rmSync(repo, { recursive: true, force: true })
    const g = (...args: string[]) => execFileSync("git", args, { cwd: repo, stdio: "pipe" })
    execFileSync("git", ["init", "--quiet", repo], { stdio: "pipe" })
    try {
      g("config", "user.email", "test@test")
      g("config", "user.name", "test")
      writeFileSync(join(repo, "a.ts"), "export const renamed = 1\n")
      g("add", "a.ts")
      g("commit", "--quiet", "--no-verify", "-m", "init")

      // `VERIFY_RECEIPT_ROOT` est indispensable : le script pointe git sur SA propre racine,
      // pas sur le cwd. Sans cette variable, ce test hacherait le dépôt du template.
      const env = {
        ...process.env,
        // Le reçu vit HORS du dépôt : dedans, il serait un fichier non suivi, donc compté dans
        // sa propre empreinte — l'écrire l'invaliderait aussitôt. Dans le template, c'est
        // `.gitignore` qui joue ce rôle pour `.claude/.verify-receipt.json`.
        VERIFY_RECEIPT_PATH: `${repo}-receipt.json`,
        VERIFY_RECEIPT_ROOT: repo,
      }
      const receiptIn = (action: string): number => {
        try {
          execFileSync("node", [RECEIPT_SCRIPT, action], { cwd: repo, stdio: "pipe", env })
          return 0
        } catch (error) {
          return (error as { status: number }).status
        }
      }
      expect(receiptIn("write")).toBe(0)
      expect(receiptIn("check")).toBe(0)

      // `a.ts` est dans HEAD : le renommer produit bien un `R100 a.ts b.ts`. Restaurer `a.ts`
      // à l'identique fait coexister les deux fichiers — le code a changé. Sans `--no-renames`,
      // seule la destination était enregistrée, la disparition de la source jamais, et le
      // contenu restauré à l'identique redonnait l'empreinte d'origine : reçu valide à tort.
      g("mv", "a.ts", "b.ts")
      writeFileSync(join(repo, "a.ts"), "export const renamed = 1\n")
      expect(receiptIn("check")).toBe(1)
    } finally {
      rmSync(repo, { recursive: true, force: true })
      rmSync(`${repo}-receipt.json`, { force: true })
    }
  })

  it("reste valide après le commit du même arbre, s'invalide quand l'amont change le code", () => {
    // Après un commit, `main` distant a souvent bougé (commit de synchro de schéma) : le rebase
    // exigeait un reçu, que le commit venait d'invalider sans changer une ligne. Il fallait
    // rejouer 10 à 37 min de checks sur le même code (bo-my, app-fnr, app-pmo, 2026-11-24).
    const repo = join(tmpdir(), `commit-repo-${process.pid}`)
    rmSync(repo, { recursive: true, force: true })
    const g = (...args: string[]) => execFileSync("git", args, { cwd: repo, stdio: "pipe" })
    execFileSync("git", ["init", "--quiet", repo], { stdio: "pipe" })
    try {
      g("config", "user.email", "test@test")
      g("config", "user.name", "test")
      writeFileSync(join(repo, "a.ts"), "export const a = 1\n")
      g("add", "a.ts")
      g("commit", "--quiet", "--no-verify", "-m", "init")
      const env = { ...process.env, VERIFY_RECEIPT_PATH: `${repo}-receipt.json`, VERIFY_RECEIPT_ROOT: repo }
      const receiptIn = (action: string): number => {
        try {
          execFileSync("node", [RECEIPT_SCRIPT, action], { cwd: repo, stdio: "pipe", env })
          return 0
        } catch (error) {
          return (error as { status: number }).status
        }
      }
      writeFileSync(join(repo, "a.ts"), "export const a = 2\n")
      writeFileSync(join(repo, "b.ts"), "export const b = 1\n")
      expect(receiptIn("write")).toBe(0)
      g("add", "a.ts", "b.ts")
      g("commit", "--quiet", "--no-verify", "-m", "travail")
      expect(receiptIn("check")).toBe(0)
      // Un commit de l'amont qui change le code (ici, un fichier ajouté) l'invalide.
      writeFileSync(join(repo, "c.ts"), "export const c = 1\n")
      g("add", "c.ts")
      g("commit", "--quiet", "--no-verify", "-m", "amont")
      expect(receiptIn("check")).toBe(1)
    } finally {
      rmSync(repo, { recursive: true, force: true })
      rmSync(`${repo}-receipt.json`, { force: true })
    }
  })

  it("ne casse pas sur un dépôt sans commit", () => {
    // Premier commit d'un projet issu du template : `git rev-parse HEAD` échoue. Sans garde,
    // `pnpm verify` mourait APRÈS avoir passé les 4 checks, et le gate refusait le commit en
    // boucle — sans échappement possible puisque `--no-verify` est bloqué.
    const repo = join(tmpdir(), `empty-repo-${process.pid}`)
    rmSync(repo, { recursive: true, force: true })
    execFileSync("git", ["init", "--quiet", repo], { stdio: "pipe" })
    try {
      // `VERIFY_RECEIPT_ROOT` : sans elle, le script hachait le dépôt du template et ce test
      // n'exerçait jamais le cas « pas de HEAD » qu'il prétend couvrir.
      const env = {
        ...process.env,
        VERIFY_RECEIPT_PATH: join(repo, "receipt.json"),
        VERIFY_RECEIPT_ROOT: repo,
      }
      execFileSync("node", [RECEIPT_SCRIPT, "write"], { cwd: repo, stdio: "pipe", env })
    } finally {
      rmSync(repo, { recursive: true, force: true })
    }
  })

  // Six appels au hook et un dépôt jetable : 3,6 s au calme, au-delà des 5 s par défaut sous charge.
  it("juge un commit sur le reçu du dépôt qu'il vise (`cd <dir> &&`, `git -C <dir>`)", { timeout: 30_000 }, () => {
    // Un worktree a son propre arbre et son propre reçu. Le gate lisait toujours celui du
    // checkout de la session : un commit dans le worktree était refusé après un `pnpm verify`
    // vert, et aurait été accepté sur un arbre jamais vérifié si l'autre reçu était frais (E05-S01).
    const repo = join(tmpdir(), `worktree-repo-${process.pid}`)
    rmSync(repo, { recursive: true, force: true })
    const g = (...args: string[]) => execFileSync("git", args, { cwd: repo, stdio: "pipe" })
    execFileSync("git", ["init", "--quiet", repo], { stdio: "pipe" })
    try {
      g("config", "user.email", "test@test")
      g("config", "user.name", "test")
      // Le reçu vit DANS le dépôt, comme dans un vrai worktree : ignoré, sinon il compterait
      // dans sa propre empreinte.
      writeFileSync(join(repo, ".gitignore"), ".claude/.verify-receipt.json\n")
      writeFileSync(join(repo, "a.ts"), "export const a = 1\n")
      g("add", ".")
      g("commit", "--quiet", "--no-verify", "-m", "init")
      mkdirSync(join(repo, ".claude"))
      execFileSync("node", [RECEIPT_SCRIPT, "write"], {
        stdio: "pipe",
        env: { ...process.env, VERIFY_RECEIPT_ROOT: repo, VERIFY_RECEIPT_PATH: join(repo, ".claude/.verify-receipt.json") },
      })

      expect(run(["clear"])).toBe(0) // le reçu du template ne couvre plus rien
      expect(gate(`git commit -m "feat: x" ${MARKER}`)).toBe(BLOCKED)
      expect(gate(`cd ${repo} && git commit -m "feat: x" ${MARKER}`)).toBe(ALLOWED)
      expect(gate(`git -C "${repo}" commit -m "feat: x" ${MARKER}`)).toBe(ALLOWED)
      if (process.platform === "win32") {
        // La forme Git Bash (`/c/…`) que produisent les sessions sous Windows.
        const posix = repo.replace(/\\/g, "/").replace(/^([a-zA-Z]):/, (_, d: string) => `/${d.toLowerCase()}`)
        expect(gate(`cd ${posix} && git commit -m "feat: x" ${MARKER}`)).toBe(ALLOWED)
      }

      writeFileSync(join(repo, "a.ts"), "export const a = 2\n")
      expect(gate(`cd ${repo} && git commit -m "feat: x" ${MARKER}`)).toBe(BLOCKED)
    } finally {
      rmSync(repo, { recursive: true, force: true })
    }
  })

  it("juge un autre dépôt de la méthode avec SON script de reçu, pas celui du template", { timeout: 30_000 }, () => {
    // Un dérivé peut avoir adapté `verify-receipt.mjs` (exclusions, empreinte) : jugé avec
    // l'algorithme du template, son reçu valide était refusé (bo-my, 2026-11-24).
    const repo = join(tmpdir(), `derived-repo-${process.pid}`)
    rmSync(repo, { recursive: true, force: true })
    execFileSync("git", ["init", "--quiet", repo], { stdio: "pipe" })
    try {
      mkdirSync(join(repo, "scripts"))
      writeFileSync(
        join(repo, "scripts/verify-receipt.mjs"),
        "import { existsSync } from 'node:fs'\nprocess.exit(process.argv[2] === 'check' && existsSync('recu-ok') ? 0 : 1)\n"
      )
      expect(gate(`cd ${repo} && git commit -m "x" ${MARKER}`)).toBe(BLOCKED)
      writeFileSync(join(repo, "recu-ok"), "")
      expect(gate(`cd ${repo} && git commit -m "x" ${MARKER}`)).toBe(ALLOWED)
      expect(gate(`git -C "${repo}" commit -m "x" ${MARKER}`)).toBe(ALLOWED)
      // Un message qui cite `git -C …` ne déplace pas le dépôt visé (bo-my, 2026-11-24).
      expect(gate(`cd ${repo} && git commit -m "fix: gate cd/git -C et dépôt hors méthode" ${MARKER}`)).toBe(ALLOWED)
      // Le marqueur reste exigé, et les interdits absolus aussi.
      expect(gate(`cd ${repo} && git commit -m "x"`)).toBe(BLOCKED)
      expect(gate(`cd ${repo} && git commit --no-verify -m "x" ${MARKER}`)).toBe(BLOCKED)
    } finally {
      rmSync(repo, { recursive: true, force: true })
    }
  })

  it("refuse dans un autre dépôt un reçu qui ne déclare pas les checks requis", { timeout: GIT_TIMEOUT }, () => {
    // Le gate se fie au `check --commit` du script du dépôt visé, et ce `check` ne relisait pas
    // les checks déclarés : un reçu « test » seul y ouvrait un commit de code (synchro 80c2c2d,
    // app-pmo-luciole, 2026-11-26). Le contrôle vit désormais dans `checkReceipt`.
    const repo = join(tmpdir(), `derived-checks-${process.pid}`)
    rmSync(repo, { recursive: true, force: true })
    const g = (...args: string[]) => execFileSync("git", args, { cwd: repo, stdio: "pipe" })
    execFileSync("git", ["init", "--quiet", repo], { stdio: "pipe" })
    try {
      g("config", "user.email", "test@test")
      g("config", "user.name", "test")
      mkdirSync(join(repo, "scripts"))
      writeFileSync(join(repo, "scripts/verify-receipt.mjs"), readFileSync(RECEIPT_SCRIPT))
      writeFileSync(join(repo, ".gitignore"), ".claude/.verify-receipt.json\n")
      writeFileSync(join(repo, "a.ts"), "export const a = 1\n")
      g("add", ".")
      g("commit", "--quiet", "--no-verify", "-m", "init")
      mkdirSync(join(repo, ".claude"))
      writeFileSync(join(repo, "a.ts"), "export const a = 2\n")
      // Sans VERIFY_RECEIPT_ROOT, le script copié hache SA racine : le dépôt jetable. Le reçu est
      // celui que le hook transmet au script (VERIFY_RECEIPT_PATH de `runHook`).
      const env: NodeJS.ProcessEnv = { ...RECEIPT_ENV }
      delete env.VERIFY_RECEIPT_ROOT
      const ecrireRecu = (...args: string[]) =>
        execFileSync("node", ["scripts/verify-receipt.mjs", "write", ...args], { cwd: repo, stdio: "pipe", env })
      ecrireRecu("test")
      expect(gate(`cd ${repo} && git commit -m "x" ${MARKER}`)).toBe(BLOCKED)
      ecrireRecu()
      expect(gate(`cd ${repo} && git commit -m "x" ${MARKER}`)).toBe(ALLOWED)
    } finally {
      rmSync(repo, { recursive: true, force: true })
    }
  })

  it("laisse passer un commit dans un dépôt qui n'utilise pas cette méthode", { timeout: 30_000 }, () => {
    // Une session ouverte ici travaille aussi dans d'autres dépôts (C:\apps\…) qui ont leur
    // propre gate. Le hook leur appliquait celui-ci, sans reçu possible : tout commit y était
    // refusé, et la seule issue était de contourner le hook (2026-11-24, web-framework-template).
    const repo = join(tmpdir(), `foreign-repo-${process.pid}`)
    rmSync(repo, { recursive: true, force: true })
    execFileSync("git", ["init", "--quiet", repo], { stdio: "pipe" })
    try {
      expect(gate(`cd ${repo} && git commit -m "x"`)).toBe(ALLOWED)
      expect(gate(`git -C "${repo}" push origin HEAD:main`)).toBe(ALLOWED)
      // Les interdits absolus restent, quel que soit le dépôt.
      expect(gate(`cd ${repo} && git push --force origin main`)).toBe(BLOCKED)
      // Le dépôt de la session reste gardé.
      expect(gate(`git commit -m "x"`)).toBe(BLOCKED)
      // Une commande dont les git ne visent pas tous le même dépôt n'est pas exemptée : le
      // commit de la session partait sans gate (relevé dans app-pmo-luciole, 2026-11-24).
      expect(gate(`git -C "${repo}" push origin HEAD && git commit -m "x"`)).toBe(BLOCKED)
      expect(gate(`cd ${repo} && git status && cd .. && git commit -m "x"`)).toBe(BLOCKED)
      // Plusieurs git dans le même dépôt visé par `cd` en tête restent exemptés.
      expect(gate(`cd ${repo} && git add a && git commit -m "x"`)).toBe(ALLOWED)
    } finally {
      rmSync(repo, { recursive: true, force: true })
    }
  })

  it("le gate refuse un commit marqué si aucun reçu ne couvre le code", () => {
    expect(run(["clear"])).toBe(0)
    expect(gate(`git commit -m "feat: x" ${MARKER}`)).toBe(BLOCKED)
    expect(run(["write"])).toBe(0)
    expect(gate(`git commit -m "feat: x" ${MARKER}`)).toBe(ALLOWED)
  })
})

describe("reçu doc", () => {
  // Une modification qui ne touche que la documentation de méthode ne demande que
  // `check:framework` : rejouer type-check, lint et tests sur un code inchangé ne prouvait rien
  // (décision JB, 2026-11-26). En contrepartie, un reçu doc ne doit jamais faire passer du code.
  const FICHIERS = {
    "a.ts": "export const a = 1\n",
    "CLAUDE.md": "# Méthode\n",
    "README.md": "# Lisez-moi\n",
    "docs/guide.md": "guide\n",
    ".method/conventions/x.md": "convention\n",
    "package.json": "{}\n",
  }
  let repo = ""
  const g = (...args: string[]) => execFileSync("git", args, { cwd: repo, stdio: "pipe" })
  const ecrire = (path: string, contenu: string) => {
    mkdirSync(join(repo, path, ".."), { recursive: true })
    writeFileSync(join(repo, path), contenu)
  }
  // Le reçu vit DANS le dépôt, comme dans un vrai dérivé : ignoré, sinon il compterait dans sa
  // propre empreinte. Le gate le lit à cet endroit pour un dépôt visé par `cd <dir> &&`.
  const recu = () => join(repo, ".claude/.verify-receipt.json")
  const script = (...args: string[]): number => {
    try {
      execFileSync("node", [RECEIPT_SCRIPT, ...args], {
        cwd: repo,
        stdio: "pipe",
        env: { ...process.env, VERIFY_RECEIPT_ROOT: repo, VERIFY_RECEIPT_PATH: recu() },
      })
      return 0
    } catch (error) {
      return (error as { status: number }).status
    }
  }
  const commit = () => gate(`cd ${repo} && git commit -m "docs: x" ${MARKER}`)

  beforeEach(() => {
    repo = join(tmpdir(), `docs-repo-${process.pid}-${Math.random().toString(36).slice(2)}`)
    execFileSync("git", ["init", "--quiet", repo], { stdio: "pipe" })
    g("config", "user.email", "test@test")
    g("config", "user.name", "test")
    ecrire(".gitignore", ".claude/.verify-receipt.json\n")
    for (const [path, contenu] of Object.entries(FICHIERS)) ecrire(path, contenu)
    g("add", ".")
    g("commit", "--quiet", "--no-verify", "-m", "init")
    mkdirSync(join(repo, ".claude"), { recursive: true })
  }, GIT_TIMEOUT)

  const nettoyer = () => rmSync(repo, { recursive: true, force: true })

  it("docs-only : 1 sans changement, 0 sur de la doc indexée, non suivie ou supprimée", { timeout: GIT_TIMEOUT }, () => {
    try {
      expect(script("docs-only")).toBe(1)
      ecrire("docs/guide.md", "guide v2\n")
      expect(script("docs-only")).toBe(0)
      ecrire(".claude/skills/dev/SKILL.md", "skill\n") // non suivi
      ecrire(".claude/agents/implementer.md", "agent\n")
      ecrire("README.md", "# Lisez-moi v2\n")
      g("add", "README.md") // indexé
      rmSync(join(repo, ".method/conventions/x.md")) // supprimé
      g("rm", "--quiet", "--cached", "CLAUDE.md") // suppression indexée, fichier gardé non suivi
      expect(script("docs-only")).toBe(0)
      // Un chemin exclu du reçu (écrit après les checks) ne compte pas.
      ecrire(".method/sprint/status.yaml", "sprint: 1\n")
      expect(script("docs-only")).toBe(0)
    } finally {
      nettoyer()
    }
  })

  it("docs-only : 1 dès qu'un chemin n'est pas de la documentation", { timeout: GIT_TIMEOUT }, () => {
    try {
      ecrire("docs/guide.md", "guide v2\n")
      for (const [path, contenu] of [
        ["a.ts", "export const a = 2\n"],
        ["package.json", '{"x":1}\n'],
        [".claude/settings.json", "{}\n"],
        [".claude/hooks/gate.mjs", "export {}\n"],
        [".method/sync-manifest.json", "{}\n"],
        ["docs/schema.json", "{}\n"],
        ["src/README.md", "# pas à la racine\n"],
      ]) {
        const avant = existsSync(join(repo, path)) ? readFileSync(join(repo, path), "utf8") : null
        ecrire(path, contenu)
        expect(script("docs-only"), path).toBe(1)
        if (avant === null) rmSync(join(repo, path))
        else ecrire(path, avant)
      }
      expect(script("docs-only")).toBe(0)
      // Suppression de code : pas de la doc non plus.
      rmSync(join(repo, "a.ts"))
      expect(script("docs-only")).toBe(1)
    } finally {
      nettoyer()
    }
  })

  it("écrit un reçu doc qui déclare check:framework et scope docs, refusé sur du code", { timeout: GIT_TIMEOUT }, () => {
    try {
      ecrire("a.ts", "export const a = 2\n")
      expect(script("write", "check:framework", "docs")).toBe(1)
      expect(existsSync(recu())).toBe(false)
      ecrire("a.ts", FICHIERS["a.ts"])
      ecrire("docs/guide.md", "guide v2\n")
      expect(script("write", "check:framework", "docs")).toBe(0)
      const ecrit = JSON.parse(readFileSync(recu(), "utf8"))
      expect(ecrit.checks).toEqual(["check:framework"])
      expect(ecrit.scope).toBe("docs")
    } finally {
      nettoyer()
    }
  })

  it("le gate accepte un reçu doc sur un commit de doc, le refuse dès que le code bouge", { timeout: GIT_TIMEOUT }, () => {
    try {
      ecrire("docs/guide.md", "guide v2\n")
      expect(script("write", "check:framework", "docs")).toBe(0)
      expect(commit()).toBe(ALLOWED)
      ecrire("a.ts", "export const a = 2\n")
      expect(commit()).toBe(BLOCKED)
      // Un reçu complet sur le même arbre reste accepté pour tout commit.
      expect(script("write")).toBe(0)
      expect(commit()).toBe(ALLOWED)
    } finally {
      nettoyer()
    }
  })

  it("le gate refuse un reçu doc dont l'arbre couvert porte du code par rapport à HEAD", { timeout: GIT_TIMEOUT }, () => {
    // L'empreinte porte sur le contenu de l'arbre, pas sur HEAD : après un `git reset --soft`,
    // le même arbre (donc un reçu toujours « valide ») contient du code jamais vérifié par
    // rapport au nouveau HEAD. Le gate doit juger le commit visé, pas seulement l'empreinte.
    try {
      ecrire("a.ts", "export const a = 2\n")
      g("commit", "--quiet", "--no-verify", "-am", "code")
      ecrire("docs/guide.md", "guide v2\n")
      expect(script("write", "check:framework", "docs")).toBe(0)
      expect(script("check")).toBe(0)
      g("reset", "--quiet", "--soft", "HEAD~1")
      expect(script("check")).toBe(0) // l'empreinte seule ne voit rien
      expect(script("check", "--commit")).toBe(1)
      expect(commit()).toBe(BLOCKED)
    } finally {
      nettoyer()
    }
  })

  it("le gate accepte un reçu doc après le commit de doc : rebase et merge sans verify complet", { timeout: GIT_TIMEOUT }, () => {
    // Une fois la doc commitée, plus rien ne diffère de HEAD : le refuser imposait un verify
    // complet pour rebaser sur un `main` qui avait bougé (décision JB, 2026-11-26).
    try {
      ecrire("docs/guide.md", "guide v2\n")
      expect(script("write", "check:framework", "docs")).toBe(0)
      g("commit", "--quiet", "--no-verify", "-am", "docs")
      expect(script("docs-only")).toBe(1) // aucun changement : pas un arbre de doc à vérifier
      expect(script("check", "--commit")).toBe(0)
      expect(gate(`cd ${repo} && git rebase main ${MARKER}`)).toBe(ALLOWED)
      expect(gate(`cd ${repo} && git merge feature/x ${MARKER}`)).toBe(ALLOWED)
    } finally {
      nettoyer()
    }
  })

  it("le gate refuse un reçu doc qui ne déclare pas check:framework", { timeout: GIT_TIMEOUT }, () => {
    try {
      ecrire("docs/guide.md", "guide v2\n")
      expect(script("write", "test", "docs")).toBe(0)
      expect(commit()).toBe(BLOCKED)
    } finally {
      nettoyer()
    }
  })

  it("verify:cached : rien si le reçu couvre l'arbre, check:framework seul sur de la doc, verify complet sinon", { timeout: 90_000 }, () => {
    // La chaîne exécutée est celle du package.json du template, dans un dépôt jetable où
    // `check:framework` et `verify` sont remplacés par des traces : on observe laquelle tourne.
    try {
      const reel = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")).scripts["verify:cached"]
      mkdirSync(join(repo, "scripts"))
      writeFileSync(join(repo, "scripts/verify-receipt.mjs"), readFileSync(RECEIPT_SCRIPT))
      const trace = (nom: string) => `node -e "require('fs').appendFileSync('trace.log','${nom} ')"`
      ecrire(
        "package.json",
        JSON.stringify({
          scripts: {
            "check:framework": trace("check:framework"),
            verify: `${trace("verify")} && node scripts/verify-receipt.mjs write`,
            "verify:cached": reel,
          },
        })
      )
      ecrire(".gitignore", ".claude/.verify-receipt.json\ntrace.log\n")
      g("add", ".")
      g("commit", "--quiet", "--no-verify", "-m", "outillage")
      const cached = () => {
        rmSync(join(repo, "trace.log"), { force: true })
        // Sans VERIFY_RECEIPT_*, le script copié prend SA racine : le dépôt jetable.
        const env = { ...process.env }
        delete env.VERIFY_RECEIPT_PATH
        delete env.VERIFY_RECEIPT_ROOT
        execFileSync("pnpm", ["run", "--silent", "verify:cached"], { cwd: repo, stdio: "pipe", env, shell: true })
        return existsSync(join(repo, "trace.log")) ? readFileSync(join(repo, "trace.log"), "utf8").trim() : ""
      }
      ecrire("docs/guide.md", "guide v2\n")
      expect(cached()).toBe("check:framework")
      expect(JSON.parse(readFileSync(recu(), "utf8")).scope).toBe("docs")
      expect(cached()).toBe("") // le reçu doc couvre l'arbre : rien ne rejoue
      ecrire("a.ts", "export const a = 2\n")
      expect(cached()).toBe("verify")
    } finally {
      nettoyer()
    }
  })
})

describe("enforce-bash-rules", () => {
  it("empêche de tronquer ou rediriger la sortie d'un check", () => {
    expect(bashRules("pnpm type-check | tail -20")).toBe(BLOCKED)
    expect(bashRules("pnpm test > out.txt")).toBe(BLOCKED)
  })

  it("laisse passer les checks bruts et les pipes hors checks", () => {
    expect(bashRules("pnpm type-check")).toBe(ALLOWED)
    expect(bashRules("pnpm install --frozen-lockfile")).toBe(ALLOWED)
    expect(bashRules("git log --oneline | head -5")).toBe(ALLOWED)
    expect(bashRules("ls -la | wc -l")).toBe(ALLOWED)
  })

  it("ne confond pas un nom de fichier ou de paquet avec l'exécution d'un check", () => {
    // Les règles ne visent QUE l'exécution d'un check. `-` et `.` valident une frontière de
    // mot : sans lookahead explicite, ces deux commandes légitimes étaient bloquées.
    expect(bashRules("pnpm add -D eslint-plugin-import")).toBe(ALLOWED)
    expect(bashRules('sed -i "s/a/b/" eslint.config.mjs > out.txt')).toBe(ALLOWED)
    expect(bashRules("cat vitest.config.ts | head -5")).toBe(ALLOWED)
  })

  it("autorise `run_in_background`, y compris sur un check", () => {
    // La règle qui le bloquait reposait sur « sa sortie serait invisible » — faux : le harness
    // notifie à la fin et la sortie reste récupérable. Et ce n'est pas la lecture de la sortie
    // qui atteste qu'un check est passé, c'est le reçu, écrit dans les deux cas.
    expect(bashRules("pnpm test", { run_in_background: true })).toBe(ALLOWED)
    expect(bashRules("pnpm verify", { run_in_background: true })).toBe(ALLOWED)
    expect(bashRules("pnpm build", { run_in_background: true })).toBe(ALLOWED)
    expect(bashRules("pnpm dev", { run_in_background: true })).toBe(ALLOWED)
    expect(bashRules("npx supabase start", { run_in_background: true })).toBe(ALLOWED)
    expect(bashRules("sleep 30", { run_in_background: true })).toBe(ALLOWED)

    // Les autres règles restent actives sur une commande en arrière-plan.
    expect(bashRules("pnpm test | tail -20", { run_in_background: true })).toBe(BLOCKED)
  })

  it("couvre `verify` et `verify:cached`, qui sont les commandes réellement utilisées", () => {
    // Les 4 checks ne sont plus lancés séparément : `pnpm verify` les enchaîne. La règle ne
    // visait que les commandes individuelles — la seule commande du workflow y échappait.
    expect(bashRules("pnpm verify | tail -20")).toBe(BLOCKED)
    expect(bashRules("pnpm verify:cached > out.txt")).toBe(BLOCKED)
    expect(bashRules("pnpm check:framework | head")).toBe(BLOCKED)
  })

  it("ne voit un check qu'en position de commande", () => {
    // Sans ancre, le simple mot `eslint` ou `vitest` n'importe où déclenchait la règle.
    expect(bashRules("ls node_modules/.bin | grep eslint")).toBe(ALLOWED)
    expect(bashRules("which vitest")).toBe(ALLOWED)
    expect(bashRules("rg 'pnpm test' docs/ | head -20")).toBe(ALLOWED)
    // …mais un check chaîné derrière `&&` ou un saut de ligne reste en position de commande :
    // une Bash multi-lignes est une seule chaîne.
    expect(bashRules("git status && pnpm type-check | tail -5")).toBe(BLOCKED)
    expect(bashRules("git status\npnpm type-check | tail -5")).toBe(BLOCKED)
  })
})
