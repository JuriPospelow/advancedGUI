import { createConnection, Socket } from "net";
import type { Connector } from "../port/connector.js";

export function createUnixConnector(socketPath: string): Connector {
  let client: Socket | null = null;
  let messageHandler: ((topic: string, payload: string) => void) | null = null;

  return {
    connect(): Promise<void> {
      return new Promise((resolve, reject) => {
        client = createConnection(socketPath, () => resolve());
        client.on("error", reject);
        client.on("data", (data: Buffer) => {
          messageHandler?.("unix/data", data.toString().trim());
        });
      });
    },

    disconnect(): Promise<void> {
      return new Promise((resolve) => {
        if (!client) {
          resolve();
          return;
        }
        client.end(() => resolve());
        client = null;
      });
    },

    publish(_topic: string, payload: string): Promise<void> {
      return new Promise((resolve, reject) => {
        if (!client) {
          reject(new Error("Not connected"));
          return;
        }
        client.write(payload, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },

    subscribe(): Promise<void> {
      return Promise.resolve();
    },

    onMessage(handler: (topic: string, payload: string) => void): void {
      messageHandler = handler;
    },
  };
}
