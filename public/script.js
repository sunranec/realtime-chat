let ws;
let currentUser = localStorage.getItem("user");
let pc; // WebRTC PeerConnection

// WebSocket подключение
function initSocket() {
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

    if (data.type === "image") {
      addMessage(data);
    }

    if (data.type === "users") {
      updateUsers(data.users);
    }

    if (data.type === "signal") {
      handleSignal(data);
    }
  };
}

// Обновление списка пользователей
function updateUsers(users) {
  const ul = document.getElementById("users");
  ul.innerHTML = "";
  users.forEach(u => {
    if (u !== currentUser) {
      const li = document.createElement("li");
      li.textContent = u;
      li.onclick = () => startCall(u);
      ul.appendChild(li);
    }
  });
}

// Добавление сообщений
function addMessage(msg) {
  const li = document.createElement("li");
  li.className = msg.user === currentUser ? "self" : "other";
  if (msg.text) li.textContent = `${msg.user}: ${msg.text} (${msg.time})`;
  if (msg.image) {
    const img = document.createElement("img");
    img.src = msg.image;
    img.style.maxWidth = "150px";
    li.appendChild(img);
  }
  document.getElementById("messages").appendChild(li);
}

// Отправка текста
document.getElementById("sendBtn").onclick = () => {
  const input = document.getElementById("message");
  if (input.value.trim() !== "") {
    const msg = { type: "message", user: currentUser, text: input.value, time: new Date().toLocaleTimeString() };
    ws.send(JSON.stringify(msg));
    input.value = "";
  }
};

// Отправка изображения
document.getElementById("imageInput").addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const msg = { type: "image", user: currentUser, image: reader.result, time: new Date().toLocaleTimeString() };
    ws.send(JSON.stringify(msg));
  };
  reader.readAsDataURL(file);
});

// 📞 WebRTC
async function startCall(targetUser) {
  pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({ type: "signal", to: targetUser, signal: { candidate: event.candidate } }));
    }
  };

  pc.ontrack = (event) => {
    document.getElementById("remoteVideo").srcObject = event.streams[0];
  };

  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  document.getElementById("localVideo").srcObject = stream;
  stream.getTracks().forEach(track => pc.addTrack(track, stream));

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  ws.send(JSON.stringify({ type: "signal", to: targetUser, signal: { sdp: pc.localDescription } }));

  document.getElementById("callBtn").classList.add("hidden");
  document.getElementById("endCallBtn").classList.remove("hidden");
}

async function handleSignal(data) {
  if (!pc) {
    pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        ws.send(JSON.stringify({ type: "signal", to: data.from, signal: { candidate: event.candidate } }));
      }
    };

    pc.ontrack = (event) => {
      document.getElementById("remoteVideo").srcObject = event.streams[0];
    };

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById("localVideo").srcObject = stream;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
  }

  if (data.signal.sdp) {
    await pc.setRemoteDescription(new RTCSessionDescription(data.signal.sdp));
    if (data.signal.sdp.type === "offer") {
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send(JSON.stringify({ type: "signal", to: data.from, signal: { sdp: pc.localDescription } }));
    }
  }

  if (data.signal.candidate) {
    await pc.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
  }
}

// Завершение звонка
document.getElementById("endCallBtn").onclick = () => {
  if (pc) {
    pc.close();
    pc = null;
  }
  document.getElementById("localVideo").srcObject = null;
  document.getElementById("remoteVideo").srcObject = null;
  document.getElementById("endCallBtn").classList.add("hidden");
  document.getElementById("callBtn").classList.remove("hidden");
};

// Запуск
initSocket();
