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

let users = {};       // активные пользователи
let messages = [];    // история сообщений

// === API ===
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, error: "Fill all fields" });
  if (users[username]) return res.json({ success: false, error: "User already online" });
  return res.json({ success: true });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, error: "Fill all fields" });
  return res.json({ success: true });
});

// === WebSocket ===
wss.on("connection", (ws) => {
  let currentUser = null;

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.type === "join") {
        currentUser = data.user;
        users[currentUser] = ws;

        broadcast({ type: "system", text: `👋 ${currentUser} joined the chat` });
        broadcast({ type: "users", users: Object.keys(users) });
        ws.send(JSON.stringify({ type: "history", messages }));
      }

      if (data.type === "message") {
        const newMsg = {
          user: data.user,
          text: data.text,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };
        messages.push(newMsg);
        broadcast({ type: "message", ...newMsg });
      }
    } catch (e) {
      console.error("❌ Error:", e);
    }
  });

  ws.on("close", () => {
    if (currentUser) {
      delete users[currentUser];
      broadcast({ type: "system", text: `❌ ${currentUser} left the chat` });
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
server.listen(PORT, () => console.log(`🚀 Running at http://localhost:${PORT}`));
