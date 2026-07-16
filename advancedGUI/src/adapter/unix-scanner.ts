import { readdir } from "fs/promises";
import { existsSync } from "fs";
import { join, basename, extname } from "path";
import { createConnection } from "net";
import type { DeviceScanner, DeviceEvent, DeviceDataHandler } from "../port/device-scanner.js";

export function createUnixScanner(socketDir: string, pollIntervalMs = 2000): DeviceScanner {
  let timer: ReturnType<typeof setInterval> | null = null;
  let knownSockets = new Map<string, { connected: boolean }>();
  let eventHandler: ((event: DeviceEvent) => void) | null = null;
  let dataHandler: DeviceDataHandler | null = null;

  async function pollState(deviceId: string, socketPath: string): Promise<void> {
    try {
      const client = createConnection(socketPath, () => {
        client.write("state?\n");
      });

      const response = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          client.destroy();
          reject(new Error("timeout"));
        }, 1000);

        client.on("data", (data: Buffer) => {
          clearTimeout(timeout);
          client.end();
          resolve(data.toString().trim());
        });

        client.on("error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      if (response && dataHandler) {
        const parsed = JSON.parse(response);
        dataHandler(deviceId, parsed);
      }
    } catch {
      // socket not available or no response
    }
  }

  async function poll(): Promise<void> {
    try {
      const files = await readdir(socketDir);
      const currentIds = new Set(
        files
          .filter((f) => f.endsWith(".sock") || f.endsWith(".socket"))
          .map((f) => basename(f, extname(f))),
      );

      for (const id of currentIds) {
        if (!knownSockets.has(id)) {
          knownSockets.set(id, { connected: false });
          eventHandler?.({ deviceId: id, transport: "unix", type: "joined" });
        }
        // poll state for all known sockets
        const socketPath = join(socketDir, `${id}.sock`);
        await pollState(id, socketPath);
      }

      for (const id of knownSockets.keys()) {
        if (!currentIds.has(id)) {
          knownSockets.delete(id);
          eventHandler?.({ deviceId: id, transport: "unix", type: "left" });
        }
      }
    } catch {
      // directory not available yet
    }
  }

  return {
    async start(): Promise<void> {
      knownSockets.clear();
      await poll();
      timer = setInterval(poll, pollIntervalMs);
    },

    async stop(): Promise<void> {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      knownSockets.clear();
    },

    onEvent(handler: (event: DeviceEvent) => void): void {
      eventHandler = handler;
    },

    onData(handler: DeviceDataHandler): void {
      dataHandler = handler;
    },
  };
}
