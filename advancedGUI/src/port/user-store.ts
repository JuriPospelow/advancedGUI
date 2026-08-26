import type { User, UserLevel } from "../core/auth-domain.js";

export interface UserStore {
  authenticate(username: string, password: string): Promise<User | null>;
  getLevel(username: string): Promise<UserLevel | null>;
}
