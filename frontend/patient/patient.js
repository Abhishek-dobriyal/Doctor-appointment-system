/* global getToken, setSession, api, notify, notifyToast, startActivityHeartbeat */

function requireAuth() {
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

async function loadProfileForm() {
  const me = await api("/auth/me");
  document.getElementById("pf-name").value = me.name || "";
  document.getElementById("pf-phone").value = me.phone || "";
  document.getElementById("pf-gender").value = me.gender || "";
  if (me.dob) document.getElementById("pf-dob").value = me.dob.slice(0, 10);
  document.getElementById("chk-otp").checked = !!me.otpEnabled;
}

async function refreshDoctors() {
  const q = document.getElementById("doc-q").value.trim();
  const specialty = document.getElementById("doc-specialty").value.trim();
  const day = document.getElementById("doc-day").value;
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (specialty) params.set("specialty", specialty);
  if (day !== "") params.set("day", day);
  const list = await api(`/users/doctors?${params.toString()}`);
  const el = document.getElementById("doctor-list");
  el.innerHTML = "";
  if (!list.length) {
    el.innerHTML = "<p style='color:var(--muted)'>No doctors found.</p>";
    return;
  }
  const ul = document.createElement("ul");
  ul.style.listStyle = "none";
  ul.style.padding = "0";
  list.forEach((d) => {
    const li = document.createElement("li");
    li.className = "card mt-1";
    li.innerHTML = `<strong>${esc(d.name || d.email)}</strong> — ${esc(
      d.specialization || "General"
    )}<br/><span style="color:var(--muted);font-size:0.85rem">${esc(d.email)}</span>`;
    ul.appendChild(li);
  });
  el.appendChild(ul);

  const sel = document.getElementById("book-doctor");
  sel.innerHTML = "";
  list.forEach((d) => {
    const o = document.createElement("option");
    o.value = d._id || d.id;
    o.textContent = `${d.name || d.email} (${d.specialization || "—"})`;
    sel.appendChild(o);
  });
}

async function loadSlots() {
  const doctorId = document.getElementById("book-doctor").value;
  const duration = document.getElementById("book-duration").value;
  const box = document.getElementById("slot-list");
  box.innerHTML = "<span style='color:var(--muted)'>Loading…</span>";
  const data = await api(
    `/appointments/slots/${doctorId}?duration=${encodeURIComponent(duration)}&days=10`
  );
  box.innerHTML = "";
  if (!data.slots || !data.slots.length) {
    box.innerHTML = "<span style='color:var(--muted)'>No open slots. Doctor may need to set availability.</span>";
    return;
  }
  data.slots.forEach((s) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn--ghost btn--sm";
    const dt = new Date(s.startTime);
    b.textContent = dt.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    b.addEventListener("click", async () => {
      try {
        await api("/appointments", {
          method: "POST",
          body: {
            doctorId,
            startTime: s.startTime,
            durationMinutes: Number(duration),
            notes: document.getElementById("book-notes").value.trim(),
          },
        });
        notifyToast("Booking requested (pending)", "success");
        loadAppointments();
      } catch (e) {
        notify(e.message || "Booking failed", "error");
      }
    });
    box.appendChild(b);
  });
}

async function loadAppointments() {
  const rows = await api("/appointments");
  const el = document.getElementById("appt-list");
  if (!rows.length) {
    el.innerHTML = "<p style='color:var(--muted)'>No appointments yet.</p>";
    return;
  }
  let html =
    "<table><thead><tr><th>When</th><th>Doctor</th><th>Duration</th><th>Status</th></tr></thead><tbody>";
  rows.forEach((a) => {
    const doc = a.doctor && typeof a.doctor === "object" ? a.doctor.name || a.doctor.email : "";
    const t = new Date(a.startTime).toLocaleString();
    html += `<tr><td>${esc(t)}</td><td>${esc(doc)}</td><td>${esc(a.durationMinutes)} min</td><td><span class="badge badge--${badgeClass(
      a.status
    )}">${esc(a.status)}</span></td></tr>`;
  });
  html += "</tbody></table>";
  el.innerHTML = html;
}

async function loadPrescriptions() {
  const list = await api("/prescriptions/mine");
  const el = document.getElementById("rx-list");
  if (!list.length) {
    el.innerHTML = "<p style='color:var(--muted)'>No prescriptions.</p>";
    return;
  }
  el.innerHTML = "";
  list.forEach((rx) => {
    const div = document.createElement("div");
    div.className = "card mt-1";
    const doc = rx.doctor && typeof rx.doctor === "object" ? rx.doctor.name : "";
    const pdfUrl = `/api/prescriptions/pdf/${encodeURIComponent(rx.mockPdfToken)}`;
    div.innerHTML = `<strong>${esc(rx.title)}</strong> — ${esc(doc)}<br/>
      <a href="${pdfUrl}" target="_blank" rel="noopener">Open mock PDF</a>`;
    el.appendChild(div);
  });
}

async function loadProjects() {
  const projects = await api("/projects");
  const el = document.getElementById("proj-list");
  const detail = document.getElementById("proj-detail");
  detail.classList.add("hidden");
  detail.innerHTML = "";
  el.innerHTML = "";
  if (!projects.length) {
    el.innerHTML = "<p style='color:var(--muted)'>No projects assigned.</p>";
    return;
  }
  projects.forEach((p) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn--ghost btn--sm mt-1";
    btn.style.display = "block";
    btn.textContent = p.title;
    btn.addEventListener("click", async () => {
      const data = await api(`/projects/${p._id}`);
      const { project, tasks } = data;
      detail.classList.remove("hidden");
      let th = `<h3>${esc(project.title)}</h3><p style="color:var(--muted)">${esc(
        project.description || ""
      )}</p><ul style="padding-left:1.2rem">`;
      (tasks || []).forEach((t) => {
        th += `<li>${esc(t.title)} — <span class="badge badge--${t.status === "completed" ? "completed" : "pending"}">${esc(
          t.status
        )}</span> `;
        if (t.status !== "completed") {
          th += `<button type="button" class="btn btn--primary btn--sm" data-complete="${esc(
            t._id
          )}">Mark done</button>`;
        }
        th += `</li>`;
      });
      th += "</ul>";
      detail.innerHTML = th;
      detail.querySelectorAll("[data-complete]").forEach((b) => {
        b.addEventListener("click", async () => {
          const id = b.getAttribute("data-complete");
          await api(`/projects/tasks/${id}`, { method: "PATCH", body: { status: "completed" } });
          notifyToast("Task updated", "success");
          btn.click();
        });
      });
    });
    el.appendChild(btn);
  });
}

async function loadUploads() {
  const list = await api("/health/mine");
  const el = document.getElementById("upload-list");
  if (!list.length) {
    el.innerHTML = "<p style='color:var(--muted)'>No uploads.</p>";
    return;
  }
  let html = "<table><thead><tr><th>Label</th><th>When</th><th>Download</th></tr></thead><tbody>";
  list.forEach((u) => {
    const id = String(u._id);
    html += `<tr><td>${esc(u.label)}</td><td>${esc(new Date(u.createdAt).toLocaleString())}</td><td><button type="button" class="btn btn--sm btn--ghost" data-dl="${esc(
      id
    )}">Download</button></td></tr>`;
  });
  html += "</tbody></table>";
  el.innerHTML = html;
  el.querySelectorAll("[data-dl]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-dl");
      try {
        const res = await fetch(`/api/health/download/${id}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error("Download failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "health-file";
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        notify("Download failed", "error");
      }
    });
  });
}

function showSection(id) {
  document.querySelectorAll(".main-content > section").forEach((s) => s.classList.add("hidden"));
  const map = {
    profile: "sec-profile",
    doctors: "sec-doctors",
    book: "sec-book",
    appointments: "sec-appointments",
    prescriptions: "sec-prescriptions",
    projects: "sec-projects",
    uploads: "sec-uploads",
    security: "sec-security",
  };
  const sec = document.getElementById(map[id]);
  if (sec) sec.classList.remove("hidden");
  document.querySelectorAll(".sidebar a").forEach((a) => {
    a.classList.toggle("is-active", a.getAttribute("data-section") === id);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAuth()) return;
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

  try {
    await loadProfileForm();
    await refreshDoctors();
    await loadAppointments();
    await loadPrescriptions();
    await loadProjects();
    await loadUploads();
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
    const dob = document.getElementById("pf-dob").value;
    try {
      await api("/users/profile", {
        method: "PATCH",
        body: {
          name: document.getElementById("pf-name").value.trim(),
          phone: document.getElementById("pf-phone").value.trim(),
          gender: document.getElementById("pf-gender").value,
          dob: dob || null,
        },
      });
      notifyToast("Profile saved", "success");
    } catch (err) {
      notify(err.message, "error");
    }
  });

  document.getElementById("btn-search-docs").addEventListener("click", () => refreshDoctors().catch((e) => notify(e.message, "error")));

  document.getElementById("btn-load-slots").addEventListener("click", () => loadSlots().catch((e) => notify(e.message, "error")));

  document.getElementById("form-upload").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("label", document.getElementById("up-label").value.trim());
    fd.append("file", document.getElementById("up-file").files[0]);
    try {
      const token = getToken();
      const res = await fetch("/api/health", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      notifyToast("Uploaded", "success");
      document.getElementById("up-file").value = "";
      loadUploads();
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
      notifyToast("2FA setting saved", "success");
    } catch (e) {
      notify(e.message, "error");
    }
  });

  showSection("profile");
});
