import { describe, it, expect } from "vitest";
import { DeviceManager } from "./device-manager.js";

describe("DeviceManager", () => {
  it("should track device join", () => {
    const dm = new DeviceManager();
    dm.join("dev1", "unix", new Set(["state"]));
    expect(dm.has("dev1")).toBe(true);
    expect(dm.getActiveCount()).toBe(1);
  });

  it("should emit joined event", () => {
    const dm = new DeviceManager();
    const events: string[] = [];
    dm.onEvent((e) => events.push(`${e.deviceId}:${e.type}`));
    dm.join("dev1", "unix", new Set(["state"]));
    expect(events).toContain("dev1:joined");
  });

  it("should emit left event on leave", () => {
    const dm = new DeviceManager();
    const events: string[] = [];
    dm.onEvent((e) => events.push(`${e.deviceId}:${e.type}`));
    dm.join("dev1", "unix", new Set(["state"]));
    dm.leave("dev1");
    expect(events).toContain("dev1:left");
    expect(dm.has("dev1")).toBe(false);
  });

  it("should not duplicate joins", () => {
    const dm = new DeviceManager();
    dm.join("dev1", "unix", new Set(["state"]));
    dm.join("dev1", "unix", new Set(["state"]));
    expect(dm.getActiveCount()).toBe(1);
  });

  it("should filter by transport", () => {
    const dm = new DeviceManager();
    dm.join("dev1", "unix", new Set(["a"]));
    dm.join("dev2", "mqtt", new Set(["b"]));
    expect(dm.getByTransport("unix")).toHaveLength(1);
    expect(dm.getByTransport("mqtt")).toHaveLength(1);
  });
});
