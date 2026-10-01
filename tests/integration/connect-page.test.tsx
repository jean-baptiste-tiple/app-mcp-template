import { afterEach, describe, it, expect } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

import ConnectPage from "@/app/(dashboard)/connect/page"
import { MCP_RESOURCE_URL } from "@/mcp/config"

// Vitest tourne sans `globals` : le démontage automatique de Testing Library n'est pas branché.
afterEach(cleanup)

describe("ConnectPage", () => {
  it("should show the MCP server URL with a copy button", () => {
    render(<ConnectPage />)

    expect(screen.getByRole("heading", { level: 1, name: "Connecter l'assistant" })).toBeInTheDocument()
    expect(screen.getByText(MCP_RESOURCE_URL)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Copier l'URL" })).toBeInTheDocument()
  })

  it("should give the setup steps for Claude, ChatGPT and Claude Code", () => {
    render(<ConnectPage />)

    for (const host of ["Claude", "ChatGPT", "Claude Code"]) {
      expect(screen.getByText(host, { selector: "strong" })).toBeInTheDocument()
    }
    expect(screen.getByText(/claude mcp add --transport http/)).toBeInTheDocument()
  })
})
