import { store } from './store.js';

let darkmodeBtn;

export function initDarkMode() {
  darkmodeBtn = document.getElementById('darkmodeBtn');

  // Apply saved preference
  const { darkMode } = store.getState();
  applyTheme(darkMode);

  // Listen for system changes
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', () => {
    if (store.getState().darkMode === 'system') {
      applyTheme('system');
    }
  });

  // Toggle button
  darkmodeBtn.addEventListener('click', cycleDarkMode);

  // Subscribe to store for UI sync
  store.subscribe(({ darkMode: mode }) => {
    updateButtonIcon(mode);
  });

  updateButtonIcon(darkMode);
}

function cycleDarkMode() {
  const modes = ['system', 'light', 'dark', 'oled'];
  const { darkMode } = store.getState();
  const next = modes[(modes.indexOf(darkMode) + 1) % modes.length];
  store.setState({ darkMode: next });
  localStorage.setItem('today_darkmode', next);
  applyTheme(next);
}

function applyTheme(mode) {
  let resolved = mode;
  if (mode === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', resolved);
}

function updateButtonIcon(mode) {
  if (!darkmodeBtn) return;
  const resolved =
    mode === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : mode;
  const isDark = resolved === 'dark' || resolved === 'oled';
  darkmodeBtn.querySelector('.icon-sun').style.display = isDark ? 'block' : 'none';
  darkmodeBtn.querySelector('.icon-moon').style.display = isDark ? 'none' : 'block';
  darkmodeBtn.setAttribute('aria-label', `Theme: ${mode} (click to cycle)`);
}
