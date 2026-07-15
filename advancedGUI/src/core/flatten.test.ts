import { describe, it, expect } from "vitest";
import { flattenFields } from "./flatten.js";

describe("flattenFields", () => {
  it("should return flat objects unchanged", () => {
    expect(flattenFields({ count: 5 })).toEqual({ count: 5 });
  });

  it("should flatten nested detail", () => {
    const input = {
      state: "IDLE",
      detail: { Mode: "MAN", Ctrl: "REMOTE" },
    };
    expect(flattenFields(input)).toEqual({
      state: "IDLE",
      "detail.Mode": "MAN",
      "detail.Ctrl": "REMOTE",
    });
  });

  it("should keep arrays as-is", () => {
    const input = { tags: ["a", "b"] };
    expect(flattenFields(input)).toEqual({ tags: ["a", "b"] });
  });
});
