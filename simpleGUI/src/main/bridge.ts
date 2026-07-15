import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { Connector } from "./connectors/connector.js";

/**
 * Bridges MQTT and WebSocket.
 * Forwards `mock/counter` from MQTT to WS clients,
 * and publishes WS messages to MQTT topics.
 */
export interface Bridge {
  /**
   * Connects to the MQTT broker and attaches to an HTTP server for WebSocket.
   * Subscribes to FORWARD_TOPICS.
   */
  start(port: number, httpServer: Server): Promise<void>;
  /** Closes the WebSocket server and disconnects from the broker. */
  stop(): Promise<void>;
}

/** MQTT topics forwarded from MQTT to all connected WebSocket clients. */
const FORWARD_TOPICS = ["mock/counter"];

/**
 * Creates a Bridge that relays messages between MQTT and WebSocket.
 * - MQTT `mock/counter` → all WS clients
 * - WS messages → published on MQTT topic from `topic` field
 */
export function createBridge(connector: Connector): Bridge {
  let wss: WebSocketServer | null = null;

  return {
    async start(port: number, httpServer: Server): Promise<void> {
      await connector.connect(port);

      wss = new WebSocketServer({ server: httpServer, path: "/ws" });

      connector.onMessage((topic, payload) => {
        const message = JSON.stringify({ topic, payload });
        wss?.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      });

      wss.on("connection", (ws) => {
        ws.on("message", (data) => {
          try {
            const { topic, payload } = JSON.parse(data.toString());
            connector.publish(topic, payload);
          } catch {
            // ignore malformed messages
          }
        });
      });

      for (const topic of FORWARD_TOPICS) {
        await connector.subscribe(topic);
      }
    },

    stop(): Promise<void> {
      return new Promise((resolve) => {
        wss?.close(() => {
          connector.disconnect().then(resolve);
        });
      });
    },
  };
}
