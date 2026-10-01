"use client"

import { useState } from "react"
import { Check, Copy } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"

interface CopyButtonProps {
  value: string
  label?: string
  size?: "default" | "sm" | "icon"
  variant?: "default" | "outline" | "ghost" | "secondary"
}

/** Bouton "copier dans le presse-papiers" avec feedback visuel (2 s). */
export function CopyButton({
  value,
  label,
  size = "sm",
  variant = "outline",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleCopy}
        // Avec un libellé visible, c'est lui le nom accessible (WCAG 2.5.3) : pas d'aria-label.
        aria-label={label ? undefined : copied ? "Copié" : "Copier dans le presse-papiers"}
      >
        {copied ? (
          <Check className="text-success" aria-hidden="true" />
        ) : (
          <Copy aria-hidden="true" />
        )}
        {label ? <span>{copied ? "Copié" : label}</span> : null}
      </Button>
      {/* Le changement de libellé n'est pas annoncé de lui-même : région live, hors du bouton
          pour ne pas polluer son nom accessible. */}
      <span role="status" className="sr-only">
        {copied ? "Copié dans le presse-papiers" : ""}
      </span>
    </>
  )
}
