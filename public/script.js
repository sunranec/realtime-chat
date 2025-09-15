// ===== ЛОГИН =====
async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  if (data.success) {
    localStorage.setItem("user", username);
    window.location.href = "/chat.html";
  } else {
    document.getElementById("authMsg").innerText = data.error || "Login failed";
  }
}

// ===== РЕГИСТРАЦИЯ =====
async function register() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  const res = await fetch("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  if (data.success) {
    alert("✅ Registration successful, now login!");
  } else {
    document.getElementById("authMsg").innerText = data.error || "Registration failed";
  }
}

// ===== Привязка кнопок =====
document.getElementById("loginBtn")?.addEventListener("click", login);
document.getElementById("registerBtn")?.addEventListener("click", register);
