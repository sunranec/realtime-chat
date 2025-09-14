const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://chat_db_8f7z_user:lzkcXUHc5BcxwaD9J9byn42fWYKLT3T3@dpg-d33bo4ripnbc73drt900-a.oregon-postgres.render.com:5432/chat_db_8f7z",
  ssl: { rejectUnauthorized: false }
});

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, message: "Fill all fields" });
  try {
    const hashed = await bcrypt.hash(password, 10);
    await pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", [username, hashed]);
    res.json({ success: true });
  } catch (err) {
    if (err.code === "23505") {
      res.json({ success: false, message: "Username already exists" });
    } else {
      console.error(err);
      res.json({ success: false, message: "Registration failed" });
    }
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE username=$1", [username]);
    if (result.rows.length === 0) return res.json({ success: false, message: "User not found" });
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ success: false, message: "Wrong password" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Login failed" });
  }
});

let onlineUsers = new Set();

wss.on("connection", async (ws) => {
  console.log("✅ Новый клиент подключился");

  const result = await pool.query(
    "SELECT m.text, u.username, m.created_at FROM messages m JOIN users u ON m.user_id=u.id ORDER BY m.created_at ASC LIMIT 50"
  );
  ws.send(JSON.stringify({ type: "history", messages: result.rows }));

  ws.on("message", async (msg) => {
    const data = JSON.parse(msg);

    if (data.type === "join") {
      ws.username = data.user;
      onlineUsers.add(data.user);
      broadcast({ type: "users", list: Array.from(onlineUsers) });
    }

    if (data.type === "message") {
      const userRes = await pool.query("SELECT id FROM users WHERE username=$1", [data.user]);
      if (userRes.rows.length > 0) {
        const userId = userRes.rows[0].id;
        const res = await pool.query(
          "INSERT INTO messages (user_id, text) VALUES ($1, $2) RETURNING created_at",
          [userId, data.text]
        );
        const time = res.rows[0].created_at;
        broadcast({ type: "message", user: data.user, text: data.text, time });
      }
    }
  });

  ws.on("close", () => {
    if (ws.username) {
      onlineUsers.delete(ws.username);
      broadcast({ type: "users", list: Array.from(onlineUsers) });
    }
    console.log("❌ Клиент отключился");
  });
});

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
