# Component Diagram — p9-advancedGUI (Approach 3)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Browser)                          │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │index.html │  │ main.js  │  │values.js │  │config.js │          │
│  │ (3 tabs)  │──│(orchestr)│──│ (pivot)  │  │ (filter) │          │
│  └──────────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
│                     │              │              │                │
│                     │      ┌──────┴──────┐       │                │
│                     │      │ health.js   │       │                │
│                     │      │(HTTP poll)  │       │                │
│                     │      └──────┬──────┘       │                │
│                     │             │              │                │
│                     │     HTTP GET /health       │                │
│                     │             │              │                │
│                     │     WebSocket (WS)         │                │
│                     └──────────┬──┴──────────────┘                │
└────────────────────────────────┼──────────────────────────────────┘
                                 │
═════════════════════════════════╪════════════════════════════════════
                            Network
═════════════════════════════════╪════════════════════════════════════
                    ┌────────────┴───────────┐
                    │   ADAPTERS (infra)      │
┌───────────────────┴────────────────────────┴──────────────────────┐
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  ws-bridge.ts   ◄─── WS clients + DeviceManager events      │  │
│  │  (WebSocket)           ┌───────────┐                         │  │
│  │                        │ Connector │ (interface)             │  │
│  │  ┌─────────────────────┴─────┬─────┴──────────────────┐      │  │
│  │  │                           │                        │      │  │
│  │  ▼                           ▼                        ▼      │  │
│  │  mqtt-connector.ts   unix-connector.ts        (future:       │  │
│  │  (mqtt.js)           (net.unix)                serial, etc.)  │  │
│  │                           │                        │         │  │
│  │  ┌────────────────────────┴────────────────────────┘         │  │
│  │  │  DeviceScanner (interface)                                │  │
│  │  ┌──────┴──────────┬───────────┐                             │  │
│  │  ▼                 ▼           │                             │  │
│  │  unix-scanner.ts   mqtt-      │                             │  │
│  │  (polls .sock dir) scanner.ts  │                             │  │
│  │                      │         │                             │  │
│  │  ┌───────────────────┘         │                             │  │
│  │  │  Logger (interface)         │                             │  │
│  │  ┌──────┴──────┐              │                             │  │
│  │  ▼             ▼              │                             │  │
│  │  pino-         (future:       │                             │  │
│  │  logger.ts     file, etc.)    │                             │  │
│  │                              │                             │  │
│  │  ┌───────────────────────────┘                             │  │
│  │  │  UserStore (interface)                                  │  │
│  │  ┌──────┴──────────┐                                       │  │
│  │  ▼                 ▼                                       │  │
│  │  file-user-store   (future: DB, etc.)                     │  │
│  │  (.auth.json)                                              │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────┐           │  │
│  │  │  express-server.ts                           │           │  │
│  │  │  • static files (renderer/)                  │           │  │
│  │  │  • GET /health (admin-only)                  │           │  │
│  │  │  • WS upgrade on /ws                         │           │  │
│  │  │  • auth middleware                            │           │  │
│  │  └─────────────────────────────────────────────┘           │  │
│  │                                                            │  │
│  │  ┌────────────────────┐   ┌───────────┐                    │  │
│  │  │  broker.ts         │   │shutdown.ts│                    │  │
│  │  │  (Aedes MQTT)      │   │(SIGTERM)  │                    │  │
│  │  └────────────────────┘   └───────────┘                    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    PORTS (interfaces)                        │  │
│  │                                                              │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  ┌─────┐  │  │
│  │  │  connector   │  │device-scanner│  │user-store│  │logger│  │  │
│  │  │ (interface)  │  │ (interface)  │  │(interface)│  │(intf)│  │  │
│  │  └──────┬───────┘  └──────┬───────┘  └────┬─────┘  └──┬──┘  │  │
│  │         │                 │               │           │     │  │
│  └─────────┼─────────────────┼───────────────┼───────────┼─────┘  │
│            │                 │               │           │        │
│  ┌─────────┴─────────────────┴───────────────┴───────────┴─────┐  │
│  │                    CORE (domain logic)                       │  │
│  │                                                              │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────┐          │  │
│  │  │table-engine │  │device-manager│  │auth-domain│          │  │
│  │  │• flatten    │  │• track active│  │• User type│          │  │
│  │  │• group keys │  │• lifecycle   │  │• roles    │          │  │
│  │  │• diff calc  │  │  events      │  │• checkPerm│          │  │
│  │  └─────────────┘  └──────────────┘  └───────────┘          │  │
│  │                                      ┌───────────┐          │  │
│  │                                      │health-model│         │  │
│  │                                      │• status    │         │  │
│  │                                      │• metrics   │         │  │
│  │                                      └───────────┘          │  │
│  │                                                              │  │
│  │  ⚠ ZERO external dependencies                               │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              MOCK DEVICES (test only)                        │  │
│  │                                                              │  │
│  │  ┌───────────────┐  devices.config.ts (enable/disable)      │  │
│  │  │ MQTT Counter  │────────────────────────────────┐         │  │
│  │  │ (existing)    │  ┌──────────────┐              │         │  │
│  │  └───────┬───────┘  │MQTT Measure  │              │         │  │
│  │          │          │(temp/hum/pres)│              │         │  │
│  │          ▼          └──────┬───────┘              │         │  │
│  │    ┌──────────────┐       │                      │         │  │
│  │    │ MQTT Connector│◄──────┘                      │         │  │
│  │    └──────┬───────┘                              │         │  │
│  │           │                                       │         │  │
│  │           ▼                                       │         │  │
│  │    ┌──────────────┐                               │         │  │
│  │    │ Aedes Broker  │                               │         │  │
│  │    └──────────────┘                               │         │  │
│  │                                                    │         │  │
│  │  ┌──────────────────────────────────────┐          │         │  │
│  │  │ Unix devices (via Unix Connector):   │          │         │  │
│  │  │ ┌──────────┐ ┌────────┐ ┌────────┐  │          │         │  │
│  │  │ │unix-     │ │unix-   │ │unix-   │  │          │         │  │
│  │  │ │counter   │ │device-A│ │device-B│  │          │         │  │
│  │  │ └──────────┘ └────────┘ └────────┘  │          │         │  │
│  │  │ ┌──────────┐                         │          │         │  │
│  │  │ │unix-     │                         │          │         │  │
│  │  │ │device-C  │                         │          │         │  │
│  │  │ └──────────┘                         │          │         │  │
│  │  └──────────────────────────────────────┘          │         │  │
│  └─────────────────────────────────────────────────────┘         │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                BOOTSTRAP                                     │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐    │  │
│  │  │  index.ts                                            │    │  │
│  │  │  • create Logger adapter                              │    │  │
│  │  │  • load .env config                                   │    │  │
│  │  │  • start Broker (if MQTT enabled)                     │    │  │
│  │  │  • create Scanners + DeviceManager (inject)           │    │  │
│  │  │  • create Connectors (inject)                         │    │  │
│  │  │  • create ExpressServer (inject logger, auth)         │    │  │
│  │  │  • create WsBridge (inject connectors, auth, dm)      │    │  │
│  │  │  • start HTTP server                                   │    │  │
│  │  │  • register Shutdown handler                           │    │  │
│  │  └──────────────────────────────────────────────────────┘    │  │
│  │                                                              │  │
│  │  Dependency arrows (index.ts wiring):                       │  │
│  │                                                              │  │
│  │  index.ts ──creates──► all Adapters                         │  │
│  │  index.ts ──injects──► Adapters into each other             │  │
│  │  Adapters ──implement──► Ports (interfaces)                 │  │
│  │  Adapters ──use──────► Core (pure domain)                   │  │
│  │  Core ──depends on──► nothing (zero deps)                   │  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

## Key dependency rules

| Layer | Depends on | Notes |
|-------|-----------|-------|
| **Core** | nothing | Pure TypeScript, zero external libraries |
| **Ports** | nothing | Pure TypeScript interfaces |
| **Adapters** | Ports + Core | Implements interfaces, uses domain types |
| **index.ts** | all Adapters | Creates and wires everything (DI) |
| **Frontend (WS)** | ws-bridge.ts | main.js ↔ ws-bridge via WebSocket |
| **Frontend (HTTP)** | express-server.ts | health.js ↔ GET /health via fetch |
| **Mock devices** | Connector interface | Same as real devices, configurable on/off |
