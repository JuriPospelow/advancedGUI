# advancedGUI

Advanced web GUI for communicating with embedded devices via MQTT and Unix sockets. Extends p5-basicGUI with dynamic pivot tables, user permission levels, device lifecycle management, and production-ready monitoring.

## Prerequisites

Choose **one** of the following:

- **Option A (Docker):** Docker installed on your system
- **Option B (direct):** Node.js 18+ and npm 9+

## Quick Start

### Option A — Docker (recommended, no Node.js needed)

```bash
# 1. Clone
git clone <repo-url>
cd p9-advancedGUI/advancedGUI

# 2. Build the image (first time only, or after code changes)
docker build -t advancedgui .

# 3. Start the container
docker run -d -p 8080:8080 --init advancedgui

# 4. Open in browser
# http://localhost:8080

# Useful commands
docker ps              # list running containers
docker logs <id>       # view logs
docker stop <id>       # stop the container
docker start <id>      # restart a stopped container
docker rm <id>         # remove a stopped container
```

The `--init` flag ensures proper signal handling (graceful shutdown on Ctrl+C). The image contains Alpine Linux + Node.js + all dependencies — nothing else needs to be installed on your machine.

**Rebuilding after code changes:**
```bash
git pull
docker build -t advancedgui .
docker stop <id> && docker rm <id>
docker run -d -p 8080:8080 --init advancedgui
```

### Option B — Direct (requires Node.js)

```bash
# 1. Clone
git clone <repo-url>
cd p9-advancedGUI/advancedGUI

# 2. Install dependencies
npm install

# 3. Start the server
npm start

# 4. Open in browser
# http://localhost:8080
```

Set a custom port:
```bash
PORT=3000 npm start
```

## Test

```bash
npm test
```

## Accounts

| Username | Password | Level | Access |
|----------|----------|-------|--------|
| `viewer` | `viewer` | viewer | Values + Config |
| `operator` | `operator` | operator | + Log |
| `admin` | `admin` | admin | + Health + Mock |

Guest (no login) can only see the Values tab.

## Architecture

```
Mock Device ──MQTT──► Aedes Broker ──MQTT──► Bridge ──WS──► Browser
                   ┌─────────────┐
Unix Mock ────────►│ Device Mgr  │──► Bridge ──WS──► Browser
                   └─────────────┘
```

- **Core** — Pure domain logic (zero external deps): device lifecycle, auth, data flattening, health model
- **Adapters** — Infrastructure: MQTT/Unix scanners, WebSocket bridge, Express server, file-based user store
- **Frontend** — Plain HTML/CSS/JS (no build step), WebSocket API, pivot-table layout with configurable fields
- **Ports** — Interface contracts (`Connector`, `DeviceScanner`, `Logger`, `UserStore`) separating core from infrastructure

## Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start the server |
| `npm test` | Run all tests |
| `npm run dev` | Start with file watching |
| `docker build -t advancedgui .` | Build Docker image |
| `docker run -d -p 8080:8080 --init advancedgui` | Run container |
