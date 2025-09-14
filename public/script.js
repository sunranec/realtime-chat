let ws;
let currentUser = localStorage.getItem("user");

// Выход
function logout() {
  localStorage.removeItem("user");
  currentUser = null;
  window.location.href = "/";
}

// Запуск чата
function startChat() {
  if (!currentUser) {
    window.location.href = "/";
    return;
  }

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
  const input = document.getElementById("message");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage();
  });

  // Отправка при Enter, перенос строки при Shift+Enter
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  function sendMessage() {
    if (input.value.trim() !== "") {
      ws.send(JSON.stringify({ type: "message", user: currentUser, text: input.value }));
      input.value = "";
    }
  }
}

// Добавить сообщение
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

// Работа со смайлами
function toggleEmojiPicker() {
  const picker = document.getElementById("emojiPicker");
  picker.style.display = picker.style.display === "block" ? "none" : "block";
}

document.addEventListener("click", (event) => {
  const picker = document.getElementById("emojiPicker");
  const button = document.querySelector(".emoji-btn");
  if (picker && picker.style.display === "block" && !picker.contains(event.target) && !button.contains(event.target)) {
    picker.style.display = "none";
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const picker = document.getElementById("emojiPicker");
  if (picker) {
    picker.querySelectorAll("span, div").forEach(el => {
      el.addEventListener("click", () => {
        const input = document.getElementById("message");
        input.value += el.textContent;
        input.focus();
      });
    });
  }
});

// Автозапуск чата
if (window.location.pathname.endsWith("chat.html")) {
  window.onload = startChat;
}
