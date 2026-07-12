# Architecture — Phase 1 Discovery (p9-advancedGUI)

## 1. Purpose

**p9-advancedGUI** extends p5-basicGUI (`simpleGUI`) with three new features:
- **Unix socket support** — a new transport connector alongside MQTT
- **Dynamic table generation** — incoming JSON messages rendered as pivot tables in the browser, with a live filter/config tab
- **User permission levels** — admin, operator, viewer with simple password config

Additionally, p9 lifts the project from L2 (internal tool) toward L3 (production-ready) by adding structured logging, input validation, and deployment configuration.

---

## 2. Module Map

### 2a. Foundation — p5-basicGUI Modules (inherited as-is)

| Module | Responsibility | Tech stack | Key files |
|--------|---------------|------------|-----------|
| **Broker** | Embedded Aedes MQTT broker on dynamic TCP port | aedes, Node.js net | `src/main/broker.ts` |
| **Connectors** | Abstract `Connector` interface + MQTT implementation | mqtt.js | `src/main/connectors/connector.ts`, `mqtt-connector.ts` |
| **Mock Device** | Simulated IoT device; publishes `mock/counter` every 2s, responds to start/stop/reset | — | `src/mock/device.ts` |
| **Bridge** | MQTT ↔ WebSocket relay; subscribes to topics, forwards to WS clients | ws | `src/main/bridge.ts` |
| **Express Server** | Static file server + WebSocket upgrade | express, http, ws | `src/main/index.ts` |
| **Frontend** | Plain JS client: shows counter, start/stop/reset buttons | WebSocket API, vanilla JS, CSS | `src/renderer/` |

### 2b. New — p9 Modules (to be built)

| Module | Responsibility | Tech stack (planned) | Key files |
|--------|---------------|---------------------|-----------|
| **Unix Connector** | Implements `Connector` interface over Unix domain sockets | Node.js `net` (unix socket) | `src/main/connectors/unix-connector.ts` |
| **Auth** | Simple password-based user authentication; session tracking | JSON config file | `src/main/auth/` |
| **Table Engine** | Parses incoming JSON, flattens keys, manages pivot tables per device group | — | `src/main/table-engine.ts` |
| **Logger** | Structured logging (pino or winston) for audit trail | pino | `src/main/logger.ts` |
| **Health** | Health endpoint (`GET /health`) for uptime monitoring | — | (part of index.ts) |
| **Config/Filter Frontend** | Three-tab UI: "Values" (pivot table) + "Config" (live checkboxes per device per field) + "Health" (server status, admin-only), persisted to localStorage | vanilla JS | `src/renderer/` |

---

## 3. Data Flow

### Current p5-basicGUI flow:

```
Mock Device ──MQTT/TCP──► Aedes Broker ──MQTT/TCP──► MqttConnector ──► Bridge ──WS──► Browser
                                                                              │
    Browser ──WS──► Bridge ──MQTT/TCP──► MqttConnector ──► Aedes Broker ──MQTT/TCP──► Mock Device
```

### Planned p9 flow (extended):

```
Mock Device ──MQTT/TCP──► Aedes Broker ──MQTT/TCP──► MqttConnector ──► Bridge ──WS──► Browser
                                                                              │ (table data)
Mock Device2 ──Unix──► UnixConnector ──► Bridge (same interface!) ────────────┘
```

Key insight: The `Connector` interface already supports pluggable transports. `unix-connector.ts` implements the same interface, so the Bridge, Broker, and Frontend remain unchanged for the transport layer.

### Table rendering flow:

```
Unix socket message ──► Bridge ──WS──► Frontend Table Engine
                                           ├── Flatten JSON (dot notation for nested keys)
                                           ├── Match device group (compare key sets)
                                           ├── Update pivot table (fields as rows, devices as columns)
                                           └── Apply Config/Filter (hide unchecked fields)
```

### Health data flow (HTTP polling):

```
Browser (Health tab active) ──GET /health every 5s──► Express Server
    ├── Returns JSON: status, uptime, version, broker port, connections, last error
    └── Only available to Admin level
```

### Request authentication flow:

```
Browser connects to WS ──► Auth middleware checks password
    ├── Viewer → receive table data only, no send commands
    ├── Operator → view + send commands (start/stop/reset)
    └── Admin → view + send commands + manage users + health/logs access
```

---

## 4. Tech Inventory

### p5-basicGUI (inherited):

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| Backend runtime | Node.js | 18+ | ESM (`"type": "module"`) |
| Backend language | TypeScript | 5.8.3 | strict mode |
| MQTT broker | aedes | 0.51.3 | Embedded, dynamic port |
| MQTT client | mqtt.js | 5.10.4 | TCP loopback |
| HTTP server | express | 4.21.2 | Static files |
| WebSocket | ws | 8.18.1 | Server + client |
| Test runner | vitest | 3.1.1 | |
| Linter | eslint + typescript-eslint | 9.x | |
| Dev runner | tsx | 4.19.3 | TypeScript execution |

### New for p9:

| Category | Technology (planned) | Notes |
|----------|---------------------|-------|
| Logger | pino | Structured JSON logging |
| Auth config | JSON file (`.auth.json`) | Simple password hashes |
| Table pivot | vanilla JS (client) | No framework needed |
| Config persistence | localStorage | Per-browser filter prefs |
| Health checks | inline endpoint | `GET /health` |

---

## 5. Current Directory Tree (p5-basicGUI — to be copied into p9)

```
simpleGUI/
├── src/
│   ├── mock/
│   │   ├── device.ts
│   │   └── device.test.ts
│   ├── main/
│   │   ├── index.ts
│   │   ├── broker.ts
│   │   ├── broker.test.ts
│   │   ├── bridge.ts
│   │   ├── bridge.test.ts
│   │   └── connectors/
│   │       ├── connector.ts
│   │       ├── connector.test.ts
│   │       └── mqtt-connector.ts
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.js
│           └── styles/
│               └── app.css
├── .gitignore
├── eslint.config.js
├── package.json
├── package-lock.json
├── README.md
└── tsconfig.json
```

---

## 6. Improvement Opportunities (p5-basicGUI → p9)

- [x] **Unix socket support** — new `unix-connector.ts` implementing `Connector` interface (already anticipated by p5's OCP design)
- [x] **Dynamic table rendering** — replace simple counter display with pivot table engine
- [x] **User permission levels** — auth layer with admin/operator/viewer
- [x] **Structured logging** — replace `console.log` with pino
- [x] **Input validation** — validate WS messages (topic, payload) before forwarding
- [x] **Health endpoint** — `GET /health` for monitoring
- [x] **Graceful shutdown** — SIGTERM/SIGINT handlers
- [x] **Dockerfile** — containerized deployment
- [x] **Environment config** — `.env` separation for dev/staging/prod

---

## 7. SOLID Analysis (p5-basicGUI)

| Principle | Module | Status | Notes |
|-----------|--------|--------|-------|
| **SRP** | Broker | ✅ Clean | Single responsibility: MQTT broker lifecycle |
| | Bridge | ✅ Clean | Single responsibility: MQTT ↔ WS relay |
| | Connector | ✅ Clean | Single responsibility: transport abstraction |
| | Mock Device | ✅ Clean | Single responsibility: simulated device |
| | Frontend | ⚠️ Minor | `main.js` mixes WS handling + DOM updates; acceptable for L2 |
| **OCP** | Connector | ✅ Excellent | Adding Unix connector requires no changes to Bridge or Broker |
| **LSP** | Connector | ✅ | `MqttConnector` fulfills `Connector` contract |
| **ISP** | Connector | ✅ Minimal | 5 methods, no fat interface |
| **DIP** | Bridge | ✅ | Depends on `Connector` interface, not on `MqttConnector` |
| | Index | ⚠️ Minor | `index.ts` creates concrete `MqttConnector` instances; acceptable for entry point |

---

## 8. p9 Design Decisions (captured from discussion)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Project relationship | Copy + extend | Clean separation from p5, no coupling |
| Commit prefix | `advancedGUI:` | Clear identity vs p5's `basicGUI:` |
| Auth approach | Simple password config (`.auth.json`) | No database needed; L3 entry point |
| Table layout | Pivot table: fields as rows, devices as columns | Side-by-side comparison, handles varying key sets |
| Table grouping | Devices with compatible key sets share one table; incompatible = separate table | Prevents table explosion, keeps comparison useful |
| Two-tab UI | "Values" (read-only pivot) + "Config" (live checkboxes per device per field) | User controls visibility, filters persist via localStorage |
| Config persistence | localStorage | Per-browser, no server-side state needed |
| Select/deselect all | Column header checkbox per device | Quick bulk toggling |
| Live update | Toggling Config instantly updates Values | Immediate feedback |
| Three-tab UI | "Values" + "Config" + "Health" | Tab 1: pivot table, Tab 2: filter checkboxes, Tab 3: server status (admin-only) |
| Health delivery | HTTP polling (GET /health every 5s) | Simple, decoupled, works even if WS is down |
| Health visibility | Admin only | Only admin users can see the Health tab |

---

## 9. User Permission Matrix

| Action | Viewer | Operator | Admin |
|---|---|---|---|
| View table data | ✅ | ✅ | ✅ |
| Send device commands (start/stop/reset) | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| View logs | ❌ | ✅ | ✅ |
| View Health tab | ❌ | ❌ | ✅ |
| Configure connectors | ❌ | ❌ | ✅ |

---

## 10. WebSocket Protocol (extended for p9)

### Server → Client (existing):
```json
{"topic":"mock/counter","payload":"{\"count\":5}"}
```

### Server → Client (new — table data):
```json
{"type":"table_update","deviceId":"device2","data":[
  {"field":"state","value":"READY"},
  {"field":"pdu","value":"ON"}
]}
```

### Client → Server (existing — commands):
```json
{"topic":"mock/control","payload":"{\"cmd\":\"reset\"}"}
```

### Client → Server (new — auth):
```json
{"type":"auth","username":"admin","password":"..."}
```

### Server → Client (new — auth response):
```json
{"type":"auth_response","success":true,"level":"admin"}
```
