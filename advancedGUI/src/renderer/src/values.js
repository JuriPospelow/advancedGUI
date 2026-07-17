const $ = (id) => document.getElementById(id);

class ValuesView {
  constructor(container) {
    this.container = container;
    this.devices = {};
    this.configView = null;
  }

  setConfigView(cv) {
    this.configView = cv;
  }

  upsertDevice(id, data) {
    this.devices[id] = data;
    this.render();
  }

  removeDevice(id) {
    delete this.devices[id];
    this.render();
  }

  render() {
    if (this.container.querySelector(".access-blocked")) return;
    const groups = this._groupDevices();
    this.container.innerHTML = "";
    for (const [keySet, deviceIds] of Object.entries(groups)) {
      const fields = keySet === "" ? [] : keySet.split(",");
      if (fields.length === 0) continue;

      const groupDiv = document.createElement("div");
      groupDiv.className = "pivot-group";

      const heading = document.createElement("h3");
      heading.textContent = `${fields.length} fields · ${deviceIds.length} device${deviceIds.length > 1 ? "s" : ""}`;
      groupDiv.appendChild(heading);

      const table = document.createElement("table");
      table.className = "pivot-table";

      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      const thLabel = document.createElement("th");
      thLabel.textContent = "Field";
      headerRow.appendChild(thLabel);
      for (const id of deviceIds) {
        const th = document.createElement("th");
        th.textContent = id;
        headerRow.appendChild(th);
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      for (const field of fields) {
        const tr = document.createElement("tr");
        const tdLabel = document.createElement("td");
        tdLabel.className = "field-label";
        tdLabel.textContent = field;
        tr.appendChild(tdLabel);
        for (const id of deviceIds) {
          const td = document.createElement("td");
          const device = this.devices[id];
          if (this.configView && !this.configView.isSelected(id, field)) {
            td.textContent = "—";
            td.className = "dimmed";
          } else {
            td.textContent = device && device[field] !== undefined ? device[field] : "—";
          }
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      groupDiv.appendChild(table);
      this.container.appendChild(groupDiv);
    }
  }

  _groupDevices() {
    const groups = {};
    for (const [id, data] of Object.entries(this.devices)) {
      const keys = Object.keys(data).sort();
      const keyStr = keys.join(",");
      if (!groups[keyStr]) groups[keyStr] = [];
      groups[keyStr].push(id);
    }
    return groups;
  }
}
