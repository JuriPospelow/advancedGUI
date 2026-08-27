# Component Diagram — advancedGUI

## Overview

```
                    ┌─────────────────────────────────────────────┐
                    │               FRONTEND (Browser)           │
                    │                                             │
                    │  index.html  (5 tabs)                       │
                    │    Values | Config | Health | Mock | Log    │
                    │                                             │
                    │  main.js (orchestrator, WS client, auth)    │
                    │    ├── values.js   (pivot table)            │
                    │    ├── config.js   (field selection)        │
                    │    ├── health.js   (GET /health, 5s poll)   │
                    │    ├── mock.js     (mock on/off toggles)    │
                    │    └── log.js      (WS message log)         │
                    │                                             │
                    │      HTTP (auth)   +   WebSocket (live)     │
                    └───────────────┬───────────────┬─────────────┘
                                    │               │
════════════════════════════════════╪═══════════════╪══════════════
                                    │               │  Network
                                    │               │
                    ┌───────────────┴───────────────┴─────────────┐
                    │               ADAPTERS (infra)              │
                    │                                             │
                    │  express-server.ts                          │
                    │    • static files (renderer/)               │
                    │    • POST /auth                             │
                    │    • GET /health                            │
                    │                                             │
                    │  ws-bridge.ts (WebSocket)                   │
                    │    • authenticates clients                  │
                    │    • broadcasts device data to browsers     │
                    │    • receives mock_toggle commands          │
                    │                                             │
                    │  mqtt-scanner.ts ──► ws-bridge.broadcast()  │
                    │  unix-scanner.ts ──► ws-bridge.broadcast()  │
                    │        └──────────────────────────────┐     │
                    │  broker.ts (Aedes MQTT)               │     │
                    │  pino-logger.ts                       │     │
                    │  file-user-store.ts (.auth.json)      │     │
                    │  mock-manager.ts (start/stop mocks)   │     │
                    └──────────────────────────────┬───────────────┘
                                                   │
                    ┌──────────────────────────────┴───────────────┐
                    │               PORTS (interfaces)            │
                    │                                             │
                    │  connector.ts   device-scanner.ts           │
                    │  user-store.ts  logger.ts                   │
                    └──────────────────────────────┬───────────────┘
                                                   │
                    ┌──────────────────────────────┴───────────────┐
                    │               CORE (domain logic)           │
                    │                                             │
                    │  device-manager.ts  (lifecycle: join/leave) │
                    │  auth-domain.ts     (UserLevel, canPerform) │
                    │  flatten.ts         (flatten nested fields) │
                    │  health-model.ts    (HealthData factory)    │
                    │                                             │
                    │   ZERO external dependencies                │
                    └─────────────────────────────────────────────┘

                    ┌─────────────────────────────────────────────┐
                    │  MOCK DEVICES (test / demo only)            │
                    │                                             │
                    │  MQTT:  mqtt-counter.ts, mqtt-measurement.ts│
                    │          ──mqtt-connector──► broker.ts      │
                    │  Unix:  unix-counter.ts, unix-devices.ts    │
                    │          ──direct socket (net.createServer) │
                    └─────────────────────────────────────────────┘
```

## Data Flow

### MQTT device data

```
MQTT Mock ──MQTT──► broker.ts ──MQTT──► mqtt-scanner.ts ──callback──► ws-bridge.broadcast() ──WS──► Browser
```

### Unix device data

```
Unix Mock ──socket (.)──► unix-scanner.ts (polls .sock dir, sends "state?\n")
                                    └──callback──► ws-bridge.broadcast() ──WS──► Browser
```

### Lifecycle (both transports)

```
scanner (onEvent: joined/left) ──► device-manager.ts ──► ws-bridge.broadcast({type:"devices"}) ──WS──► Browser
```

### Auth (HTTP — login)

```
Browser ──POST /auth──► express-server.ts ──► file-user-store.ts ──► .auth.json
                                                        │
                                                        └── returns { level } to browser
```

### Auth (WebSocket — session)

```
Browser ──{type:"auth",user,pass}──► ws-bridge.ts ──► file-user-store.ts ──► .auth.json
                                                        │
                                                        └── client level tracked in bridge
```

### Mock device management

```
Browser (Mock tab) ──WS {type:"mock_toggle"}──► ws-bridge.ts ──► mock-manager.ts.start()/stop() ──► mock device created/destroyed
```

## Key dependency rules

| Layer | Depends on | Notes |
|-------|-----------|-------|
| **Core** | nothing | Pure TypeScript, zero external libraries |
| **Ports** | Core types | Pure TypeScript interfaces |
| **Adapters** | Ports + Core | Implement interfaces, use domain types |
| **index.ts** | all Adapters | Creates and wires everything (composition root) |
| **Frontend (WS)** | ws-bridge.ts | main.js ↔ ws-bridge via WebSocket |
| **Frontend (HTTP)** | express-server.ts | health.js ↔ GET /health via fetch; login via POST /auth |
| **Mock devices** | connector (MQTT) / net (Unix) | Same interface pattern as real devices |

## Notes

- The **scanners call `wsBridge.broadcast()` directly** (wired in `main/index.ts`). `device-manager.ts` handles lifecycle events only — it is **not** in the data path.
- **`src/main/shutdown.ts`** (graceful SIGTERM/SIGINT handler) and `src/main/index.ts` form the **composition root** — they are wiring glue, not clean-architecture layer components, so they appear outside the Adapter layer.
- There is **no `unix-connector.ts`**; Unix devices bind directly to socket files via `net.createServer`.
- `table-engine` / `group-keys` logic lives in the **renderer** (`values.js`), not in core.
- The Health tab gates visibility **client-side** by permission level; the `/health` endpoint itself is served to authenticated clients.
