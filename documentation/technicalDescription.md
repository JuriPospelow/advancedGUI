# Technical Decisions — advancedGUI

## Architecture

**Clean Architecture (Hexagonal)** — Core domain has **zero external dependencies**. All I/O goes through port interfaces. Adapters implement those ports. Dependencies point inward only: `main/index.ts → adapters → ports ← core`. This was the single biggest decision — it makes the domain testable in isolation and allows swapping infrastructure without touching business logic.

## Core Domain Decisions

| Decision | Why |
|---|---|
| **Device Manager in core** | Device lifecycle (join/leave, transport tracking, event emission) is pure business logic — no files, no network, no framework |
| **Auth as domain logic** | `canPerform(level, required)` and `LEVEL_HIERARCHY` are pure rules. No JWT, no sessions, no cookies — just SHA-256 password hashes in a flat JSON file |
| **Flatten nested fields** | Incoming device data like `{detail: {Mode: "MAN"}}` is flattened to `{"detail.Mode": "MAN"}` for the pivot table — a domain concern, not presentation |
| **Health model** | Health status ("ok" vs "degraded") computed from domain data, rendered as cards in the UI |

## Infrastructure Decisions

| Decision | Why |
|---|---|
| **MQTT (Aedes broker)** | Embedded broker — zero external dependencies for development. MQTT is the industry standard for IoT/embedded |
| **Unix sockets** | Real devices communicate via Unix sockets (`state?` request → JSON response). Used `net.createConnection` directly rather than a library |
| **WebSocket bridge** | HTTP for REST endpoints (auth, health), WS for real-time device data. Bridge subscribes to MQTT + receives Unix scanner data and pushes to all connected browsers |
| **TSX runtime** | Run TypeScript directly without a build step (`npx tsx src/main/index.ts`). Avoids compile issues with aedes/pino types that are correct at runtime |
| **Plain HTML/CSS/JS frontend** | No framework (React, Vue, etc.). Five `<script>` tags, each a plain class (`ValuesView`, `ConfigView`, etc.). Pivot table for device data: fields as rows, devices as columns |

## UI/UX Decisions

| Decision | Why |
|---|---|
| **Tab-level access control** | Numerical levels (0=guest, 1=viewer, 5=operator, 10=admin). Blocked sections show a message. Views check for `.access-blocked` and skip DOM updates |
| **Pivot table** | Fields as rows, devices as columns, grouped by compatible key sets. Config checkboxes toggle which fields appear. New fields auto-checked and persisted in localStorage |
| **Guest gets device data** | Unauthenticated users receive live device updates (Values tab) — they just can't access Config/Log/Health/Mock |

## Test Strategy

| Type | Count | What |
|---|---|---|
| **Domain tests** | 15 | Pure logic — auth hierarchy, device join/leave, flatten, health model |
| **Infrastructure tests** | 19 | Adapter integrations with real MQTT broker, Unix sockets, WS, HTTP, file I/O |
| **E2E** | 4 | Full stack — serve page, auth, health endpoint, WS connection with auth |

## What Was Removed

During the p5→p9 migration, 7 superseded source modules and 5 orphaned tests were deleted. Also removed: an unused `AuthMiddleware` type and `requiresAuth` function.
