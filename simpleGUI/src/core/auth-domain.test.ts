import { describe, it, expect } from "vitest";
import { canPerform } from "./auth-domain.js";

describe("auth-domain", () => {
  it("admin can perform admin actions", () => {
    expect(canPerform("admin", "admin")).toBe(true);
  });

  it("operator cannot perform admin actions", () => {
    expect(canPerform("operator", "admin")).toBe(false);
  });

  it("viewer cannot perform operator actions", () => {
    expect(canPerform("viewer", "operator")).toBe(false);
  });

  it("viewer can perform viewer actions", () => {
    expect(canPerform("viewer", "viewer")).toBe(true);
  });

  it("operator can perform viewer actions", () => {
    expect(canPerform("operator", "viewer")).toBe(true);
  });
});
