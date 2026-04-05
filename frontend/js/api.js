/**
 * REST client with JWT; uses same-origin /api when served by Express.
 */
const TOKEN_KEY = 'dap_token';
const USER_KEY = 'dap_user';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setSession(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text || 'Invalid response' };
  }
  if (!res.ok) {
    const err = new Error(data.message || res.statusText || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Heartbeat to refresh lastActivity on server (30 min timeout) */
function startActivityHeartbeat() {
  setInterval(async () => {
    if (!getToken()) return;
    try {
      await api('/auth/me');
    } catch {
      /* ignore */
    }
  }, 5 * 60 * 1000);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && getToken()) {
    api('/auth/me').catch(() => {});
  }
});

/* Classic scripts: expose for other pages */
window.getToken = getToken;
window.setSession = setSession;
window.getUser = getUser;
window.api = api;
window.startActivityHeartbeat = startActivityHeartbeat;
