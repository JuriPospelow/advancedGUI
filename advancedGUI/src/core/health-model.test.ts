import { describe, it, expect } from "vitest";
import { createHealthData } from "./health-model.js";

describe("health-model", () => {
  it("should create ok status when no error", () => {
    const h = createHealthData(12345, "0.2.0", 54321, 2, 1, 0);
    expect(h.status).toBe("ok");
    expect(h.uptime).toBe(12345);
    expect(h.version).toBe("0.2.0");
    expect(h.deviceCount).toBe(0);
  });

  it("should create degraded status when error present", () => {
    const h = createHealthData(100, "0.2.0", 0, 0, 0, 0, "Broker disconnected");
    expect(h.status).toBe("degraded");
    expect(h.lastError).toBe("Broker disconnected");
  });
});
