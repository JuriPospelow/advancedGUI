export interface DeviceEvent {
  deviceId: string;
  type: "joined" | "left";
  transport: "unix" | "mqtt";
}

export type DeviceDataHandler = (deviceId: string, fields: Record<string, unknown>) => void;

export interface DeviceScanner {
  start(): Promise<void>;
  stop(): Promise<void>;
  onEvent(handler: (event: DeviceEvent) => void): void;
  onData(handler: DeviceDataHandler): void;
}
