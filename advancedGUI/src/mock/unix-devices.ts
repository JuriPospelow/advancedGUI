import { createServer } from "net";

export interface UnixMockDevice {
  start(socketPath: string): Promise<void>;
  stop(): Promise<void>;
}

export function createUnixDevice1(socketPath: string): UnixMockDevice {
  const server = createServer((conn) => {
    conn.on("data", (data) => {
      const msg = data.toString().trim();
      if (msg === "state?") {
        conn.write(JSON.stringify({
          state: "IDLE",
          pdu: "ON",
          con: "CONNECTED,DISCONNECTED",
          shutter: "UNKNOWN",
          power: 50,
          ilck: "UNKNOWN",
          detail: {
            Mode: "MAN",
            Ctrl: "REMOTE",
            Laser: "STB",
            Gate: "UP",
            PwmFreq: "20kHz",
            LoP: "DIS",
            PwmMax: "99%",
            Pwm: 50,
          },
        }) + "\n");
      }
    });
  });

  return {
    start(): Promise<void> {
      return new Promise((resolve, reject) => {
        server.listen(socketPath, () => resolve());
        server.on("error", reject);
      });
    },

    stop(): Promise<void> {
      return new Promise((resolve) => {
        server.close(() => resolve());
      });
    },
  };
}

export function createUnixDevice2(socketPath: string): UnixMockDevice {
  const server = createServer((conn) => {
    conn.on("data", (data) => {
      const msg = data.toString().trim();
      if (msg === "state?") {
        conn.write(JSON.stringify({
          state: "READY",
          pdu: "ON",
          con: "CONNECTED",
          shutter: "UNKNOWN",
          ilck: "OPEN",
          power: 0,
          detail: {
            LaserOn: 0,
            Interlock: "0",
            TriggerMode: "qcw",
            Setpoint: 0,
            T1: "stable",
          },
        }) + "\n");
      }
    });
  });

  return {
    start(): Promise<void> {
      return new Promise((resolve, reject) => {
        server.listen(socketPath, () => resolve());
        server.on("error", reject);
      });
    },

    stop(): Promise<void> {
      return new Promise((resolve) => {
        server.close(() => resolve());
      });
    },
  };
}

export function createUnixDevice3(socketPath: string): UnixMockDevice {
  const server = createServer((conn) => {
    conn.on("data", (data) => {
      const msg = data.toString().trim();
      if (msg === "state?") {
        conn.write(JSON.stringify({
          state: "READY",
          pdu: "ON",
          con: "CONNECTED",
          shutter: "UNKNOWN",
          ilck: "OPEN",
          power: 0,
          detail: {
            LaserOn: 0,
            Interlock: "0",
            TriggerMode: "qcw",
            Setpoint: 0,
            T1: "stable",
            T2: "stable",
          },
        }) + "\n");
      }
    });
  });

  return {
    start(): Promise<void> {
      return new Promise((resolve, reject) => {
        server.listen(socketPath, () => resolve());
        server.on("error", reject);
      });
    },

    stop(): Promise<void> {
      return new Promise((resolve) => {
        server.close(() => resolve());
      });
    },
  };
}
