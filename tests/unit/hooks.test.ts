import { execFileSync } from "node:child_process"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
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
  })

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

  it("n'accepte le marqueur qu'en fin de commande, jamais dans un message ou une description", () => {
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

  it("ne bloque pas un message de commit qui contient le texte d'un flag interdit", () => {
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

  it("refuse les formes agglomérées de --force", () => {
    // `git push -fu origin main` est la forme la plus courante d'un push forcé. `-f\b` ne coupe
    // pas entre `f` et `u` : elle franchissait l'interdit.
    expect(gate(`git push -fu origin main ${MARKER}`)).toBe(BLOCKED)
    expect(gate(`git push -uf origin main ${MARKER}`)).toBe(BLOCKED)
  })

  it("exige un reçu de tout verbe qui produit un commit, mais pas du push", () => {
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

  it("refuse un reçu qui ne déclare pas les 4 checks", () => {
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

  it("le gate refuse un commit marqué si aucun reçu ne couvre le code", () => {
    expect(run(["clear"])).toBe(0)
    expect(gate(`git commit -m "feat: x" ${MARKER}`)).toBe(BLOCKED)
    expect(run(["write"])).toBe(0)
    expect(gate(`git commit -m "feat: x" ${MARKER}`)).toBe(ALLOWED)
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
