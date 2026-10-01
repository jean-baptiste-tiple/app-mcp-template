"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, CircleNotch } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { forgotPasswordAction } from "@/lib/actions/auth"
import { forgotPasswordSchema } from "@/lib/schemas/auth"

export default function ForgotPasswordPage() {
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Email invalide")
      setLoading(false)
      return
    }

    const result = await forgotPasswordAction(formData)

    // L'action ne renvoie jamais d'erreur : même réponse que le compte existe ou non.
    setSuccess(result.data.message)
    setLoading(false)
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">
          Mot de passe oublié
        </CardTitle>
        <CardDescription>
          Entrez votre email pour recevoir un lien de réinitialisation
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-success/10 p-3 text-sm text-success">
              {success}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="nom@exemple.com"
              required
              autoComplete="email"
              autoFocus
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <CircleNotch className="mr-2 h-4 w-4 animate-spin" />}
            Envoyer le lien
          </Button>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Retour à la connexion
          </Link>
        </CardFooter>
      </form>
    </Card>
  )
}
