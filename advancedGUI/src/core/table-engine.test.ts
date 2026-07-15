import { describe, it, expect } from "vitest";
import { flattenJson, computeKeySet, areKeySetsCompatible, groupDevices } from "./table-engine.js";

describe("flattenJson", () => {
  it("should flatten nested JSON with dot notation", () => {
    const input = { state: "IDLE", detail: { Mode: "MAN", Ctrl: "REMOTE" } };
    const result = flattenJson(input);
    expect(result).toContainEqual({ field: "state", value: "IDLE" });
    expect(result).toContainEqual({ field: "detail.Mode", value: "MAN" });
    expect(result).toContainEqual({ field: "detail.Ctrl", value: "REMOTE" });
  });

  it("should handle flat objects", () => {
    const input = { power: 50, pdu: "ON" };
    const result = flattenJson(input);
    expect(result).toHaveLength(2);
  });
});

describe("areKeySetsCompatible", () => {
  it("should return true for overlapping key sets (>=30% union)", () => {
    const a = new Set(["state", "pdu", "con"]);
    const b = new Set(["state", "pdu", "power", "ilck"]);
    expect(areKeySetsCompatible(a, b)).toBe(true);
  });

  it("should return false for disjoint key sets", () => {
    const a = new Set(["state", "pdu"]);
    const b = new Set(["temp", "hum"]);
    expect(areKeySetsCompatible(a, b)).toBe(false);
  });
});

describe("groupDevices", () => {
  it("should group compatible devices together", () => {
    const devices = [
      { deviceId: "dev2", keySet: new Set(["state", "pdu", "power"]) },
      { deviceId: "dev3", keySet: new Set(["state", "pdu", "power", "temp"]) },
    ];
    const groups = groupDevices(devices);
    expect(groups).toHaveLength(1);
    expect(groups[0].deviceIds).toEqual(["dev2", "dev3"]);
  });

  it("should separate incompatible devices", () => {
    const devices = [
      { deviceId: "dev1", keySet: new Set(["state", "detail.Mode"]) },
      { deviceId: "dev2", keySet: new Set(["temp", "hum"]) },
    ];
    const groups = groupDevices(devices);
    expect(groups).toHaveLength(2);
  });
});
