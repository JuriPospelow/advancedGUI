export type UserLevel = "viewer" | "operator" | "admin";

export const LEVEL_HIERARCHY: Record<UserLevel, number> = {
  viewer: 1,
  operator: 2,
  admin: 3,
};

export interface User {
  username: string;
  level: UserLevel;
}

export function canPerform(
  userLevel: UserLevel,
  requiredLevel: UserLevel,
): boolean {
  return LEVEL_HIERARCHY[userLevel] >= LEVEL_HIERARCHY[requiredLevel];
}

