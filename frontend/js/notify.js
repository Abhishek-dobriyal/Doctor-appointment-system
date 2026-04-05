/**
 * Simple alert-based notifications (MVP).
 */
function notify(message, type = 'info') {
  const prefix = type === 'error' ? 'Error: ' : type === 'success' ? '' : '';
  window.alert(prefix + message);
}

function notifyToast(message, type = 'info') {
  let el = document.getElementById('toast-root');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-root';
    el.className = 'toast-root';
    document.body.appendChild(el);
  }
  const t = document.createElement('div');
  t.className = `toast toast--${type}`;
  t.textContent = message;
  el.appendChild(t);
  setTimeout(() => {
    t.classList.add('toast--out');
    setTimeout(() => t.remove(), 400);
  }, 4000);
}

window.notify = notify;
window.notifyToast = notifyToast;
