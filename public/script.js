let ws;
const user = localStorage.getItem("user");
if (!user) {
  window.location.href = "/";
}

const messagesUl = document.getElementById("messages");
const usersUl = document.getElementById("users");

ws = new WebSocket(`ws://${window.location.host}`);

ws.onopen = () => {
  ws.send(JSON.stringify({ type: "join", user }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "users") {
    usersUl.innerHTML = "";
    data.users.forEach(u => {
      const li = document.createElement("li");
      li.textContent = u;
      usersUl.appendChild(li);
    });
  }

  if (data.type === "history") {
    messagesUl.innerHTML = "";
    data.messages.forEach(addMessage);
  }

  if (data.type === "message") {
    addMessage(data);
  }
};

function addMessage(msg) {
  const li = document.createElement("li");
  li.textContent = msg.user ? `${msg.user}: ${msg.text} (${msg.time})` : `${msg.text} (${msg.time})`;
  messagesUl.appendChild(li);
  messagesUl.scrollTop = messagesUl.scrollHeight;
}

document.getElementById("chatForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("message");
  if (input.value.trim()) {
    ws.send(JSON.stringify({
      type: "message",
      user,
      text: input.value,
      time: new Date().toLocaleTimeString()
    }));
    input.value = "";
  }
});

document.getElementById("logoutBtn").onclick = () => {
  localStorage.removeItem("user");
  ws.close();
  window.location.href = "/";
};
