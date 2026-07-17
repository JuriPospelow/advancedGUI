class LogView {
  constructor(container) {
    this.container = container;
    this.entries = [];
    this.maxEntries = 500;
  }

  push(event, rawData) {
    let msg;
    try {
      msg = JSON.parse(rawData);
    } catch {
      msg = { raw: rawData };
    }

    const entry = {
      time: new Date().toLocaleTimeString(),
      type: msg.type || "?",
      raw: rawData.length > 300 ? rawData.slice(0, 300) + "…" : rawData,
    };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
    this.render();
  }

  render() {
    if (this.container.querySelector(".access-blocked")) return;
    this.container.innerHTML = "";
    const toolbar = document.createElement("div");
    toolbar.className = "log-toolbar";

    const count = document.createElement("span");
    count.className = "log-count";
    count.textContent = `${this.entries.length} messages`;

    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Clear";
    clearBtn.addEventListener("click", () => {
      this.entries = [];
      this.render();
    });

    toolbar.appendChild(count);
    toolbar.appendChild(clearBtn);
    this.container.appendChild(toolbar);

    const list = document.createElement("div");
    list.className = "log-list";

    for (const entry of this.entries) {
      const row = document.createElement("div");
      row.className = "log-entry";

      const timeSpan = document.createElement("span");
      timeSpan.className = "log-time";
      timeSpan.textContent = entry.time;

      const typeSpan = document.createElement("span");
      typeSpan.className = `log-type log-type-${entry.type}`;
      typeSpan.textContent = entry.type;

      const contentSpan = document.createElement("span");
      contentSpan.className = "log-content";
      contentSpan.textContent = entry.raw;

      row.appendChild(timeSpan);
      row.appendChild(typeSpan);
      row.appendChild(contentSpan);
      list.appendChild(row);
    }

    this.container.appendChild(list);
    list.scrollTop = list.scrollHeight;
  }
}
