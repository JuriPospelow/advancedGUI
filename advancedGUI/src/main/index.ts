import "dotenv/config";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createBroker } from "../adapter/broker.js";
import { createMqttConnector } from "../adapter/mqtt-connector.js";
import { createPinoLogger } from "../adapter/pino-logger.js";
import { createFileUserStore } from "../adapter/file-user-store.js";
import { createExpressServer } from "../adapter/express-server.js";
import { createWsBridge } from "../adapter/ws-bridge.js";
import { createUnixScanner } from "../adapter/unix-scanner.js";
import { DeviceManager } from "../core/device-manager.js";
import { createHealthData } from "../core/health-model.js";
import { createShutdownHandler } from "./shutdown.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "8080", 10);
const UNIX_SOCKET_DIR = process.env.UNIX_SOCKET_DIR || "/tmp/sockets";
const AUTH_FILE = process.env.AUTH_FILE || resolve(__dirname, "../../.auth.json");

async function main() {
  const logger = createPinoLogger(process.env.LOG_LEVEL || "info");
  const userStore = createFileUserStore(AUTH_FILE);
  const deviceManager = new DeviceManager();

  const broker = createBroker();
  const brokerPort = await broker.start();
  logger.info(`Broker started on port ${brokerPort}`);

  const unixScanner = createUnixScanner(UNIX_SOCKET_DIR);
  unixScanner.onEvent((event) => {
    if (event.type === "joined") {
      deviceManager.join(event.deviceId, "unix", new Set());
    } else {
      deviceManager.leave(event.deviceId);
    }
    logger.info(`Device ${event.type}: ${event.deviceId} (unix)`);
  });
  await unixScanner.start();

  const expressServer = createExpressServer(logger, userStore, () => {
    const devices = deviceManager.getAll();
    return createHealthData(
      Math.floor(process.uptime()),
      "0.2.0",
      brokerPort,
      0,
      devices.length,
      null,
    );
  });

  const wsBridge = createWsBridge(
    expressServer.httpServer,
    expressServer.wsPath,
    userStore,
    logger,
    deviceManager,
  );
  wsBridge.start();

  await expressServer.start(PORT);

  const shutdown = createShutdownHandler(logger, wsBridge, expressServer, unixScanner, broker);
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
