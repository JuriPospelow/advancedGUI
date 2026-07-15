import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createBroker } from "../main/broker.js";
import { createMqttConnector } from "../main/connectors/mqtt-connector.js";
import { createMockDevice } from "./device.js";

describe("MockDevice", () => {
  const broker = createBroker();
  let port: number;

  beforeAll(async () => {
    port = await broker.start();
  });

  afterAll(async () => {
    await broker.stop();
  });

  it("should publish counter messages and respond to commands", async () => {
    const deviceConnector = createMqttConnector();
    const device = createMockDevice(deviceConnector);
    await device.start(port);

    const monitor = createMqttConnector();
    await monitor.connect(port);
    await monitor.subscribe("mock/counter");

    const received: number[] = [];
    monitor.onMessage((_topic, payload) => {
      const data = JSON.parse(payload);
      received.push(data.count);
    });

    // wait for 2 counter ticks
    await new Promise((r) => setTimeout(r, 4500));
    expect(received.length).toBeGreaterThanOrEqual(2);

    // send reset
    await monitor.publish(
      "mock/control",
      JSON.stringify({ cmd: "reset" }),
    );
    await new Promise((r) => setTimeout(r, 500));
    expect(device.getCount()).toBe(0);

    // send stop
    const beforeStop = received.length;
    await monitor.publish(
      "mock/control",
      JSON.stringify({ cmd: "stop" }),
    );
    await new Promise((r) => setTimeout(r, 2500));
    expect(received.length).toBe(beforeStop);

    // send start
    await monitor.publish(
      "mock/control",
      JSON.stringify({ cmd: "start" }),
    );
    await new Promise((r) => setTimeout(r, 2500));
    expect(received.length).toBeGreaterThan(beforeStop);

    await device.stop();
    await monitor.disconnect();
  }, 20000);
});
