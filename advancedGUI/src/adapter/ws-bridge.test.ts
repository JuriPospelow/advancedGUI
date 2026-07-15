import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "http";
import { WebSocket } from "ws";
import { createWsBridge } from "./ws-bridge.js";
import { createPinoLogger } from "./pino-logger.js";
import { createFileUserStore, hashPassword } from "./file-user-store.js";
import { DeviceManager } from "../core/device-manager.js";
import { writeFileSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const testAuthPath = resolve(__dirname, "../../.auth.test3.json");

describe("WsBridge", () => {
  const httpServer = createServer();
  let port: number;
  let bridge: ReturnType<typeof createWsBridge>;
  const dm = new DeviceManager();

  beforeAll(async () => {
    writeFileSync(testAuthPath, JSON.stringify({
      users: [
        { username: "admin", passwordHash: hashPassword("admin"), level: "admin" },
        { username: "viewer", passwordHash: hashPassword("viewer"), level: "viewer" },
      ],
    }));
    const logger = createPinoLogger("silent");
    const userStore = createFileUserStore(testAuthPath);
    bridge = createWsBridge(httpServer, "/ws", userStore, logger, dm);
    bridge.start();

    await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
    const addr = httpServer.address();
    port = addr && typeof addr === "object" ? addr.port : 8080;
  });

  afterAll(async () => {
    await bridge.stop();
    httpServer.close();
    try { unlinkSync(testAuthPath); } catch { /* ok */ }
  });

  it("should reject unauthenticated client with timeout", async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    let closed = false;
    ws.on("close", () => { closed = true; });
    await new Promise((r) => setTimeout(r, 12000));
    expect(closed).toBe(true);
  }, 15000);

  it("should authenticate valid admin client", async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    const messages: unknown[] = [];

    ws.on("message", (data) => messages.push(JSON.parse(data.toString())));
    await new Promise<void>((resolve, reject) => {
      ws.on("open", () => resolve());
      ws.on("error", reject);
    });

    ws.send(JSON.stringify({ type: "auth", username: "admin", password: "admin" }));
    await new Promise((r) => setTimeout(r, 500));

    const authResponse = messages.find((m: any) => m.type === "auth_response");
    expect(authResponse).toBeTruthy();
    expect((authResponse as any).success).toBe(true);
    expect((authResponse as any).level).toBe("admin");

    ws.close();
  }, 10000);
});
