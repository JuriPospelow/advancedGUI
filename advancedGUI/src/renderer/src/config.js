const STORAGE_KEY = "advancedgui-config";

class ConfigView {
  constructor(container) {
    this.container = container;
    this.devices = {};
    this.selections = this._load();
    this.onChange = null;
  }

  upsertDevice(id, data) {
    this.devices[id] = Object.keys(data);
    this._ensureDefaults(id);
    this.render();
  }

  removeDevice(id) {
    delete this.devices[id];
    delete this.selections[id];
    this._save();
    this.render();
  }

  isSelected(deviceId, field) {
    return this.selections[deviceId]?.includes(field) ?? true;
  }

  getSelections() {
    return this.selections;
  }

  render() {
    this.container.innerHTML = "";
    for (const [id, fields] of Object.entries(this.devices)) {
      if (fields.length === 0) continue;

      const section = document.createElement("div");
      section.className = "config-section";

      const heading = document.createElement("h3");
      heading.textContent = id;
      section.appendChild(heading);

      const selected = this.selections[id] || fields;

      for (const field of fields) {
        const div = document.createElement("div");
        div.className = "config-field";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.id = `cfg-${id}-${field}`;
        cb.checked = selected.includes(field);
        cb.addEventListener("change", () => {
          this._toggle(id, field);
        });

        const label = document.createElement("label");
        label.htmlFor = cb.id;
        label.textContent = field;

        div.appendChild(cb);
        div.appendChild(label);
        section.appendChild(div);
      }

      this.container.appendChild(section);
    }
  }

  _toggle(id, field) {
    let selected = this.selections[id];
    if (!selected) {
      selected = [...(this.devices[id] || [])];
    }
    if (selected.includes(field)) {
      selected = selected.filter((f) => f !== field);
    } else {
      selected.push(field);
    }
    this.selections[id] = selected.length > 0 ? selected : [];
    this._save();
    this.onChange?.();
    this.render();
  }

  _ensureDefaults(id) {
    if (!this.selections[id]) {
      this.selections[id] = [...this.devices[id]];
      this._save();
    }
  }

  _load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.selections));
  }
}
