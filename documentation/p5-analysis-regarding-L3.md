# p5-basicGUI — L3 Gap Analysis

## 1. Monitoring / Logging

**Logging** — Recording events systematically (errors, connections, commands, state changes) to a file or stdout so you can debug issues or audit what happened.

**Monitoring** — Observing the running system's health in real time: is the broker up? How many WebSocket clients are connected? Memory / CPU usage? Response times? Alerting when something breaks.

| Level | Approach | p5-basicGUI status |
|---|---|---|
| **L2 (internal tool)** | `console.log` is fine — you look at the terminal when something breaks | ✅ Current state |
| **L3 (production)** | Proper logger (winston, pino, or structured stdout) + health endpoints + Prometheus metrics / uptime checks | ❌ Missing |

---

## 2. Scalability Design

Scalability design means the system is architected to handle **growth in load** without major rewrites.

| Scale dimension | What breaks | L3 design pattern | p5-basicGUI status |
|---|---|---|---|
| **More concurrent WebSocket clients** | Single thread gets overloaded | Clustering (Node.js `cluster`), horizontal scaling behind a load balancer, sticky sessions | ❌ Embedded Aedes, single process |
| **More MQTT topics / messages** | Bridge becomes a bottleneck | Message queue between broker and bridge, topic filtering per client, backpressure handling | ❌ No backpressure, no filtering |
| **Multiple instances** | State is in-memory (broker, connections) | Externalize broker (standalone Mosquitto/EMQX), shared state via Redis | ❌ In-memory only |
| **Deployment growth** | Manual restart / no health checks | Health endpoint (`GET /health`), graceful shutdown, Docker + orchestration | ❌ No infra |

---

## 3. Input Validation / Sanitization

**Input validation** — Checking that incoming data (WebSocket messages, HTTP requests, socket commands) is **correct and expected** before processing it.

**Input sanitization** — Cleaning or escaping data to prevent injection attacks.

| Check | Purpose | p5-basicGUI status |
|---|---|---|
| Required fields present (`topic`, `payload`) | Prevent `null`/`undefined` crashes | ❌ Not validated |
| `topic` is a string | Prevent object/array injection | ❌ Not validated |
| `payload` is valid JSON | Prevent parse errors downstream | ❌ Not validated |
| Topic is in allowed list | Prevent publishing to system topics (e.g., `$SYS/broker/...`) | ❌ Any topic accepted |
| Length limits on topic/payload | Prevent memory exhaustion | ❌ No limits |
| Output escaping in GUI | Prevent XSS | ❌ Not escaped |
| Path traversal prevention (if files involved) | Prevent arbitrary file read/write | ❌ N/A currently |

---

## 4. Production Deployment Configuration

Production deployment cfg means the scripts, configs, and tooling needed to reliably run the software on a real server — not just on your dev machine with `npm start`.

| What's needed | Purpose | p5-basicGUI status |
|---|---|---|
| **Dockerfile** | Containerized, reproducible environment | ❌ Missing |
| **Process manager** (systemd, PM2, Docker restart policy) | Restart on crash | ❌ Missing |
| **Environment config** (dev/staging/prod, .env files) | Separate config per environment | ❌ Uses `process.env.PORT \|\| 8080` only |
| **CI/CD pipeline** | Automated test → build → deploy | ❌ Missing |
| **Graceful shutdown** (SIGTERM/SIGINT handlers) | Close broker, WS, HTTP cleanly | ❌ Missing |
| **Health endpoint** (`GET /health`) | Orchestrator / load balancer checks | ❌ Missing |
| **CORS / reverse proxy awareness** | Running behind nginx or similar | ❌ Missing |
| **Resource limits / security hardening** | No `root`, minimal dependencies, non-privileged user | ❌ Missing |

---

## Summary

| L3 requirement | p5-basicGUI |
|---|---|
| Monitoring / Logging | ❌ |
| Scalability design | ❌ |
| Input validation / sanitization | ❌ |
| Auth / user levels | ❌ |
| Production deployment cfg | ❌ |
