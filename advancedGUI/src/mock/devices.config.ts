export interface DevicesConfig {
  enableMqttCounter: boolean;
  enableMqttMeasurement: boolean;
  enableUnixCounter: boolean;
  enableUnixDeviceA: boolean;
  enableUnixDeviceB: boolean;
  enableUnixDeviceC: boolean;
  unixSocketDir: string;
}

export function createDevicesConfig(): DevicesConfig {
  return {
    enableMqttCounter: true,
    enableMqttMeasurement: true,
    enableUnixCounter: true,
    enableUnixDeviceA: true,
    enableUnixDeviceB: true,
    enableUnixDeviceC: true,
    unixSocketDir: process.env.UNIX_SOCKET_DIR || "/tmp/sockets",
  };
}
