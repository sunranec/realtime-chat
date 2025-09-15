let ws;
const messagesUl = document.getElementById("messages");
const usersUl = document.getElementById("users");
const emojiPicker = document.getElementById("emojiPicker");

const user = localStorage.getItem("user");
if (!user) window.location.href = "/";

ws = new WebSocket(`wss://${window.location.host}`);
ws.onopen = () => ws.send(JSON.stringify({ type: "join", user }));

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

  if (data.type === "history") data.messages.forEach(addMessage);
  if (data.type === "message" || data.type === "system") addMessage(data);
  if (data.type === "image") addImage(data);
};

function addMessage(msg) {
  const li = document.createElement("li");
  li.textContent = msg.user ? `${msg.user}: ${msg.text} (${msg.time})` : `${msg.text} (${msg.time})`;
  messagesUl.appendChild(li);
  messagesUl.scrollTop = messagesUl.scrollHeight;
}

function addImage(msg) {
  const li = document.createElement("li");
  li.innerHTML = `<b>${msg.user}</b>: <br><img src="${msg.image}" width="150"><br><small>${msg.time}</small>`;
  messagesUl.appendChild(li);
  messagesUl.scrollTop = messagesUl.scrollHeight;
}

document.getElementById("chatForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("message");
  if (input.value.trim()) {
    ws.send(JSON.stringify({ type: "message", user, text: input.value }));
    input.value = "";
  }
});

document.getElementById("logoutBtn").onclick = () => {
  localStorage.removeItem("user");
  ws.close();
  window.location.href = "/";
};

// ==== Emoji Picker ====
function toggleEmoji() {
  if (emojiPicker.style.display === "block") {
    emojiPicker.style.display = "none";
  } else {
    emojiPicker.style.display = "block";
    loadEmojis();
  }
}
function loadEmojis() {
  if (emojiPicker.innerHTML) return;
  const emojis = ["😀","😂","😍","😎","😭","😡","👍","👎","🙏","🔥","❤️","🎉","👌","💯"];
  emojis.forEach(e => {
    const span = document.createElement("span");
    span.textContent = e;
    span.style.cursor = "pointer";
    span.onclick = () => {
      document.getElementById("message").value += e;
    };
    emojiPicker.appendChild(span);
  });
}

// ==== File Upload ====
document.getElementById("fileInput").addEventListener("change", function() {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    ws.send(JSON.stringify({ type: "image", user, image: reader.result }));
  };
  reader.readAsDataURL(file);
});
