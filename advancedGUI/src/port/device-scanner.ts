import type { DeviceEvent } from "../core/device-manager.js";

export type DeviceDataHandler = (deviceId: string, fields: Record<string, unknown>) => void;

export interface DeviceScanner {
  start(): Promise<void>;
  stop(): Promise<void>;
  onEvent(handler: (event: DeviceEvent) => void): void;
  onData(handler: DeviceDataHandler): void;
}
