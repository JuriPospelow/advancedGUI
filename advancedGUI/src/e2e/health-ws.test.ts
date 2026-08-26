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

// why: mirrors the ref-object wiring from main/index.ts so this test fails if
// /health stops reading the WS client count through a late-bound source.
describe("e2e health wsConnections", () => {
  const logger = createPinoLogger("silent");
  const userStore = createFileUserStore(AUTH_FILE);
  const deviceManager = new DeviceManager();
  const refs = { wsClientCount: (): number => 0 };

  let broker: ReturnType<typeof createBroker>;
  let brokerPort: number;
  let server: ReturnType<typeof createExpressServer>;
  let wsBridge: ReturnType<typeof createWsBridge>;
  let httpPort: number;

  beforeAll(async () => {
    broker = createBroker();
    brokerPort = await broker.start();

    server = createExpressServer(logger, userStore, () =>
      createHealthData(42, "0.2.0", 8080, brokerPort, refs.wsClientCount(), 0, 0, null),
    );

    wsBridge = createWsBridge(
      server.httpServer,
      server.wsPath,
      userStore,
      logger,
      deviceManager,
    );
    wsBridge.start();
    refs.wsClientCount = () => wsBridge.clientCount();

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

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function getWsCount(): Promise<number> {
    const res = await fetch(`http://localhost:${httpPort}/health`);
    expect(res.status).toBe(200);
    return ((await res.json()) as { wsConnections: number }).wsConnections;
  }

  // why: poll instead of fixed sleeps so the test stays fast and race-free
  async function pollUntil(pred: () => Promise<boolean>, timeoutMs = 3000): Promise<void> {
    const t0 = Date.now();
    while (!(await pred())) {
      if (Date.now() - t0 > timeoutMs) throw new Error("timeout waiting for condition");
      await sleep(25);
    }
  }

  function openClient(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${httpPort}/ws`);
      ws.on("open", () => resolve(ws));
      ws.on("error", reject);
      setTimeout(() => reject(new Error("timeout opening WS")), 5000);
    });
  }

  function closeClient(ws: WebSocket): Promise<void> {
    return new Promise((resolve) => {
      ws.on("close", () => resolve());
      ws.close();
    });
  }

  it("reports live WS client count through the late-bound ref", async () => {
    expect(await getWsCount()).toBe(0);

    const ws = await openClient();
    await pollUntil(async () => (await getWsCount()) === 1);

    await closeClient(ws);
    await pollUntil(async () => (await getWsCount()) === 0);
  }, 10000);
});
