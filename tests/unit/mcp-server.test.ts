// Tests du serveur MCP via InMemoryTransport (mcp-patterns §10) : pas de HTTP, pas de mock
// du SDK — un vrai client connecté au vrai serveur. Vérifie le contrat AX : schéma,
// structuredContent, next_actions, et les TROIS clés de méta widget + les DEUX resources.
import { describe, it, expect, beforeAll } from "vitest"
import { Client, InMemoryTransport } from "@modelcontextprotocol/client"
import { McpServer } from "@modelcontextprotocol/server"

import { initializeMcpServer, mcpServerOptions } from "@/mcp/server"

describe("MCP server", () => {
  let client: Client

  beforeAll(async () => {
    const server = new McpServer(mcpServerOptions.serverInfo, {
      capabilities: mcpServerOptions.capabilities,
      instructions: mcpServerOptions.instructions,
    })
    initializeMcpServer(server)

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    client = new Client({ name: "test-client", version: "0.0.0" })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  })

  it("should expose get_status with the required description format and the triple widget meta (§5.1)", async () => {
    const { tools } = await client.listTools()
    const tool = tools.find((t) => t.name === "get_status")

    expect(tool).toBeDefined()
    expect(tool?.description).toMatch(/^Returns/) // verbe d'abord (§3)
    expect(tool?.description).toContain("Use this when")
    expect(tool?.description).toContain("Do not use")
    expect(tool?.annotations?.readOnlyHint).toBe(true)
    // Triple méta §5.1 : nested GA + alias plat pré-GA + alias Apps SDK → variante skybridge
    const meta = tool?._meta
    expect(meta?.ui).toMatchObject({ resourceUri: "ui://widgets/status-card.html" })
    expect(meta?.["ui/resourceUri"]).toBe("ui://widgets/status-card.html")
    expect(meta?.["openai/outputTemplate"]).toBe("ui://widgets/status-card-skybridge.html")
    // Exigence ChatGPT : securitySchemes déclaré (§3)
    expect(Array.isArray(meta?.securitySchemes)).toBe(true)
  })

  it("should return both forms: text content and structuredContent with next_actions (§4)", async () => {
    // En 2.x, `client.callTool` valide déjà la réponse et renvoie un `CallToolResult` typé.
    const result = await client.callTool({ name: "get_status", arguments: { verbose: true } })

    expect(result.isError).toBeFalsy()
    expect(result.content[0]?.type).toBe("text")

    // structuredContent est typé `{}` en 2.x : le contrat se vérifie par la forme, pas par le type.
    expect(result.structuredContent).toBeDefined()
    expect(result.structuredContent).toMatchObject({ status: "ok", next_actions: expect.any(Array) })
  })

  it("should list BOTH widget resources: standard profile=mcp-app and skybridge variant (§5.1)", async () => {
    const { resources } = await client.listResources()
    const byUri = new Map(resources.map((r) => [r.uri, r]))

    expect(byUri.get("ui://widgets/status-card.html")?.mimeType).toBe("text/html;profile=mcp-app")
    expect(byUri.get("ui://widgets/status-card-skybridge.html")?.mimeType).toBe(
      "text/html+skybridge"
    )
  })
})
