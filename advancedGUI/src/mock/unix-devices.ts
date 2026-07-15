import type { Connector } from "../port/connector.js";
import { createUnixConnector } from "../adapter/unix-connector.js";

export interface UnixMockDevice {
  start(socketPath: string): Promise<void>;
  stop(): Promise<void>;
}

function createDevicePublisher(
  socketPath: string,
  getPayload: () => string,
  intervalMs = 3000,
): UnixMockDevice {
  const connector = createUnixConnector(socketPath);
  let timer: ReturnType<typeof setInterval> | null = null;

  return {
    async start(): Promise<void> {
      await connector.connect(0);
      timer = setInterval(async () => {
        await connector.publish("mock/data", getPayload());
      }, intervalMs);
    },

    async stop(): Promise<void> {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      await connector.disconnect();
    },
  };
}

export function createUnixDeviceA(socketPath: string): UnixMockDevice {
  return createDevicePublisher(socketPath, () =>
    JSON.stringify({
      state: "IDLE",
      pdu: "ON",
      con: "CONNECTED,DISCONNECTED",
      shutter: "UNKNOWN",
      power: 50,
      ilck: "UNKNOWN",
      detail: { Mode: "MAN", Ctrl: "REMOTE", Laser: "STB", Gate: "UP", PwmFreq: "20kHz", LoP: "DIS", PwmMax: "99%", Pwm: 50 },
    }),
  );
}

export function createUnixDeviceB(socketPath: string): UnixMockDevice {
  return createDevicePublisher(socketPath, () =>
    JSON.stringify({
      state: "READY",
      pdu: "ON",
      con: "CONNECTED",
      shutter: "UNKNOWN",
      ilck: "OPEN",
      power: 0,
      detail: { LaserOn: 0, Interlock: "0", TriggerMode: "qcw", Setpoint: 0, T1: "stable" },
    }),
  );
}

export function createUnixDeviceC(socketPath: string): UnixMockDevice {
  return createDevicePublisher(socketPath, () =>
    JSON.stringify({
      state: "READY",
      pdu: "ON",
      con: "CONNECTED",
      shutter: "UNKNOWN",
      ilck: "OPEN",
      power: 0,
      detail: { LaserOn: 0, Interlock: "0", TriggerMode: "qcw", Setpoint: 0, T1: "stable", T2: "stable" },
    }),
  );
}
