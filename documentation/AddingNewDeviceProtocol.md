# Adding New Devices & Protocols

## Architecture Pattern

The project uses the `DeviceScanner` port interface from `src/port/device-scanner.ts`:

```typescript
interface DeviceScanner {
  start(): Promise<void>;
  stop(): Promise<void>;
  onEvent(handler: (event: DeviceEvent) => void): void;
  onData(handler: DeviceDataHandler): void;
}
```

Any new protocol or device type just needs to implement this interface.

---

## 1. New communication protocol (e.g., serial)

Create a scanner adapter that implements `DeviceScanner`:

```
src/adapter/serial-scanner.ts
```

```typescript
import type { DeviceScanner, DeviceEvent, DeviceDataHandler } from "../port/device-scanner.js";

export function createSerialScanner(devicePath: string): DeviceScanner {
  let eventHandler: ((event: DeviceEvent) => void) | null = null;
  let dataHandler: DeviceDataHandler | null = null;

  return {
    async start(): Promise<void> {
      // open serial port, listen for data
      eventHandler?.({ deviceId: "serial-device", transport: "unix", type: "joined" });
    },
    async stop(): Promise<void> { /* close serial port */ },
    onEvent(handler) { eventHandler = handler; },
    onData(handler) { dataHandler = handler; },
  };
}
```

Wire it in `src/main/index.ts` (around line 79):

```typescript
const serialScanner = createSerialScanner("/dev/ttyUSB0");
serialScanner.onEvent((event) => {
  if (event.type === "joined") {
    deviceManager.join(event.deviceId, "unix", new Set());
  } else {
    deviceManager.leave(event.deviceId);
  }
});
serialScanner.onData((deviceId, fields) => {
  wsBridge.broadcast({ type: "devices", updated: { [deviceId]: flattenFields(fields) } });
});
await serialScanner.start();
```

Add `serialScanner` to the shutdown handler.

---

## 2. Real MQTT device

**Zero code changes.** The Aedes broker is already running. Any MQTT client that connects and publishes to any topic will be auto-discovered by `mqtt-scanner.ts` (subscribes to `#`, all topics). Just connect your real device to the broker and publish JSON payloads.

> **Note:** By default the broker uses a **dynamic port** (0). For external devices (ESP32, etc.) you must set `MQTT_BROKER_PORT` in `.env` to a fixed value, e.g. `MQTT_BROKER_PORT=1883`, then configure your device to connect to `<server-ip>:1883`.

---

## 3. Real Unix-socket device

**Zero code changes.** Place a `.sock` file in `UNIX_SOCKET_DIR` (`/tmp/sockets` by default). The `unix-scanner.ts` will:

1. Detect the new `.sock` file → emit `joined` event
2. Connect to it, send `"state?"` → expect a JSON response
3. Forward parsed data to the frontend

Your real device just needs to listen on a Unix socket and respond to `"state?"` with a JSON line.

---

## 4. Device with different JSON format

The data pipeline is:

```
device JSON → scanner → dataHandler(deviceId, fields) → flattenFields(fields) → WS broadcast
```

If a device sends JSON in a different structure (e.g., nested under a `values` key), add a **normalizer** function in the `onData` callback:

```typescript
// In main/index.ts, inside the scanner's onData callback:
serialScanner.onData((deviceId, fields) => {
  const normalized = normalizeMyDevice(fields);
  wsBridge.broadcast({
    type: "devices",
    updated: { [deviceId]: flattenFields(normalized) },
  });
});
```

### Where to put the normalizer

| Scope | Location |
|---|---|
| Device-specific | `adapter/serial-scanner.ts` — scanner returns already-normalized data |
| Protocol-specific | A new file like `core/normalizers/serial-device.ts` |
| One-off | Inline in `main/index.ts` onData callback |

### Built-in flattening

The existing `flattenFields` (from `src/core/flatten.ts`) already handles nested objects:

```typescript
flattenFields({ detail: { Mode: "MAN" }, power: 50 })
// → { "detail.Mode": "MAN", power: 50 }
```

If your device JSON matches this nested-object pattern, you likely don't need a normalizer at all.

---

## Summary

| What you want | Effort | Change needed |
|---|---|---|
| Real MQTT device | **None** | Just connect & publish to the broker |
| Real Unix socket device | **None** | Drop a `.sock` file, respond to `"state?"` |
| New protocol (serial, CAN, etc.) | **~30 lines** | Create scanner adapter, wire in `main/index.ts` |
| Different JSON format | **~5 lines** | Add a normalizer function in `onData` callback |
