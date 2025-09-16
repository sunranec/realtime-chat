let ws;
let currentUser = null;

function connectWS() {
  ws = new WebSocket(`wss://${window.location.host}`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "join", user: currentUser }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "history") data.messages.forEach(addMessage);
    if (data.type === "message") addMessage(data);
    if (data.type === "image") addImageMessage(data);
    if (data.type === "system") addSystemMessage(data.text);
    if (data.type === "users") updateUserList(data.users);
    if (data.type === "clear") clearChatUI();
  };
}

function addMessage(msg) {
  const li = document.createElement("li");
  li.className = msg.user === currentUser ? "self" : "other";
  li.innerHTML = `<strong>${msg.user}</strong>: ${msg.text}
                  <span class="time">${msg.time}</span>`;
  document.getElementById("messages").appendChild(li);
}

function addImageMessage(msg) {
  const li = document.createElement("li");
  li.className = msg.user === currentUser ? "self" : "other";
  li.innerHTML = `<strong>${msg.user}</strong>: <br><img src="${msg.image}" class="chat-image"/>
                  <span class="time">${msg.time}</span>`;
  document.getElementById("messages").appendChild(li);
}

function addSystemMessage(text) {
  const li = document.createElement("li");
  li.className = "system";
  li.innerHTML = `<em>${text}</em>`;
  document.getElementById("messages").appendChild(li);
}

function updateUserList(users) {
  const list = document.getElementById("users");
  list.innerHTML = "";
  users.forEach(u => {
    const li = document.createElement("li");
    li.textContent = u;
    if (u === currentUser) li.onclick = logout;
    list.appendChild(li);
  });
}

function clearChatUI() {
  document.getElementById("messages").innerHTML = "";
}

document.getElementById("chatForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("message");
  if (input.value.trim() !== "") {
    ws.send(JSON.stringify({
      type: "message",
      user: currentUser,
      text: input.value,
      time: new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})
    }));
    input.value = "";
  }
});

document.getElementById("imageInput")?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    ws.send(JSON.stringify({
      type: "image",
      user: currentUser,
      image: reader.result,
      time: new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})
    }));
  };
  reader.readAsDataURL(file);
});

document.querySelectorAll(".emoji-picker span")?.forEach(emoji => {
  emoji.addEventListener("click", () => {
    const input = document.getElementById("message");
    input.value += emoji.textContent;
    input.focus();
  });
});

document.getElementById("clearBtn")?.addEventListener("click", () => {
  if (confirm("Очистить весь чат?")) {
    ws.send(JSON.stringify({ type: "clear" }));
  }
});

function logout() {
  localStorage.removeItem("user");
  window.location.href = "/";
}

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
