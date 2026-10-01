import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  // `next` vient de l'URL : seul un chemin relatif du site est accepté. `//hote` ou `@hote`
  // concaténés à `origin` feraient de cette route une redirection ouverte.
  const requested = searchParams.get("next")
  const next = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
