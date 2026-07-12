# Architecture — Phase 2 Target State

> **Status:** ✅ User selected **Approach 3 — Clean Architecture (Hexagonal)** with Device Manager extension.

---

## Approach 1 — "Copy & Patch"

### Philosophy
Minimal structural change. Copy p5-basicGUI verbatim, add new features as standalone files without refactoring existing ones. Keep the same flat layout, same frontend file, same entry point style.

### Tech stack additions

| Technology | Purpose |
|---|---|
| pino | Structured logging (replaces `console.log`) |
| crypto (built-in) | Password hashing for auth |

No new frameworks. No architectural changes.

### Target directory tree

```
simpleGUI/
├── src/
│   ├── mock/
│   │   ├── device.ts
│   │   └── device.test.ts
│   ├── main/
│   │   ├── index.ts                  (add auth, health route, graceful shutdown)
│   │   ├── broker.ts                 (unchanged)
│   │   ├── broker.test.ts
│   │   ├── bridge.ts                 (unchanged)
│   │   ├── bridge.test.ts
│   │   ├── auth.ts                   NEW: simple password check
│   │   └── connectors/
│   │       ├── connector.ts          (unchanged)
│   │       ├── connector.test.ts
│   │       ├── mqtt-connector.ts     (unchanged)
│   │       └── unix-connector.ts     NEW: implements Connector over Unix sockets
│   └── renderer/
│       ├── index.html                (add 3 tabs)
│       └── src/
│           ├── main.js               (grows: WS + tabs + pivot table + health polling)
│           └── styles/
│               └── app.css
├── .auth.json                        NEW: password config
├── .gitignore
├── eslint.config.js
├── package.json
├── README.md
└── tsconfig.json
```

### Target module map

| Module | Responsibility | Key files |
|--------|---------------|-----------|
| Broker | MQTT broker lifecycle (unchanged) | `broker.ts` |
| Connectors | Transport abstraction + MQTT + Unix impl | `connector.ts`, `mqtt-connector.ts`, `unix-connector.ts` |
| Auth | Password check + user level lookup | `auth.ts`, `.auth.json` |
| Bridge | MQTT ↔ WS relay (unchanged) | `bridge.ts` |
| Express Server | Static files + WS upgrade + health route + graceful shutdown | `index.ts` |
| Frontend | 3 tabs: Values + Config + Health | `index.html`, `main.js`, `app.css` |

### Key ADRs

| ID | Decision | Rationale | Phase 1 ref |
|---|---|---|---|
| ADR-001 | Keep p5 directory structure unchanged | Minimal diff, easy to merge p5 updates later | §6 |
| ADR-002 | Auth as single file, password config as JSON | No database, no framework, fits small project | §8 |
| ADR-003 | Frontend stays single-file JS | No build step, consistent with p5 philosophy | — |
| ADR-004 | Health via HTTP polling (not WS) | Works when WS is down, simple fetch API | §8 |

### Trade-offs

| Dimension | Rating | Notes |
|---|---|---|
| Effort | Low | Fewest new files, no refactoring |
| Risk | Low | p5 code unchanged, add-only changes |
| Maintainability gain | Low → Medium | Better than p5 (logging + auth), but `main.js` grows into a monolith |
| Scalability gain | Low | Same single-process architecture as p5 |

---

## Approach 2 — "Feature Modules"

### Philosophy
Copy p5, then organize new features into their own directories and modules. Each concern gets its own file or folder on the backend. Frontend is split into one JS file per tab. The entry point (`index.ts`) becomes a thin coordinator that wires modules together.

### Tech stack additions

| Technology | Purpose |
|---|---|
| pino | Structured logging |
| dotenv | Environment config (`.env`) |
| crypto (built-in) | Password hashing |

### Target directory tree

```
simpleGUI/
├── src/
│   ├── mock/
│   │   ├── device.ts
│   │   └── device.test.ts
│   ├── main/
│   │   ├── index.ts                  (thin: wires modules, starts server)
│   │   ├── broker.ts                 (unchanged)
│   │   ├── broker.test.ts
│   │   ├── bridge.ts                 (unchanged)
│   │   ├── bridge.test.ts
│   │   ├── logger.ts                 NEW: pino logger setup
│   │   ├── logger.test.ts
│   │   ├── health.ts                 NEW: GET /health handler + metrics
│   │   ├── health.test.ts
│   │   ├── auth.ts                   NEW: auth middleware + user config loader
│   │   ├── auth.test.ts
│   │   ├── shutdown.ts               NEW: graceful SIGTERM/SIGINT handler
│   │   ├── shutdown.test.ts
│   │   └── connectors/
│   │       ├── connector.ts          (unchanged)
│   │       ├── connector.test.ts
│   │       ├── mqtt-connector.ts     (unchanged)
│   │       └── unix-connector.ts     NEW
│   └── renderer/
│       ├── index.html                (3 tabs, script tags for each tab)
│       └── src/
│           ├── main.js               (orchestrator: WS connect, tab switching)
│           ├── values.js             NEW: pivot table rendering
│           ├── config.js             NEW: checkbox filter UI + localStorage
│           ├── health.js             NEW: HTTP polling + status display
│           └── styles/
│               └── app.css
├── .auth.json
├── .env                              NEW: PORT, LOG_LEVEL, etc.
├── .gitignore
├── eslint.config.js
├── package.json
├── Dockerfile                        NEW
├── README.md
└── tsconfig.json
```

### Target module map

| Module | Responsibility | Key files |
|--------|---------------|-----------|
| Broker | MQTT broker lifecycle | `broker.ts` |
| Connectors | Transport abstraction + MQTT + Unix impl | `connector.ts`, `mqtt-connector.ts`, `unix-connector.ts` |
| Logger | Structured logging | `logger.ts` |
| Auth | Password check, user level lookup, middleware | `auth.ts`, `.auth.json` |
| Health | Server status endpoint + metrics collection | `health.ts` |
| Shutdown | Graceful shutdown orchestration | `shutdown.ts` |
| Bridge | MQTT ↔ WS relay | `bridge.ts` |
| Express Server | Static files + WS upgrade + route wiring | `index.ts` |
| Frontend Orchestrator | WS connection, tab switching | `main.js` |
| Values Tab | Pivot table rendering, live updates | `values.js` |
| Config Tab | Checkbox filter UI, localStorage persistence | `config.js` |
| Health Tab | HTTP polling, status display | `health.js` |

### Key ADRs

| ID | Decision | Rationale | Phase 1 ref |
|---|---|---|---|
| ADR-005 | One backend module per concern | Each module is independently testable, follows SRP | §7 |
| ADR-006 | Frontend split into one JS file per tab | Prevents `main.js` monolith, each tab logic is isolated | §7 |
| ADR-007 | Logger as explicit module (not global) | Can be injected, tested, and configured | §6 |
| ADR-008 | Shutdown module handles SIGTERM/SIGINT | Ensures broker, WS, HTTP clean up in order | §6 |
| ADR-009 | Dockerfile at project root | Containerized deployment, L3 requirement | §6 |

### Trade-offs

| Dimension | Rating | Notes |
|---|---|---|
| Effort | Medium | More files to create, but each is small and focused |
| Risk | Low | p5 core files unchanged; new modules are additive |
| Maintainability gain | Medium → High | Clear module boundaries, easy to find and change code |
| Scalability gain | Low | Same single-process architecture; modules don't improve throughput |

---

## Approach 3 — "Clean Architecture (Hexagonal)"

### Philosophy
Domain logic is completely isolated from infrastructure. The core knows nothing about Express, WebSocket, MQTT, or file systems. All I/O goes through port interfaces. Adapters implement those ports. This maximizes testability and allows swapping infrastructure without touching business rules.

### Tech stack additions

| Technology | Purpose |
|---|---|
| pino | Structured logging |
| dotenv | Environment config |
| crypto (built-in) | Password hashing |
| vitest | Already present for core testing |

### Target directory tree

```
simpleGUI/
├── src/
│   ├── core/                              NEW: zero external dependencies
│   │   ├── table-engine.ts                NEW: JSON flatten, grouping, diff logic
│   │   ├── table-engine.test.ts
│   │   ├── device-manager.ts              NEW: scan + track device lifecycle
│   │   ├── device-manager.test.ts
│   │   ├── auth-domain.ts                 NEW: user model, permission rules
│   │   ├── auth-domain.test.ts
│   │   └── health-model.ts                NEW: status data structure
│   ├── port/                              NEW: interfaces only
│   │   ├── connector.ts                   (moved from connectors/)
│   │   ├── device-scanner.ts              NEW: abstract device discovery
│   │   ├── user-store.ts                  NEW: abstract user persistence
│   │   └── logger.ts                      NEW: abstract logger
│   ├── adapter/
│   │   ├── mqtt-connector.ts              (moved from connectors/)
│   │   ├── unix-connector.ts              NEW
│   │   ├── unix-scanner.ts                NEW: poll socket dir for .sock files
│   │   ├── mqtt-scanner.ts                NEW: config + auto-discovery
│   │   ├── file-user-store.ts             NEW: .auth.json implementation
│   │   ├── pino-logger.ts                 NEW: pino implementation
│   │   ├── express-server.ts              NEW: Express setup + routes
│   │   └── ws-bridge.ts                   NEW: WS ↔ adapter wiring
│   ├── mock/
│   │   ├── device.ts                      (existing MQTT counter, adapted)
│   │   ├── device.test.ts
│   │   ├── mqtt-measurement.ts            NEW: temp/humidity/pressure via MQTT
│   │   ├── mqtt-measurement.test.ts
│   │   ├── unix-counter.ts                NEW: counter over Unix socket
│   │   ├── unix-device-a.ts               NEW: key set A
│   │   ├── unix-device-b.ts               NEW: key set B
│   │   ├── unix-device-c.ts               NEW: key set C
│   │   └── devices.config.ts              NEW: enable/disable mock devices
│   ├── main/
│   │   ├── index.ts                       (thin: dependency injection, bootstrap)
│   │   ├── broker.ts                      (unchanged)
│   │   ├── broker.test.ts
│   │   └── shutdown.ts                    NEW
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.js
│           ├── values.js
│           ├── config.js
│           ├── health.js
│           └── styles/
│               └── app.css
├── .auth.json
├── .env
├── .gitignore
├── eslint.config.js
├── package.json
├── Dockerfile
├── README.md
└── tsconfig.json
```

### Target module map

| Module | Responsibility | Key files |
|--------|---------------|-----------|
| **Core (domain)** | | |
| Table Engine | JSON flattening, device grouping, diff calculation | `table-engine.ts` |
| Device Manager | Track devices, lifecycle events (joined/left), socket dir + MQTT topic scanning logic | `device-manager.ts` |
| Auth Domain | User model, permission rules, role hierarchy | `auth-domain.ts` |
| Health Model | Status data structure | `health-model.ts` |
| **Ports (interfaces)** | | |
| Connector | Transport abstraction (moved from old connectors/) | `connector.ts` |
| Device Scanner | Abstract device discovery (scan, poll, notify) | `device-scanner.ts` |
| User Store | Abstract user persistence | `user-store.ts` |
| Logger | Abstract logging | `logger.ts` |
| **Adapters (infrastructure)** | | |
| MQTT Connector | mqtt.js implementation of Connector | `mqtt-connector.ts` |
| Unix Connector | Unix socket implementation of Connector | `unix-connector.ts` |
| Unix Scanner | Polls `UNIX_SOCKET_DIR` env / --socket-dir arg / config file for .sock files | `unix-scanner.ts` |
| MQTT Scanner | Reads config file + auto-discovery via MQTT topic pattern | `mqtt-scanner.ts` |
| File User Store | JSON file implementation of User Store | `file-user-store.ts` |
| Pino Logger | pino implementation of Logger | `pino-logger.ts` |
| Express Server | HTTP server, routes, middleware | `express-server.ts` |
| WS Bridge | WebSocket ↔ Connector wiring | `ws-bridge.ts` |
| **Mock Devices** | | |
| MQTT Counter | Existing counter device (adapted to port/connector) | `device.ts` |
| MQTT Measurement | Publishes temperature, humidity, pressure every 2s | `mqtt-measurement.ts` |
| Unix Counter | Counter over Unix socket | `unix-counter.ts` |
| Unix Device A | JSON with key set A (state, pdu, detail.Mode, detail.Ctrl, etc.) | `unix-device-a.ts` |
| Unix Device B | JSON with key set B (state, pdu, detail.LaserOn, detail.T1, detail.T2) | `unix-device-b.ts` |
| Unix Device C | JSON with key set C (different schema) | `unix-device-c.ts` |
| Devices Config | Enable/disable mock devices via config | `devices.config.ts` |
| **Bootstrap** | | |
| Index | Dependency injection, start sequence | `index.ts` |
| Broker | MQTT broker lifecycle | `broker.ts` |
| Shutdown | Graceful shutdown | `shutdown.ts` |

### Key ADRs

| ID | Decision | Rationale | Phase 1 ref |
|---|---|---|---|
| ADR-010 | Core has zero external dependencies | Domain logic is pure TypeScript, testable without mocks | §7 |
| ADR-011 | All I/O through port interfaces | Swap MQTT for Unix (or mock) without touching core | §7 |
| ADR-012 | Dependency injection at bootstrap | Each adapter is created and wired in `index.ts` only | §6 |
| ADR-013 | Move existing Connector interface to `port/` | Consistent with hexagonal terminology, no code change | — |
| ADR-014 | Frontend split per tab (same as Approach 2) | Only backend architecture differs | §7 |
| ADR-015 | Device Manager in core — no external deps | Pure domain logic: track devices, emit events, pure functions | §6 |
| ADR-016 | Device identity derived from path | Unix: socket filename without extension (`dev1.sock` → `dev1`), MQTT: topic name | — |
| ADR-017 | Mock devices configurable via `devices.config.ts` | Production runs without mocks; tests enable them selectively | — |
| ADR-018 | Device left emitted immediately (no grace period) | Column disappears as soon as socket file is gone; reappears on rejoin | — |

### Trade-offs

| Dimension | Rating | Notes |
|---|---|---|
| Effort | High | Significant restructuring: moving files, adding interfaces, DI wiring |
| Risk | Medium | Moving existing code risks breaking things; tests mitigate this |
| Maintainability gain | High | Domain logic is pure and testable; swapping infra is trivial |
| Scalability gain | Low → Medium | Core can be tested in isolation; adapters can be load-balanced independently |

---

## Comparison & Recommendation

| Dimension | Approach 1 — Copy & Patch | Approach 2 — Feature Modules | Approach 3 — Clean Architecture |
|---|---|---|---|
| Philosophy | Minimal change | Organize by concern | Isolate domain from infra |
| Effort | **Low** | Medium | High |
| Risk | **Lowest** | Low | Medium |
| Maintainability | Low → Medium | **Medium → High** | High |
| Testability | Low (monolith frontend, inline auth) | Medium (per-module tests) | **Highest** (core tests without mocks) |
| Frontend structure | Single file (`main.js` grows) | **One file per tab** | One file per tab (same as A2) |
| Deployment readiness | Basic (added features) | **Good (Dockerfile + .env + health)** | Good |
| Over-engineering risk | None | Low | **Medium (small project, heavy structure)** |
| **Best for** | Quick results, small team, prototype | **Balanced production app** | Large team, long-lived product |

### User Selection

**✅ The user selected Approach 3 — "Clean Architecture (Hexagonal)"** with the Device Manager extension.

**Why this choice fits p9:**
1. **Maximum testability** — core domain logic (table engine, device manager, auth rules) is pure TypeScript with zero external dependencies
2. **Pluggable scanners** — device discovery for Unix sockets and MQTT both implement the same `DeviceScanner` port, making future transports trivial
3. **Frontend split per tab** — prevents the single-file monolith problem as the pivot table, config, health, and device lifecycle logic accumulate
4. **L3-ready** — Dockerfile, .env, health endpoint, logger, and graceful shutdown are all first-class adapters
5. **Mock devices are configurable** — controlled via `devices.config.ts`, enabled only in dev/test

The key trade-off is higher upfront effort (more interfaces, more files), but this pays off immediately when testing the device lifecycle logic or adding a new transport.

---

**User choice locked. Proceeding to Phase 3 (implementation plan).**
