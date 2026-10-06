# Auth Patterns — Supabase Auth

> Tag : `auth`
> Lire ce fichier pour toute story touchant à l'authentification, l'inscription, ou la gestion de session.

## Architecture Auth

```
Browser                    Next.js Server              Supabase
  │                            │                         │
  ├── Login form ──────────────┤                         │
  │                            ├── signInWithPassword ───┤
  │                            │◄── session + cookies ───┤
  │◄── Set cookies ────────────┤                         │
  │                            │                         │
  ├── Navigate /dashboard ─────┤                         │
  │                            ├── middleware: refresh ───┤
  │                            │◄── valid session ───────┤
  │◄── Page HTML ──────────────┤                         │
```

## Flows

### Signup (email/password)
```typescript
"use server"
export async function signupAction(formData: FormData): Promise<ActionResult<void>> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "Données invalides" }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    // Ne PAS révéler si l'email existe déjà
    return { error: "Impossible de créer le compte. Vérifiez vos informations." }
  }

  return { data: undefined } // Afficher "Vérifiez votre email"
}
```

### Login
```typescript
"use server"
export async function loginAction(formData: FormData): Promise<ActionResult<void>> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "Données invalides" }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) return { error: "Email ou mot de passe incorrect" }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}
```

### Password Reset
```typescript
// Étape 1 : demande de reset
"use server"
export async function requestPasswordResetAction(formData: FormData): Promise<ActionResult<void>> {
  const email = formData.get("email") as string
  const parsed = z.string().email().safeParse(email)
  if (!parsed.success) return { error: "Email invalide" }

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
  })

  // Toujours retourner succès (ne pas révéler si l'email existe)
  return { data: undefined }
}

// Étape 2 : nouveau mot de passe (après clic sur le lien email)
"use server"
export async function updatePasswordAction(formData: FormData): Promise<ActionResult<void>> {
  const parsed = updatePasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "Mot de passe invalide" }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) return { error: "Impossible de mettre à jour le mot de passe" }

  redirect("/login?message=password-updated")
}
```

### Logout
```typescript
"use server"
export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
```

### Auth Callback (email confirmation / password reset)
```typescript
// app/auth/callback/route.ts
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  // `next` vient de l'URL : seul un chemin relatif du site est accepté. `//hote` ou `@hote`
  // concaténés à `origin` feraient de cette route une redirection ouverte.
  const requested = searchParams.get("next")
  const next = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth-failed`)
}
```

## Middleware

```typescript
// src/middleware.ts
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_ROUTES = ["/login", "/signup", "/forgot-password", "/auth/callback"]

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* getAll, setAll sur response */ } }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  // `getUser()` peut rafraîchir la session et écrire de nouveaux cookies sur `response`.
  // Un `NextResponse.redirect()` neuf ne les porte pas : l'ancien refresh token est déjà
  // consommé côté Supabase, le nouveau est jeté → déconnexion aléatoire et boucle de
  // redirection. C'est le footgun n°1 de @supabase/ssr.
  function redirectTo(pathname: string) {
    const url = request.nextUrl.clone()
    url.pathname = pathname
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  if (!user && !isPublicRoute) return redirectTo("/login")
  if (user && request.nextUrl.pathname === "/login") return redirectTo("/dashboard")

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
```

## Schemas de validation Auth

```typescript
// lib/schemas/auth.ts
import * as z from "zod/v4"

export const loginSchema = z.object({
  email: z.string().email("Email invalide").max(255),
  password: z.string().min(1, "Mot de passe requis").max(72),
})

export const signupSchema = z.object({
  fullName: z.string().min(2, "Nom trop court").max(100),
  email: z.string().email("Email invalide").max(255),
  password: z
    .string()
    .min(8, "Minimum 8 caractères")
    .max(72) // bcrypt (Supabase Auth) ignore tout au-delà de 72 octets
    .regex(/[A-Z]/, "Au moins une majuscule")
    .regex(/[0-9]/, "Au moins un chiffre"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
})

export const updatePasswordSchema = z.object({
  password: z.string().min(8).max(72).regex(/[A-Z]/).regex(/[0-9]/),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
})

export type LoginData = z.infer<typeof loginSchema>
export type SignupData = z.infer<typeof signupSchema>
```

## Sécurité Auth

- **Messages génériques :** "Email ou mot de passe incorrect" (jamais "Email non trouvé")
- **Rate limiting :** 5 tentatives de login / minute / IP
- **Tokens de reset :** expirent après 1h (géré par Supabase)
- **Sessions :** cookie `httpOnly`, `secure`, `sameSite=lax`
- **Vérifier l'auth dans CHAQUE Server Action** — le middleware ne suffit pas

## OAuth (si applicable)

```typescript
"use server"
export async function signInWithGoogleAction() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) return { error: "Échec de la connexion Google" }
  redirect(data.url)
}
```
