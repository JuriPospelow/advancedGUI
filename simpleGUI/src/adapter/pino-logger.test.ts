import { describe, it, expect } from "vitest";
import { createPinoLogger } from "./pino-logger.js";

describe("PinoLogger", () => {
  it("should create logger without throwing", () => {
    const logger = createPinoLogger("silent");
    expect(() => logger.info("test")).not.toThrow();
    expect(() => logger.warn("test")).not.toThrow();
    expect(() => logger.error("test")).not.toThrow();
    expect(() => logger.debug("test")).not.toThrow();
  });
});
