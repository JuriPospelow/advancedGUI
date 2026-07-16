import "dotenv/config";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, readdirSync, unlinkSync } from "fs";
import { createBroker } from "../adapter/broker.js";
import { createPinoLogger } from "../adapter/pino-logger.js";
import { createFileUserStore } from "../adapter/file-user-store.js";
import { createExpressServer } from "../adapter/express-server.js";
import { createWsBridge } from "../adapter/ws-bridge.js";
import { createUnixScanner } from "../adapter/unix-scanner.js";
import { createMqttScanner } from "../adapter/mqtt-scanner.js";
import { DeviceManager } from "../core/device-manager.js";
import { createHealthData } from "../core/health-model.js";
import { flattenFields } from "../core/flatten.js";
import { createDevicesConfig } from "../mock/devices.config.js";
import { MockManager, MOCK_DEVICES } from "../adapter/mock-manager.js";
import { createShutdownHandler } from "./shutdown.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "8080", 10);
const UNIX_SOCKET_DIR = process.env.UNIX_SOCKET_DIR || "/tmp/sockets";
const AUTH_FILE = process.env.AUTH_FILE || resolve(__dirname, "../../.auth.json");

async function main() {
  const logger = createPinoLogger(process.env.LOG_LEVEL || "info");
  const userStore = createFileUserStore(AUTH_FILE);
  const deviceManager = new DeviceManager();
  const cfg = createDevicesConfig();

  mkdirSync(UNIX_SOCKET_DIR, { recursive: true });
  for (const f of readdirSync(UNIX_SOCKET_DIR)) {
    if (f.endsWith(".sock")) {
      try { unlinkSync(`${UNIX_SOCKET_DIR}/${f}`); } catch { /* ok */ }
    }
  }

  // --- Broker ---
  const broker = createBroker();
  const brokerPort = await broker.start();
  logger.info(`Broker started on port ${brokerPort}`);

  // --- MockManager (remote toggle via WS) ---
  const mockManager = new MockManager(deviceManager, brokerPort, UNIX_SOCKET_DIR);

  // --- Unix scanner ---
  const unixScanner = createUnixScanner(UNIX_SOCKET_DIR);
  unixScanner.onEvent((event) => {
    if (event.type === "joined") {
      deviceManager.join(event.deviceId, "unix", new Set());
      logger.info(`Device joined: ${event.deviceId} (unix)`);
    } else {
      deviceManager.leave(event.deviceId);
      logger.info(`Device left: ${event.deviceId} (unix)`);
    }
  });
  unixScanner.onData((deviceId, fields) => {
    const flat = flattenFields(fields);
    logger.debug(`Unix data [${deviceId}]: ${JSON.stringify(flat)}`);
    wsBridge.broadcast({ type: "devices", updated: { [deviceId]: flat } });
  });
  await unixScanner.start();

  // --- MQTT scanner ---
  const mqttScanner = createMqttScanner({ brokerPort, configTopic: "#", deviceIdPrefix: "mqtt-" });
  mqttScanner.onEvent((event) => {
    if (event.type === "joined") {
      deviceManager.join(event.deviceId, "mqtt", new Set());
      logger.info(`Device joined: ${event.deviceId} (mqtt)`);
    } else {
      deviceManager.leave(event.deviceId);
      logger.info(`Device left: ${event.deviceId} (mqtt)`);
    }
  });
  mqttScanner.onData((deviceId, fields) => {
    const flat = flattenFields(fields);
    logger.debug(`MQTT data [${deviceId}]: ${JSON.stringify(flat)}`);
    wsBridge.broadcast({ type: "devices", updated: { [deviceId]: flat } });
  });
  await mqttScanner.start();

  // --- Express + WS ---
  const expressServer = createExpressServer(logger, userStore, () => {
    const devices = deviceManager.getAll();
    return createHealthData(
      Math.floor(process.uptime()),
      "0.2.0",
      brokerPort,
      0,
      devices.filter((d) => d.transport === "unix").length,
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
    mockManager,
  );
  wsBridge.start();

  await expressServer.start(PORT);

  // --- Start initial mock devices ---
  const mocks: { stop: () => Promise<void> }[] = [];
  const autoStart: Record<string, boolean> = {
    "mqtt-counter": cfg.enableMqttCounter,
    "mqtt-measurement": cfg.enableMqttMeasurement,
    "unix-counter": cfg.enableUnixCounter,
    "unix-device-a": cfg.enableUnixDeviceA,
    "unix-device-b": cfg.enableUnixDeviceB,
    "unix-device-c": cfg.enableUnixDeviceC,
  };
  for (const [id, enabled] of Object.entries(autoStart)) {
    if (enabled) {
      try {
        await mockManager.start(id);
        mocks.push({ stop: () => mockManager.stop(id) });
        logger.info(`${id} mock started`);
      } catch (err) {
        logger.error(`Failed to start ${id}: ${err}`);
      }
    }
  }

  // --- Graceful shutdown ---
  const shutdown = createShutdownHandler(logger, ...mocks, wsBridge, expressServer, unixScanner, mqttScanner, broker);
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
