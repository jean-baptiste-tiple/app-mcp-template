# Option de déploiement : Supabase self-hosted sur Scaleway

> Tag : `selfhost` (option, activé seulement par un ADR d'hébergement self-hosted dans `docs/decisions/`).
> Statut : **analysé sur les sources, non éprouvé en prod** (2026-10-01). Les points marqués *à valider* se vérifient avec la checklist de fin avant la première connexion d'un host MCP.
> Défaut du template : Supabase Cloud + Vercel (`deployment-patterns.md`). Cette option sert les projets qui exigent un hébergement en France ou hors Supabase Cloud.

## Verdict

Supabase Auth open source (GoTrue) couvre tout ce que le template utilise côté MCP (`mcp-patterns.md` §6) : serveur OAuth 2.1, enregistrement dynamique (DCR), JWKS asymétrique. Le docker-compose officiel ne l'active pas par défaut : 4 réglages obligatoires (§ Auth OAuth 2.1). Le serveur OAuth est en **beta** : retester à chaque montée de version de GoTrue.

## Les deux options

**Option A, Supabase sur Scaleway, app sur Vercel (recommandée pour démarrer).**
Une Instance Scaleway porte le docker-compose officiel Supabase. L'app Next.js et `/api/mcp` restent sur Vercel, sans changement de code. Les données sont en France ; seul le front transite par Vercel.

**Option B, tout sur Scaleway.**
Même Instance pour Supabase. L'app Next.js (build `standalone`) tourne en Serverless Containers. Le timeout HTTP se règle de 10 s à 60 min, la concurrence monte à 80 requêtes par instance, et l'instance passe à zéro après 15 min d'inactivité. Le transport MCP stateless du template convient tel quel. `maxDuration` est propre à Vercel et sans effet ici : régler le timeout du container.

**Écartés :**
- *Managed Database for PostgreSQL de Scaleway comme base Supabase.* Le stack exige l'image `supabase/postgres` (rôles `supabase_auth_admin`, `authenticator`… et extensions `pg_graphql`, `pg_net`, `pgsodium`), absentes de la liste d'extensions Scaleway.
- *Kubernetes Kapsule.* Rien ne casse sans lui aujourd'hui ; à reconsidérer seulement si une Instance ne suffit plus.

## Socle Scaleway (A et B)

- **Instance** : ≥ 8 Go RAM, 4 vCPU, 80 Go SSD (recommandation Supabase ; minimum 4 Go, 2 vCPU, 40 Go). Volume Block Storage pour `volumes/db`, snapshots planifiés.
- **TLS** : `docker-compose.caddy.yml` officiel (Caddy, certificats automatiques) devant Kong. Domaine dédié, ex. `supabase.<domaine>`.
- **SMTP** (emails d'auth) : Transactional Email Scaleway. Hôte `smtp.tem.scaleway.com`, port 587 (STARTTLS) ou 465/2465 (TLS). Utilisateur = Project ID du domaine TEM, mot de passe = secret key d'une clé API IAM.
  ```env
  SMTP_HOST=smtp.tem.scaleway.com
  SMTP_PORT=587
  SMTP_USER=<project-id-tem>
  SMTP_PASS=<secret-key-iam>
  SMTP_ADMIN_EMAIL=no-reply@<domaine>
  SMTP_SENDER_NAME=<Produit>
  ```
- **Storage** (si le projet stocke des fichiers) : Object Storage Scaleway en backend S3.
  ```env
  STORAGE_BACKEND=s3
  GLOBAL_S3_BUCKET=<bucket>
  GLOBAL_S3_ENDPOINT=https://s3.fr-par.scw.cloud
  GLOBAL_S3_PROTOCOL=https
  GLOBAL_S3_FORCE_PATH_STYLE=true
  AWS_ACCESS_KEY_ID=<access-key>
  AWS_SECRET_ACCESS_KEY=<secret-key>
  REGION=fr-par
  ```
- **Secrets** : `.env` hors dépôt ; en prod, un gestionnaire de secrets (recommandation Supabase).
- **Studio** : derrière le basic auth de Caddy, jamais exposé sans mot de passe.

## Auth OAuth 2.1 (bloquants)

> Aucun hook Custom Access Token n'est requis : l'organisation et le rôle sont relus en base à
> chaque appel, jamais lus dans le jeton (`mcp-patterns.md` §6).

### 1. URLs

```env
SUPABASE_PUBLIC_URL=https://supabase.<domaine>
API_EXTERNAL_URL=https://supabase.<domaine>/auth/v1   # garder /auth/v1 : c'est l'issuer
SITE_URL=https://<domaine-app>                        # porte la page de consentement
```

Le compose pose `GOTRUE_JWT_ISSUER=${API_EXTERNAL_URL}`. GoTrue construit sa metadata OAuth depuis l'issuer (`<issuer>/oauth/authorize`, `/oauth/token`, `/.well-known/jwks.json`). `src/mcp/config.ts` attend `NEXT_PUBLIC_SUPABASE_URL + "/auth/v1"`. Donc `NEXT_PUBLIC_SUPABASE_URL=https://supabase.<domaine>` côté app, et `API_EXTERNAL_URL` doit finir par `/auth/v1`. Sinon `verifyToken` rejette tous les jetons.

### 2. Serveur OAuth + DCR

Absents du compose, à ajouter dans `services.auth.environment` :

```yaml
GOTRUE_OAUTH_SERVER_ENABLED: "true"
GOTRUE_OAUTH_SERVER_ALLOW_DYNAMIC_REGISTRATION: "true"   # Claude, ChatGPT, Claude Code s'enregistrent seuls
GOTRUE_OAUTH_SERVER_AUTHORIZATION_PATH: "/oauth/consent" # page de l'app, combinée à SITE_URL
```

La page `/oauth/consent` est fournie par le starter `supabase-auth` (`oauth-consent-page.tsx`), comme sur Cloud.

### 3. Clés asymétriques (JWKS)

`verifyToken` vérifie la signature via JWKS, ce qui est impossible en HS256 (défaut du compose). L'ID token du scope `openid` échoue aussi sans clé asymétrique.

```sh
sh utils/add-new-auth-keys.sh --update-env
```

Puis décommenter dans le compose les lignes `GOTRUE_JWT_KEYS`, `API_JWT_JWKS`, `JWT_JWKS`, `SUPABASE_JWKS` et passer `PGRST_JWT_SECRET` sur `${JWT_JWKS}`. Contrôle : `curl https://supabase.<domaine>/auth/v1/.well-known/jwks.json` renvoie une clé `EC`.

### 4. Kong et Caddy : ouvrir les routes OAuth

Kong protège `/auth/v1/*` par `key-auth`, sans fallback anonyme. Or les hosts MCP et le navigateur (sur `/oauth/authorize`) n'envoient pas d'`apikey`. Ajouter dans `volumes/api/kong.yml`, à côté de `auth-v1-open-jwks` ; le préfixe le plus long l'emporte sur `/auth/v1/` :

```yaml
  - name: auth-v1-open-oauth-authorize
    url: http://auth:9999/oauth/authorize
    routes:
      - name: auth-v1-open-oauth-authorize
        strip_path: true
        paths: [/auth/v1/oauth/authorize]
    plugins: [{ name: cors }]
  - name: auth-v1-open-oauth-token
    url: http://auth:9999/oauth/token
    routes:
      - name: auth-v1-open-oauth-token
        strip_path: true
        paths: [/auth/v1/oauth/token]
    plugins: [{ name: cors }]
  - name: auth-v1-open-oauth-register
    url: http://auth:9999/oauth/clients/register
    routes:
      - name: auth-v1-open-oauth-register
        strip_path: true
        paths: [/auth/v1/oauth/clients/register]
    plugins: [{ name: cors }]
  - name: auth-v1-open-oidc
    url: http://auth:9999/.well-known/openid-configuration
    routes:
      - name: auth-v1-open-oidc
        strip_path: true
        paths: [/auth/v1/.well-known/openid-configuration]
    plugins: [{ name: cors }]
  # Découverte RFC 8414 « suffixée » (issuer avec chemin) : GoTrue ne sert que le chemin exact.
  - name: well-known-oauth-suffixed
    url: http://auth:9999/.well-known/oauth-authorization-server
    routes:
      - name: well-known-oauth-suffixed
        strip_path: true
        paths: [/.well-known/oauth-authorization-server/auth/v1]
    plugins: [{ name: cors }]
```

`/oauth/authorizations/*` (lecture et consentement) reste sur la route protégée : la page de consentement l'appelle via supabase-js, qui envoie l'`apikey`.

Le `Caddyfile` officiel ne matche `/.well-known/oauth-authorization-server` qu'en chemin exact. La forme suffixée tombe alors sur Studio (basic auth). Élargir le matcher :

```
@supabase_api path /auth/v1/* /rest/v1/* /graphql/v1 /realtime/v1/* /storage/v1/* /functions/v1/* /mcp /sso/* /.well-known/oauth-authorization-server*
```

DCR ouvert sur Internet : GoTrue limite déjà l'enregistrement. Ajouter un `rate-limiting` Kong sur `auth-v1-open-oauth-register` si le trafic le justifie, et surveiller `auth.oauth_clients` (`mcp-patterns.md` §6.5).

## Adaptations du template

- **`src/mcp/README.md`, activation de l'auth, étape « Dashboard Supabase »** : en self-hosted, tout passe par les variables ci-dessus. Le Studio n'a pas ces réglages.
- **`supabase-migrations.yml`** (starter `supabase-auth`) : `supabase link --project-ref` ne fonctionne qu'avec Supabase Cloud. Remplacer les deux étapes par :
  ```yaml
      - name: Push migrations
        run: supabase db push --db-url "${{ secrets.SUPABASE_DB_URL }}"
  ```
  avec `SUPABASE_DB_URL=postgresql://postgres:<mdp>@<hôte>:5432/postgres`. Le port Postgres est filtré par Security Group, ouvert seulement depuis la CI (ou via bastion).
- **`db:types`** : `npx supabase gen types typescript --db-url "$SUPABASE_DB_URL" > src/types/database.ts`.
- **Preview** (`deployment-patterns.md`) : pas de branching en self-hosted. Les previews partagent la base staging, ou on monte une seconde Instance.

## Checklist de validation (avant de connecter un host)

```sh
S=https://supabase.<domaine>
curl -s $S/auth/v1/.well-known/jwks.json                       # clé EC présente
curl -s $S/.well-known/oauth-authorization-server/auth/v1      # JSON, issuer = $S/auth/v1   (à valider)
curl -s $S/auth/v1/.well-known/openid-configuration            # JSON sans apikey
curl -s -X POST $S/auth/v1/oauth/clients/register \
  -H 'content-type: application/json' \
  -d '{"client_name":"smoke","redirect_uris":["http://localhost:9999/callback"]}'   # 201, client_id
curl -sI "$S/auth/v1/oauth/authorize?client_id=<id>&response_type=code&redirect_uri=http://localhost:9999/callback&code_challenge=x&code_challenge_method=S256"  # 302 vers SITE_URL/oauth/consent
curl -s https://<domaine-app>/.well-known/oauth-protected-resource/api/mcp   # authorization_servers = $S/auth/v1
```

Puis rejouer la matrice host de `mcp-patterns.md` §6.7 (Claude, ChatGPT, Claude Code). Les mesures du §6 ont été faites sur Cloud ; elles se reconfirment ici.

## Risques

- Serveur OAuth 2.1 en beta : la forme des endpoints peut changer. Épingler l'image `supabase/gotrue` et retester la checklist à chaque montée.
- Supabase devient l'IdP des intégrations : sa disponibilité conditionne les connecteurs MCP. Sauvegarder le schéma `auth` (Postgres + snapshots Block Storage).
- Exploitation à charge de l'équipe : mises à jour Postgres et GoTrue, sauvegardes, supervision.

## Sources

- Supabase, OAuth 2.1 Server : https://supabase.com/docs/guides/auth/oauth-server/getting-started
- Supabase, self-hosted auth keys : https://supabase.com/docs/guides/self-hosting/self-hosted-auth-keys
- Supabase, self-hosting Docker (ressources, HTTPS, secrets) : https://supabase.com/docs/guides/self-hosting/docker
- Supabase, S3 self-hosted : https://supabase.com/docs/guides/self-hosting/self-hosted-s3
- Compose officiel (`docker-compose.yml`, `.env.example`, `volumes/api/kong.yml`, `volumes/proxy/caddy/Caddyfile`, `CONFIG.md`) : https://github.com/supabase/supabase/tree/master/docker
- GoTrue (`internal/conf/configuration.go`, `internal/api/api.go`, `internal/api/jwks.go`) : https://github.com/supabase/auth
- Scaleway, limites Serverless Containers : https://www.scaleway.com/en/docs/serverless-containers/reference-content/containers-limitations/
- Scaleway, SMTP Transactional Email : https://www.scaleway.com/en/docs/transactional-email/reference-content/smtp-configuration/
- Scaleway, extensions PostgreSQL managé : https://www.scaleway.com/en/docs/managed-databases-for-postgresql-and-mysql/reference-content/postgresql-extensions/
- Scaleway, endpoints Object Storage : https://www.scaleway.com/en/docs/object-storage/concepts/
