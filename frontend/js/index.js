/* global getToken, setSession, api, notify, notifyToast, toggleTheme */

function redirectForRole(role) {
  if (role === "admin") window.location.href = "/admin/dashboard.html";
  else if (role === "doctor") window.location.href = "/doctor/dashboard.html";
  else window.location.href = "/patient/dashboard.html";
}

document.addEventListener("DOMContentLoaded", () => {
  if (getToken()) {
    api("/auth/me")
      .then((u) => redirectForRole(u.role))
      .catch(() => {});
  }

  const tabs = document.querySelectorAll(".auth-tabs [data-tab]");
  const panels = {
    login: document.getElementById("panel-login"),
    register: document.getElementById("panel-register"),
  };

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-tab");
      tabs.forEach((b) => b.classList.toggle("is-active", b === btn));
      Object.keys(panels).forEach((k) => {
        panels[k].classList.toggle("is-active", k === id);
      });
    });
  });

  let otpChallengeToken = null;

  function showFieldError(inputId, msg) {
    const el = document.querySelector(`[data-error-for="${inputId}"]`);
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.classList.remove("hidden");
    } else {
      el.textContent = "";
      el.classList.add("hidden");
    }
  }

  document.getElementById("form-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    showFieldError("login-email");
    showFieldError("login-password");
    const fd = new FormData(e.target);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    if (!email) return showFieldError("login-email", "Email required");
    if (password.length < 8) return showFieldError("login-password", "Min 8 characters");

    try {
      const data = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }).then((r) => r.json().then((j) => ({ ok: r.ok, status: r.status, ...j })));

      if (!data.ok) {
        notify(data.message || "Login failed", "error");
        return;
      }
      if (data.needsOtp) {
        otpChallengeToken = data.otpChallengeToken;
        document.getElementById("otp-section").classList.remove("hidden");
        notifyToast("Check server console for OTP", "info");
        return;
      }
      setSession(data.token, data.user);
      notifyToast("Signed in", "success");
      redirectForRole(data.user.role);
    } catch {
      notify("Network error", "error");
    }
  });

  document.getElementById("form-otp").addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = document.getElementById("otp-code").value.trim();
    if (!otpChallengeToken) {
      notify("Login first", "error");
      return;
    }
    try {
      const data = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpChallengeToken, code }),
      }).then((r) => r.json().then((j) => ({ ok: r.ok, ...j })));
      if (!data.ok) {
        notify(data.message || "Invalid OTP", "error");
        return;
      }
      setSession(data.token, data.user);
      redirectForRole(data.user.role);
    } catch {
      notify("Network error", "error");
    }
  });

  document.getElementById("form-register").addEventListener("submit", async (e) => {
    e.preventDefault();
    showFieldError("reg-email");
    showFieldError("reg-password");
    const fd = new FormData(e.target);
    const body = {
      email: String(fd.get("email") || "").trim(),
      password: String(fd.get("password") || ""),
      name: String(fd.get("name") || "").trim(),
    };
    if (!body.email) return showFieldError("reg-email", "Email required");
    if (body.password.length < 8) return showFieldError("reg-password", "Min 8 characters");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.message || "Registration failed", "error");
        return;
      }
      setSession(data.token, data.user);
      notifyToast("Account created", "success");
      redirectForRole(data.user.role);
    } catch {
      notify("Network error", "error");
    }
  });
});
