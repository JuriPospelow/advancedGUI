import { describe, it, expect } from "vitest";
import { createMqttConnector } from "./mqtt-connector.js";
import { createBroker } from "./broker.js";

describe("MqttAdapter", () => {
  it("should create adapter connector that works like the original", async () => {
    const broker = createBroker();
    const port = await broker.start();

    const pub = createMqttConnector();
    const sub = createMqttConnector();
    await pub.connect(port);
    await sub.connect(port);

    const received: string[] = [];
    sub.onMessage((_topic, payload) => received.push(payload));
    await sub.subscribe("adapter/test");

    await new Promise((r) => setTimeout(r, 100));
    await pub.publish("adapter/test", "hello-adapter");

    await new Promise((r) => setTimeout(r, 300));
    expect(received).toContain("hello-adapter");

    await pub.disconnect();
    await sub.disconnect();
    await broker.stop();
  }, 10000);
});
