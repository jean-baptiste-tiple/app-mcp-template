"use client"

import * as React from "react"
import { Bell, Trash } from "@phosphor-icons/react"

import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Section } from "./section"

export function AlertsSection() {
  return (
    <Section title="Alerts">
      <div className="space-y-3 max-w-2xl">
        <Alert>
          <Bell className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Information</AlertTitle>
          <AlertDescription>
            Ceci est une alerte informative avec le style par défaut.
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <Trash className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            Cette action est irréversible. Toutes les données seront supprimées.
          </AlertDescription>
        </Alert>
      </div>
    </Section>
  )
}

export function FeedbackSection() {
  const [progress, setProgress] = React.useState(45)

  React.useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => (p >= 100 ? 0 : p + 5))
    }, 500)
    return () => clearInterval(timer)
  }, [])

  return (
    <Section title="Feedback">
      <div className="max-w-md space-y-4">
        <div className="space-y-2">
          <Label id="progress-demo-label">Progress</Label>
          <Progress value={progress} aria-labelledby="progress-demo-label" />
        </div>
        <div className="space-y-2">
          <Label>Spinner</Label>
          <div className="flex items-center gap-4">
            <Spinner size="sm" />
            <Spinner />
            <Spinner size="lg" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Skeleton</Label>
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[160px]" />
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}
