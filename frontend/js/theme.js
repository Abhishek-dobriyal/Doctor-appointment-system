const THEME_KEY = 'dap_theme';

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = saved === 'dark' || (!saved && prefersDark);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
}

window.toggleTheme = toggleTheme;

document.addEventListener('DOMContentLoaded', initTheme);
