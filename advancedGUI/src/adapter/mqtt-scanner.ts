import { connect } from "mqtt";
import type { DeviceScanner, DeviceEvent, DeviceDataHandler } from "../port/device-scanner.js";

export interface MqttScannerConfig {
  brokerPort: number;
  configTopic?: string;
  deviceIdPrefix?: string;
}

export function createMqttScanner(config: MqttScannerConfig): DeviceScanner {
  let client: ReturnType<typeof connect> | null = null;
  let eventHandler: ((event: DeviceEvent) => void) | null = null;
  let dataHandler: DeviceDataHandler | null = null;
  const knownDevices = new Set<string>();
  const prefix = config.deviceIdPrefix ?? "mqtt-";

  function parseDeviceId(topic: string): string {
    return `${prefix}${topic.replace(/\//g, "-")}`;
  }

  function handleMessage(topic: string, payload: Buffer): void {
    const deviceId = parseDeviceId(topic);
    if (!knownDevices.has(deviceId)) {
      knownDevices.add(deviceId);
      eventHandler?.({ deviceId, transport: "mqtt", type: "joined" });
    }
    try {
      const fields = JSON.parse(payload.toString());
      dataHandler?.(deviceId, fields);
    } catch {
      // non-JSON payload, ignore data
    }
  }

  return {
    async start(): Promise<void> {
      client = connect(`mqtt://localhost:${config.brokerPort}`, { manualConnect: true });
      await new Promise<void>((resolve, reject) => {
        client!.on("connect", () => resolve());
        client!.on("error", reject);
        client!.connect();
      });

      const topics = [config.configTopic ?? "#"];
      for (const topic of topics) {
        await new Promise<void>((resolve, reject) => {
          client!.subscribe(topic, (err) => {
            if (err) reject(err); else resolve();
          });
        });
      }

      client!.on("message", handleMessage);
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

    onData(handler: DeviceDataHandler): void {
      dataHandler = handler;
    },
  };
}
