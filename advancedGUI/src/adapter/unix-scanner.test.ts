import { describe, it, expect } from "vitest";
import { createUnixScanner } from "./unix-scanner.js";
import { mkdirSync, writeFileSync, unlinkSync, rmdirSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { createServer } from "net";

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

  it("should call onData with parsed response from state? request", async () => {
    const dir = join(tmpdir(), `p9-test-data-${Date.now()}`);
    mkdirSync(dir, { recursive: true });

    // create a mock socket server that responds to "state?"
    const socketPath = join(dir, "responder.sock");
    const server = createServer((conn) => {
      conn.on("data", (data) => {
        if (data.toString().trim() === "state?") {
          conn.write(JSON.stringify({ status: "ok", value: 42 }) + "\n");
        }
      });
    });
    await new Promise<void>((resolve) => server.listen(socketPath, resolve));

    const scanner = createUnixScanner(dir, 100);
    const data: Array<{ id: string; fields: Record<string, unknown> }> = [];
    scanner.onData((id, fields) => data.push({ id, fields }));

    await scanner.start();
    await new Promise((r) => setTimeout(r, 300));

    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].id).toBe("responder");
    expect(data[0].fields).toEqual({ status: "ok", value: 42 });

    await scanner.stop();
    await new Promise<void>((resolve) => server.close(() => {
      // server.close() removes the Unix socket file automatically
      resolve();
    }));
    rmdirSync(dir);
  });
});
