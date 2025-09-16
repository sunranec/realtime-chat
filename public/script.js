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
    if (data.type === "system") addSystemMessage(data.text);
    if (data.type === "users") updateUserList(data.users);
  };
}

function addMessage(msg) {
  const li = document.createElement("li");
  li.className = msg.user === currentUser ? "self" : "other";
  li.innerHTML = `<strong>${msg.user}</strong>: ${msg.text}
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

document.querySelectorAll(".emoji-picker span")?.forEach(emoji => {
  emoji.addEventListener("click", () => {
    const input = document.getElementById("message");
    input.value += emoji.textContent;
    input.focus();
  });
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
