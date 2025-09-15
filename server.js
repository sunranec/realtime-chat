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

let users = {};       // активные пользователи {username: ws}
let messages = [];    // история сообщений

// ===== API для логина/регистрации (простая имитация) =====
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ success: false, error: "Fill all fields" });
  }
  // в реальном проекте здесь должна быть база данных
  if (users[username]) {
    return res.json({ success: false, error: "User already online" });
  }
  return res.json({ success: true });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ success: false, error: "Fill all fields" });
  }
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

        // обновляем список онлайн юзеров
        broadcast({ type: "users", users: Object.keys(users) });

        // отправляем историю сообщений новому юзеру
        ws.send(JSON.stringify({ type: "history", messages }));
      }

      if (data.type === "message") {
        const newMsg = {
          user: data.user,
          text: data.text,
          time: data.time,
        };
        messages.push(newMsg);

        // рассылаем всем
        broadcast({ type: "message", ...newMsg });
      }
    } catch (e) {
      console.error("❌ Ошибка обработки сообщения:", e);
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
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});
