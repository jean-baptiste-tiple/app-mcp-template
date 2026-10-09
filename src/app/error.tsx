"use client"

import { useEffect } from "react"
import { Warning } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Détails techniques côté console uniquement — jamais affichés à l'utilisateur.
  useEffect(() => {
    console.error("[app error]", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <Warning className="h-6 w-6 text-destructive" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Une erreur est survenue</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Réessayez. Si le problème persiste, contactez le support.
        </p>
      </div>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  )
}
