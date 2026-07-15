export interface HealthData {
  status: "ok" | "degraded" | "down";
  uptime: number;
  version: string;
  brokerPort: number;
  wsConnections: number;
  unixConnections: number;
  lastError: string | null;
}

export function createHealthData(
  uptime: number,
  version: string,
  brokerPort: number,
  wsConnections: number,
  unixConnections: number,
  lastError: string | null = null,
): HealthData {
  const status: HealthData["status"] = lastError ? "degraded" : "ok";
  return { status, uptime, version, brokerPort, wsConnections, unixConnections, lastError };
}
