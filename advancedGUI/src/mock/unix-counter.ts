import { createServer } from "net";

export interface UnixMockDevice {
  start(socketPath: string): Promise<void>;
  stop(): Promise<void>;
}

export function createUnixCounter(socketPath: string): UnixMockDevice {
  let count = 0;
  let interval: ReturnType<typeof setInterval> | null = null;

  const server = createServer((conn) => {
    conn.on("data", (data) => {
      const msg = data.toString().trim();
      if (msg === "state?") {
        conn.write(JSON.stringify({ count }) + "\n");
      }
    });
  });

  return {
    start(): Promise<void> {
      return new Promise((resolve, reject) => {
        server.listen(socketPath, () => {
          interval = setInterval(() => { count++; }, 3000);
          resolve();
        });
        server.on("error", reject);
      });
    },

    stop(): Promise<void> {
      return new Promise((resolve) => {
        if (interval) clearInterval(interval);
        server.close(() => resolve());
      });
    },
  };
}
