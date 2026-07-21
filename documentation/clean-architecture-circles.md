# Clean Architecture Circles — p9-advancedGUI

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
                  │   │   │  │  table-engine  │  │   │   │
                  │   │   │  │  device-mgr    │  │   │   │
                  │   │   │  │  auth-domain   │  │   │   │
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
                  │   │  │  unix-connector         │   │   │
                  │   │  │  unix-scanner           │   │   │
                  │   │  │  mqtt-scanner           │   │   │
                  │   │  │  pino-logger            │   │   │
                  │   │  │  file-user-store        │   │   │
                  │   │  │  express-server         │   │   │
                  │   │  │  ws-bridge              │   │   │
                  │   │  │  broker                 │   │   │
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
| **Core** | table-engine, device-manager, auth-domain, health-model | nothing (pure TS) | nothing outside |
| **Ports** | Connector, DeviceScanner, UserStore, Logger interfaces | nothing (pure TS interfaces) | Core types |
| **Adapters** | mqtt-connector, unix-connector, unix-scanner, mqtt-scanner, pino-logger, file-user-store, express-server, ws-bridge, broker, shutdown | Ports + Core | Ports interfaces |
| **External** | Browser, MQTT devices, Unix sockets, .auth.json, Docker | nothing | Adapters (via network/FS) |

## Data Flow (Arrow of Dependence vs Arrow of Data)

```
Data flows OUTWARD:
───────────────────────────────────────────────────────────

  Core ──► Ports ──► Adapters ──► External

  (domain events are pushed through interfaces to infra)

Control flows INWARD:
───────────────────────────────────────────────────────────

  External ──► Adapters ──► Ports ──► Core

  (HTTP request arrives → adapter calls port → core processes)

Cross-boundary communication:
───────────────────────────────────────────────────────────

  External Request     Adapter calls        Core returns
  (HTTP GET /health) ──► Port method ──────► pure function
                         │                    │
                         ◄────────────────────┘
                         result mapped to
                         HTTP response
```

## Example: Device discovery flow

```
┌─────────┐    polls      ┌──────────────┐   onJoined/left   ┌──────────────┐
│  unix-  │──────────────►│  device-     │──────────────────►│  ws-bridge   │
│  scanner│  .sock files  │  manager     │  DeviceEvent      │──────────────► WS
│ (Adapter)│              │ (Core)       │                  │ (Adapter)    │
└─────────┘              └──────────────┘                  └──────────────┘
     │                         │                                  │
     │ implements              │ uses port                        │ implements
     ▼                         ▼                                  ▼
┌──────────────┐        ┌──────────────┐                  ┌──────────────┐
│ DeviceScanner│        │  Core only   │                  │  Connector   │
│ (Port)       │        │  pure logic  │                  │  (Port)      │
└──────────────┘        └──────────────┘                  └──────────────┘
```
