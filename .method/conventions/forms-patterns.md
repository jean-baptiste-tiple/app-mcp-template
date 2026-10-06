# Forms Patterns — React Hook Form + Zod + Server Actions

> Côté serveur (validation, retour, revalidation) : `api-patterns.md`.

## Principe

Un schema Zod dans `src/lib/schemas/` = **une seule source de vérité**, validé côté form
**et** côté action. Pas de double validation manuelle : si les deux divergent, c'est la
version serveur qui compte et l'utilisateur voit une erreur qu'il ne comprend pas.

Les schémas s'écrivent en `zod/v4` (`import * as z from "zod/v4"`, livré par zod 3.25), lu par
`@hookform/resolvers` 5 côté formulaire, par le SDK MCP côté tool et par `defineErpFunction` si la
plateforme Otomata est activée (ADR-001). L'import de `"zod"` est refusé par ESLint.

Le composant gère les quatre états : idle, pending, error (inline), success (redirect ou toast).

## Pattern standard

```tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { createProjectSchema, type CreateProjectData } from "@/lib/schemas/project"
import { createProjectAction } from "@/lib/actions/project"

export function CreateProjectForm() {
  const [isPending, startTransition] = useTransition()
  const form = useForm<CreateProjectData>({
    resolver: zodResolver(createProjectSchema),
    mode: "onBlur", // valide au blur, pas à chaque frappe
  })

  function onSubmit(data: CreateProjectData) {
    startTransition(async () => {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => formData.append(key, String(value)))
      const result = await createProjectAction(formData)
      if (result.error) form.setError("root", { message: result.error })
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Champs */}
      {form.formState.errors.root && (
        <p role="alert" className="text-sm text-destructive">
          {form.formState.errors.root.message}
        </p>
      )}
      <button type="submit" disabled={isPending}>
        {isPending ? "Création…" : "Créer"}
      </button>
    </form>
  )
}
```

## Formulaire progressif (sans JavaScript)

Pour un formulaire simple, `<form action={serverAction}>` fonctionne **avant** l'hydratation.
Préférer cette forme quand il n'y a pas de validation client complexe.

```tsx
"use client"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"

function SubmitButton() {
  const { pending } = useFormStatus() // doit être DANS le <form>, pas à côté
  return <button disabled={pending}>{pending ? "Envoi…" : "Envoyer"}</button>
}

export function ContactForm() {
  const [state, action] = useActionState(sendMessageAction, { error: undefined })
  return (
    <form action={action}>
      <input name="email" type="email" required />
      {state.error && <p role="alert">{state.error}</p>}
      <SubmitButton />
    </form>
  )
}
```

**Vérifiable :** une mutation déclenchée par un formulaire passe par `action={}` ou par
`handleSubmit` + Server Action — jamais par `onSubmit` + `fetch("/api/…")`.

## Validation asynchrone (unicité, disponibilité)

```tsx
// Debounce obligatoire : sans lui, chaque frappe déclenche une requête serveur.
const checkSlug = useDebouncedCallback(async (slug: string) => {
  const { available } = await checkSlugAvailability(slug)
  if (!available) form.setError("slug", { message: "Ce nom est déjà pris" })
  else form.clearErrors("slug")
}, 400)
```

**La validation asynchrone client est un confort, jamais une garantie.** L'unicité réelle est
portée par une contrainte `UNIQUE` en base, et l'action traduit l'erreur `23505` en message
utilisateur. Entre le check et la soumission, un autre utilisateur peut avoir pris la valeur.

## Mise à jour optimiste

```tsx
"use client"
import { useOptimistic, useTransition } from "react"

export function TodoList({ items }: { items: Todo[] }) {
  const [optimisticItems, addOptimistic] = useOptimistic(items, (state, item: Todo) => [
    ...state,
    item,
  ])
  const [, startTransition] = useTransition()

  function handleAdd(formData: FormData) {
    const title = String(formData.get("title") ?? "")
    startTransition(async () => {
      // L'ajout optimiste DOIT être dans la transition : hors d'elle, React le rejette.
      addOptimistic({ id: crypto.randomUUID(), title, completed: false })
      await createTodoAction(formData)
    })
  }

  return <form action={handleAdd}>{/* … */}</form>
}
```

L'état optimiste est **réconcilié automatiquement** quand la Server Action revalide : ne pas
essayer de le corriger à la main. En cas d'échec, l'élément disparaît — d'où la nécessité de
retourner `{ error }` et de l'afficher, sinon l'utilisateur voit sa saisie s'évanouir sans
explication.

À réserver aux actions rapides et à faible taux d'échec (cocher, réordonner, ajouter une ligne).
Sur une action qui peut échouer souvent, un état de chargement franc est moins déroutant.

## Double soumission

`useTransition` et `useFormStatus` désactivent le bouton, mais ne dédupliquent **pas** côté
serveur : un double-clic rapide ou un retry réseau peut exécuter l'action deux fois. Pour une
création facturable ou non réversible, voir `security-patterns.md § Idempotence`.

## Règles

- Un schema = un formulaire = une action. Le schema vit dans `src/lib/schemas/`.
- Les erreurs de champ s'affichent **inline**, sous le champ concerné ; l'erreur globale porte `role="alert"`.
- **Vérifiable :** tout champ a un `<label>` associé (`htmlFor` / `id`) — voir `accessibility-patterns.md`.
- **Vérifiable :** aucun `useState` par champ quand React Hook Form est déjà là.
- Les valeurs par défaut sont dans `defaultValues`, pas dans le JSX.
