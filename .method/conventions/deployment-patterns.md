# Deployment Patterns

> Tag : `deploy`
> Lire ce fichier pour configurer les environnements, les déploiements et les rollbacks.

## Environnements

| Env | Usage | DB | URL |
|-----|-------|-----|-----|
| `local` | Développement | Supabase local (`npx supabase start`) | `localhost:3000` |
| `preview` | PR review | Supabase staging (branch) | `pr-123.vercel.app` |
| `staging` | Test pré-prod | Supabase staging | `staging.monapp.com` |
| `production` | Prod | Supabase production | `monapp.com` |

## Variables d'environnement

```bash
# .env.local (dev — JAMAIS commité)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# .env.example (template — commité, sans valeurs)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

**En production :** variables dans le dashboard de l'hébergeur (Vercel, Coolify, etc.), JAMAIS dans des fichiers.

> Option souveraine : Supabase self-hosted (Scaleway ou autre) au lieu de Supabase Cloud → `deployment-scaleway.md` (tag `selfhost`, activé par ADR).

## Database Migrations en Production

### Workflow
```
1. Développer la migration en local
2. Tester : supabase db reset (local)
3. Appliquer en staging : supabase db push --linked
4. Vérifier en staging
5. Appliquer en prod : supabase db push --linked (projet prod)
```

### Règles
- **Jamais de migration destructive sans rollback prévu**
- **Migrations additives d'abord** : ajouter une colonne, puis migrer les données, puis supprimer l'ancienne
- **Tester avec des données réalistes** avant la prod

### Rollback SQL
```sql
-- Chaque migration devrait avoir un rollback documenté
-- Dans un commentaire en fin de fichier

-- ROLLBACK:
-- ALTER TABLE orders DROP COLUMN IF EXISTS discount_cents;
-- DROP TYPE IF EXISTS discount_type;
```

## Qualité avant push

### Vérification locale via `/commit-push`
```
# La commande /commit-push exécute automatiquement :
# 1. pnpm type-check
# 2. pnpm lint
# 3. pnpm test
# Puis commit + push si tout passe.
# Pas de CI GitHub pour les checks — tout se fait en local.
```

### Pre-deploy checklist
- [ ] Tous les tests passent
- [ ] Type-check OK
- [ ] Lint OK
- [ ] Migrations testées en local
- [ ] Variables d'environnement configurées
- [ ] Pas de `console.log` oublié
- [ ] Pas de secrets dans le code
- [ ] `pnpm audit:lh` vert (seuils de `performance-patterns.md § Audit Lighthouse`)

## Rollback

### Code (Vercel)
```bash
# Rollback au déploiement précédent
# Via le dashboard Vercel : Deployments → Promote to production

# Ou via CLI
vercel rollback
```

### Database
```bash
# Appliquer le rollback SQL documenté dans la migration
# ATTENTION : tester en staging d'abord
supabase db execute --file rollback.sql
```

## Health & Monitoring post-deploy

```bash
# Vérifier le health check
curl https://monapp.com/api/health

# Vérifier les Web Vitals
# → Vercel Analytics ou Lighthouse CI

# Vérifier les erreurs
# → Sentry dashboard
```

## Contrôles post-déploiement

À dérouler sur l'URL de **production**, une fois le déploiement promu. Aucun ne se vérifie en
local : ils portent sur ce que l'hébergeur sert réellement.

1. **404 réelle** — `curl -s -o /dev/null -w "%{http_code}" https://monapp.com/chemin-inexistant`
   → `404`. Un 200 sur un chemin inexistant fait indexer des pages vides et casse les crawlers,
   IA compris (`seo-patterns.md § Agentic readiness`).
2. **Preview non indexable** — `curl -sI https://<preview>.vercel.app | grep -i x-robots-tag`
   → `noindex` (`seo-patterns.md § Règles SEO`).
3. **Lighthouse sur l'URL de prod** ≥ les seuils de
   `performance-patterns.md § Audit Lighthouse`. L'audit local tourne sur `localhost` : il ne
   voit ni la latence réseau, ni la compression, ni le cache.
4. **En-têtes servis** — `curl -sI https://monapp.com/_next/static/<asset>` →
   `content-encoding: br` ou `gzip`, et `cache-control: public, max-age=31536000, immutable`.
   Vercel le fait par défaut ; un reverse proxy maison ou un CDN de stockage, non.
5. **Agent readiness** — `npx is-agentic monapp.com --json` → zéro issue de tier `essential`.
   Rapports mis en cache 6 h : vérifier `scanned_at` avant de conclure qu'un correctif a porté.

## Règles de déploiement

- **Jamais de deploy le vendredi soir** (sauf hotfix critique)
- **Deploy souvent, deploy petit** — une feature à la fois
- **Toujours avoir un rollback** — code ET database
- **Monitorer après chaque deploy** — erreurs, performance, feedback
