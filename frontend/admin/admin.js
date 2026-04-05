/* global getToken, setSession, api, notify, notifyToast, startActivityHeartbeat */

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}

async function loadStats() {
  const s = await api("/admin/stats");
  document.getElementById("st-users").textContent = s.users?.total ?? "—";
  document.getElementById("st-appts").textContent = s.appointments ?? "—";
  document.getElementById("st-proj").textContent = s.activeProjects ?? "—";
}

async function loadUsers() {
  const role = document.getElementById("filter-role").value;
  const q = role ? `?role=${encodeURIComponent(role)}` : "";
  const users = await api(`/users/admin/users${q}`);
  const el = document.getElementById("user-table");
  let html =
    "<table><thead><tr><th>ID (for doctors)</th><th>Email</th><th>Role</th><th>Name</th><th>Active</th><th>Actions</th></tr></thead><tbody>";
  users.forEach((u) => {
    const id = String(u._id);
    html += `<tr data-id="${esc(id)}">
      <td><code style="font-size:0.75rem">${esc(id)}</code></td>
      <td>${esc(u.email)}</td>
      <td>${esc(u.role)}</td>
      <td>${esc(u.name || "")}</td>
      <td>${u.isActive ? "yes" : "no"}</td>
      <td class="flex gap-1 flex-wrap">
        <button type="button" class="btn btn--ghost btn--sm" data-edit="${esc(u._id)}">Toggle active</button>
        <button type="button" class="btn btn--danger btn--sm" data-del="${esc(u._id)}">Delete</button>
      </td>
    </tr>`;
  });
  html += "</tbody></table>";
  el.innerHTML = html;

  el.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-edit");
      const row = users.find((x) => x._id === id);
      if (!row) return;
      try {
        await api(`/users/admin/users/${id}`, {
          method: "PATCH",
          body: { isActive: !row.isActive },
        });
        notifyToast("User updated", "success");
        loadUsers();
        loadStats();
      } catch (e) {
        notify(e.message, "error");
      }
    });
  });

  el.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      if (!window.confirm("Delete this user?")) return;
      try {
        await api(`/users/admin/users/${id}`, { method: "DELETE" });
        notifyToast("Deleted", "success");
        loadUsers();
        loadStats();
      } catch (e) {
        notify(e.message, "error");
      }
    });
  });
}

async function loadUploads() {
  const list = await api("/health/admin/all");
  const el = document.getElementById("upload-table");
  if (!list.length) {
    el.innerHTML = "<p style='color:var(--muted)'>No uploads.</p>";
    return;
  }
  let html =
    "<table><thead><tr><th>Patient</th><th>Label</th><th>When</th><th></th></tr></thead><tbody>";
  list.forEach((u) => {
    const p = u.patient && typeof u.patient === "object" ? u.patient.email : "";
    html += `<tr><td>${esc(p)}</td><td>${esc(u.label)}</td><td>${esc(
      new Date(u.createdAt).toLocaleString()
    )}</td><td><button type="button" class="btn btn--danger btn--sm" data-del-up="${esc(
      u._id
    )}">Delete</button></td></tr>`;
  });
  html += "</tbody></table>";
  el.innerHTML = html;
  el.querySelectorAll("[data-del-up]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del-up");
      if (!window.confirm("Remove this upload?")) return;
      try {
        await api(`/health/${id}`, { method: "DELETE" });
        notifyToast("Removed", "success");
        loadUploads();
      } catch (e) {
        notify(e.message, "error");
      }
    });
  });
}

function showSection(id) {
  document.querySelectorAll(".main-content > section").forEach((s) => s.classList.add("hidden"));
  const map = { stats: "sec-stats", users: "sec-users", uploads: "sec-uploads", reports: "sec-reports" };
  const sec = document.getElementById(map[id]);
  if (sec) sec.classList.remove("hidden");
  document.querySelectorAll(".sidebar a").forEach((a) => {
    a.classList.toggle("is-active", a.getAttribute("data-section") === id);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!getToken()) {
    window.location.href = "/";
    return;
  }
  startActivityHeartbeat();

  document.getElementById("sidebar-toggle").addEventListener("click", () => {
    document.getElementById("dashboard").classList.toggle("sidebar-open");
  });

  document.getElementById("btn-logout").addEventListener("click", () => {
    setSession(null, null);
    window.location.href = "/";
  });

  document.querySelectorAll(".sidebar a[data-section]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      showSection(a.getAttribute("data-section"));
    });
  });

  const token = getToken();
  document.getElementById("link-csv").addEventListener("click", (e) => {
    e.preventDefault();
    fetch("/api/admin/export/csv", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error("Export failed");
        return r.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "report-mock.csv";
        a.click();
        URL.revokeObjectURL(url);
        notifyToast("Download started", "success");
      })
      .catch(() => notify("Export failed", "error"));
  });

  try {
    const me = await api("/auth/me");
    if (me.role !== "admin") {
      notify("Admin only.", "error");
      window.location.href = "/";
      return;
    }
    await loadStats();
    await loadUsers();
    await loadUploads();
  } catch (e) {
    if (e.status === 401) {
      setSession(null, null);
      window.location.href = "/";
      return;
    }
    notify(e.message || "Load failed", "error");
  }

  document.getElementById("btn-refresh-users").addEventListener("click", () =>
    loadUsers().catch((err) => notify(err.message, "error"))
  );
  document.getElementById("filter-role").addEventListener("change", () =>
    loadUsers().catch((err) => notify(err.message, "error"))
  );

  document.getElementById("form-user").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/users/admin/users", {
        method: "POST",
        body: {
          email: document.getElementById("cu-email").value.trim(),
          password: document.getElementById("cu-password").value,
          role: document.getElementById("cu-role").value,
          name: document.getElementById("cu-name").value.trim(),
          specialization: document.getElementById("cu-spec").value.trim(),
          phone: document.getElementById("cu-phone").value.trim(),
        },
      });
      notifyToast("User created", "success");
      e.target.reset();
      loadUsers();
      loadStats();
    } catch (err) {
      notify(err.message, "error");
    }
  });

  document.getElementById("btn-refresh-uploads").addEventListener("click", () =>
    loadUploads().catch((err) => notify(err.message, "error"))
  );

  showSection("stats");
});
