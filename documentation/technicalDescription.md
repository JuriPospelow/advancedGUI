# Technical Decisions — advancedGUI

## Goal
The system must support new device protocols without modifying the business logic.
Every transport should be replaceable.
The core should remain fully testable.
This led to a Hexagonal Architecture.

## Architecture

**Clean Architecture (Hexagonal)** — Core domain has **zero external dependencies**. All I/O goes through port interfaces. Adapters implement those ports. Dependencies point inward only: `main/index.ts → adapters → ports ← core`. This was the single biggest decision — it makes the domain testable in isolation and allows swapping infrastructure without touching business logic.

## Core Domain Decisions

| Problem | Solution | Benefit |
|---|---|---|
| Device lifecycle (join/leave, transport tracking, event emission) is business logic that risks being tied to files, network, or a framework | `DeviceManager` lives in pure core with zero external dependencies | Lifecycle behavior is testable in isolation; logic is not coupled to any infrastructure |
| Authentication/permission logic can pollute the domain with tokens, sessions, or cookies | Pure `canPerform(level, required)` rules + `LEVEL_HIERARCHY`, backed by SHA-256 hashes in a flat `.auth.json` file | Permission logic is trivially testable and storage-agnostic; avoids the overhead of JWTs, sessions, or cookie handling |
| Incoming device JSON is deeply nested, which doesn't fit a flat pivot table | `flattenFields` turns `{detail:{Mode:"MAN"}}` into `{"detail.Mode":"MAN"}` in the domain layer | Presenting devices works uniformly regardless of source; normalization is a tested, reusable domain concern |
| Health status needs to be derived consistently from domain data | `HealthData` model computes status ("ok"/"degraded") from domain data | UI renders uniform health cards; status logic is unit-testable |

## Infrastructure Decisions

| Problem | Solution | Benefit |
|---|---|---|
| Devices need an industry-standard, self-hosted messaging backbone with zero external dependencies | Embedded Aedes MQTT broker | Real IoT devices (ESP32, etc.) can connect without running a separate broker service |
| Real devices communicate over Unix sockets with a request/response `state?` protocol | Used `net.createConnection` directly (no library) | No extra dependency; direct control over the socket protocol |
| REST is request/response and can't push live device data efficiently | HTTP for REST (auth/health) + WebSocket bridge for real-time device data | Browsers receive live updates instantly; the bridge fans device data out to all connected clients |
| A required TypeScript compile step added build friction, and third-party type definitions (aedes, pino) are inaccurate at compile time though correct at runtime — a full `tsc` build would block or complicate it | Run TypeScript directly at runtime with `tsx` (no compile step); type-checking remains in the editor | Faster friction-free iteration; the app runs despite imperfect library typings, with no build-infrastructure overhead |
| A heavy frontend framework adds build complexity for a focused monitoring UI | Plain HTML/CSS/JS with plain view classes | Zero build step; pivot table works without a framework; simpler to maintain |

## UI/UX Decisions

| Problem | Solution | Benefit |
|---|---|---|
| Different users must see only what their role allows | Numerical levels (0=guest, 1=viewer, 5=operator, 10=admin); blocked sections show a message | Fine-grained tab access; role enforcement is consistent and skips blocked DOM updates |
| Device data differs per device; users need a flexible comparison view | Pivot table: fields as rows, devices as columns, grouped by compatible key sets; config checkboxes + localStorage persistence | Users configure exactly which fields to compare; choices persist across sessions |
| Guests should be able to monitor devices without a login | Guests receive live device updates (Values tab) while restricted from Config/Log/Health/Mock | Low-friction read-only monitoring for non-authenticated users |

## Test Strategy

| Type | Count | What |
|---|---|---|
| **Domain tests** | 15 | Pure logic — auth hierarchy, device join/leave, flatten, health model |
| **Infrastructure tests** | 19 | Adapter integrations with real MQTT broker, Unix sockets, WS, HTTP, file I/O |
| **E2E** | 4 | Full stack — serve page, auth, health endpoint, WS connection with auth |

## Simplification

During the p5→p9 migration, 7 superseded source modules and 5 orphaned tests were deleted. Also removed: an unused `AuthMiddleware` type and `requiresAuth` function.
