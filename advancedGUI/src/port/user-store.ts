export type UserLevel = "viewer" | "operator" | "admin";

export interface User {
  username: string;
  level: UserLevel;
}

export interface UserStore {
  authenticate(username: string, password: string): Promise<User | null>;
  getLevel(username: string): Promise<UserLevel | null>;
}
