import type { Connector } from "../port/connector.js";
import { createUnixConnector } from "../adapter/unix-connector.js";

export interface UnixMockDevice {
  start(socketPath: string): Promise<void>;
  stop(): Promise<void>;
}

function makeStartPublishing(
  connector: Connector,
  getRunning: () => boolean,
  getCount: () => number,
  increment: () => void,
): ReturnType<typeof setInterval> {
  return setInterval(async () => {
    if (getRunning()) {
      increment();
      await connector.publish("mock/counter", JSON.stringify({ count: getCount() }));
    }
  }, 2000);
}

export function createUnixCounter(socketPath: string): UnixMockDevice {
  const connector = createUnixConnector(socketPath);
  let count = 0;
  let interval: ReturnType<typeof setInterval> | null = null;
  let running = false;

  return {
    async start(): Promise<void> {
      await connector.connect(0);
      running = true;
      interval = makeStartPublishing(connector, () => running, () => count, () => { count++; });
    },

    async stop(): Promise<void> {
      running = false;
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      await connector.disconnect();
    },
  };
}
