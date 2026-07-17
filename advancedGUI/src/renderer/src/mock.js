const MOCK_DEVICES = [
  { id: "mqtt-counter", label: "MQTT Counter", transport: "mqtt" },
  { id: "mqtt-measurement", label: "MQTT Measurement", transport: "mqtt" },
  { id: "unix-counter", label: "Unix Counter", transport: "unix" },
  { id: "unix-device-a", label: "Unix Device A", transport: "unix" },
  { id: "unix-device-b", label: "Unix Device B", transport: "unix" },
  { id: "unix-device-c", label: "Unix Device C", transport: "unix" },
];

class MockView {
  constructor(container) {
    this.container = container;
    this.state = {};
    this.ws = null;
  }

  setWs(ws) {
    this.ws = ws;
  }

  updateState(state) {
    Object.assign(this.state, state);
    this.render();
  }

  render() {
    if (this.container.querySelector(".access-blocked")) return;
    this.container.innerHTML = "";
    for (const def of MOCK_DEVICES) {
      const enabled = this.state[def.id] ?? false;

      const card = document.createElement("div");
      card.className = "mock-card";

      const info = document.createElement("div");
      info.className = "mock-card-info";

      const name = document.createElement("div");
      name.className = "mock-card-name";
      name.textContent = def.label;

      const badge = document.createElement("span");
      badge.className = `mock-transport mock-${def.transport}`;
      badge.textContent = def.transport;

      name.appendChild(badge);
      info.appendChild(name);

      const toggle = document.createElement("button");
      toggle.className = `mock-toggle ${enabled ? "on" : "off"}`;
      toggle.textContent = enabled ? "ON" : "OFF";
      toggle.addEventListener("click", () => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: "mock_toggle",
            deviceId: def.id,
            enable: !enabled,
          }));
        }
      });

      card.appendChild(info);
      card.appendChild(toggle);
      this.container.appendChild(card);
    }
  }
}
