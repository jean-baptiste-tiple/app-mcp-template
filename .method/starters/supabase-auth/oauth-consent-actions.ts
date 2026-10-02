"use server"

import { redirect } from "next/navigation"
import {
  assistantRedirectSchema,
  authorizationIdSchema,
  consentDecisionSchema,
} from "@/lib/schemas/auth"
import { createClient } from "@/lib/supabase/server"

const CONSENT_PATH = "/oauth/consent"

/**
 * « Autoriser » / « Refuser » sur la page de consentement OAuth (serveur OAuth 2.1 de Supabase,
 * canal MCP). La session d'abord : la page a pu vieillir. Les redirections sont hors de tout `try`
 * (api-patterns § Type de retour standard) : vers l'assistant, ou de retour sur la demande.
 */
export async function decideConsentAction(formData: FormData): Promise<never> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    const id = authorizationIdSchema.safeParse(formData.get("authorization_id"))
    const back = id.success ? `${CONSENT_PATH}?authorization_id=${id.data}` : CONSENT_PATH
    redirect(`/login?redirect=${encodeURIComponent(back)}`)
  }

  const parsed = consentDecisionSchema.safeParse(Object.fromEntries(formData))
  // Formulaire altéré : la page affiche « lien invalide », sans appel à Supabase.
  if (!parsed.success) redirect(CONSENT_PATH)
  const { authorization_id: authorizationId, decision } = parsed.data

  // skipBrowserRedirect : Supabase rend l'adresse de retour au lieu de rediriger lui-même ;
  // c'est l'app qui redirige, après avoir vérifié qu'elle est en http(s).
  const options = { skipBrowserRedirect: true }
  const { data, error } =
    decision === "approve"
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, options)
      : await supabase.auth.oauth.denyAuthorization(authorizationId, options)
  const target = assistantRedirectSchema.safeParse(data?.redirect_url)
  if (error || !target.success) {
    console.error(`[oauth] consent ${decision} failed`, error?.status ?? "invalid redirect_url")
    redirect(`${CONSENT_PATH}?authorization_id=${authorizationId}&error=decision`)
  }
  redirect(target.data)
}
