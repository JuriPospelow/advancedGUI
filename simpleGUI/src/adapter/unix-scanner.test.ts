import { describe, it, expect } from "vitest";
import { createUnixScanner } from "./unix-scanner.js";
import { mkdirSync, writeFileSync, unlinkSync, rmdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("UnixScanner", () => {
  it("should detect socket files in directory", async () => {
    const dir = join(tmpdir(), `p9-test-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "dev1.sock"), "");

    const scanner = createUnixScanner(dir, 100);
    const events: string[] = [];
    scanner.onEvent((e) => events.push(`${e.deviceId}:${e.type}`));

    await scanner.start();
    await new Promise((r) => setTimeout(r, 200));

    expect(events).toContain("dev1:joined");

    unlinkSync(join(dir, "dev1.sock"));
    await new Promise((r) => setTimeout(r, 200));

    expect(events).toContain("dev1:left");

    await scanner.stop();
    rmdirSync(dir);
  });

  it("should not error on missing directory", async () => {
    const scanner = createUnixScanner("/nonexistent/p9-test-xyz", 100);
    await expect(scanner.start()).resolves.toBeUndefined();
    await scanner.stop();
  });
});
