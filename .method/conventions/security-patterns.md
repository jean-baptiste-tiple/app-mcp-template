# Security Patterns

> Tag : `security`
> Lire ce fichier pour toute story touchant à la sécurité, l'auth, les inputs utilisateur, ou les API.

## Principes

1. **Ne jamais faire confiance au client.** Toute donnée du navigateur est suspecte.
2. **Valider côté serveur en premier.** La validation client est du confort UX, pas de la sécurité.
3. **Principe du moindre privilège.** RLS, roles, permissions — accorder le minimum nécessaire.
4. **Défense en profondeur.** Plusieurs couches : proxy (`src/proxy.ts`) + action + RLS.

## Validation des inputs

```typescript
// TOUJOURS valider avec Zod dans les Server Actions
"use server"
export async function createItem(formData: FormData) {
  const parsed = createItemSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: "Données invalides" }
  // ...
}
```

**Règles :**
- Zod `.safeParse()` — jamais `.parse()` dans les actions (ne pas throw)
- Limiter les longueurs : `.max(255)` sur les strings, `.max(10000)` sur les textareas
- Valider les formats : `.email()`, `.url()`, `.uuid()`
- Whitelister les valeurs : `.enum(["admin", "user"])` plutôt que `.string()`
- Valider les fichiers : type MIME, taille max, extension

## XSS Prevention

**Interdit :**
```tsx
// JAMAIS — injection XSS directe
<div dangerouslySetInnerHTML={{ __html: userContent }} />
```

**Si absolument nécessaire :**
```tsx
import DOMPurify from "dompurify"
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />
```

**Règles :**
- React échappe automatiquement les variables dans JSX — ne pas contourner
- Pas de `dangerouslySetInnerHTML` sans DOMPurify
- Pas d'interpolation dans les `href` : `href={userInput}` peut exécuter `javascript:`
- Valider les URLs : `z.string().url().startsWith("https://")`

## CSRF Protection

**Il n'y a pas de token CSRF dans les Server Actions.** Next.js compare l'en-tête `Origin` au
`Host` et rejette la requête en cas d'écart ; le cookie de session est en `SameSite=Lax`.
C'est tout. Croire à une protection cryptographique fait manquer les deux vrais risques :

- **Derrière un reverse proxy** qui réécrit `Host`, la comparaison tombe. `serverActions.allowedOrigins` doit alors être déclaré explicitement dans `next.config.ts`, et ne jamais contenir de wildcard.
- **Rejeu** : l'identifiant d'une Server Action reste invocable tant qu'il est déployé. La protection Origin ne couvre ni le rejeu ni le débit — toute action mutative sensible porte sa propre clé d'idempotence (voir plus bas).

Les Route Handlers ne bénéficient d'aucune de ces protections : vérification manuelle de
l'origine ou signature obligatoire.

```typescript
// API route (webhook) — vérifier l'origin si nécessaire
export async function POST(request: Request) {
  const origin = request.headers.get("origin")
  if (origin && !allowedOrigins.includes(origin)) {
    return new Response("Forbidden", { status: 403 })
  }
  // ...
}
```

## Rate Limiting

**Un compteur en mémoire ne limite rien sur Vercel** : chaque invocation peut être une isolate
neuve, le compteur repart de zéro. Le rate limiting exige un store partagé.

```typescript
import { headers } from "next/headers"

// `x-forwarded-for` est une liste que le client peut préfixer de valeurs bidon.
// Le proxy ajoute la vraie IP en DERNIER : prendre le dernier segment, jamais le premier.
async function clientIp(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for") ?? ""
  return forwarded.split(",").map((s) => s.trim()).filter(Boolean).at(-1) ?? "unknown"
}

export async function loginAction(formData: FormData) {
  const { success } = await ratelimit.limit(`login:${await clientIp()}`) // Upstash / @vercel/kv
  if (!success) return { error: "Trop de tentatives. Réessayez dans 1 minute." }
  // ...
}
```

**Cibles :** login 5/min/IP · signup 3/h/IP · password reset 3/h/email.

**Vérifiable :** un rate limiter fondé sur une `Map` ou une variable de module est acceptable
uniquement en dev et porte un commentaire le disant. En production, le store est externe.

## Idempotence et mutations concurrentes

Deux trous que ni Zod ni RLS ne couvrent :

- **Double soumission.** `useTransition` ne déduplique pas : un double-clic exécute l'action deux fois. Toute action qui crée une ressource facturable ou non réversible accepte une `idempotency_key` (uuid généré côté client) portée par une contrainte `UNIQUE` en base.
- **Lost update.** Un `SELECT` puis `UPDATE` dans une action écrase la modification d'un tiers arrivée entre les deux. Filtrer sur la version lue — `.eq("updated_at", expectedUpdatedAt)` — et traiter « 0 ligne modifiée » comme un conflit à remonter à l'utilisateur, jamais comme un succès.
- API sensible : 60 / minute / user

## Environment Variables & Secrets

```bash
# .env.local — JAMAIS commité
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...           # Public, OK côté client
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # PRIVÉ — jamais côté client
STRIPE_SECRET_KEY=sk_live_...      # PRIVÉ
WEBHOOK_SECRET=whsec_...           # PRIVÉ

# Variables accessibles côté client (ATTENTION)
NEXT_PUBLIC_SUPABASE_URL=...       # OK — données publiques uniquement
NEXT_PUBLIC_SUPABASE_ANON_KEY=...  # OK — protégé par RLS
```

**Règles :**
- `NEXT_PUBLIC_` = visible dans le bundle client. N'y mettre QUE des données publiques
- Jamais de clé secrète dans `NEXT_PUBLIC_`
- `.env.local` dans `.gitignore` (déjà configuré)
- `.env.example` avec les noms de variables sans valeurs
- En prod : variables dans le dashboard Vercel/hosting, pas dans des fichiers

## SQL Injection Prevention

Supabase paramétrise automatiquement les requêtes via son SDK :
```typescript
// SAFE — Supabase paramétrise
const { data } = await supabase
  .from("items")
  .select("*")
  .eq("user_id", userId)

// DANGER — RPC avec SQL brut
const { data } = await supabase
  .rpc("search_items", { search_term: userInput })
// → La fonction PostgreSQL DOIT utiliser des paramètres, pas de concaténation
```

**Règles dans les fonctions PostgreSQL :**
```sql
-- SAFE : paramètre
CREATE FUNCTION search_items(search_term text)
RETURNS SETOF items AS $$
  SELECT * FROM items WHERE name ILIKE '%' || search_term || '%';
$$ LANGUAGE sql SECURITY DEFINER;

-- DANGER : concaténation dynamique
-- NE JAMAIS FAIRE : EXECUTE 'SELECT * FROM ' || table_name;
```

## Auth Security Checklist

- [ ] Le proxy (`src/proxy.ts`) vérifie la session sur toutes les routes protégées
- [ ] Chaque Server Action revérifie l'auth (ne pas se fier au proxy seul)
- [ ] Les mots de passe ont une longueur minimum (8+ caractères)
- [ ] Les messages d'erreur ne révèlent pas si un email existe ("Identifiants invalides", pas "Email non trouvé")
- [ ] Les tokens de reset expirent (1h max)
- [ ] Les sessions expirent après inactivité
- [ ] Pas de données sensibles dans les JWT custom claims
- [ ] Les cookies auth sont `httpOnly`, `secure`, `sameSite`

## Headers de sécurité

Configurer dans `next.config.ts` :
```typescript
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
]
```
