import "dotenv/config";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, readdirSync, unlinkSync } from "fs";
import { createBroker } from "../adapter/broker.js";
import { createMqttConnector } from "../adapter/mqtt-connector.js";
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
import { createMqttMeasurementDevice } from "../mock/mqtt-measurement.js";
import { createUnixCounter } from "../mock/unix-counter.js";
import { createMqttCounterDevice } from "../mock/mqtt-counter.js";
import { createUnixDevice1, createUnixDevice2, createUnixDevice3 } from "../mock/unix-devices.js";
import { createShutdownHandler, type Shutdownable } from "./shutdown.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "8080", 10);
const UNIX_SOCKET_DIR = process.env.UNIX_SOCKET_DIR || "/tmp/sockets";
const AUTH_FILE = process.env.AUTH_FILE || resolve(__dirname, "../../.auth.json");

async function main() {
  const logger = createPinoLogger(process.env.LOG_LEVEL || "info");
  const userStore = createFileUserStore(AUTH_FILE);
  const deviceManager = new DeviceManager();
  const cfg = createDevicesConfig();

  // ensure socket dir exists and clean up stale sockets from previous runs
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

  // --- Unix scanner (discovers .sock files + polls state?) ---
  const unixScanner = createUnixScanner(UNIX_SOCKET_DIR);
  unixScanner.onEvent((event) => {
    if (event.type === "joined") {
      deviceManager.join(event.deviceId, "unix", new Set());
    } else {
      deviceManager.leave(event.deviceId);
    }
  });
  unixScanner.onData((deviceId, fields) => {
    wsBridge.broadcast({ type: "devices", updated: { [deviceId]: flattenFields(fields) } });
  });
  await unixScanner.start();

  // --- MQTT scanner (discovers devices + reads data) ---
  const mqttScanner = createMqttScanner({ brokerPort, configTopic: "mock/#", deviceIdPrefix: "mqtt-" });
  mqttScanner.onEvent((event) => {
    if (event.type === "joined") {
      deviceManager.join(event.deviceId, "mqtt", new Set());
    } else {
      deviceManager.leave(event.deviceId);
    }
  });
  mqttScanner.onData((deviceId, fields) => {
    wsBridge.broadcast({ type: "devices", updated: { [deviceId]: flattenFields(fields) } });
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
  );
  wsBridge.start();

  await expressServer.start(PORT);

  // --- Mock devices (start on bootstrap) ---
  const mocks: Shutdownable[] = [];
  if (cfg.enableMqttCounter) {
    const mqttConn = createMqttConnector();
    const counter = createMqttCounterDevice(mqttConn);
    counter.start(brokerPort);
    mocks.push(counter);
    logger.info("mqtt-counter mock started");
  }
  if (cfg.enableMqttMeasurement) {
    const mqttConn = createMqttConnector();
    const measurement = createMqttMeasurementDevice(mqttConn);
    measurement.start(brokerPort);
    mocks.push(measurement);
    logger.info("mqtt-measurement mock started");
  }
  if (cfg.enableUnixCounter) {
    const counter = createUnixCounter(`${UNIX_SOCKET_DIR}/unix-counter.sock`);
    await counter.start();
    mocks.push(counter);
    logger.info("unix-counter mock started");
  }
  if (cfg.enableUnixDeviceA) {
    const dev1 = createUnixDevice1(`${UNIX_SOCKET_DIR}/unix-device-a.sock`);
    await dev1.start();
    mocks.push(dev1);
    logger.info("unix-device-a mock started");
  }
  if (cfg.enableUnixDeviceB) {
    const dev2 = createUnixDevice2(`${UNIX_SOCKET_DIR}/unix-device-b.sock`);
    await dev2.start();
    mocks.push(dev2);
    logger.info("unix-device-b mock started");
  }
  if (cfg.enableUnixDeviceC) {
    const dev3 = createUnixDevice3(`${UNIX_SOCKET_DIR}/unix-device-c.sock`);
    await dev3.start();
    mocks.push(dev3);
    logger.info("unix-device-c mock started");
  }

  // --- Graceful shutdown ---
  const shutdown = createShutdownHandler(logger, wsBridge, expressServer, unixScanner, mqttScanner, broker, ...mocks);
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
