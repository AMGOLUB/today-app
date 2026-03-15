import { store } from './store.js';
import { initAudio, sounds } from './sounds.js';
import { initThemes } from './themes.js';
import { initTime } from './time.js';
import { initQuotes } from './quotes.js';
import { initProgress } from './progress.js';
import { initFirebase } from './firebase.js';
import { initTasks } from './tasks.js';

export function initApp() {
  // Initialize audio on first user interaction
  document.addEventListener('click', initAudio, { once: true });
  document.addEventListener('keydown', initAudio, { once: true });

  // Sound toggle button
  const soundBtn = document.getElementById('soundBtn');
  soundBtn.addEventListener('click', () => {
    initAudio();
    const { soundEnabled } = store.getState();
    store.setState({ soundEnabled: !soundEnabled });
    localStorage.setItem('today_sound', !soundEnabled);
    soundBtn.classList.toggle('muted', soundEnabled); // toggling: if was enabled, now muted
    soundBtn.setAttribute('aria-pressed', !soundEnabled);
    sounds.toggle();
  });

  // Initialize sound button state
  const { soundEnabled } = store.getState();
  soundBtn.classList.toggle('muted', !soundEnabled);
  soundBtn.setAttribute('aria-pressed', soundEnabled);

  // Persist tasks on state changes
  store.subscribe((state) => {
    updateSyncStatusUI(state.syncStatus);
  });

  // Update greeting with username
  const userNameEl = document.getElementById('userName');
  if (userNameEl) {
    userNameEl.textContent = store.getState().username;
  }

  // Initialize all modules
  initThemes();
  initTime();
  initQuotes();
  initProgress();
  initFirebase();
  initTasks();
}

function updateSyncStatusUI({ status, text }) {
  const el = document.getElementById('syncStatus');
  if (el) {
    el.className = 'sync-status ' + status;
    el.querySelector('.sync-text').textContent = text;
  }
}
