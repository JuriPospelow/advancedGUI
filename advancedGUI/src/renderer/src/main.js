(function () {
  const $ = (id) => document.getElementById(id);

  const valuesView = new ValuesView($("tab-values"));
  const configView = new ConfigView($("tab-config"));
  const healthView = new HealthView($("tab-health"));
  const mockView = new MockView($("tab-mock"));

  let ws = null;
  let authToken = null;
  let currentUser = null;

  /* --- Tab routing --- */
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      $(`tab-${btn.dataset.tab}`).classList.add("active");
    });
  });

  /* --- Auth --- */
  $("btn-login").addEventListener("click", () => {
    $("login-overlay").classList.remove("hidden");
    $("login-error").classList.add("hidden");
    $("login-username").value = "";
    $("login-password").value = "";
    $("login-username").focus();
  });

  $("btn-login-cancel").addEventListener("click", () => {
    $("login-overlay").classList.add("hidden");
  });

  $("btn-login-submit").addEventListener("click", async () => {
    const username = $("login-username").value.trim();
    const password = $("login-password").value;
    if (!username || !password) return;
    try {
      const res = await fetch("/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        $("login-error").textContent = "Invalid credentials";
        $("login-error").classList.remove("hidden");
        return;
      }
      const data = await res.json();
      authToken = data.token;
      currentUser = data.user;
      $("login-overlay").classList.add("hidden");
      $("btn-login").classList.add("hidden");
      $("btn-logout").classList.remove("hidden");
      $("btn-logout").textContent = `Logout (${currentUser.role})`;
      healthView.setToken(authToken);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "auth", token: authToken }));
      }
    } catch (err) {
      $("login-error").textContent = "Connection error";
      $("login-error").classList.remove("hidden");
    }
  });

  $("btn-logout").addEventListener("click", () => {
    authToken = null;
    currentUser = null;
    $("btn-logout").classList.add("hidden");
    $("btn-login").classList.remove("hidden");
    healthView.setToken(null);
    if (ws) ws.close();
  });

  /* --- WebSocket --- */
  function connect() {
    ws = new WebSocket(`ws://${location.host}/ws`);
    mockView.setWs(ws);

    ws.onopen = () => {
      $("status").textContent = "connected";
      $("status").className = "connected";
      $("btn-login").classList.remove("hidden");
      if (authToken) {
        ws.send(JSON.stringify({ type: "auth", token: authToken }));
      }
    };

    ws.onclose = () => {
      $("status").textContent = "disconnected";
      $("status").className = "disconnected";
      setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "devices") {
          for (const id of msg.left || []) {
            valuesView.removeDevice(id);
            configView.removeDevice(id);
          }
          for (const [id, data] of Object.entries(msg.joined || {})) {
            valuesView.upsertDevice(id, data);
            configView.upsertDevice(id, data);
          }
          for (const [id, data] of Object.entries(msg.updated || {})) {
            valuesView.upsertDevice(id, data);
            configView.upsertDevice(id, data);
          }
          const count = Object.keys(valuesView.devices).length;
          $("device-count").textContent = `${count} device${count !== 1 ? "s" : ""}`;
        }
        if (msg.type === "mock_state") {
          mockView.updateState(msg.devices);
        }
      } catch {
        // ignore malformed
      }
    };
  }

  connect();
})();
