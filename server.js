const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Подключение к PostgreSQL через переменные окружения
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());

// Регистрация
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });

  try {
    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2)",
      [username, hashed]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Ошибка регистрации:", err);
    res.status(500).json({ error: "User already exists" });
  }
});

// Логин
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE username=$1", [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, result.rows[0].password);
    if (!valid) return res.status(401).json({ error: "Invalid password" });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Ошибка логина:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Список онлайн-юзеров
let onlineUsers = [];

// WebSocket логика
wss.on("connection", async (ws) => {
  console.log("✅ Новый клиент подключился");

  // Отправляем историю сообщений из БД
  const result = await pool.query(
    "SELECT m.text, m.created_at, u.username FROM messages m JOIN users u ON m.user_id = u.id ORDER BY m.created_at ASC LIMIT 50"
  );
  ws.send(JSON.stringify({ type: "history", messages: result.rows }));

  ws.on("message", async (msg) => {
    try {
      const data = JSON.parse(msg.toString());

      if (data.type === "join") {
        if (!onlineUsers.includes(data.user)) onlineUsers.push(data.user);
        broadcast({ type: "users", list: onlineUsers });
      }

      if (data.type === "message") {
        const userRes = await pool.query("SELECT id FROM users WHERE username=$1", [data.user]);
        if (userRes.rows.length > 0) {
          await pool.query("INSERT INTO messages (user_id, text) VALUES ($1, $2)", [
            userRes.rows[0].id,
            data.text
          ]);
        }

        broadcast({ type: "message", user: data.user, text: data.text, time: new Date() });
      }
    } catch (err) {
      console.error("Ошибка WS:", err);
    }
  });

  ws.on("close", () => {
    console.log("❌ Клиент отключился");
  });
});

// Функция для рассылки всем
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});
