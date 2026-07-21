# Configurable Parameters

All parameters are loaded via `dotenv` from `.env`. The priority is:

1. **Command-line env** (highest) — set before Node starts, e.g. `PORT=3000 npm start`
2. **`.env` file** — only applies if the variable was not already set by the command line
3. **Hardcoded default** (lowest) — the `|| "value"` fallback in the source code

| Parameter | Env var | Default | Override via CLI | Override via `.env` |
|-----------|---------|---------|-----------------|---------------------|
| HTTP port | `PORT` | `8080` | `PORT=3000 npm start` | `PORT=3000` |
| MQTT broker port | `MQTT_BROKER_PORT` | `0` (dynamic) | `MQTT_BROKER_PORT=1883 npm start` | `MQTT_BROKER_PORT=1883` |
| Unix socket dir | `UNIX_SOCKET_DIR` | `/tmp/sockets` | `UNIX_SOCKET_DIR=/custom npm start` | `UNIX_SOCKET_DIR=/custom` |
| Auth file path | `AUTH_FILE` | `../../.auth.json` | `AUTH_FILE=/path/auth.json npm start` | `AUTH_FILE=/path/auth.json` |
| Log level | `LOG_LEVEL` | `info` | `LOG_LEVEL=warn npm start` | `LOG_LEVEL=warn` |

## User Accounts

Usernames, passwords, and permission levels are stored in `.auth.json` and must be edited directly in that file. They are **not** configurable via `.env` or command-line environment variables.
