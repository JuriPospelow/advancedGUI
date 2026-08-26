import pino from "pino";
import type { Logger } from "../port/logger.js";

export function createPinoLogger(level = "info"): Logger {
  const instance = pino({ level });
  return {
    info: (msg, ...args) => instance.info(msg, ...args as any[]),
    warn: (msg, ...args) => instance.warn(msg, ...args as any[]),
    error: (msg, ...args) => instance.error(msg, ...args as any[]),
    debug: (msg, ...args) => instance.debug(msg, ...args as any[]),
  };
}
