"use server"

import { revalidatePath } from "next/cache"
import { redirect, unstable_rethrow } from "next/navigation"
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/schemas/auth"
import { createClient } from "@/lib/supabase/server"

/**
 * Les messages d'erreur d'auth sont des CONSTANTES, jamais `error.message`.
 * Supabase renvoie « User already registered » sur un email déjà inscrit : le relayer au
 * client donne un oracle d'énumération de comptes sur la page d'inscription. Même logique au
 * login : ne jamais distinguer « email inconnu » de « mot de passe faux ».
 */
const GENERIC_ERROR = "Une erreur est survenue. Réessayez."
const INVALID_CREDENTIALS = "Email ou mot de passe incorrect."

function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL
  if (!url) throw new Error("NEXT_PUBLIC_SITE_URL manquant — voir .env.example")
  return url.replace(/\/$/, "")
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: INVALID_CREDENTIALS }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: INVALID_CREDENTIALS }

  revalidatePath("/", "layout")
  redirect("/")
}

export async function signupAction(formData: FormData) {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback` },
  })
  // Réponse identique que le compte existe ou non : pas d'oracle d'énumération.
  if (error) return { error: GENERIC_ERROR }

  revalidatePath("/", "layout")
  return { data: { message: "Vérifiez votre email pour confirmer votre compte." } }
}

export async function forgotPasswordAction(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData))
  // Message de succès même sur email invalide ou inconnu : l'existence d'un compte ne fuite pas.
  const confirmation = { data: { message: "Si un compte existe, un email vous a été envoyé." } }
  if (!parsed.success) return confirmation

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  })

  return confirmation
}

export async function resetPasswordAction(formData: FormData) {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Mot de passe invalide" }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
    if (error) return { error: GENERIC_ERROR }

    revalidatePath("/", "layout")
    redirect("/")
  } catch (error) {
    // redirect() lève NEXT_REDIRECT : sans ce rethrow, le catch avalerait la redirection.
    unstable_rethrow(error)
    return { error: GENERIC_ERROR }
  }
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}
