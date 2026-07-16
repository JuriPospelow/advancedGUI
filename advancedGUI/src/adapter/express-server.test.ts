import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createExpressServer } from "./express-server.js";
import { createPinoLogger } from "./pino-logger.js";
import http from "http";

function getJson(url: string): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = "";
      res.on("data", (c) => body += c);
      res.on("end", () => resolve({ status: res.statusCode ?? 0, data: JSON.parse(body) }));
    }).on("error", reject);
  });
}

describe("ExpressServer", () => {
  let server: ReturnType<typeof createExpressServer>;
  let port: number;

  beforeAll(async () => {
    const logger = createPinoLogger("silent");
    server = createExpressServer(logger, null as never, () => ({
      status: "ok", uptime: 10, version: "0.2.0",
      brokerPort: 0, wsConnections: 0, unixConnections: 0, deviceCount: 0, lastError: null,
    }));
    await server.start(0);
    const addr = server.httpServer.address();
    port = addr && typeof addr === "object" ? addr.port : 8080;
  });

  afterAll(async () => {
    await server.stop();
  });

  it("should return health JSON", async () => {
    const { status, data } = await getJson(`http://localhost:${port}/health`);
    expect(status).toBe(200);
    expect(data).toMatchObject({ status: "ok", version: "0.2.0" });
  });
});
