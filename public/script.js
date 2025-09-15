let ws;
let currentUser = localStorage.getItem("user");

// ===== Автоматический выбор протокола =====
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

// ===== Список юзеров =====
function updateUsers(users) {
  const list = document.getElementById("userList");
  list.innerHTML = "";
  users.forEach(u => {
    const li = document.createElement("li");
    li.innerHTML = `
      <img src="https://api.dicebear.com/7.x/identicon/svg?seed=${u}" alt="avatar">
      <span>${u}</span>
    `;
    list.appendChild(li);
  });
}

// ===== Отправка формы =====
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

// ===== Подключаемся, если юзер авторизован =====
if (currentUser) {
  connectWS();
}
