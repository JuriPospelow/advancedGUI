import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createBroker } from "../broker.js";
import { createMqttConnector } from "./mqtt-connector.js";

describe("Connector", () => {
  const broker = createBroker();
  let port: number;

  beforeAll(async () => {
    port = await broker.start();
  });

  afterAll(async () => {
    await broker.stop();
  });

  it("should connect, publish, subscribe, and receive messages", async () => {
    const pub = createMqttConnector();
    const sub = createMqttConnector();

    await pub.connect(port);
    await sub.connect(port);

    const received: { topic: string; payload: string }[] = [];
    sub.onMessage((topic, payload) => {
      received.push({ topic, payload });
    });
    await sub.subscribe("test/+");

    await new Promise((r) => setTimeout(r, 100));
    await pub.publish("test/hello", "world");

    await new Promise((r) => setTimeout(r, 300));

    expect(received.length).toBe(1);
    expect(received[0].topic).toBe("test/hello");
    expect(received[0].payload).toBe("world");

    await pub.disconnect();
    await sub.disconnect();
  }, 10000);
});
