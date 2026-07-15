import express from "express";
import { createServer } from "http";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createBroker } from "./broker.js";
import { createMqttConnector } from "./connectors/mqtt-connector.js";
import { createBridge } from "./bridge.js";
import { createMockDevice } from "../mock/device.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rendererPath = resolve(__dirname, "../renderer");

const PORT = parseInt(process.env.PORT || "8080", 10);

/**
 * Entry point.
 * Starts the MQTT broker, mock device, bridge, and HTTP server.
 */
async function main() {
  const broker = createBroker();
  const brokerPort = await broker.start();
  console.log(`Broker started on port ${brokerPort}`);

  const deviceConnector = createMqttConnector();
  const mockDevice = createMockDevice(deviceConnector);
  await mockDevice.start(brokerPort);
  console.log("Mock device started");

  const bridgeConnector = createMqttConnector();
  const bridge = createBridge(bridgeConnector);

  const app = express();
  app.use(express.static(rendererPath));

  const server = createServer(app);
  await bridge.start(brokerPort, server);

  server.listen(PORT, () => {
    console.log(`HTTP server on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
