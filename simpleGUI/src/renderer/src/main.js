const statusEl = document.getElementById("status");
const counterEl = document.getElementById("counter-value");
const btnStart = document.getElementById("btn-start");
const btnStop = document.getElementById("btn-stop");
const btnReset = document.getElementById("btn-reset");

let ws = null;

function setConnected(connected) {
  statusEl.textContent = connected ? "connected" : "disconnected";
  statusEl.className = connected ? "connected" : "disconnected";
  btnStart.disabled = !connected;
  btnStop.disabled = !connected;
  btnReset.disabled = !connected;
}

function connect() {
  ws = new WebSocket(`ws://${location.host}/ws`);

  ws.onopen = () => {
    setConnected(true);
  };

  ws.onclose = () => {
    setConnected(false);
    setTimeout(connect, 2000);
  };

  ws.onerror = () => {
    ws.close();
  };

  ws.onmessage = (event) => {
    try {
      const { topic, payload } = JSON.parse(event.data);
      if (topic === "mock/counter") {
        const data = JSON.parse(payload);
        counterEl.textContent = data.count;
      }
    } catch {
      // ignore malformed messages
    }
  };
}

function send(cmd) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        topic: "mock/control",
        payload: JSON.stringify({ cmd }),
      }),
    );
  }
}

btnStart.addEventListener("click", () => send("start"));
btnStop.addEventListener("click", () => send("stop"));
btnReset.addEventListener("click", () => send("reset"));

connect();
