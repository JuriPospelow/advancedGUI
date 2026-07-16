import type { Connector } from "../port/connector.js";
import type { DeviceManager } from "../core/device-manager.js";
import { createMqttConnector } from "./mqtt-connector.js";
import { createMqttCounterDevice } from "../mock/mqtt-counter.js";
import { createMqttMeasurementDevice } from "../mock/mqtt-measurement.js";
import { createUnixCounter } from "../mock/unix-counter.js";
import { createUnixDevice1, createUnixDevice2, createUnixDevice3 } from "../mock/unix-devices.js";

export interface MockDeviceDef {
  id: string;
  label: string;
  transport: "unix" | "mqtt";
  socketPath?: string;
}

export const MOCK_DEVICES: MockDeviceDef[] = [
  { id: "mqtt-counter", label: "MQTT Counter", transport: "mqtt" },
  { id: "mqtt-measurement", label: "MQTT Measurement", transport: "mqtt" },
  { id: "unix-counter", label: "Unix Counter", transport: "unix", socketPath: "unix-counter.sock" },
  { id: "unix-device-a", label: "Unix Device A", transport: "unix", socketPath: "unix-device-a.sock" },
  { id: "unix-device-b", label: "Unix Device B", transport: "unix", socketPath: "unix-device-b.sock" },
  { id: "unix-device-c", label: "Unix Device C", transport: "unix", socketPath: "unix-device-c.sock" },
];

type Starter = { start: () => Promise<void>; stop: () => Promise<void> };

export class MockManager {
  private running = new Map<string, Starter>();
  private deviceManager: DeviceManager;
  private brokerPort: number;
  private socketDir: string;

  constructor(deviceManager: DeviceManager, brokerPort: number, socketDir: string) {
    this.deviceManager = deviceManager;
    this.brokerPort = brokerPort;
    this.socketDir = socketDir;
  }

  getState(): Record<string, boolean> {
    const state: Record<string, boolean> = {};
    for (const def of MOCK_DEVICES) {
      state[def.id] = this.running.has(def.id);
    }
    return state;
  }

  async start(deviceId: string): Promise<void> {
    if (this.running.has(deviceId)) return;
    const def = MOCK_DEVICES.find((d) => d.id === deviceId);
    if (!def) throw new Error(`Unknown mock device: ${deviceId}`);

    let starter: Starter;
    if (def.transport === "mqtt") {
      const conn: Connector = createMqttConnector();
      if (deviceId === "mqtt-counter") {
        const dev = createMqttCounterDevice(conn);
        await dev.start(this.brokerPort);
        starter = dev;
      } else {
        const dev = createMqttMeasurementDevice(conn);
        await dev.start(this.brokerPort);
        starter = dev;
      }
    } else {
      const socketPath = `${this.socketDir}/${def.socketPath}`;
      if (deviceId === "unix-counter") {
        const dev = createUnixCounter(socketPath);
        await dev.start();
        starter = dev;
      } else if (deviceId === "unix-device-a") {
        const dev = createUnixDevice1(socketPath);
        await dev.start();
        starter = dev;
      } else if (deviceId === "unix-device-b") {
        const dev = createUnixDevice2(socketPath);
        await dev.start();
        starter = dev;
      } else {
        const dev = createUnixDevice3(socketPath);
        await dev.start();
        starter = dev;
      }
    }

    this.running.set(deviceId, starter);
    this.deviceManager.join(deviceId, def.transport, new Set());
  }

  async stop(deviceId: string): Promise<void> {
    const starter = this.running.get(deviceId);
    if (!starter) return;
    await starter.stop();
    this.running.delete(deviceId);
    this.deviceManager.leave(deviceId);
  }
}
