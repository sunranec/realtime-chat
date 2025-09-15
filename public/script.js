let ws;
let currentUser = localStorage.getItem("user");

// ===== Подключение WebSocket =====
function connectWS() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${protocol}://${window.location.host}`);

  ws.onopen = () => {
    console.log("✅ Connected to server");
    ws.send(JSON.stringify({ type: "join", user: currentUser }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "history") {
      document.getElementById("messages").innerHTML = "";
      data.messages.forEach(addMessage);
    }

    if (data.type === "message") {
      addMessage(data);
    }

    if (data.type === "users") {
      updateUsers(data.users);
    }
  };
}

// ===== Функции входа / регистрации =====
async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  if (data.success) {
    localStorage.setItem("user", username);
    window.location.href = "/chat.html";
  } else {
    document.getElementById("authMsg").innerText = data.error || "Login failed";
  }
}

async function register() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  const res = await fetch("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  if (data.success) {
    alert("✅ Registration successful, now login!");
  } else {
    document.getElementById("authMsg").innerText = data.error || "Registration failed";
  }
}

// ===== Отправка сообщений =====
document.getElementById("chatForm")?.addEventListener("submit", function(e) {
  e.preventDefault();
  const input = document.getElementById("message");
  if (input.value.trim() !== "") {
    const msg = {
      type: "message",
      user: currentUser,
      text: input.value,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    ws.send(JSON.stringify(msg));
    input.value = "";
  }
});

// ===== Отрисовка сообщения =====
function addMessage(msg) {
  const messages = document.getElementById("messages");
  const div = document.createElement("div");

  div.classList.add("message");
  if (msg.user === currentUser) div.classList.add("me");

  div.innerHTML = `
    <span class="msg-user">${msg.user}</span>
    <span class="msg-text">${msg.text}</span>
    <span class="msg-time">${msg.time}</span>
  `;

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

// ===== Список онлайн пользователей =====
function updateUsers(users) {
  const list = document.getElementById("userList");
  if (!list) return;
  list.innerHTML = "";
  users.forEach(u => {
    const li = document.createElement("li");
    li.textContent = u;
    list.appendChild(li);
  });
}

// ===== События для кнопок Login/Register =====
document.getElementById("loginBtn")?.addEventListener("click", login);
document.getElementById("registerBtn")?.addEventListener("click", register);

// ===== Авто-подключение в чате =====
if (currentUser && window.location.pathname.includes("chat.html")) {
  connectWS();
}
