import aedes from "aedes";
import { createServer } from "net";

export interface Broker {
  start(): Promise<number>;
  stop(): Promise<void>;
  port(): number;
}

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
