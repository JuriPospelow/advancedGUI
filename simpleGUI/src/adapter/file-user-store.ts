import { readFile, writeFile } from "fs/promises";
import { createHash } from "crypto";
import type { UserStore, User, UserLevel } from "../port/user-store.js";

interface AuthEntry {
  username: string;
  passwordHash: string;
  level: UserLevel;
}

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function createFileUserStore(authPath: string): UserStore {
  let entries: AuthEntry[] = [];

  async function load(): Promise<void> {
    try {
      const raw = await readFile(authPath, "utf-8");
      entries = JSON.parse(raw).users;
    } catch {
      entries = [];
    }
  }

  return {
    async authenticate(username, password): Promise<User | null> {
      await load();
      const hash = hashPassword(password);
      const entry = entries.find(
        (e) => e.username === username && e.passwordHash === hash,
      );
      return entry ? { username: entry.username, level: entry.level } : null;
    },

    async getLevel(username): Promise<UserLevel | null> {
      await load();
      const entry = entries.find((e) => e.username === username);
      return entry ? entry.level : null;
    },
  };
}
