import type { Connector } from "../port/connector.js";

export interface MqttMeasurementDevice {
  start(port: number): Promise<void>;
  stop(): Promise<void>;
}

export function createMqttMeasurementDevice(connector: Connector): MqttMeasurementDevice {
  let interval: ReturnType<typeof setInterval> | null = null;

  function rand(min: number, max: number): number {
    return Math.round((min + Math.random() * (max - min)) * 10) / 10;
  }

  return {
    async start(port: number): Promise<void> {
      await connector.connect(port);
      interval = setInterval(async () => {
        const payload = JSON.stringify({
          temperature: rand(20, 30),
          humidity: rand(40, 80),
          pressure: rand(1000, 1020),
        });
        await connector.publish("measurement", payload);
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
