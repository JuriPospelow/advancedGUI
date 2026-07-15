# Architecture — Phase 3 Migration Plan

> **Approach selected:** Approach 3 — Clean Architecture (Hexagonal) + Device Manager

Each step follows the coding skill's **A–F** workflow:

| Phase | Action |
|-------|--------|
| **A** — Observe | Identify observable behaviour |
| **B** — Verify baseline | Run verification that captures it |
| **C** — Confirm | Baseline is green? If not → log bug, fix, retry |
| **D** — Change | Make the code change (one conceptual change) |
| **E** — Re-verify | Run verification again (must still be green) |
| **F** — Commit | `git add` + `git commit` (3-commit pattern: verification code → changed code → clean up) |

---

## Step 1 — Copy p5-basicGUI into p9 + bootstrap

**Dependencies:** None (first step)

**What changes:**
- Copy all files from `p5-basicGUI/simpleGUI/` into a new `simpleGUI/` directory in p9
- Update `package.json`: add `pino`, `dotenv` dependencies; rename to `advancedgui`
- Create `.env` with `PORT=8080`, `LOG_LEVEL=info`, `UNIX_SOCKET_DIR=/tmp/sockets`
- Add `src/main/logger.ts` as a thin pino wrapper (temporary — will be replaced by port/adapter pattern later)

**A — Observe:** p5 test suite passes with 6/6 tests. Lint passes. TypeScript compiles (known aedes type issue aside).

**B — Verify baseline:** `npm test && npx eslint src/ && npx tsc --noEmit`

**C — Confirm:** All tests pass, lint passes, tsc passes (except pre-existing aedes issue in `bugs.md`).

**D — Change:** Copy files, update package.json, add `.env`, add temporary `logger.ts`.

**E — Re-verify:** Same as **B**.

**F — Commit:**
1. `git add simpleGUI/src/main/logger.ts simpleGUI/.env` + commit `"verification: add logger baseline"`
2. `git add --all` + commit `"advancedGUI: step 1 — bootstrap from p5"`
3. Clean up any p5-specific files (remove references)

---

## Step 2 — Create port interfaces

**Dependencies:** Step 1

**What changes:**
- Create `simpleGUI/src/port/` directory
- Move `connector.ts` from `connectors/` to `port/` (pure interface, no changes)
- Create `device-scanner.ts` — interface for device discovery (scan, poll, onJoined/onLeft)
- Create `user-store.ts` — interface for user persistence (authenticate, getLevel)
- Create `logger.ts` — interface for structured logging (info, warn, error)
- Delete temporary `logger.ts` from step 1

**A — Observe:** Port interfaces are pure TypeScript, compile-time checkable.

**B — Verify baseline:** `npx tsc --noEmit` (will fail if interfaces are wrong).

**C — Confirm:** Compilation passes.

**D — Change:** Create 4 interface files.

**E — Re-verify:** `npx tsc --noEmit` passes.

**F — Commit:**
1. Commit interface files first
2. Commit deletion of temporary logger.ts

---

## Step 3 — Create core domain modules

**Dependencies:** Step 1 (TypeScript), Step 2 (port interfaces for imports)

**What changes:**
- Create `simpleGUI/src/core/table-engine.ts` — JSON flatten (dot notation), device grouping by key set, diff logic for pivot updates
- Create `simpleGUI/src/core/device-manager.ts` — pure domain: track active devices, emit joined/left events, group by key compatibility
- Create `simpleGUI/src/core/auth-domain.ts` — User type, PermissionLevel enum (viewer/operator/admin), checkPermission() pure function
- Create `simpleGUI/src/core/health-model.ts` — HealthStatus type, collectMetrics() pure function
- All core modules have **zero external dependencies** (pure TypeScript only)

**A — Observe:** Each core module exports pure functions and types. Testable without mocks.

**B — Verify baseline:** `npm test` (existing p5 tests still pass).

**C — Confirm:** Green.

**D — Change:** Create 4 core modules + their test files.

**E — Re-verify:** `npx vitest run` — all old tests + new core tests pass.

**F — Commit:** 3-commit pattern: test files → implementation → clean up.

---

## Step 4 — Create adapters: logging + user store

**Dependencies:** Step 2 (port interfaces), Step 3 (auth-domain types)

**What changes:**
- Create `simpleGUI/src/adapter/pino-logger.ts` — implements `Logger` port via pino
- Create `simpleGUI/src/adapter/file-user-store.ts` — implements `UserStore` port via `.auth.json` file
- Create `.auth.json` with default admin/operator/viewer accounts (bcrypt-hashed passwords)

**A — Observe:** Adapters are instantiated and wired. Logger outputs structured JSON. User store reads `.auth.json`.

**B — Verify baseline:** `npm test` passes.

**C — Confirm:** Green.

**D — Change:** Create 2 adapter files + `.auth.json` + tests.

**E — Re-verify:** `npx vitest run` — all tests pass.

**F — Commit:** 3-commit pattern.

---

## Step 5 — Create adapters: Unix connector + scanner

**Dependencies:** Step 2 (Connector, DeviceScanner ports)

**What changes:**
- Create `simpleGUI/src/adapter/unix-connector.ts` — implements `Connector` over Node.js `net` (Unix socket)
- Create `simpleGUI/src/adapter/unix-scanner.ts` — implements `DeviceScanner`: polls `UNIX_SOCKET_DIR` (env / --socket-dir arg / config) for `.sock` files, emits joined/left

**A — Observe:** Unix connector connects to Unix domain sockets. Scanner detects socket files appearing/disappearing.

**B — Verify baseline:** `npm test` passes.

**C — Confirm:** Green.

**D — Change:** Create 2 adapter files + tests.

**E — Re-verify:** `npx vitest run` — all tests pass.

**F — Commit:** 3-commit pattern.

---

## Step 6 — Create adapters: MQTT scanner + connector

**Dependencies:** Step 2 (Connector, DeviceScanner ports), Step 1 (aedes broker)

**What changes:**
- Move `src/main/connectors/mqtt-connector.ts` → `src/adapter/mqtt-connector.ts` (update import paths)
- Create `simpleGUI/src/adapter/mqtt-scanner.ts` — implements `DeviceScanner`: reads device config file, subscribes to auto-discovery topics, emits joined/left
- Update `src/main/broker.ts` → `src/adapter/broker.ts` (move to adapter as infrastructure)

**A — Observe:** MQTT connector (unchanged logic, moved file). MQTT scanner detects devices from config + auto-discovery.

**B — Verify baseline:** `npm test` passes.

**C — Confirm:** Green.

**D — Change:** Move mqtt-connector.ts, create mqtt-scanner.ts, move broker.ts.

**E — Re-verify:** `npx vitest run` — all tests pass with new paths.

**F — Commit:** 3-commit pattern.

---

## Step 7 — Create Express server adapter

**Dependencies:** Step 4 (pino-logger), Step 3 (health-model)

**What changes:**
- Create `simpleGUI/src/adapter/express-server.ts` — Express setup: static files, `GET /health` route (admin-only), auth middleware, WS upgrade path
- Health route returns JSON with status, uptime, version, broker port, connection counts, last error

**A — Observe:** `GET /health` returns JSON. Static files served. Auth middleware returns 401 for unknown users.

**B — Verify baseline:** `npm test` passes.

**C — Confirm:** Green.

**D — Change:** Create express-server.ts + tests.

**E — Re-verify:** `npx vitest run` — all tests pass.

**F — Commit:** 3-commit pattern.

---

## Step 8 — Create WS Bridge adapter

**Dependencies:** Step 2 (Connector port), Step 3 (device-manager core, auth-domain core), Step 4 (logger), Step 7 (express-server)

**What changes:**
- Create `simpleGUI/src/adapter/ws-bridge.ts` — WebSocket ↔ Connector relay with:
  - Auth: validate credentials on WS connect, set user level
  - Device lifecycle: subscribe to device-manager events, notify frontend of joined/left
  - Table data: forward incoming MQTT/Unix messages to authenticated WS clients
  - Command relay: forward WS commands to appropriate connector (only if user level permits)
  - Input validation: validate topic, payload, length limits before forwarding

**A — Observe:** WS clients connect, authenticate, receive device data, receive joined/left events. Unauthenticated clients get rejected.

**B — Verify baseline:** `npm test` passes.

**C — Confirm:** Green.

**D — Change:** Create ws-bridge.ts + tests.

**E — Re-verify:** `npx vitest run` — all tests pass.

**F — Commit:** 3-commit pattern.

---

## Step 9 — Bootstrap: index.ts + shutdown

**Dependencies:** All previous steps (everything is wired here)

**What changes:**
- Create `simpleGUI/src/main/index.ts` — dependency injection and start sequence:
  1. Create logger (pino-logger adapter)
  2. Load .env config
  3. Start broker (if MQTT enabled)
  4. Create scanners (unix-scanner, mqtt-scanner) + device-manager
  5. Create connectors (mqtt-connector, unix-connector)
  6. Create express-server + ws-bridge
  7. Start HTTP server
- Create `simpleGUI/src/main/shutdown.ts` — graceful SIGTERM/SIGINT handler: close WS, HTTP, broker, scanners in order

**A — Observe:** Server starts without errors. Scanners poll. WS accepts connections. Shutdown cleans up.

**B — Verify baseline:** `npm test` passes.

**C — Confirm:** Green.

**D — Change:** Create index.ts + shutdown.ts.

**E — Re-verify:** `npm test` + manual: `npm start` → server starts on `:8080`, `GET /health` responds.

**F — Commit:** 3-commit pattern.

---

## Step 10 — Create mock devices

**Dependencies:** Step 5 (unix-connector), Step 6 (mqtt-connector)

**What changes:**
- Create `simpleGUI/src/mock/mqtt-measurement.ts` — publishes temperature (20-30), humidity (40-80), pressure (1000-1020) every 2s via MQTT
- Create `simpleGUI/src/mock/unix-counter.ts` — publishes incremental counter over Unix socket, responds to start/stop/reset
- Create `simpleGUI/src/mock/unix-device-a.ts` — JSON key set A: state, pdu, con, shutter, power, ilck, detail.{Mode, Ctrl, Laser, Gate, PwmFreq, LoP, PwmMax, Pwm}
- Create `simpleGUI/src/mock/unix-device-b.ts` — JSON key set B: state, pdu, con, shutter, ilck, power, detail.{LaserOn, Interlock, TriggerMode, Setpoint, T1}
- Create `simpleGUI/src/mock/unix-device-c.ts` — JSON key set C: different schema for table grouping test
- Create `simpleGUI/src/mock/devices.config.ts` — enable/disable each mock device with boolean flags

**A — Observe:** Each mock device publishes its data. MQTT devices publish to broker. Unix devices to their socket path.

**B — Verify baseline:** `npm test` passes (existing MQTT counter test still works).

**C — Confirm:** Green.

**D — Change:** Create 6 mock files + tests for each.

**E — Re-verify:** `npx vitest run` — all tests pass.

**F — Commit:** 3-commit pattern.

---

## Step 11 — Frontend: index.html + main.js

**Dependencies:** Step 8 (WS Bridge protocol), Step 9 (server running)

**What changes:**
- Rewrite `simpleGUI/src/renderer/index.html` — three-tab layout with "Values", "Config", "Health" tabs; login form
- Rewrite `simpleGUI/src/renderer/src/main.js` — orchestrator:
  - WS connection with auto-reconnect
  - Login flow: send auth credentials, receive user level
  - Tab switching (Values / Config / Health)
  - Dispatch messages to appropriate tab handler
  - Device joined/left events → update tab UI

**A — Observe:** Browser loads 3-tab layout. Connects via WS. Login form appears. After auth, tabs become active.

**B — Verify baseline:** `npm start` → browser shows p5 counter UI.

**C — Confirm:** Old UI works.

**D — Change:** Rewrite index.html (3 tabs) and main.js (orchestrator).

**E — Re-verify:** `npm start` → browser shows login screen. After auth → 3 tabs visible.

**F — Commit:** 3-commit pattern.

---

## Step 12 — Frontend: values.js (pivot table)

**Dependencies:** Step 11 (main.js dispatches table data here)

**What changes:**
- Create `simpleGUI/src/renderer/src/values.js` — pivot table engine:
  - Receive `table_update` messages from WS
  - Render pivot table: fields as rows, devices as columns
  - One table per device group (compatible key sets)
  - Apply Config filter: hide unchecked fields/cells
  - Live update: values refresh, columns appear/disappear on device join/leave
  - Device name derived from socket path (e.g., `dev1.sock` → `dev1`) or MQTT topic

**A — Observe:** Values tab shows pivot tables. Data updates live. Columns appear/disappear with device lifecycle.

**B — Verify baseline:** `npm start` → Values tab renders (initially empty).

**C — Confirm:** Green.

**D — Change:** Create values.js.

**E — Re-verify:** Mock devices start publishing → Values tab shows pivot tables with device columns.

**F — Commit:** 3-commit pattern.

---

## Step 13 — Frontend: config.js (filter checkboxes)

**Dependencies:** Step 11 (main.js manages tabs), Step 12 (values.js reads filter state)

**What changes:**
- Create `simpleGUI/src/renderer/src/config.js` — filter UI:
  - Render checkbox grid: fields as rows, devices as columns
  - Select/deselect all checkbox per device column header
  - Live update: toggle → immediately update Values tab
  - Persist to localStorage (keyed by device group)
  - Load saved state on page load

**A — Observe:** Config tab shows checkboxes. Toggling hides/shows values. Settings survive page reload.

**B — Verify baseline:** `npm start` → Config tab renders (initially all checked).

**C — Confirm:** Green.

**D — Change:** Create config.js.

**E — Re-verify:** Uncheck a field → Values tab hides it. Reload page → state persists.

**F — Commit:** 3-commit pattern.

---

## Step 14 — Frontend: health.js + CSS

**Dependencies:** Step 11 (main.js manages tabs), Step 7 (GET /health endpoint)

**What changes:**
- Create `simpleGUI/src/renderer/src/health.js` — health display:
  - Only visible to Admin level
  - Poll `GET /health` via `fetch()` every 5 seconds when tab is active
  - Display: status (✅/❌), uptime, version, broker port, WS connections, Unix connections, last error
  - Stop polling when switching away from Health tab (start on re-enter)
- Update `simpleGUI/src/renderer/src/styles/app.css` — styles for tabs, pivot tables, checkbox grid, login form

**A — Observe:** Health tab shows server status. Updates every 5s. Not visible to non-admin users.

**B — Verify baseline:** `npm start` → Health tab visible for admin, hidden for viewer/operator.

**C — Confirm:** Green.

**D — Change:** Create health.js, update app.css.

**E — Re-verify:** Login as admin → Health tab shows live data. Login as viewer → Health tab hidden.

**F — Commit:** 3-commit pattern.

---

## Step 15 — Deployment: Dockerfile + .env

**Dependencies:** Step 9 (server bootstrap)

**What changes:**
- Create `simpleGUI/Dockerfile` — multi-stage: install deps, build? (or just copy since tsx runs TS directly), expose port, HEALTHCHECK
- Update `.env` with all configurable values: PORT, LOG_LEVEL, UNIX_SOCKET_DIR, MQTT_AUTO_DISCOVERY_TOPIC, AUTH_FILE_PATH
- Create `.env.example` as documentation
- Update `README.md` with deployment instructions

**A — Observe:** `docker build -t advancedgui . && docker run -p 8080:8080 advancedgui` starts the server.

**B — Verify baseline:** `npm start` works.

**C — Confirm:** Green.

**D — Change:** Dockerfile, .env.example, update README.

**E — Re-verify:** Docker build + run → server accessible at `http://localhost:8080`.

**F — Commit:** 3-commit pattern.

---

## Step 16 — End-to-end smoke test + cleanup

**Dependencies:** All previous steps

**What changes:**
- Run full test suite: `npx vitest run && npx tsc --noEmit && npx eslint src/`
- Update `bugs.md` with any new issues found
- Manual smoke test checklist:
  - [ ] Server starts, `GET /health` returns JSON
  - [ ] Login as admin → all 3 tabs visible
  - [ ] Login as operator → Values + Config visible, Health hidden, commands work
  - [ ] Login as viewer → Values + Config visible, Health hidden, commands blocked
  - [ ] Unix mock devices appear in Values tab as columns
  - [ ] MQTT mock devices appear in Values tab
  - [ ] Remove socket file → column disappears within 1 poll cycle
  - [ ] Re-add socket file → column reappears
  - [ ] Config tab toggle → Values tab updates live
  - [ ] Reload page → Config filter persists
  - [ ] Graceful shutdown → no orphan processes

**A — Observe:** All tests pass. Smoke checklist is green.

**B — Verify baseline:** `npm test` passes.

**C — Confirm:** Green.

**D — Change:** If any issues, fix them. No structural changes expected.

**E — Re-verify:** Full test suite + smoke checklist.

**F — Commit:** Fixes + final commit.

---

## Summary

| Step | Description | Verification | Dependencies |
|------|------------|-------------|--------------|
| 1 | Copy p5 + bootstrap | `npm test` + tsc + lint | — |
| 2 | Port interfaces | `npx tsc` | 1 |
| 3 | Core domain modules | `npx vitest run` | 1, 2 |
| 4 | Adapters: logger + user store | `npx vitest run` | 2, 3 |
| 5 | Adapters: Unix connector + scanner | `npx vitest run` | 2 |
| 6 | Adapters: MQTT scanner + connector | `npx vitest run` | 1, 2 |
| 7 | Express server adapter | `npx vitest run` | 3, 4 |
| 8 | WS Bridge adapter | `npx vitest run` | 2, 3, 4, 7 |
| 9 | Bootstrap index.ts + shutdown | `npm test` + `npm start` | all above |
| 10 | Mock devices | `npx vitest run` | 5, 6 |
| 11 | Frontend: index.html + main.js | `npm start` (manual) | 8, 9 |
| 12 | Frontend: values.js | manual | 11 |
| 13 | Frontend: config.js | manual | 11, 12 |
| 14 | Frontend: health.js + CSS | manual | 7, 11 |
| 15 | Dockerfile + .env | `docker build` | 9 |
| 16 | End-to-end smoke test + cleanup | `npm test` + checklist | all |

**Status:** ✅ Plan ready. Waiting for user approval before execution begins.
