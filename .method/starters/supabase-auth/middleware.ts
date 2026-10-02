import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

// Routes servies sans session. `/api` et `/.well-known` : le canal MCP fait sa propre auth
// (401 + WWW-Authenticate, que les hosts Claude et ChatGPT attendent pour lancer OAuth) — une
// redirection vers /login casserait la découverte. Conséquence : tout nouveau route handler sous
// `/api` naît public et vérifie lui-même l'auth (mcp-patterns.md § 6 bis).
const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/design-system",
  "/api",
  "/.well-known",
]

/** Préfixe par segment entier : `/api` couvre `/api/mcp`, pas `/apidoc`. */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

/**
 * Où envoyer une requête sans session, ou `null` pour la laisser passer.
 * - POST de `/oauth/consent` (Server Action de la décision) : passe. Redirigé, il serait rejoué
 *   sur /login ; l'action revérifie la session et renvoie elle-même à la connexion.
 * - GET d'une page : `/login?redirect=<page>` pour y revenir après la connexion (le consentement
 *   OAuth d'un assistant MCP en dépend, sinon la demande est perdue).
 */
export function loginRedirectFor(method: string, pathname: string, search: string): string | null {
  if (isPublicRoute(pathname)) return null
  if (method === "POST" && pathname === "/oauth/consent") return null
  if (method === "GET" && pathname !== "/") {
    return `/login?redirect=${encodeURIComponent(`${pathname}${search}`)}`
  }
  return "/login"
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const destination = user
    ? null
    : loginRedirectFor(request.method, request.nextUrl.pathname, request.nextUrl.search)
  if (destination) {
    const target = new URL(destination, request.url)
    const url = request.nextUrl.clone()
    url.pathname = target.pathname
    url.search = target.search
    // `getUser()` a pu rafraîchir la session et écrire de nouveaux cookies sur
    // `supabaseResponse`. Une réponse de redirection neuve ne les porte pas : l'ancien
    // refresh token est déjà consommé côté Supabase et le nouveau serait jeté, ce qui
    // produit des déconnexions aléatoires. Recopier les cookies avant de retourner.
    const redirect = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
