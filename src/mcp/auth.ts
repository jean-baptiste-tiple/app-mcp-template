// Validation des tokens OAuth 2.1 (Supabase = authorization server) — mcp-patterns §6.
// Signature vérifiée via JWKS, puis client Supabase construit AU JWT DE L'UTILISATEUR
// → RLS active dans les tools exactement comme au web. `service_role` INTERDIT ici.
// Le jeton dit QUI appelle, rien de plus : l'organisation (déduite de l'adresse appelée) et le
// rôle sont relus en base à chaque appel, via ce client (§6.7) — jamais lus dans un claim, qui
// survivrait à un retrait de droit jusqu'à l'expiration du jeton.
import { createRemoteJWKSet, jwtVerify } from "jose"
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js"

import { supabaseIssuer } from "./config"

// TODO(S01) : décommenter après install du starter supabase-auth.
// import { createClient, type SupabaseClient } from "@supabase/supabase-js"
// const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
// const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

// JWKS Supabase (clés de signature asymétriques). Cache interne à jose, lazy
// (réutilisé entre invocations serverless chaudes).
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null
function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${supabaseIssuer()}/.well-known/jwks.json`))
  }
  return jwks
}

export interface AuthContext {
  userId: string
  // supabase: SupabaseClient // TODO(S01) : décommenter avec supabase-auth
}

/**
 * Vérifie un token OAuth Supabase (signature JWKS, issuer, exp/nbf) et renvoie
 * un AuthInfo. Renvoie `undefined` si absent/invalide → withMcpAuth répond 401.
 * `extra.userId` = `sub` du jeton.
 */
export async function verifyToken(
  _req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined
  try {
    const { payload } = await jwtVerify(bearerToken, getJwks(), {
      issuer: supabaseIssuer(),
    })
    const userId = typeof payload.sub === "string" ? payload.sub : undefined
    if (!userId) return undefined

    const scope = typeof payload.scope === "string" ? payload.scope : ""

    return {
      token: bearerToken,
      clientId: userId,
      scopes: scope ? scope.split(" ") : [],
      expiresAt: typeof payload.exp === "number" ? payload.exp : undefined,
      extra: { userId },
    }
  } catch {
    return undefined
  }
}

/**
 * Résout l'AuthContext d'un tool depuis l'`extra` du handler MCP.
 * À appeler en tête de CHAQUE tool authentifié (§1). Projet multi-organisations : le service
 * résout ensuite l'organisation depuis l'adresse appelée (`extra.requestInfo`) et vérifie
 * l'appartenance et le rôle en base, via `ctx.supabase`, à chaque appel (§6.7).
 */
export function requireAuthContext(extra: { authInfo?: AuthInfo }): AuthContext {
  const info = extra.authInfo
  const userId = typeof info?.extra?.userId === "string" ? info.extra.userId : undefined
  if (!info?.token || !userId) {
    // Erreur actionnable (§4) — le tool la transforme en résultat isError
    throw new Error("Authentication required. Connect your account to use this tool.")
  }

  return {
    userId,
    // TODO(S01) : client au JWT de l'utilisateur → RLS active (jamais service_role)
    // supabase: createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    //   global: { headers: { Authorization: `Bearer ${info.token}` } },
    //   auth: { persistSession: false, autoRefreshToken: false },
    // }),
  }
}
