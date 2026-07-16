const STORAGE_KEY = "advancedgui-config";
const ALL_FIELDS_KEY = "advancedgui-allfields";

class ConfigView {
  constructor(container) {
    this.container = container;
    this.devices = {};
    this.selections = this._load();
    this.allFields = this._loadAll();
    this.onChange = null;
  }

  upsertDevice(id, data) {
    const fields = Object.keys(data);
    this.devices[id] = fields;
    this._trackFields(id, fields);
    this._ensureDefaults(id);
    this.render();
  }

  _trackFields(id, fields) {
    if (!this.allFields[id]) this.allFields[id] = [];
    let changed = false;
    for (const f of fields) {
      if (!this.allFields[id].includes(f)) {
        this.allFields[id].push(f);
        changed = true;
      }
    }
    if (changed) this._saveAll();
  }

  removeDevice(id) {
    delete this.devices[id];
    delete this.selections[id];
    delete this.allFields[id];
    this._save();
    this._saveAll();
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

    const toolbar = document.createElement("div");
    toolbar.className = "config-toolbar";

    const selectAllBtn = document.createElement("button");
    selectAllBtn.textContent = "Select All";
    selectAllBtn.addEventListener("click", () => this.selectAll());
    toolbar.appendChild(selectAllBtn);

    const heading = document.createElement("span");
    heading.className = "config-heading";
    heading.textContent = "Toggle fields to show in Values tab";
    toolbar.appendChild(heading);

    this.container.appendChild(toolbar);

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
    const fields = this.devices[id];
    if (!fields) return;
    if (!this.selections[id]) {
      this.selections[id] = [...fields];
      this._save();
    } else {
      let changed = false;
      const known = this.allFields[id] || [];
      for (const f of fields) {
        if (!known.includes(f)) {
          if (!this.selections[id].includes(f)) {
            this.selections[id].push(f);
            changed = true;
          }
        }
      }
      if (changed) this._save();
    }
  }

  selectAll() {
    for (const [id, fields] of Object.entries(this.devices)) {
      this.selections[id] = [...fields];
    }
    this._save();
    this.onChange?.();
    this.render();
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

  _loadAll() {
    try {
      return JSON.parse(localStorage.getItem(ALL_FIELDS_KEY)) || {};
    } catch {
      return {};
    }
  }

  _saveAll() {
    localStorage.setItem(ALL_FIELDS_KEY, JSON.stringify(this.allFields));
  }
}
