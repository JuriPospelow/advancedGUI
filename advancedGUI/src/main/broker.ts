import aedes from "aedes";
import { createServer } from "net";

/** Aedes MQTT broker running on a dynamic TCP port. */
export interface Broker {
  /** Starts the broker on a random available port. Returns the port number. */
  start(): Promise<number>;
  /** Stops the broker and closes the server. */
  stop(): Promise<void>;
  /** Returns the port the broker is listening on (0 if not started). */
  port(): number;
}

/**
 * Creates an Aedes MQTT broker.
 * The broker listens on a dynamic port assigned by the OS.
 */
export function createBroker(): Broker {
  const instance = new aedes();
  const server = createServer(instance.handle);
  let listeningPort = 0;

  return {
    start(): Promise<number> {
      return new Promise((resolve, reject) => {
        server.listen(0, () => {
          const addr = server.address();
          if (addr && typeof addr === "object") {
            listeningPort = addr.port;
            resolve(listeningPort);
          } else {
            reject(new Error("Failed to get port"));
          }
        });
        server.on("error", reject);
      });
    },

    stop(): Promise<void> {
      return new Promise((resolve) => {
        server.close(() => resolve());
        instance.close();
      });
    },

    port(): number {
      return listeningPort;
    },
  };
}
