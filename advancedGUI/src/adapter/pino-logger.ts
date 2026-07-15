import pino from "pino";
import type { Logger } from "../port/logger.js";

export function createPinoLogger(level = "info"): Logger {
  const instance = pino({ level });
  return {
    info: (msg, ...args) => instance.info(msg, ...args),
    warn: (msg, ...args) => instance.warn(msg, ...args),
    error: (msg, ...args) => instance.error(msg, ...args),
    debug: (msg, ...args) => instance.debug(msg, ...args),
  };
}
