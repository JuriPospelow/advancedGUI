export interface FlatKeyValue {
  field: string;
  value: string;
}

export function flattenJson(obj: Record<string, unknown>, prefix = ""): FlatKeyValue[] {
  const result: FlatKeyValue[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const field = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result.push(...flattenJson(value as Record<string, unknown>, field));
    } else {
      result.push({ field, value: String(value ?? "") });
    }
  }
  return result;
}

export function computeKeySet(flat: FlatKeyValue[]): Set<string> {
  return new Set(flat.map((f) => f.field));
}

export function areKeySetsCompatible(a: Set<string>, b: Set<string>): boolean {
  const union = new Set([...a, ...b]);
  const intersection = new Set([...a].filter((k) => b.has(k)));
  if (intersection.size === 0) return false;
  const minSize = Math.min(a.size, b.size);
  return intersection.size / union.size >= 0.3;
}

export function groupDevices(
  devices: { deviceId: string; keySet: Set<string> }[],
): { groupId: string; deviceIds: string[]; keySet: Set<string> }[] {
  const groups: { groupId: string; deviceIds: string[]; keySet: Set<string> }[] = [];
  for (const device of devices) {
    let added = false;
    for (const group of groups) {
      if (areKeySetsCompatible(group.keySet, device.keySet)) {
        group.deviceIds.push(device.deviceId);
        group.keySet = new Set([...group.keySet, ...device.keySet]);
        added = true;
        break;
      }
    }
    if (!added) {
      groups.push({
        groupId: `group-${groups.length + 1}`,
        deviceIds: [device.deviceId],
        keySet: new Set(device.keySet),
      });
    }
  }
  return groups;
}

export interface TableDiff {
  field: string;
  deviceId: string;
  newValue: string;
}
