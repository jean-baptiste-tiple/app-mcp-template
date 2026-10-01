// Boilerplate de montage React + hook de données partagé par tous les widgets.
import { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"

import { getToolOutput, onToolOutput } from "./bridge"

/** Récupère le tool output (synchro si déjà là, sinon via push async du host). */
export function useToolOutput<T>(): T | null {
  const [output, setOutput] = useState<T | null>(() => getToolOutput<T>())
  useEffect(() => {
    const unsub = onToolOutput<T>((o) => setOutput(o))
    // Filet : certains hosts posent la donnée sans émettre d'événement qu'on connaît.
    // On sonde tant que rien n'est arrivé (400 ms × 30 ≈ 12 s), puis on s'arrête.
    let tries = 0
    const timer = setInterval(() => {
      tries += 1
      const late = getToolOutput<T>()
      if (late != null || tries >= 30) {
        clearInterval(timer)
        if (late != null) setOutput((prev) => prev ?? late)
      }
    }, 400)
    return () => {
      clearInterval(timer)
      unsub()
    }
  }, [])
  return output
}

export function mount(node: React.ReactNode): void {
  const el = document.getElementById("root")
  if (!el) throw new Error("#root introuvable")
  createRoot(el).render(node)
}
