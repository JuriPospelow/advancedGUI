import type { Logger } from "../port/logger.js";

export interface Shutdownable {
  stop(): Promise<void>;
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
    for (const service of services) {
      try {
        await service.stop();
      } catch (err) {
        logger.error(`Shutdown error: ${err}`);
      }
    }
    logger.info("Shutdown complete");
  };
}
