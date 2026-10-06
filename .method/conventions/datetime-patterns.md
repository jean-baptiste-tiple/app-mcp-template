# Date, Time & Number Patterns

> Tag : `datetime`
> Lire ce fichier pour le formatage des dates, heures, nombres et devises.

## Principe

Utiliser l'API **`Intl`** native pour le formatage. Pas besoin de lib externe pour le formatage simple. Utiliser **`date-fns`** uniquement pour les manipulations complexes (ajout de jours, différences, etc.).

## Dates

### Stockage (base de données)
- Toujours **UTC** en base : `timestamptz` (PostgreSQL)
- Format ISO 8601 : `2024-01-15T10:30:00Z`

### Formatage (affichage)
```typescript
// lib/utils/format-date.ts

export function formatDate(date: string | Date, locale = "fr-FR"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date))
  // → "15 janvier 2024"
}

export function formatDateTime(date: string | Date, locale = "fr-FR"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
  // → "15 janv. 2024, 10:30"
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const target = new Date(date)
  const diffMs = now.getTime() - target.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" })

  if (diffSec < 60) return "à l'instant"
  if (diffMin < 60) return rtf.format(-diffMin, "minute")
  if (diffHour < 24) return rtf.format(-diffHour, "hour")
  if (diffDay < 30) return rtf.format(-diffDay, "day")
  return formatDate(date)
}
```

### Avec date-fns (manipulations)
```typescript
import { addDays, differenceInDays, startOfWeek, format } from "date-fns"
import { fr } from "date-fns/locale"

// Ajouter des jours
const deadline = addDays(new Date(), 7)

// Différence
const daysLeft = differenceInDays(deadline, new Date())

// Format custom
format(new Date(), "EEEE d MMMM yyyy", { locale: fr })
// → "lundi 15 janvier 2024"
```

## Nombres

```typescript
export function formatNumber(value: number, locale = "fr-FR"): string {
  return new Intl.NumberFormat(locale).format(value)
  // 1234567 → "1 234 567"
}

export function formatPercent(value: number, locale = "fr-FR"): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)
  // 0.256 → "25,6 %"
}
```

## Devises

```typescript
export function formatCurrency(
  cents: number,
  currency = "EUR",
  locale = "fr-FR"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(cents / 100)
  // 2999 → "29,99 €"
}
```

**Règle :** Stocker les montants en **centimes** (integer) en base de données. Jamais de float pour l'argent.

### Schema Zod pour les montants
```typescript
const priceSchema = z.object({
  amount_cents: z.number().int().min(0),
  currency: z.enum(["EUR", "USD"]).default("EUR"),
})
```

## Validation des dates dans les formulaires

```typescript
import * as z from "zod/v4"

const dateRangeSchema = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
}).refine(
  (data) => new Date(data.end_date) > new Date(data.start_date),
  { message: "La date de fin doit être après la date de début", path: ["end_date"] }
)
```

## Règles

- **Stockage :** toujours UTC (`timestamptz`)
- **Affichage :** toujours locale de l'utilisateur via `Intl`
- **Argent :** toujours en centimes (int), formaté avec `Intl.NumberFormat`
- **Pas de `moment.js`** — trop lourd. Utiliser `date-fns` ou natif
- **Pas de formatage custom** (`.toLocaleDateString()` sans options) — utiliser les fonctions partagées
