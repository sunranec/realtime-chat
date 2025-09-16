const ws = new WebSocket(
  (location.protocol === "https:" ? "wss://" : "ws://") + window.location.host
);

let currentUser = localStorage.getItem("user");
if (!currentUser) {
  window.location.href = "/";
}

const messagesEl = document.getElementById("messages");
const usersEl = document.getElementById("users");
const input = document.getElementById("message");
const sendBtn = document.getElementById("sendBtn");
const emojiBtn = document.getElementById("emojiBtn");
const emojiPicker = document.getElementById("emojiPicker");
const imageInput = document.getElementById("imageInput");
const logoutBtn = document.getElementById("logoutBtn");

const callUI = document.getElementById("callUI");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const endCallBtn = document.getElementById("endCallBtn");

let pc = null;

// ===== Эмодзи =====
const emojis = ["😀","😁","😂","🤣","😅","😊","😍","😘","😎","🤔","😢","😭","😡","👍","👎","🙏","💪","👏","🔥","❤️"];
emojis.forEach(e => {
  const span = document.createElement("span");
  span.textContent = e;
  span.addEventListener("click", () => {
    input.value += e;
    emojiPicker.classList.add("hidden");
  });
  emojiPicker.appendChild(span);
});
emojiBtn.addEventListener("click", () => {
  emojiPicker.classList.toggle("hidden");
});

// ===== Отправка сообщения =====
sendBtn.addEventListener("click", () => {
  if (input.value.trim() !== "") {
    const msg = {
      type: "message",
      user: currentUser,
      text: input.value,
      time: new Date().toLocaleTimeString(),
    };
    ws.send(JSON.stringify(msg));
    input.value = "";
  }
});

// ===== Картинки =====
imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    ws.send(
      JSON.stringify({
        type: "image",
        user: currentUser,
        image: reader.result,
        time: new Date().toLocaleTimeString(),
      })
    );
  };
  reader.readAsDataURL(file);
});

// ===== Logout =====
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("user");
  location.href = "/";
});

// ===== WebSocket =====
ws.onopen = () => {
  ws.send(JSON.stringify({ type: "join", user: currentUser }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "users") {
    usersEl.innerHTML = "";
    data.users.forEach((u) => {
      const li = document.createElement("li");
      li.textContent = u;
      if (u !== currentUser) {
        li.addEventListener("click", () => startCall(u));
      }
      usersEl.appendChild(li);
    });
  }

  if (data.type === "history") {
    data.messages.forEach((m) => renderMessage(m));
  }

  if (data.type === "message" || data.type === "image") {
    renderMessage(data);
  }

  if (data.type === "system") {
    renderSystemMessage(data.text);
  }

  // ==== WebRTC сигналы ====
  if (data.type === "call-offer") {
    handleOffer(data);
  }
  if (data.type === "call-answer") {
    handleAnswer(data);
  }
  if (data.type === "ice-candidate") {
    handleCandidate(data);
  }
};

// ===== Рендер сообщений =====
function renderMessage(m) {
  const li = document.createElement("li");
  if (m.text) {
    li.innerHTML = `<b>${m.user}</b>: ${m.text} <span class="time">${m.time}</span>`;
  } else if (m.image) {
    li.innerHTML = `<b>${m.user}</b>: <img src="${m.image}" class="chat-img"/> <span class="time">${m.time}</span>`;
  }
  messagesEl.appendChild(li);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderSystemMessage(text) {
  const li = document.createElement("li");
  li.className = "system";
  li.textContent = text;
  messagesEl.appendChild(li);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ===== WebRTC звонки =====
async function startCall(target) {
  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({ type: "ice-candidate", target, candidate: event.candidate }));
    }
  };

  pc.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  localVideo.srcObject = stream;

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  ws.send(JSON.stringify({ type: "call-offer", target, offer }));
  callUI.classList.remove("hidden");
}

async function handleOffer(data) {
  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({ type: "ice-candidate", target: data.user, candidate: event.candidate }));
    }
  };

  pc.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  localVideo.srcObject = stream;

  await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  ws.send(JSON.stringify({ type: "call-answer", target: data.user, answer }));
  callUI.classList.remove("hidden");
}

async function handleAnswer(data) {
  await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
}

async function handleCandidate(data) {
  try {
    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
  } catch (err) {
    console.error("Error adding candidate:", err);
  }
}

endCallBtn.addEventListener("click", () => {
  if (pc) {
    pc.close();
    pc = null;
  }
  callUI.classList.add("hidden");
});
