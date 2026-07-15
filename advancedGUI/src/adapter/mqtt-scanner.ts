import { connect } from "mqtt";
import type { DeviceScanner, DeviceEvent } from "../port/device-scanner.js";

export interface MqttScannerConfig {
  brokerPort: number;
  configTopic?: string;
  deviceIdPrefix?: string;
}

export function createMqttScanner(config: MqttScannerConfig): DeviceScanner {
  let client: ReturnType<typeof connect> | null = null;
  let eventHandler: ((event: DeviceEvent) => void) | null = null;
  const knownDevices = new Set<string>();
  const prefix = config.deviceIdPrefix ?? "mqtt-";

  return {
    async start(): Promise<void> {
      client = connect(`mqtt://localhost:${config.brokerPort}`, { manualConnect: true });
      await new Promise<void>((resolve, reject) => {
        client!.on("connect", () => resolve());
        client!.on("error", reject);
        client!.connect();
      });

      if (config.configTopic) {
        await new Promise<void>((resolve, reject) => {
          client!.subscribe(config.configTopic!, (err) => {
            if (err) reject(err); else resolve();
          });
        });
      }

      client!.on("message", (topic) => {
        const deviceId = `${prefix}${topic.replace(/\//g, "-")}`;
        if (!knownDevices.has(deviceId)) {
          knownDevices.add(deviceId);
          eventHandler?.({ deviceId, transport: "mqtt", type: "joined" });
        }
      });
    },

    async stop(): Promise<void> {
      return new Promise((resolve) => {
        if (!client) { resolve(); return; }
        client.end(true, {}, () => {
          knownDevices.clear();
          resolve();
        });
      });
    },

    onEvent(handler: (event: DeviceEvent) => void): void {
      eventHandler = handler;
    },
  };
}
