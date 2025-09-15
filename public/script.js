let ws;
let currentUser = localStorage.getItem("user");

// ====== Подключение WS ======
function connectWS() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${protocol}://${window.location.host}`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "join", user: currentUser }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "history") {
      document.getElementById("messages").innerHTML = "";
      data.messages.forEach(addMessage);
    }
    if (data.type === "message") addMessage(data);
    if (data.type === "users") updateUsers(data.users);
  };
}

// ====== Login/Register ======
async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const res = await fetch("/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.success) {
    localStorage.setItem("user", username);
    window.location.href = "/chat.html";
  } else {
    document.getElementById("authMsg").innerText = data.error;
  }
}

async function register() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const res = await fetch("/register", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.success) alert("✅ Registration successful, now login!");
  else document.getElementById("authMsg").innerText = data.error;
}

document.getElementById("loginBtn")?.addEventListener("click", login);
document.getElementById("registerBtn")?.addEventListener("click", register);

// ====== Отправка сообщений ======
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

function addMessage(msg) {
  const messages = document.getElementById("messages");
  const div = document.createElement("div");
  div.classList.add("message");
  if (msg.user === currentUser) div.classList.add("me");

  div.innerHTML = `
    <span class="msg-user">${msg.user}</span>:
    <span class="msg-text">${msg.text}</span>
    <span class="msg-time">${msg.time || ""}</span>
  `;

  if (msg.image) {
    div.innerHTML += `<br><img src="${msg.image}" style="max-width:200px;border-radius:5px;">`;
  }

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

// ====== Эмодзи ======
const emojiPanel = document.getElementById("emojiPanel");
document.getElementById("emojiBtn")?.addEventListener("click", () => {
  emojiPanel.style.display = emojiPanel.style.display === "flex" ? "none" : "flex";
});

const emojis = ["😀","😁","😂","🤣","😍","😘","😎","😢","😡","👍","🙏","💔","🔥","❤️","🎉","✅","⚡"];
emojis.forEach(e => {
  const span = document.createElement("span");
  span.textContent = e;
  span.onclick = () => {
    document.getElementById("message").value += e;
  };
  emojiPanel?.appendChild(span);
});

// ====== Фото ======
document.getElementById("uploadBtn")?.addEventListener("click", () => {
  document.getElementById("fileInput").click();
});

document.getElementById("fileInput")?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const msg = { type: "message", user: currentUser, image: reader.result, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    ws.send(JSON.stringify(msg));
  };
  reader.readAsDataURL(file);
});

// ====== Список пользователей ======
function updateUsers(users) {
  const list = document.getElementById("userList");
  list.innerHTML = "";
  users.forEach(u => {
    const li = document.createElement("li");
    li.textContent = u;
    li.onclick = () => alert("🔔 Open chat with " + u);
    list.appendChild(li);
  });
}

// ====== Автоподключение ======
if (currentUser && window.location.pathname.includes("chat.html")) {
  connectWS();
}
