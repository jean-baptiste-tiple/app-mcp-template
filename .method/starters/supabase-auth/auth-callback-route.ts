import { NextResponse } from "next/server"
import { redirectPathSchema } from "@/lib/schemas/auth"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  // `next` vient de l'URL : seul un chemin du site est accepté (`redirectPathSchema`). `//hote`,
  // `/\hote` ou `@hote` concaténés à `origin` feraient de cette route une redirection ouverte.
  const next = redirectPathSchema.parse(searchParams.get("next"))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
