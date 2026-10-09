import AxeBuilder from "@axe-core/playwright"
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

test.describe("at 375px", () => {
  test.use({ viewport: { width: 375, height: 812 } })

  for (const route of ["/", "/design-system"]) {
    test(`has no horizontal overflow on ${route}`, async ({ page }) => {
      await page.goto(route, { timeout: 30_000 })
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
    })
  }
})

test("home has no serious or critical accessibility violations", async ({ page }) => {
  await page.goto("/", { timeout: 30_000 })
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze()
  const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical")
  // Le message liste règle et cibles : sans lui, un échec ne dit pas quoi corriger.
  expect(
    blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
  ).toEqual([])
})
