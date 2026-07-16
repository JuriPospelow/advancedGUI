import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import type { Connector } from "../port/connector.js";
import type { UserStore, UserLevel } from "../port/user-store.js";
import type { Logger } from "../port/logger.js";
import { DeviceManager } from "../core/device-manager.js";
import { canPerform } from "../core/auth-domain.js";

const MAX_TOPIC_LENGTH = 128;
const MAX_PAYLOAD_LENGTH = 65536;

export interface WsClient {
  ws: WebSocket;
  userLevel: UserLevel;
  username: string;
}

export function createWsBridge(
  httpServer: HttpServer,
  path: string,
  userStore: UserStore,
  logger: Logger,
  deviceManager: DeviceManager,
): { start: () => void; stop: () => Promise<void>; broadcast: (msg: unknown) => void } {
  const clients = new Map<WebSocket, WsClient>();
  let wss: WebSocketServer;

  function broadcast(msg: unknown): void {
    const data = JSON.stringify(msg);
    for (const { ws } of clients.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  function broadcastToLevel(msg: unknown, minLevel: UserLevel): void {
    const data = JSON.stringify(msg);
    for (const { ws, userLevel } of clients.values()) {
      if (ws.readyState === WebSocket.OPEN && canPerform(userLevel, minLevel)) {
        ws.send(data);
      }
    }
  }

  function sendTo(ws: WebSocket, msg: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  return {
    start(): void {
      wss = new WebSocketServer({ server: httpServer, path });

      wss.on("connection", (ws) => {
        let authenticated = false;
        let clientInfo: WsClient | null = null;

        const authTimeout = setTimeout(() => {
          if (!authenticated) {
            sendTo(ws, { type: "error", message: "Authentication timeout" });
            ws.close();
          }
        }, 10000);

        ws.on("message", async (raw) => {
          try {
            const msg = JSON.parse(raw.toString());

            if (!authenticated) {
              if (msg.type === "auth") {
                const { username, password } = msg;
                if (!username || !password) {
                  sendTo(ws, { type: "auth_response", success: false, error: "Missing credentials" });
                  return;
                }
                const user = await userStore.authenticate(username, password);
                if (user) {
                  authenticated = true;
                  clearTimeout(authTimeout);
                  clientInfo = { ws, userLevel: user.level, username: user.username };
                  clients.set(ws, clientInfo);
                  sendTo(ws, { type: "auth_response", success: true, level: user.level, username: user.username });
                  logger.info(`WS client authenticated: ${user.username} (${user.level})`);

                  const allDevices = deviceManager.getAll();
                  const joined: Record<string, Record<string, string>> = {};
                  for (const device of allDevices) {
                    joined[device.deviceId] = {};
                  }
                  sendTo(ws, { type: "devices", joined });
                } else {
                  sendTo(ws, { type: "auth_response", success: false, error: "Invalid credentials" });
                }
              }
              return;
            }

            if (!clientInfo) return;

            if (msg.type === "command") {
              if (!canPerform(clientInfo.userLevel, "operator")) {
                sendTo(ws, { type: "error", message: "Insufficient permissions" });
                return;
              }
              const { topic, payload } = msg;
              if (typeof topic !== "string" || topic.length > MAX_TOPIC_LENGTH) {
                sendTo(ws, { type: "error", message: "Invalid topic" });
                return;
              }
              if (typeof payload !== "string" || payload.length > MAX_PAYLOAD_LENGTH) {
                sendTo(ws, { type: "error", message: "Invalid payload" });
                return;
              }
              logger.info(`WS command from ${clientInfo.username}: ${topic}`);
              broadcast({ type: "command", topic, payload, from: clientInfo.username });
            }
          } catch {
            sendTo(ws, { type: "error", message: "Malformed message" });
          }
        });

        ws.on("close", () => {
          clients.delete(ws);
          if (clientInfo) {
            logger.info(`WS client disconnected: ${clientInfo.username}`);
          }
        });

        ws.on("error", () => {
          clients.delete(ws);
        });
      });

      deviceManager.onEvent((event) => {
        if (event.type === "joined") {
          broadcast({ type: "devices", joined: { [event.deviceId]: {} } });
        } else if (event.type === "left") {
          broadcast({ type: "devices", left: [event.deviceId] });
        }
      });
    },

    stop(): Promise<void> {
      return new Promise((resolve) => {
        for (const { ws } of clients.values()) {
          ws.close();
        }
        clients.clear();
        wss.close(() => resolve());
      });
    },

    broadcast,
  };
}
