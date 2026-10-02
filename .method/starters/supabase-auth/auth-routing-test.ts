// Garde de retour après connexion et routage du middleware (canal MCP + consentement OAuth).
import { describe, it, expect } from "vitest"

import { assistantRedirectSchema, redirectPathSchema } from "@/lib/schemas/auth"
import { isPublicRoute, loginRedirectFor } from "@/middleware"

describe("redirectPathSchema", () => {
  it("should keep a path of the site, query string included", () => {
    expect(redirectPathSchema.parse("/oauth/consent?authorization_id=abc")).toBe(
      "/oauth/consent?authorization_id=abc"
    )
  })

  it("should fall back to / for anything that could leave the site", () => {
    for (const value of ["//evil.example", "/\\evil.example", "https://evil.example", "evil", "", null, undefined]) {
      expect(redirectPathSchema.parse(value)).toBe("/")
    }
  })
})

describe("assistantRedirectSchema", () => {
  it("should accept http(s) return addresses, localhost included", () => {
    expect(assistantRedirectSchema.safeParse("https://claude.ai/api/mcp/auth_callback?code=x").success).toBe(true)
    expect(assistantRedirectSchema.safeParse("http://localhost:4242/callback?code=x").success).toBe(true)
  })

  it("should refuse any other scheme", () => {
    expect(assistantRedirectSchema.safeParse("javascript:alert(1)").success).toBe(false)
  })
})

describe("middleware routing without a session", () => {
  it("should let the MCP endpoint and its OAuth metadata through (they answer 401 themselves)", () => {
    expect(isPublicRoute("/api/mcp")).toBe(true)
    expect(isPublicRoute("/.well-known/oauth-protected-resource")).toBe(true)
    expect(isPublicRoute("/apidoc")).toBe(false)
    expect(loginRedirectFor("POST", "/api/mcp", "")).toBeNull()
  })

  it("should send a page to /login with a way back, consent request included", () => {
    expect(loginRedirectFor("GET", "/oauth/consent", "?authorization_id=abc")).toBe(
      `/login?redirect=${encodeURIComponent("/oauth/consent?authorization_id=abc")}`
    )
    expect(loginRedirectFor("GET", "/", "")).toBe("/login")
  })

  it("should let the consent decision POST through (the action rechecks the session)", () => {
    expect(loginRedirectFor("POST", "/oauth/consent", "")).toBeNull()
  })
})
