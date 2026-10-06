import * as z from "zod/v4"

// Source unique des règles d'auth : les formulaires (validation client, confort) et les
// Server Actions (validation serveur, sécurité) lisent les mêmes schémas.
const PASSWORD_MIN_LENGTH = 8
// bcrypt (Supabase Auth) ignore silencieusement tout au-delà de 72 octets.
const PASSWORD_MAX_LENGTH = 72

const emailField = z.string().email("Email invalide").max(255, "Email trop long")
const newPasswordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`)
  .max(PASSWORD_MAX_LENGTH, "Mot de passe trop long")

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Mot de passe requis").max(PASSWORD_MAX_LENGTH, "Mot de passe trop long"),
})

export const signupSchema = z
  .object({
    email: emailField,
    password: newPasswordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  })

export const forgotPasswordSchema = z.object({
  email: emailField,
})

export const resetPasswordSchema = z
  .object({
    password: newPasswordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  })

/**
 * Chemin de retour après connexion (`?redirect=`, `?next=`) : il vient de l'URL, donc d'un tiers.
 * Seul un chemin du site passe : `//hote` et `/\hote` (le navigateur lit `\` comme `/`)
 * feraient de la connexion une redirection ouverte. Toute autre valeur retombe sur `/`.
 */
export const redirectPathSchema = z
  .string()
  .regex(/^\/(?![/\\])/)
  .max(2048)
  .catch("/")

/** Identifiant d'une demande d'autorisation OAuth (`authorization_id`), émis par Supabase. */
export const authorizationIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,255}$/)

/** Le formulaire de la page de consentement : la demande, et le bouton choisi. */
export const consentDecisionSchema = z.object({
  authorization_id: authorizationIdSchema,
  decision: z.enum(["approve", "deny"]),
})

/**
 * Adresse de retour vers l'assistant rendue par Supabase après la décision : http(s) uniquement
 * (`http://localhost:<port>/callback` pour Claude Code), jamais `javascript:` ni un autre schéma.
 */
export const assistantRedirectSchema = z
  .string()
  .url()
  .refine((value) => /^https?:\/\//i.test(value))

export type LoginData = z.infer<typeof loginSchema>
export type SignupData = z.infer<typeof signupSchema>
export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>
