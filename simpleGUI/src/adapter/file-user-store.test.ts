import { describe, it, expect, afterAll } from "vitest";
import { createFileUserStore, hashPassword } from "./file-user-store.js";
import { writeFileSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("hashPassword", () => {
  it("should produce a sha256 hex string", () => {
    const hash = hashPassword("test");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });
});

describe("FileUserStore", () => {
  const testPath = resolve(__dirname, "../../.auth.test.json");

  afterAll(() => {
    try {
      unlinkSync(testPath);
    } catch { /* ok */ }
  });

  it("should authenticate valid user", async () => {
    writeFileSync(
      testPath,
      JSON.stringify({
        users: [
          {
            username: "testuser",
            passwordHash: hashPassword("secret"),
            level: "operator",
          },
        ],
      }),
    );
    const store = createFileUserStore(testPath);
    const user = await store.authenticate("testuser", "secret");
    expect(user).not.toBeNull();
    expect(user!.username).toBe("testuser");
    expect(user!.level).toBe("operator");
  });

  it("should reject invalid password", async () => {
    const store = createFileUserStore(testPath);
    const user = await store.authenticate("testuser", "wrong");
    expect(user).toBeNull();
  });

  it("should return null for missing user", async () => {
    const store = createFileUserStore(testPath);
    const user = await store.authenticate("nobody", "x");
    expect(user).toBeNull();
  });
});
