import { describe, it, expect } from "vitest"

import { isNavItemActive } from "@/components/nav-items"

describe("isNavItemActive", () => {
  it("should match the root item only on the exact root path", () => {
    expect(isNavItemActive("/", "/")).toBe(true)
    expect(isNavItemActive("/", "/projets")).toBe(false)
  })

  it("should match an item on its own path and on nested paths", () => {
    expect(isNavItemActive("/projets", "/projets")).toBe(true)
    expect(isNavItemActive("/projets", "/projets/42")).toBe(true)
  })

  it("should not match a sibling path that only shares a prefix", () => {
    expect(isNavItemActive("/projets", "/projets-archives")).toBe(false)
  })
})
