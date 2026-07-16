import type { Connector } from "../port/connector.js";

export interface MqttCounterDevice {
  start(port: number): Promise<void>;
  stop(): Promise<void>;
}

export function createMqttCounterDevice(connector: Connector): MqttCounterDevice {
  let interval: ReturnType<typeof setInterval> | null = null;
  let count = 0;

  return {
    async start(port: number): Promise<void> {
      await connector.connect(port);
      interval = setInterval(async () => {
        count++;
        await connector.publish("counter", JSON.stringify({ count }));
      }, 2000);
    },

    async stop(): Promise<void> {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      await connector.disconnect();
    },
  };
}
