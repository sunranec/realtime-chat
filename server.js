const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");
const bodyParser = require("body-parser");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

let users = {}; // {username: ws}
let messages = [];

// ===== API =====
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, error: "Fill all fields" });
  return res.json({ success: true });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, error: "Fill all fields" });
  return res.json({ success: true });
});

// ===== WebSocket =====
wss.on("connection", (ws) => {
  let currentUser = null;

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.type === "join") {
        currentUser = data.user;
        users[currentUser] = ws;

        const systemMsg = { user: "System", text: `✅ ${currentUser} joined the chat`, time: new Date().toLocaleTimeString() };
        messages.push(systemMsg);
        broadcast({ type: "message", ...systemMsg });

        broadcast({ type: "users", users: Object.keys(users) });
        ws.send(JSON.stringify({ type: "history", messages }));
      }

      if (data.type === "message") {
        const newMsg = { user: data.user, text: data.text, time: data.time };
        messages.push(newMsg);
        broadcast({ type: "message", ...newMsg });
      }

      if (data.type === "image") {
        const newMsg = { user: data.user, image: data.image, time: data.time };
        messages.push(newMsg);
        broadcast({ type: "image", ...newMsg });
      }

      // 📞 WebRTC signaling
      if (data.type === "signal" && data.to) {
        if (users[data.to]) {
          users[data.to].send(JSON.stringify({
            type: "signal",
            from: currentUser,
            signal: data.signal
          }));
        }
      }
    } catch (e) {
      console.error("❌ Error:", e);
    }
  });

  ws.on("close", () => {
    if (currentUser) {
      delete users[currentUser];
      broadcast({ type: "users", users: Object.keys(users) });
    }
  });
});

function broadcast(data) {
  const json = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(json);
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
