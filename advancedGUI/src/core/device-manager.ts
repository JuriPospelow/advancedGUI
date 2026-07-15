export type DeviceTransport = "unix" | "mqtt";

export interface DeviceInfo {
  deviceId: string;
  transport: DeviceTransport;
  keySet: Set<string>;
}

export interface DeviceEvent {
  deviceId: string;
  transport: DeviceTransport;
  type: "joined" | "left";
}

export class DeviceManager {
  private devices: Map<string, DeviceInfo> = new Map();
  private listeners: Set<(event: DeviceEvent) => void> = new Set();

  onEvent(handler: (event: DeviceEvent) => void): void {
    this.listeners.add(handler);
  }

  join(deviceId: string, transport: DeviceTransport, keySet: Set<string>): void {
    if (this.devices.has(deviceId)) return;
    this.devices.set(deviceId, { deviceId, transport, keySet });
    for (const listener of this.listeners) {
      listener({ deviceId, transport, type: "joined" });
    }
  }

  leave(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (!device) return;
    this.devices.delete(deviceId);
    for (const listener of this.listeners) {
      listener({ deviceId: device.deviceId, transport: device.transport, type: "left" });
    }
  }

  has(deviceId: string): boolean {
    return this.devices.has(deviceId);
  }

  getAll(): DeviceInfo[] {
    return Array.from(this.devices.values());
  }

  getDevice(deviceId: string): DeviceInfo | undefined {
    return this.devices.get(deviceId);
  }

  getActiveCount(): number {
    return this.devices.size;
  }

  getByTransport(transport: DeviceTransport): DeviceInfo[] {
    return this.getAll().filter((d) => d.transport === transport);
  }
}
