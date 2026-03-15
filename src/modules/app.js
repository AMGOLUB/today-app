import { store } from './store.js';
import { initAudio, sounds } from './sounds.js';
import { initDarkMode } from './darkmode.js';
import { initThemes } from './themes.js';
import { initTime } from './time.js';
import { initQuotes } from './quotes.js';
import { initProjects } from './projects.js';
import { initProgress } from './progress.js';
import { initFirebase } from './firebase.js';
import { initTasks } from './tasks.js';
import { initKeyboard } from './keyboard.js';
import { initTimer } from './timer.js';
import { initFocusMode } from './focusmode.js';
import { initTemplates } from './templates.js';
import { initReview } from './review.js';
import { initCelebrations } from './celebrations.js';

export function initApp() {
  // Audio init on first interaction
  document.addEventListener('click', initAudio, { once: true });
  document.addEventListener('keydown', initAudio, { once: true });

  // Sound toggle
  const soundBtn = document.getElementById('soundBtn');
  soundBtn.addEventListener('click', () => {
    initAudio();
    const { soundEnabled } = store.getState();
    store.setState({ soundEnabled: !soundEnabled });
    localStorage.setItem('today_sound', !soundEnabled);
    soundBtn.classList.toggle('muted', soundEnabled);
    soundBtn.setAttribute('aria-pressed', !soundEnabled);
    sounds.toggle();
  });

  const { soundEnabled } = store.getState();
  soundBtn.classList.toggle('muted', !soundEnabled);
  soundBtn.setAttribute('aria-pressed', soundEnabled);

  // Sync status UI subscriber
  store.subscribe((state) => {
    updateSyncStatusUI(state.syncStatus);
  });

  // Username
  const userNameEl = document.getElementById('userName');
  if (userNameEl) userNameEl.textContent = store.getState().username;

  // Initialize all modules in order
  initDarkMode();
  initThemes();
  initTime();
  initQuotes();
  initProjects();
  initProgress();
  initFirebase();
  initTasks();
  initKeyboard();
  initTimer();
  initFocusMode();
  initTemplates();
  initReview();
  initCelebrations();
}

function updateSyncStatusUI({ status, text }) {
  const el = document.getElementById('syncStatus');
  if (el) {
    el.className = 'sync-status ' + status;
    el.querySelector('.sync-text').textContent = text;
  }
}
