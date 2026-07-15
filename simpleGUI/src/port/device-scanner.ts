export interface DeviceEvent {
  deviceId: string;
  type: "joined" | "left";
  transport: "unix" | "mqtt";
}

export interface DeviceScanner {
  start(): Promise<void>;
  stop(): Promise<void>;
  onEvent(handler: (event: DeviceEvent) => void): void;
}
