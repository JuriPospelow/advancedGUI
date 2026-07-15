import { readdir } from "fs/promises";
import { existsSync } from "fs";
import { join, basename, extname } from "path";
import type { DeviceScanner, DeviceEvent } from "../port/device-scanner.js";

export function createUnixScanner(socketDir: string, pollIntervalMs = 2000): DeviceScanner {
  let timer: ReturnType<typeof setInterval> | null = null;
  let knownSockets = new Set<string>();
  let eventHandler: ((event: DeviceEvent) => void) | null = null;

  async function poll(): Promise<void> {
    try {
      const files = await readdir(socketDir);
      const current = new Set(
        files
          .filter((f) => f.endsWith(".sock") || f.endsWith(".socket"))
          .map((f) => basename(f, extname(f))),
      );

      for (const id of current) {
        if (!knownSockets.has(id)) {
          knownSockets.add(id);
          eventHandler?.({ deviceId: id, transport: "unix", type: "joined" });
        }
      }
      for (const id of knownSockets) {
        if (!current.has(id)) {
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
  };
}
