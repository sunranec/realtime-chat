let ws;
let currentUser = null;

// подключение к WebSocket
function connectWS() {
  ws = new WebSocket(`wss://${window.location.host}`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "join", user: currentUser }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "history") {
      data.messages.forEach(addMessage);
    }

    if (data.type === "message") {
      addMessage(data);
    }

    if (data.type === "system") {
      addSystemMessage(data.text);
    }

    if (data.type === "users") {
      updateUserList(data.users);
    }
  };

  ws.onclose = () => {
    console.log("🔌 WebSocket закрыт");
  };
}

// добавление сообщений
function addMessage(msg) {
  const messages = document.getElementById("messages");
  const li = document.createElement("li");
  li.className = msg.user === currentUser ? "self" : "other";

  li.innerHTML = `
    <strong>${msg.user}</strong>: ${msg.text}
    <span class="time">${msg.time}</span>
  `;

  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

// добавление системных сообщений
function addSystemMessage(text) {
  const messages = document.getElementById("messages");
  const li = document.createElement("li");
  li.className = "system";
  li.innerHTML = `<em>${text}</em>`;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

// обновляем список пользователей
function updateUserList(users) {
  const list = document.getElementById("users");
  list.innerHTML = "";
  users.forEach((u) => {
    const li = document.createElement("li");
    li.textContent = u;
    li.onclick = () => {
      if (u === currentUser) {
        logout();
      }
    };
    list.appendChild(li);
  });
}

// отправка сообщений
document.getElementById("chatForm")?.addEventListener("submit", (e) => {
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

// эмодзи
document.querySelectorAll(".emoji-picker span")?.forEach((emoji) => {
  emoji.addEventListener("click", () => {
    const input = document.getElementById("message");
    input.value += emoji.textContent;
    input.focus();
  });
});

// logout
function logout() {
  localStorage.removeItem("user");
  window.location.href = "/";
}

// при загрузке страницы
window.onload = () => {
  const user = localStorage.getItem("user");
  if (user) {
    currentUser = user;
    connectWS();
  } else {
    if (!window.location.pathname.includes("index.html")) {
      window.location.href = "/";
    }
  }
};
