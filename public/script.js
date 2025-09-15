let ws;
let currentUser = null;

// ===== ЛОГИН =====
async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
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
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (data.success) {
    alert("✅ Registration successful, now login!");
  } else {
    document.getElementById("authMsg").innerText = data.error || "Registration failed";
  }
}

// ===== ЛОГАУТ =====
function logout() {
  localStorage.removeItem("user");
  window.location.href = "/";
}

// ===== ЧАТ =====
function startChat() {
  currentUser = localStorage.getItem("user");
  if (!currentUser) {
    window.location.href = "/";
    return;
  }

  ws = new WebSocket(`wss://${window.location.host}`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "join", user: currentUser }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "history") {
      data.messages.forEach((m) => addMessage(m.user, m.text, m.time));
    }

    if (data.type === "message") {
      addMessage(data.user, data.text, data.time);
    }

    if (data.type === "users") {
      updateUsers(data.users);
    }
  };

  document.getElementById("chatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("message");
    if (input.value.trim() !== "") {
      const msg = {
        type: "message",
        user: currentUser,
        text: input.value,
        time:
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
          " " +
          new Date().toLocaleDateString(),
      };
      ws.send(JSON.stringify(msg));
      input.value = "";
    }
  });

  // ===== ЭМОДЗИ =====
  document.getElementById("emojiBtn")?.addEventListener("click", () => {
    const picker = document.getElementById("emojiPicker");
    picker.style.display = picker.style.display === "block" ? "none" : "block";
  });

  document.querySelectorAll(".emoji-picker span").forEach((el) => {
    el.addEventListener("click", () => {
      const input = document.getElementById("message");
      input.value += el.innerText;
      input.focus();
    });
  });
}

// ===== ДОБАВЛЕНИЕ СООБЩЕНИЙ =====
function addMessage(user, text, time) {
  const messages = document.getElementById("messages");

  const div = document.createElement("div");
  div.classList.add("message");
  if (user === currentUser) div.classList.add("me");

  div.innerHTML = `
    <span class="msg-user">${user}</span>
    <span class="msg-text">${text}</span>
    <span class="msg-time">${time}</span>
  `;

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

// ===== ОБНОВЛЕНИЕ СПИСКА ЮЗЕРОВ =====
function updateUsers(users) {
  const list = document.getElementById("userList");
  list.innerHTML = "";
  users.forEach((u) => {
    const li = document.createElement("li");
    li.textContent = u;
    list.appendChild(li);
  });
}
