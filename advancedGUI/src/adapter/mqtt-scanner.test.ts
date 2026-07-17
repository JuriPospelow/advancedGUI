import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createMqttScanner } from "./mqtt-scanner.js";
import { createBroker } from "./broker.js";
import { createMqttConnector } from "./mqtt-connector.js";

describe("MqttScanner", () => {
  const broker = createBroker();
  let port: number;

  beforeAll(async () => {
    port = await broker.start();
  });

  afterAll(async () => {
    await broker.stop();
  });

  it("should detect device and call onData on MQTT message", async () => {
    const scanner = createMqttScanner({ brokerPort: port, configTopic: "mock/#", deviceIdPrefix: "mqtt-" });
    const events: string[] = [];
    const data: Array<{ id: string; fields: unknown }> = [];
    scanner.onEvent((e) => events.push(`${e.deviceId}:${e.type}`));
    scanner.onData((id, fields) => data.push({ id, fields }));
    await scanner.start();

    const pubConn = createMqttConnector();
    await pubConn.connect(port);
    await pubConn.publish("mock/counter", JSON.stringify({ count: 42 }));

    await new Promise((r) => setTimeout(r, 500));

    expect(events).toContain("mqtt-mock-counter:joined");
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].id).toBe("mqtt-mock-counter");
    expect(data[0].fields).toEqual({ count: 42 });

    await scanner.stop();
    await pubConn.disconnect();
  });
});
