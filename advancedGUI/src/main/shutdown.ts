import type { Logger } from "../port/logger.js";

export interface Shutdownable {
  stop(): Promise<void>;
}

const FORCE_EXIT_MS = 3000;

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

    for (const service of services) {
      try {
        await service.stop();
      } catch (err) {
        logger.error(`Shutdown error: ${err}`);
      }
    }

    clearTimeout(forceExit);
    logger.info("Shutdown complete");
    process.exit(0);
  };
}
