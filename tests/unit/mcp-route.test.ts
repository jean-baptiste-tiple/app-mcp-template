// @vitest-environment node
// Garde-fou anonyme de /api/mcp tant que l'auth est désactivée (mcp-patterns §6) : la route est
// appelée comme Next l'appelle, avec une Request, et l'environnement est piloté par vi.stubEnv.
import { afterEach, describe, expect, it, vi } from "vitest"

import { POST } from "@/app/api/[transport]/route"

function initializeRequest(): Request {
  return new Request("http://localhost:3000/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test-client", version: "0.0.0" },
      },
    }),
  })
}

describe("POST /api/mcp anonymous guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("should return 401 with WWW-Authenticate in production when MCP_ALLOW_ANONYMOUS is unset", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("MCP_ALLOW_ANONYMOUS", undefined)

    const response = await POST(initializeRequest())

    expect(response.status).toBe(401)
    expect(response.headers.get("WWW-Authenticate")).toBe(
      'Bearer resource_metadata="http://localhost:3000/.well-known/oauth-protected-resource"'
    )
    expect(await response.text()).toContain("src/mcp/README.md")
  })

  it("should serve the MCP endpoint in production when MCP_ALLOW_ANONYMOUS is true", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("MCP_ALLOW_ANONYMOUS", "true")

    const response = await POST(initializeRequest())

    expect(response.status).toBe(200)
  })

  it("should serve the MCP endpoint outside production", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("MCP_ALLOW_ANONYMOUS", undefined)

    const response = await POST(initializeRequest())

    expect(response.status).toBe(200)
  })
})
