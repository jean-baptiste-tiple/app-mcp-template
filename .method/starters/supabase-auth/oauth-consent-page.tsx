import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { decideConsentAction } from "@/lib/actions/oauth-consent"
import { assistantRedirectSchema, authorizationIdSchema } from "@/lib/schemas/auth"
import { createClient } from "@/lib/supabase/server"

// Page de consentement du serveur OAuth 2.1 de Supabase (canal MCP, mcp-patterns § 6) : Supabase y
// envoie la personne (`<site>/oauth/consent?authorization_id=…`) avant de délivrer un code à
// l'assistant (Claude, ChatGPT, Claude Code). Chemin à déclarer côté Supabase (Authorization Path).
export const metadata: Metadata = {
  title: "Autoriser un assistant",
  robots: { index: false },
}

const INVALID = "Ce lien ne porte pas de demande d'autorisation valide. Relancez la connexion depuis votre assistant."
const EXPIRED = "Cette demande a expiré, a déjà été tranchée ou a été ouverte avec un autre compte. Relancez la connexion depuis votre assistant."
const DECISION_FAILED = "La décision n'a pas pu être enregistrée. Réessayez."

function ConsentMessage({ text }: { text: string }) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Autoriser un assistant</CardTitle>
        <CardDescription role="alert">{text}</CardDescription>
      </CardHeader>
    </Card>
  )
}

export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string | string[]; error?: string | string[] }>
}) {
  const params = await searchParams
  const id = authorizationIdSchema.safeParse(params.authorization_id)
  if (!id.success) return <ConsentMessage text={INVALID} />

  // Le middleware ne suffit pas : la page revérifie la session (nextjs-patterns, frontière d'autorisation).
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/oauth/consent?authorization_id=${id.data}`)}`)
  }

  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(id.data)
  if (error || !data) return <ConsentMessage text={EXPIRED} />
  // Consentement déjà donné à ce client : Supabase rend directement l'adresse de retour.
  if (!("authorization_id" in data)) {
    const target = assistantRedirectSchema.safeParse(data.redirect_url)
    if (!target.success) return <ConsentMessage text={EXPIRED} />
    redirect(target.data)
  }

  // Supabase omet `scope` quand il est vide.
  const scopes = (data.scope ?? "").split(/\s+/).filter(Boolean)
  const failed = params.error === "decision"

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold">Autoriser {data.client.name || "cet assistant"}</CardTitle>
        <CardDescription>
          {data.client.name || "Cet assistant"} demande l&apos;accès à votre compte {data.user.email}.
        </CardDescription>
      </CardHeader>
      <form action={decideConsentAction}>
        <input type="hidden" name="authorization_id" value={id.data} />
        <CardContent className="space-y-3 text-sm">
          {failed ? (
            <p role="alert" className="rounded-md bg-destructive/10 p-3 text-destructive">
              {DECISION_FAILED}
            </p>
          ) : null}
          {scopes.length > 0 ? (
            <div>
              <p className="font-medium">Accès demandés</p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {scopes.map((scope) => (
                  <li key={scope}>{scope}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-muted-foreground">
            L&apos;assistant agira en votre nom, avec vos droits. Vous pourrez retirer cet accès depuis
            ses paramètres de connecteurs.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="submit" name="decision" value="deny" variant="outline">
            Refuser
          </Button>
          <Button type="submit" name="decision" value="approve">
            Autoriser
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
