# Getting Started

## Prerequisites

Choose **one**:

- **Docker** — Docker installed on your system
- **Node.js** — Node.js 18+ and npm 9+

---

## Quick Start

### Option A — Docker (recommended)

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
```

With custom MQTT broker port (for external device connections):

```bash
docker run -d -p 8080:8080 -p 1883:1883 -e MQTT_BROKER_PORT=1883 --init advancedgui
```

Useful Docker commands:

```bash
docker ps              # list running containers
docker logs <id>       # view logs
docker stop <id>       # stop the container
docker start <id>      # restart a stopped container
docker rm <id>         # remove a stopped container
```

Rebuilding after code changes:

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

---

## Configuration

All parameters are loaded via `dotenv` from `.env`. Priority: CLI env > `.env` file > hardcoded default.

| Parameter | Env var | Default | Example |
|-----------|---------|---------|---------|
| HTTP port | `PORT` | `8080` | `PORT=3000 npm start` |
| MQTT broker port | `MQTT_BROKER_PORT` | `0` (dynamic) | `MQTT_BROKER_PORT=1883 npm start` |
| Unix socket dir | `UNIX_SOCKET_DIR` | `/tmp/sockets` | `UNIX_SOCKET_DIR=/custom npm start` |
| Auth file path | `AUTH_FILE` | `../../.auth.json` | `AUTH_FILE=/path/auth.json npm start` |
| Log level | `LOG_LEVEL` | `info` | `LOG_LEVEL=warn npm start` |

Copy `.env.example` to `.env` in the project root and edit as needed.

---

## Adding Real MQTT Devices

**Zero code changes.** The Aedes broker is already running. Any MQTT client that connects and publishes to any topic will be auto-discovered by `mqtt-scanner.ts` (subscribes to `#`, all topics). Just connect your real device to the broker and publish JSON payloads.

> By default the broker uses a **dynamic port** (0). For external devices (ESP32, etc.) you must set `MQTT_BROKER_PORT` to a fixed value (e.g. `1883`), then configure your device to connect to `<server-ip>:1883`.

---

## Adding Real Unix-Socket Devices

**Zero code changes.** Place a `.sock` file in `UNIX_SOCKET_DIR` (`/tmp/sockets` by default). The `unix-scanner.ts` will:

1. Detect the new `.sock` file → emit `joined` event
2. Connect to it, send `"state?"` → expect a JSON response
3. Forward parsed data to the frontend

Your real device just needs to listen on a Unix socket and respond to `"state?"` with a JSON line.

---

## Adding New Protocols

For adding support for new communication protocols (serial, CAN, etc.), see [AddingNewDeviceProtocol.md](AddingNewDeviceProtocol.md).

---

## User Accounts

| Username | Password | Level | Access |
|----------|----------|-------|--------|
| — | — | guest | Values only |
| `viewer` | `viewer` | viewer | Values + Config |
| `operator` | `operator` | operator | + Log |
| `admin` | `admin` | admin | + Health + Mock |

Usernames, passwords, and permission levels are stored in `.auth.json` and must be edited directly in that file.
