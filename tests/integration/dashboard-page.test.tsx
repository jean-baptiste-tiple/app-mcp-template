import { afterEach, describe, it, expect, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"

import DashboardLayout from "@/app/(dashboard)/layout"
import DashboardPage from "@/app/(dashboard)/page"

// Pages et layout rendus avec leurs composants réels : seul le routeur Next est simulé.
vi.mock("next/navigation", () => ({ usePathname: () => "/" }))

// Vitest tourne sans `globals` : le démontage automatique de Testing Library n'est pas branché.
afterEach(cleanup)

describe("DashboardPage", () => {
  it("should render the page heading and the empty state", () => {
    render(<DashboardPage />)

    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument()
    expect(screen.getByText("Prêt à démarrer")).toBeInTheDocument()
  })
})

describe("DashboardLayout", () => {
  it("should mark the current route as the active sidebar link", () => {
    render(<DashboardLayout>contenu</DashboardLayout>)

    const nav = screen.getByRole("navigation", { name: "Navigation principale" })
    expect(nav).toContainElement(screen.getByRole("link", { name: "Dashboard" }))
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page")
  })

  it("should open the mobile menu sheet with the navigation links", async () => {
    render(<DashboardLayout>contenu</DashboardLayout>)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Ouvrir le menu" }))

    const sheet = await screen.findByRole("dialog", { name: "Mon App" })
    expect(within(sheet).getByRole("navigation", { name: "Navigation principale" })).toBeInTheDocument()
    expect(within(sheet).getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/")
  })

  it("should close the mobile menu when a link is clicked", async () => {
    render(<DashboardLayout>contenu</DashboardLayout>)
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir le menu" }))
    const sheet = await screen.findByRole("dialog", { name: "Mon App" })

    fireEvent.click(within(sheet).getByRole("link", { name: "Dashboard" }))

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("should put the skip link target on the main landmark, after the sidebar", () => {
    render(<DashboardLayout>contenu</DashboardLayout>)

    const main = screen.getByRole("main")
    expect(main).toHaveAttribute("id", "main-content")
    expect(main).toHaveTextContent("contenu")
    expect(main).not.toContainElement(screen.getByRole("navigation"))
  })
})
