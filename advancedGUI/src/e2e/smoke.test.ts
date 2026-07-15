import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { createBroker } from "../adapter/broker.js";
import { createExpressServer } from "../adapter/express-server.js";
import { createPinoLogger } from "../adapter/pino-logger.js";
import { createFileUserStore } from "../adapter/file-user-store.js";
import { createHealthData } from "../core/health-model.js";
import { createWsBridge } from "../adapter/ws-bridge.js";
import { DeviceManager } from "../core/device-manager.js";
import WebSocket from "ws";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = resolve(__dirname, "../../.auth.json");
const PORT = 0;

describe("e2e", () => {
  const logger = createPinoLogger("silent");
  const userStore = createFileUserStore(AUTH_FILE);
  const deviceManager = new DeviceManager();
  let brokerPort: number;
  let broker: ReturnType<typeof createBroker>;
  let server: ReturnType<typeof createExpressServer>;
  let wsBridge: ReturnType<typeof createWsBridge>;
  let httpPort: number;

  beforeAll(async () => {
    broker = createBroker();
    brokerPort = await broker.start();

    deviceManager.join("test-device", "unix", new Set(["state", "pdu", "con"]));

    server = createExpressServer(logger, userStore, () =>
      createHealthData(42, "0.2.0", brokerPort, 0, 1, null),
    );

    wsBridge = createWsBridge(
      server.httpServer,
      server.wsPath,
      userStore,
      logger,
      deviceManager,
    );
    wsBridge.start();

    httpPort = await new Promise<number>((resolve) => {
      server.httpServer.listen(PORT, () => {
        const addr = server.httpServer.address();
        resolve(typeof addr === "object" && addr ? addr.port : 0);
      });
    });
  });

  afterAll(async () => {
    wsBridge.stop();
    await server.stop();
    broker.stop();
  });

  it("should serve auth endpoint", async () => {
    const res = await fetch(`http://localhost:${httpPort}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.level).toBe("admin");
  });

  it("should reject invalid credentials", async () => {
    const res = await fetch(`http://localhost:${httpPort}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "wrong" }),
    });
    expect(res.status).toBe(401);
  });

  it("should return health data", async () => {
    const res = await fetch(`http://localhost:${httpPort}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.uptime).toBe(42);
    expect(data.unixConnections).toBe(1);
  });

  it("should accept WebSocket connection with auth", async () => {
    const ws = new WebSocket(`ws://localhost:${httpPort}/ws`);

    const connected = new Promise<void>((resolve, reject) => {
      ws.on("open", () => resolve());
      ws.on("error", reject);
      setTimeout(() => reject(new Error("timeout")), 5000);
    });
    await connected;

    const authRes = new Promise<void>((resolve, reject) => {
      const messages: string[] = [];
      ws.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        messages.push(msg.type);
        if (msg.type === "auth_response" && msg.success) {
          expect(msg.level).toBe("admin");
        }
        if (msg.type === "devices") {
          expect(Object.keys(msg.joined)).toContain("test-device");
          ws.close();
          resolve();
        }
      });
      setTimeout(() => {
        ws.close();
        reject(new Error(`timeout waiting for device event, got: ${messages.join(", ")}`));
      }, 5000);
    });

    ws.send(JSON.stringify({ type: "auth", username: "admin", password: "admin" }));
    await authRes;
  }, 10000);
});
