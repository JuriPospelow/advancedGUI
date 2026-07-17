import express from "express";
import { createServer, Server as HttpServer } from "http";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { Logger } from "../port/logger.js";
import type { UserStore, UserLevel } from "../port/user-store.js";
import type { HealthData } from "../core/health-model.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rendererPath = resolve(__dirname, "../renderer");

export interface ExpressServer {
  httpServer: HttpServer;
  start(port: number): Promise<void>;
  stop(): Promise<void>;
  getHealth(): HealthData;
  wsPath: string;
}

export function createExpressServer(
  logger: Logger,
  userStore: UserStore,
  getHealth: () => HealthData,
): ExpressServer {
  const app = express();
  const httpServer = createServer(app);
  let currentPort = 0;
  const startTime = Date.now();

  app.use(express.static(rendererPath));

  app.get("/health", async (_req, res) => {
    const h = getHealth();
    res.json(h);
  });

  app.post("/auth", express.json(), async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      res.status(400).json({ success: false, error: "Missing credentials" });
      return;
    }
    const user = await userStore.authenticate(username, password);
    if (user) {
      res.json({ success: true, username: user.username, level: user.level });
    } else {
      res.status(401).json({ success: false, error: "Invalid credentials" });
    }
  });

  return {
    httpServer,
    wsPath: "/ws",

    async start(port: number): Promise<void> {
      return new Promise((resolve, reject) => {
        httpServer.listen(port, () => {
          currentPort = port;
          logger.info(`HTTP server on http://localhost:${port}`);
          resolve();
        });
        httpServer.on("error", reject);
      });
    },

    stop(): Promise<void> {
      return new Promise((resolve) => {
        httpServer.close(() => resolve());
        setTimeout(() => resolve(), 1000);
      });
    },

    getHealth(): HealthData {
      return {
        status: "ok",
        uptime: Math.floor((Date.now() - startTime) / 1000),
        version: "0.2.0",
        brokerPort: 0,
        wsConnections: 0,
        unixConnections: 0,
        deviceCount: 0,
        lastError: null,
      };
    },
  };
}
