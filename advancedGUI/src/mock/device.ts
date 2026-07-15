import type { Connector } from "../main/connectors/connector.js";

/** Simulated IoT device that publishes a counter every 2s and accepts commands. */
export interface MockDevice {
  /** Connects to the broker, subscribes to mock/control, starts publishing. */
  start(port: number): Promise<void>;
  /** Stops publishing and disconnects. */
  stop(): Promise<void>;
  /** Returns the current counter value. */
  getCount(): number;
}

/**
 * Starts a 2-second interval that publishes the counter to mock/counter.
 * Only publishes if the device is running.
 */
function startPublishing(
  connector: Connector,
  getRunning: () => boolean,
  getCount: () => number,
  increment: () => void,
): ReturnType<typeof setInterval> {
  return setInterval(async () => {
    if (getRunning()) {
      increment();
      await connector.publish(
        "mock/counter",
        JSON.stringify({ count: getCount() }),
      );
    }
  }, 2000);
}

/**
 * Creates a mock device that publishes incrementing counts
 * and responds to commands (start, stop, reset) on mock/control.
 */
export function createMockDevice(connector: Connector): MockDevice {
  let count = 0;
  let interval: ReturnType<typeof setInterval> | null = null;
  let running = false;

  return {
    async start(port: number): Promise<void> {
      await connector.connect(port);
      await connector.subscribe("mock/control");

      connector.onMessage((_topic, payload) => {
        try {
          const msg = JSON.parse(payload);
          if (msg.cmd === "reset") {
            count = 0;
          } else if (msg.cmd === "stop") {
            running = false;
            if (interval) {
              clearInterval(interval);
              interval = null;
            }
          } else if (msg.cmd === "start") {
            running = true;
            if (!interval) {
              interval = startPublishing(
                connector,
                () => running,
                () => count,
                () => {
                  count++;
                },
              );
            }
          }
        } catch {
          // ignore malformed messages
        }
      });

      running = true;
      interval = startPublishing(
        connector,
        () => running,
        () => count,
        () => {
          count++;
        },
      );
    },

    async stop(): Promise<void> {
      running = false;
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      await connector.disconnect();
    },

    getCount(): number {
      return count;
    },
  };
}
