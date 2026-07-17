class HealthView {
  constructor(container) {
    this.container = container;
    this.interval = null;
    this.token = null;
    this.lastData = null;
  }

  refresh() {
    if (this.container.querySelector(".access-blocked")) return;
    if (this.lastData) this._render(this.lastData);
  }

  setToken(token) {
    this.token = token;
    if (token) {
      this._poll();
      this.interval = setInterval(() => this._poll(), 5000);
    } else {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
      this.container.innerHTML = "<p>Log in as admin to see health.</p>";
    }
  }

  async _poll() {
    if (this.container.querySelector(".access-blocked")) return;
    try {
      const res = await fetch("/health", {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (this.container.querySelector(".access-blocked")) return;
      if (!res.ok) {
        if (res.status === 403) {
          this.container.innerHTML = "<p>Access denied. Admin role required.</p>";
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      this._render(data);
    } catch (err) {
      this.container.innerHTML = `<p id="health-error">Error: ${err.message}</p>`;
    }
  }

  _render(data) {
    if (this.container.querySelector(".access-blocked")) return;
    this.lastData = data;
    this.container.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "health-grid";

    const cards = [
      { label: "Uptime", value: `${data.uptime ?? 0}s` },
      { label: "Version", value: data.version ?? "—" },
      { label: "Devices", value: data.deviceCount ?? 0 },
      { label: "Broker Port", value: data.brokerPort ?? "—" },
      { label: "WS Clients", value: data.wsConnections ?? 0 },
      { label: "Status", value: data.error ? "Error" : "OK", cls: data.error ? "red" : "green" },
    ];

    for (const c of cards) {
      const card = document.createElement("div");
      card.className = "health-card";
      card.innerHTML = `<h3>${c.label}</h3><div class="value ${c.cls || ""}">${c.value}</div>`;
      grid.appendChild(card);
    }

    this.container.appendChild(grid);
  }
}
