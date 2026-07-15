import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "http";
import { WebSocket } from "ws";
import { createBroker } from "./broker.js";
import { createMqttConnector } from "./connectors/mqtt-connector.js";
import { createBridge } from "./bridge.js";

describe("Bridge", () => {
  const broker = createBroker();
  const connector = createMqttConnector();
  const bridge = createBridge(connector);
  let port: number;
  const httpServer = createServer();

  beforeAll(async () => {
    port = await broker.start();
    await bridge.start(port, httpServer);
    await new Promise<void>((resolve) =>
      httpServer.listen(0, () => resolve()),
    );
  });

  afterAll(async () => {
    httpServer.close();
    await bridge.stop();
    await broker.stop();
  });

  it("should forward MQTT messages to WebSocket clients", async () => {
    const httpAddr = httpServer.address();
    if (!httpAddr || typeof httpAddr !== "object") throw new Error("no addr");
    const wsUrl = `ws://localhost:${httpAddr.port}/ws`;

    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      ws.on("open", () => resolve());
      ws.on("error", reject);
    });

    const received: { topic: string; payload: string }[] = [];
    ws.on("message", (data) => {
      received.push(JSON.parse(data.toString()));
    });

    // publish via MQTT connector
    const pub = createMqttConnector();
    await pub.connect(port);
    await pub.publish("mock/counter", JSON.stringify({ count: 42 }));
    await new Promise((r) => setTimeout(r, 300));

    expect(received.length).toBe(1);
    expect(received[0].topic).toBe("mock/counter");
    expect(JSON.parse(received[0].payload).count).toBe(42);

    ws.close();
    await pub.disconnect();
  }, 10000);

  it("should forward WebSocket messages to MQTT", async () => {
    const httpAddr = httpServer.address();
    if (!httpAddr || typeof httpAddr !== "object") throw new Error("no addr");
    const wsUrl = `ws://localhost:${httpAddr.port}/ws`;

    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      ws.on("open", () => resolve());
      ws.on("error", reject);
    });

    const sub = createMqttConnector();
    await sub.connect(port);
    await sub.subscribe("mock/control");

    const received: { topic: string; payload: string }[] = [];
    sub.onMessage((topic, payload) => {
      received.push({ topic, payload });
    });

    await new Promise((r) => setTimeout(r, 100));
    ws.send(
      JSON.stringify({
        topic: "mock/control",
        payload: JSON.stringify({ cmd: "reset" }),
      }),
    );

    await new Promise((r) => setTimeout(r, 300));

    expect(received.length).toBe(1);
    expect(received[0].topic).toBe("mock/control");
    expect(JSON.parse(received[0].payload).cmd).toBe("reset");

    ws.close();
    await sub.disconnect();
  }, 10000);
});
