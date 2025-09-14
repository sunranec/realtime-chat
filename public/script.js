let ws;
let currentUser = null;

// Логин
function login() {
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value.trim();

  if (user && pass) {
    localStorage.setItem("user", user);
    currentUser = user;
    window.location.href = "/chat.html";
  } else {
    document.getElementById("authMsg").innerText = "Enter username & password";
  }
}

// Регистрация (фейковая, в БД уходит через сервер)
function register() {
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value.trim();

  if (user && pass) {
    localStorage.setItem("user", user);
    currentUser = user;
    window.location.href = "/chat.html";
  } else {
    document.getElementById("authMsg").innerText = "Fill all fields";
  }
}

// Выход
function logout() {
  localStorage.removeItem("user");
  currentUser = null;
  window.location.href = "/";
}

// Запуск чата
function startChat() {
  currentUser = localStorage.getItem("user");
  if (!currentUser) {
    window.location.href = "/";
    return;
  }

  // выбираем правильный протокол
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${protocol}://${window.location.host}`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "join", user: currentUser }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "history") {
      data.messages.forEach(m => addMessage(m.username, m.text, m.created_at));
    }

    if (data.type === "message") {
      addMessage(data.user, data.text, data.time);
    }

    if (data.type === "users") {
      updateUserList(data.list);
    }
  };

  const form = document.getElementById("chatForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("message");
    if (input.value.trim() !== "") {
      ws.send(JSON.stringify({ type: "message", user: currentUser, text: input.value }));
      input.value = "";
    }
  });
}

// Добавить сообщение в чат
function addMessage(user, text, time) {
  const messages = document.getElementById("messages");
  if (!messages) return;

  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");
  msgDiv.classList.add(user === currentUser ? "me" : "other");

  const userSpan = document.createElement("span");
  userSpan.className = "msg-user";
  userSpan.innerText = user;

  const textSpan = document.createElement("span");
  textSpan.className = "msg-text";
  textSpan.innerText = text;

  const timeSpan = document.createElement("span");
  timeSpan.className = "msg-time";
  timeSpan.innerText = formatTime(time);

  msgDiv.appendChild(userSpan);
  msgDiv.appendChild(textSpan);
  msgDiv.appendChild(timeSpan);

  messages.appendChild(msgDiv);
  messages.scrollTop = messages.scrollHeight;
}

// Формат времени
function formatTime(time) {
  if (!time) return "";
  const d = new Date(time);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
         " " +
         d.toLocaleDateString();
}

// Обновить список юзеров
function updateUserList(users) {
  const ul = document.getElementById("userList");
  if (!ul) return;
  ul.innerHTML = "";
  users.forEach(u => {
    const li = document.createElement("li");
    li.className = "user-online";
    li.innerText = u;
    ul.appendChild(li);
  });
}

// Автозапуск при заходе на chat.html
if (window.location.pathname.endsWith("chat.html")) {
  window.onload = startChat;
}
