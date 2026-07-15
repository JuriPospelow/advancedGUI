import { describe, it, expect } from "vitest";
import { createDevicesConfig } from "./devices.config.js";

describe("DevicesConfig", () => {
  it("should return a config with defaults", () => {
    const cfg = createDevicesConfig();
    expect(cfg.enableMqttCounter).toBe(true);
    expect(cfg.enableMqttMeasurement).toBe(true);
    expect(cfg.enableUnixCounter).toBe(false);
    expect(typeof cfg.unixSocketDir).toBe("string");
  });
});
