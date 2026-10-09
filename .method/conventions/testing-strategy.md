# Stratégie de Tests — Next.js + Supabase

## Setup

- `vitest.config.ts` avec `@vitejs/plugin-react`, resolve alias `@/`
- `@testing-library/react` + `@testing-library/jest-dom`
- Playwright installé avec `npx playwright install`

## Unit Tests (Vitest)

- **Quoi :** Server Actions (mock Supabase), Zod schemas (edge cases), hooks custom, utils
- **Où :** `tests/unit/`. La colocalisation (`fichier.test.ts` à côté du code) est tolérée par
  `vitest.config.ts` mais **ne doit pas être utilisée** : un fichier de test placé sous `src/`
  matche en plus les globs `registry`, `a11y` et `nextjs`, donc charge des conventions qui ne le
  concernent pas ; et l'exemption `max-lines` d'`eslint.config.mjs` ne couvre que `tests/**`.
- **Mock Supabase :** `vi.mock("@/lib/supabase/server")` → retourner des réponses fake
- **Couverture cible :** >80% sur `lib/actions/` et `lib/schemas/`

### Exemple mock Supabase

```typescript
import { vi } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: "test-user-id", email: "test@test.com" } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => ({ data: { id: 1 }, error: null })),
    })),
  })),
}))
```

## Integration Tests (Vitest + Testing Library)

- **Quoi :** Composants form complets (render → fill → submit → vérifier résultat)
- **Mock :** Supabase client mocké, Server Actions mockées pour les tests composants
- **Où :** `tests/integration/`

## E2E Tests (Playwright)

- **Quoi :** Parcours critiques uniquement (login, CRUD principal, parcours de valeur core)
- **Env :** Supabase local (`npx supabase start`) ou projet staging dédié
- **Seed :** Script de seed pour données de test reproductibles
- **Où :** `tests/e2e/`
- **Convention :** un fichier par feature (`auth.spec.ts`, `projects.spec.ts`)
- **Projets :** `chromium` (desktop clair), `mobile` (Pixel 7, Chromium) et `dark` (desktop,
  `colorScheme: "dark"`) dans `playwright.config.ts`. Chaque spec tourne dans les trois : un
  menu mobile cassé ou un contraste sombre insuffisant échoue sans test dédié.
- **Smoke UI :** `smoke.spec.ts` vérifie l'absence de débordement horizontal à 375 px et
  l'absence de violation axe `serious`/`critical` (`@axe-core/playwright`, tags `wcag2a`,
  `wcag2aa`, `wcag22aa`) sur `/`. Une route nouvelle du parcours principal s'ajoute aux deux
  listes (`ui-patterns.md § Preuve visuelle`).

## Non-régression

- Avant chaque merge : TOUS les tests existants doivent passer
- `/commit-push` exécute `pnpm test` (unit + integ) avant chaque push
- E2E : avant chaque mise en prod (pas sur chaque push)

## Ce qu'on ne teste PAS

- Les composants Shadcn/ui (déjà testés en amont)
- Le CSS / le rendu pixel-perfect (les tests e2e vérifient les flows, pas le style)
- Les fonctions Supabase internes (RLS, triggers) → testées via l'app, pas en isolation

## Naming Conventions

```typescript
// describe = unité testée (composant, action, schema)
// it/test = comportement attendu en anglais
describe("createProjectAction", () => {
  it("should create a project with valid data", async () => {})
  it("should return error when user is not authenticated", async () => {})
  it("should return error when name is empty", async () => {})
})

describe("CreateProjectForm", () => {
  it("should render all form fields", () => {})
  it("should show validation errors on submit with empty fields", async () => {})
  it("should disable submit button while pending", async () => {})
})
```

**Règle :** Un `it` = un comportement. Pas de `it("should work")`.

## File Organization

```
tests/
├── unit/
│   ├── actions/           # Tests des Server Actions
│   │   └── project.test.ts
│   ├── schemas/           # Tests des schemas Zod
│   │   └── project.test.ts
│   ├── hooks/             # Tests des hooks custom
│   │   └── use-debounce.test.ts
│   └── utils/             # Tests des fonctions utilitaires
│       └── format-date.test.ts
├── integration/
│   ├── components/        # Tests des composants avec interactions
│   │   └── create-project-form.test.tsx
│   └── pages/             # Tests des pages complètes
│       └── projects-page.test.tsx
├── e2e/
│   ├── auth.spec.ts       # Un fichier par parcours
│   ├── projects.spec.ts
│   └── fixtures/          # Page Objects et helpers
│       ├── auth.fixture.ts
│       └── base.fixture.ts
├── factories/             # Générateurs de données de test
│   ├── user.factory.ts
│   └── project.factory.ts
└── setup.ts               # Setup global Vitest
```

## Mock Data Factories

```typescript
// tests/factories/user.factory.ts
import type { User } from "@/types"

let counter = 0

export function createMockUser(overrides?: Partial<User>): User {
  counter++
  return {
    id: `user-${counter}`,
    email: `user${counter}@test.com`,
    full_name: `Test User ${counter}`,
    role: "user",
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

// Usage dans les tests
const admin = createMockUser({ role: "admin" })
const user = createMockUser({ email: "custom@test.com" })
```

## Playwright Fixtures

```typescript
// tests/e2e/fixtures/auth.fixture.ts
import { test as base, type Page } from "@playwright/test"

type AuthFixtures = {
  authenticatedPage: Page
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto("/login")
    await page.fill('[name="email"]', "test@test.com")
    await page.fill('[name="password"]', "password123")
    await page.click('button[type="submit"]')
    await page.waitForURL("/dashboard")
    await use(page)
  },
})

// Usage
test("should display projects list", async ({ authenticatedPage }) => {
  await authenticatedPage.goto("/projects")
  await expect(authenticatedPage.getByRole("heading")).toContainText("Projets")
})
```

## Coverage Targets

| Dossier | Cible | Justification |
|---------|-------|---------------|
| `lib/actions/` | > 80% | Logique métier critique |
| `lib/schemas/` | > 90% | Validation = filet de sécurité |
| `hooks/` | > 70% | Logique réutilisable |
| `components/` | > 60% | Comportement, pas rendu |
| `lib/utils/` | > 90% | Fonctions pures = facile à tester |

## Anti-patterns

| Anti-pattern | Pourquoi c'est mauvais | Faire plutôt |
|-------------|----------------------|-------------|
| Tester l'implémentation | Casse à chaque refacto | Tester le comportement |
| `expect(component).toMatchSnapshot()` partout | Faux positifs, snapshots géants | Snapshots ciblés (petits composants) |
| Tester les détails CSS | Fragile, aucune valeur | Tester les interactions |
| Mock de tout | Test ne teste rien | Mock uniquement les frontières (DB, API) |
| Test qui dépend d'un autre | Non-déterministe | Chaque test est indépendant |
| `await sleep(1000)` | Lent et fragile | `waitFor`, `findBy` |
