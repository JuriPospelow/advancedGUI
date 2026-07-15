import { connect } from "mqtt";
import type { Connector } from "../port/connector.js";

export function createMqttConnector(): Connector {
  let client: ReturnType<typeof connect> | null = null;
  let messageHandler: ((topic: string, payload: string) => void) | null = null;

  return {
    connect(port: number): Promise<void> {
      return new Promise((resolve, reject) => {
        client = connect(`mqtt://localhost:${port}`, { manualConnect: true });
        client.on("connect", () => resolve());
        client.on("error", reject);
        client.connect();
      });
    },

    disconnect(): Promise<void> {
      return new Promise((resolve) => {
        if (!client) { resolve(); return; }
        client.end(true, {}, () => resolve());
      });
    },

    publish(topic: string, payload: string): Promise<void> {
      return new Promise((resolve, reject) => {
        if (!client) { reject(new Error("Not connected")); return; }
        client.publish(topic, payload, {}, (err) => {
          if (err) reject(err); else resolve();
        });
      });
    },

    subscribe(topic: string): Promise<void> {
      return new Promise((resolve, reject) => {
        if (!client) { reject(new Error("Not connected")); return; }
        client.subscribe(topic, (err) => {
          if (err) reject(err); else resolve();
        });
      });
    },

    onMessage(handler: (topic: string, payload: string) => void): void {
      messageHandler = handler;
      if (client) {
        client.on("message", (topic, payload) => {
          messageHandler?.(topic, payload.toString());
        });
      }
    },
  };
}
