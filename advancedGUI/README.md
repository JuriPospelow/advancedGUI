
## Architecture

  
  
  ![Architecture diagram](documentation/images/architecture.svg)
  

- **Core** — Pure domain logic (zero external deps): device lifecycle, auth, data flattening, health model
- **Adapters** — Infrastructure: MQTT/Unix scanners, WebSocket bridge, Express server, file-based user store
- **Frontend** — Plain HTML/CSS/JS (no build step), WebSocket API, pivot-table layout with configurable fields
- **Ports** — Interface contracts (`Connector`, `DeviceScanner`, `Logger`, `UserStore`) separating core from infrastructure
