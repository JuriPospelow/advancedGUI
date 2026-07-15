# simpleGUI

Web GUI for communicating with embedded MQTT devices. Uses the **Backend Bridge Pattern** — the browser never connects to the MQTT broker directly.

## Prerequisites

- Node.js 18+
- npm 9+

## Install

```bash
npm install
```

## Run

```bash
npm start
```

Opens at [http://localhost:8080](http://localhost:8080). Set the `PORT` environment variable to use a different port:

```bash
PORT=3000 npm start
```

## Architecture

```
Mock Device ──MQTT──► Aedes Broker ──MQTT──► Bridge ──WS──► Browser
```

- **Broker** — Embedded Aedes MQTT broker on a dynamic port
- **Connector** — Abstraction layer (`Connector` interface) for MQTT transport
- **Mock Device** — Publishes `mock/counter` every 2s, responds to `start`/`stop`/`reset` on `mock/control`
- **Bridge** — Subscribes to MQTT topics via the Connector, forwards to WebSocket clients, and publishes WebSocket commands back to MQTT
- **Frontend** — Plain HTML/CSS/JS (no build step), WebSocket API

## Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start the server |
| `npm test` | Run all tests |
| `npm run dev` | Start with file watching |
