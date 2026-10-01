import { test, expect } from "@playwright/test"

// Smoke e2e : valide que l'app démarre et que les routes de base répondent.
// Sert aussi de test de la config Playwright elle-même — à étoffer par story.
test("home serves the dashboard without redirect", async ({ page }) => {
  // Timeout large : la 1re requête compile la route à froid en dev (turbopack).
  await page.goto("/", { timeout: 30_000 })
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible({
    timeout: 30_000,
  })
})

test("design system preview renders", async ({ page }) => {
  await page.goto("/design-system")
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()
})
