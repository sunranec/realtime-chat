let ws;
let currentUser = null;

function showError(msg) {
  const el = document.getElementById("authMsg");
  if (el) el.innerText = msg;
}

function register() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  fetch("/register", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ username, password })
  }).then(res=>res.json()).then(data=>{
    if(data.success){ showError("✅ Registered! Now login."); }
    else { showError(data.message || "Registration failed"); }
  });
}

function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  fetch("/login", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ username, password })
  }).then(res=>res.json()).then(data=>{
    if(data.success){
      currentUser = username;
      localStorage.setItem("user", username);
      window.location.href = "chat.html";
    } else {
      showError(data.message || "Login failed");
    }
  });
}

function logout() {
  currentUser = null;
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

function startChat() {
  currentUser = localStorage.getItem("user");
  if(!currentUser){ window.location.href="index.html"; return; }

  ws = new const protocol = window.location.protocol === "https:" ? "wss" : "ws";(`ws://${window.location.host}`);
  ws.onopen = () => {
    ws.send(JSON.stringify({ type:"join", user:currentUser }));
  };
  ws.onmessage = (event)=>{
    const data = JSON.parse(event.data);
    if(data.type==="history"){
      const messages = document.getElementById("messages");
      messages.innerHTML="";
      data.messages.forEach(m=>addMessage(m.username,m.text,m.created_at));
    }
    if(data.type==="message"){
      addMessage(data.user, data.text, data.time);
    }
    if(data.type==="users"){
      updateUserList(data.list);
    }
  };
  document.getElementById("chatForm").addEventListener("submit", e=>{
    e.preventDefault();
    const input = document.getElementById("message");
    if(input.value.trim()!==""){
      ws.send(JSON.stringify({ type:"message", user:currentUser, text:input.value }));
      input.value="";
    }
  });
}

function addMessage(user,text,time){
  const messages=document.getElementById("messages");
  const div=document.createElement("div");
  div.className="message "+(user===currentUser?"me":"other");
  const now = time ? new Date(time) : new Date();
  const timeStr = now.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
  div.innerHTML = `<strong>${user}</strong><br>${text}<span class="timestamp">${timeStr}</span>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

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

if(document.body.classList.contains("chat-page")){
  startChat();
}
