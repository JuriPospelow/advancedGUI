import type { Logger } from "../port/logger.js";

export interface Shutdownable {
  stop(): Promise<void>;
}

const FORCE_EXIT_MS = 4000;
const STOP_TIMEOUT_MS = 2000;

function timeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

export function createShutdownHandler(
  logger: Logger,
  ...services: Shutdownable[]
): () => void {
  let shuttingDown = false;

  return async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("Shutting down services...");

    const forceExit = setTimeout(() => {
      logger.error("Shutdown timed out — force exiting");
      process.exit(1);
    }, FORCE_EXIT_MS);

    for (let i = 0; i < services.length; i++) {
      try {
        logger.info(`Shutdown step ${i + 1}/${services.length}`);
        await timeout(services[i].stop(), STOP_TIMEOUT_MS, `Service ${i + 1}`);
      } catch (err) {
        logger.error(`Shutdown step ${i + 1} error: ${err}`);
      }
    }

    clearTimeout(forceExit);
    logger.info("Shutdown complete");
    process.exit(0);
  };
}
