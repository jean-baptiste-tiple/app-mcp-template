import type { Metadata } from "next"

import { CopyButton } from "@/components/copy-button"
import { PageContainer } from "@/components/page-container"
import { MCP_RESOURCE_URL, MCP_SERVER_INFO } from "@/mcp/config"

// Page d'onboarding du canal MCP (mcp-patterns §9) : cible de `resource_documentation` dans la
// metadata OAuth (src/app/.well-known/oauth-protected-resource/route.ts).
// PERSONNALISER à la story de setup : nom du produit, prompts d'exemple (golden queries).
export const metadata: Metadata = { title: "Connecter l'assistant" }

const CLAUDE_CODE_COMMAND = `claude mcp add --transport http ${MCP_SERVER_INFO.name} ${MCP_RESOURCE_URL}`

export default function ConnectPage() {
  return (
    <PageContainer
      heading="Connecter l'assistant"
      description="Utilisez l'app depuis Claude ou ChatGPT : ajoutez son serveur MCP comme connecteur."
    >
      <div className="max-w-2xl space-y-8">
        <section aria-labelledby="connect-url" className="space-y-2">
          <h2 id="connect-url" className="text-lg font-semibold">
            URL du serveur
          </h2>
          <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
            <code className="min-w-0 flex-1 truncate text-sm">{MCP_RESOURCE_URL}</code>
            <CopyButton value={MCP_RESOURCE_URL} label="Copier l'URL" />
          </div>
        </section>

        <section aria-labelledby="connect-hosts" className="space-y-3">
          <h2 id="connect-hosts" className="text-lg font-semibold">
            Ajouter le connecteur
          </h2>
          <ol className="list-decimal space-y-3 pl-5 text-sm">
            <li>
              <strong>Claude</strong> (claude.ai, Desktop) : Paramètres → Connecteurs → Ajouter,
              puis collez l&apos;URL ci-dessus et connectez votre compte.
            </li>
            <li>
              <strong>ChatGPT</strong> : activez le mode développeur, créez une app avec
              l&apos;URL ci-dessus, puis sélectionnez-la dans une conversation.
            </li>
            <li className="space-y-2">
              <span>
                <strong>Claude Code</strong> : dans un terminal,
              </span>
              <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
                <code className="min-w-0 flex-1 truncate">{CLAUDE_CODE_COMMAND}</code>
                <CopyButton value={CLAUDE_CODE_COMMAND} size="icon" />
              </div>
            </li>
          </ol>
        </section>
      </div>
    </PageContainer>
  )
}
