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

let users = {};    // {username: ws}
let messages = []; // история сообщений

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

        broadcast({ type: "users", users: Object.keys(users) });
        broadcast({ type: "system", text: `👋 ${currentUser} вошёл в чат` });

        ws.send(JSON.stringify({ type: "history", messages }));
      }

      if (data.type === "message") {
        const newMsg = {
          user: data.user,
          text: data.text,
          time: data.time,
        };
        messages.push(newMsg);
        broadcast({ type: "message", ...newMsg });
      }

      if (data.type === "image") {
        const newMsg = {
          user: data.user,
          image: data.image,
          time: data.time,
        };
        messages.push(newMsg);
        broadcast({ type: "image", ...newMsg });
      }

      // ==== WebRTC сигналы ====
      if (["call-offer", "call-answer", "ice-candidate"].includes(data.type)) {
        if (users[data.target]) {
          users[data.target].send(JSON.stringify(data));
        }
      }
    } catch (e) {
      console.error("Ошибка WS:", e);
    }
  });

  ws.on("close", () => {
    if (currentUser) {
      delete users[currentUser];
      broadcast({ type: "users", users: Object.keys(users) });
      broadcast({ type: "system", text: `❌ ${currentUser} вышел из чата` });
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
server.listen(PORT, () => console.log(`🚀 Сервер: http://localhost:${PORT}`));
