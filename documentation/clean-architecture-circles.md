# Clean Architecture Circles — advancedGUI

```
                  ┌─────────────────────────────────────┐
                  │         EXTERNAL (Drivers/Devices)   │
                  │                                     │
                  │   ┌─────────────────────────────┐   │
                  │   │      ADAPTERS (Infra)        │   │
                  │   │                             │   │
                  │   │   ┌─────────────────────┐   │   │
                  │   │   │      PORTS           │   │   │
                  │   │   │   (Interfaces)       │   │   │
                  │   │   │                     │   │   │
                  │   │   │  ┌───────────────┐  │   │   │
                  │   │   │  │     CORE       │  │   │   │
                  │   │   │  │  (Domain)      │  │   │   │
                  │   │   │  │                │  │   │   │
                  │   │   │  │  device-manager │  │   │   │
                  │   │   │  │  auth-domain   │  │   │   │
                  │   │   │  │  flatten       │  │   │   │
                  │   │   │  │  health-model  │  │   │   │
                  │   │   │  │                │  │   │   │
                  │   │   │  └───────▲────────┘  │   │   │
                  │   │   │          │            │   │   │
                  │   │   │  ┌───────┴────────┐  │   │   │
                  │   │   │  │  connector     │  │   │   │
                  │   │   │  │  device-scanner│  │   │   │
                  │   │   │  │  user-store    │  │   │   │
                  │   │   │  │  logger        │  │   │   │
                  │   │   │  └───────▲────────┘  │   │   │
                  │   │   │          │            │   │   │
                  │   │   └──────────┼────────────┘   │   │
                  │   │              │                 │   │
                  │   │  ┌───────────┴─────────────┐   │   │
                  │   │  │  mqtt-connector         │   │   │
                  │   │  │  mqtt-scanner           │   │   │
                  │   │  │  unix-scanner           │   │   │
                  │   │  │  pino-logger            │   │   │
                  │   │  │  file-user-store        │   │   │
                  │   │  │  express-server         │   │   │
                  │   │  │  ws-bridge              │   │   │
                  │   │  │  broker                 │   │   │
                  │   │  │  mock-manager           │   │   │
                  │   │  │  shutdown               │   │   │
                  │   │  └───────▲─────────────────┘   │   │
                  │   │          │                       │   │
                  │   └──────────┼───────────────────────┘   │
                  │              │                             │
                  │  ┌───────────┴──────────────────────┐     │
                  │  │  Browser (Frontend)              │     │
                  │  │  MQTT Devices                    │     │
                  │  │  Unix Socket Devices             │     │
                  │  │  .auth.json (File system)        │     │
                  │  │  Docker / K8s (Health probes)    │     │
                  │  └──────────────────────────────────┘     │
                  └───────────────────────────────────────────┘
```

## Dependency Rule

```
┌─────────────────────────────────────────────────────┐
│                  DEPENDENCY DIRECTION                │
│                                                      │
│  External ───► Adapters ───► Ports ───► Core        │
│                                                      │
│  (never the other way around)                       │
└─────────────────────────────────────────────────────┘
```

| Layer | Contents | Depends on | Knows about |
|-------|----------|-----------|-------------|
| **Core** | device-manager, auth-domain, flatten, health-model | nothing (pure TS) | nothing outside |
| **Ports** | Connector, DeviceScanner, UserStore, Logger interfaces | nothing (pure TS interfaces) | Core types |
| **Adapters** | mqtt-connector, mqtt-scanner, unix-scanner, pino-logger, file-user-store, express-server, ws-bridge, broker, mock-manager, shutdown | Ports + Core | Ports interfaces |
| **External** | Browser, MQTT devices, Unix sockets, .auth.json, Docker | nothing | Adapters (via network/FS) |

## Data Flow (Arrow of Dependence vs Arrow of Data)

```
Data flows OUTWARD from devices to the browser:

  MQTT Device ──► broker ──► mqtt-scanner ──► ws-bridge ──► Browser
  Unix Device  ───────────► unix-scanner ──► ws-bridge ──► Browser

  (scanners call wsBridge.broadcast() directly — wired in main/index.ts)

Lifecycle events flow through the domain:

  scanner (joined/left) ──► device-manager ──► ws-bridge.broadcast() ──► Browser

Control flows INWARD:

  Browser action (login, mock toggle) ──► adapter ──► port/store ──► core logic
```

## Data vs Lifecycle

The scanners and `device-manager` serve different roles:

- **Data path**: `deviceManager` is **not** involved. Scanners push raw device data straight to `ws-bridge.broadcast()` (wired in `main/index.ts`).
- **Lifecycle path**: `device-manager` tracks active devices and emits `joined`/`left` events, which the bridge forwards to browsers.

## Example: Device discovery (Unix) flow

```
┌─────────┐   polls .sock   ┌──────────────┐  joined/left    ┌──────────────┐
│  unix-  │───────────────► │  device-     │────────────────►│  ws-bridge   │
│  scanner│   directory     │  manager     │  DeviceEvent    │──────────────► WS
│ (Adapter)│                │ (Core)       │  (lifecycle)    │ (Adapter)    │
└─────────┘                └──────────────┘                 └──────────────┘
     │                                                             │
     │ data (state?) response                                     │ data
     │                                                             │
     └───────────────────────────────────────► ws-bridge.broadcast() ──► WS
```
