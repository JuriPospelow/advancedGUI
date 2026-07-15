import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createBroker } from "./broker.js";
import { connectAsync } from "mqtt";

describe("Broker", () => {
  const broker = createBroker();

  beforeAll(async () => {
    await broker.start();
  });

  afterAll(async () => {
    await broker.stop();
  });

  it("should start on a dynamic port", () => {
    expect(broker.port()).toBeGreaterThan(0);
  });

  it("should accept MQTT connections and route messages", async () => {
    const client1 = await connectAsync(`mqtt://localhost:${broker.port()}`);
    const client2 = await connectAsync(`mqtt://localhost:${broker.port()}`);

    const messages: string[] = [];
    await client2.subscribeAsync("test/topic");
    client2.on("message", (_topic, payload) => {
      messages.push(payload.toString());
    });

    await new Promise((r) => setTimeout(r, 100));
    await client1.publishAsync("test/topic", "hello");

    await new Promise((r) => setTimeout(r, 300));

    expect(messages).toContain("hello");

    await client1.endAsync();
    await client2.endAsync();
  }, 10000);
});
