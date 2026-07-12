# Architecture — Phase 1 Practical Validation

## Test results

p5-basicGUI (simpleGUI) — baseline validation before copying into p9.

| Module | Functionality | Test description | Result |
|--------|---------------|------------------|--------|
| **Broker** | Start on dynamic port | `broker.test.ts` — starts broker, verifies `port() > 0` | **PASS** |
| **Broker** | Accept MQTT connections and route messages | `broker.test.ts` — two clients connect via TCP, publish/subscribe `test/topic` | **PASS** |
| **Connector** | Connect, publish, subscribe, receive | `connector.test.ts` — pub/sub over MQTT connector via broker | **PASS** |
| **Bridge** | Forward MQTT messages to WebSocket clients | `bridge.test.ts` — publish via MQTT connector, receive via WebSocket | **PASS** |
| **Bridge** | Forward WebSocket messages to MQTT | `bridge.test.ts` — send via WebSocket, receive via MQTT subscriber | **PASS** |
| **MockDevice** | Publish counter messages, respond to commands | `device.test.ts` — start device, verify counter increments, send reset/stop/start commands | **PASS** (20s timeout) |
| **TypeScript** | Compile-time check | `npx tsc --noEmit` | **FAIL** — `TS2351: aedes not constructable` (pre-existing, runtime-safe) |
| **Lint** | ESLint code quality | `npx eslint src/` | **PASS** |

## Summary

- **6/6 functional tests PASS** — all core modules work correctly
- **Lint PASS** — no code quality issues
- **TypeScript:** 1 pre-existing type definition issue in `broker.ts:19` (aedes types lack constructor signature; does not affect runtime)
- **Bugs logged:** 1 pre-existing issue logged in `bugs.md`
- **Foundation is stable** for copying into p9
