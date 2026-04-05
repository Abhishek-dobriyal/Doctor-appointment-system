/* global getToken, setSession, api, notify, notifyToast, startActivityHeartbeat */

function requireDoctor() {
  if (!getToken()) {
    window.location.href = "/";
    return false;
  }
  return true;
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}

function badgeClass(status) {
  const m = { pending: "pending", accepted: "accepted", rejected: "rejected", completed: "completed" };
  return m[status] || "pending";
}

function addAvailRow(day = 1, start = 540, end = 1020) {
  const wrap = document.getElementById("avail-rows");
  const row = document.createElement("div");
  row.className = "flex gap-1 flex-wrap mt-1";
  row.innerHTML = `
    <select class="av-day" style="max-width:120px">
      ${[0, 1, 2, 3, 4, 5, 6]
        .map(
          (d) =>
            `<option value="${d}" ${d === day ? "selected" : ""}>${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]}</option>`
        )
        .join("")}
    </select>
    <input class="av-start" type="number" placeholder="start min" value="${start}" style="max-width:110px" />
    <input class="av-end" type="number" placeholder="end min" value="${end}" style="max-width:110px" />
    <button type="button" class="btn btn--danger btn--sm av-remove">✕</button>`;
  row.querySelector(".av-remove").addEventListener("click", () => row.remove());
  wrap.appendChild(row);
}

function collectAvailability() {
  const rows = document.querySelectorAll("#avail-rows > div");
  const out = [];
  rows.forEach((r) => {
    const day = Number(r.querySelector(".av-day").value);
    const startMinutes = Number(r.querySelector(".av-start").value);
    const endMinutes = Number(r.querySelector(".av-end").value);
    if (!Number.isNaN(day) && !Number.isNaN(startMinutes) && !Number.isNaN(endMinutes) && endMinutes > startMinutes) {
      out.push({ dayOfWeek: day, startMinutes, endMinutes });
    }
  });
  return out;
}

async function loadProfile() {
  const me = await api("/auth/me");
  if (me.role !== "doctor") {
    notify("This account is not a doctor.", "error");
    window.location.href = "/";
    return;
  }
  document.getElementById("pf-name").value = me.name || "";
  document.getElementById("pf-spec").value = me.specialization || "";
  document.getElementById("pf-bio").value = me.bio || "";
  document.getElementById("chk-otp").checked = !!me.otpEnabled;
  document.getElementById("avail-rows").innerHTML = "";
  if (me.availability && me.availability.length) {
    me.availability.forEach((a) => addAvailRow(a.dayOfWeek, a.startMinutes, a.endMinutes));
  } else {
    addAvailRow(1, 540, 1020);
  }
}

async function loadAppointments() {
  const rows = await api("/appointments");
  const el = document.getElementById("appt-list");
  const sel = document.getElementById("consult-appt");
  sel.innerHTML = "";
  if (!rows.length) {
    el.innerHTML = "<p style='color:var(--muted)'>No appointments.</p>";
    return;
  }
  let html =
    "<table><thead><tr><th>When</th><th>Patient</th><th>Duration</th><th>Status</th><th>Actions</th></tr></thead><tbody>";
  rows.forEach((a) => {
    const pat = a.patient && typeof a.patient === "object" ? a.patient.name || a.patient.email : "";
    const t = new Date(a.startTime).toLocaleString();
    html += `<tr><td>${esc(t)}</td><td>${esc(pat)}</td><td>${esc(a.durationMinutes)} min</td><td><span class="badge badge--${badgeClass(
      a.status
    )}">${esc(a.status)}</span></td><td class="flex gap-1 flex-wrap">`;
    if (a.status === "pending") {
      html += `<button type="button" class="btn btn--primary btn--sm" data-act="accepted" data-id="${esc(
        a._id
      )}">Accept</button>`;
      html += `<button type="button" class="btn btn--ghost btn--sm" data-act="rejected" data-id="${esc(
        a._id
      )}">Reject</button>`;
    }
    if (a.status === "accepted") {
      html += `<button type="button" class="btn btn--ghost btn--sm" data-act="completed" data-id="${esc(
        a._id
      )}">Complete</button>`;
    }
    html += "</td></tr>";

    if (a.status === "accepted") {
      const opt = document.createElement("option");
      opt.value = a._id;
      opt.textContent = `${t} — ${pat}`;
      sel.appendChild(opt);
    }
  });
  html += "</tbody></table>";
  el.innerHTML = html;

  el.querySelectorAll("[data-act]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const status = btn.getAttribute("data-act");
      try {
        await api(`/appointments/${id}/status`, { method: "PATCH", body: { status } });
        notifyToast("Updated", "success");
        loadAppointments();
      } catch (e) {
        notify(e.message, "error");
      }
    });
  });
}

async function loadProjects() {
  const projects = await api("/projects");
  const el = document.getElementById("proj-list");
  const detail = document.getElementById("proj-detail");
  detail.classList.add("hidden");
  el.innerHTML = "";
  if (!projects.length) {
    el.innerHTML = "<p style='color:var(--muted)'>No projects.</p>";
    return;
  }
  projects.forEach((p) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn--ghost btn--sm mt-1";
    b.style.display = "block";
    b.textContent = p.title;
    b.addEventListener("click", async () => {
      const data = await api(`/projects/${p._id}`);
      const { project, tasks } = data;
      detail.classList.remove("hidden");
      const patient = project.patient && typeof project.patient === "object" ? project.patient : {};
      detail.innerHTML = `
        <h3>${esc(project.title)}</h3>
        <p style="color:var(--muted)">${esc(project.description || "")}</p>
        <p><small>Patient: ${esc(patient.name || "")} (${esc(patient.email || "")})</small></p>
        <h4>Tasks</h4>
        <ul id="task-ul" style="padding-left:1.2rem"></ul>
        <form id="form-task" class="mt-1">
          <div class="form-group">
            <input name="title" placeholder="Task title" required />
          </div>
          <div class="form-group flex gap-1">
            <select name="type">
              <option value="medication">Medication</option>
              <option value="test">Test</option>
              <option value="diet">Diet</option>
              <option value="other">Other</option>
            </select>
            <input name="deadline" type="datetime-local" />
          </div>
          <button type="submit" class="btn btn--primary btn--sm">Add task</button>
        </form>`;
      const ul = detail.querySelector("#task-ul");
      (tasks || []).forEach((t) => {
        const li = document.createElement("li");
        li.innerHTML = `${esc(t.title)} <span class="badge badge--${t.status === "completed" ? "completed" : "pending"}">${esc(
          t.status
        )}</span>`;
        ul.appendChild(li);
      });
      detail.querySelector("#form-task").addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        try {
          await api(`/projects/${p._id}/tasks`, {
            method: "POST",
            body: {
              title: fd.get("title"),
              type: fd.get("type"),
              deadline: fd.get("deadline") || undefined,
            },
          });
          notifyToast("Task added", "success");
          b.click();
        } catch (e) {
          notify(e.message, "error");
        }
      });
    });
    el.appendChild(b);
  });
}

function showSection(id) {
  document.querySelectorAll(".main-content > section").forEach((s) => s.classList.add("hidden"));
  const map = {
    profile: "sec-profile",
    appointments: "sec-appointments",
    consult: "sec-consult",
    projects: "sec-projects",
    rx: "sec-rx",
    security: "sec-security",
  };
  const sec = document.getElementById(map[id]);
  if (sec) sec.classList.remove("hidden");
  document.querySelectorAll(".sidebar a").forEach((a) => {
    a.classList.toggle("is-active", a.getAttribute("data-section") === id);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!requireDoctor()) return;
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

  document.getElementById("btn-add-avail").addEventListener("click", () => addAvailRow());

  try {
    await loadProfile();
    await loadAppointments();
    await loadProjects();
  } catch (e) {
    if (e.status === 401) {
      setSession(null, null);
      window.location.href = "/";
      return;
    }
    notify(e.message || "Load failed", "error");
  }

  document.getElementById("form-profile").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/users/profile", {
        method: "PATCH",
        body: {
          name: document.getElementById("pf-name").value.trim(),
          specialization: document.getElementById("pf-spec").value.trim(),
          bio: document.getElementById("pf-bio").value.trim(),
          availability: collectAvailability(),
        },
      });
      notifyToast("Saved", "success");
    } catch (err) {
      notify(err.message, "error");
    }
  });

  document.getElementById("form-new-project").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/projects", {
        method: "POST",
        body: {
          patientId: document.getElementById("np-patient").value.trim(),
          title: document.getElementById("np-title").value.trim(),
          description: document.getElementById("np-desc").value.trim(),
        },
      });
      notifyToast("Project created", "success");
      loadProjects();
    } catch (err) {
      notify(err.message, "error");
    }
  });

  document.getElementById("form-rx").addEventListener("submit", async (e) => {
    e.preventDefault();
    const items = document
      .getElementById("rx-items")
      .value.split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    try {
      await api("/prescriptions", {
        method: "POST",
        body: {
          patientId: document.getElementById("rx-patient").value.trim(),
          title: document.getElementById("rx-title").value.trim(),
          items,
        },
      });
      notifyToast("Prescription created", "success");
    } catch (err) {
      notify(err.message, "error");
    }
  });

  document.getElementById("btn-save-otp").addEventListener("click", async () => {
    try {
      await api("/auth/otp-setting", {
        method: "PATCH",
        body: { enabled: document.getElementById("chk-otp").checked },
      });
      notifyToast("Saved", "success");
    } catch (e) {
      notify(e.message, "error");
    }
  });

  const videoEl = document.getElementById("consult-video");
  document.getElementById("btn-start-call").addEventListener("click", () => {
    const id = document.getElementById("consult-appt").value;
    if (!id) {
      notify("Pick an accepted appointment", "error");
      return;
    }
    videoEl.textContent = "● Live (mock) — session in progress";
    videoEl.style.border = "3px solid var(--primary)";
    notifyToast("Mock video session started", "success");
  });
  document.getElementById("btn-end-call").addEventListener("click", () => {
    videoEl.textContent = "Camera preview (mock) — ended";
    videoEl.style.border = "none";
  });

  document.getElementById("btn-chat-send").addEventListener("click", () => {
    const input = document.getElementById("chat-input");
    const log = document.getElementById("chat-log");
    const msg = input.value.trim();
    if (!msg) return;
    const line = document.createElement("div");
    line.textContent = `You: ${msg}`;
    if (log.textContent.includes("No messages")) log.innerHTML = "";
    log.appendChild(line);
    input.value = "";
  });

  showSection("profile");
});
