import { store } from './store.js';
import { sounds } from './sounds.js';

let focusBtn, backBtn;

export function initFocusMode() {
  focusBtn = document.getElementById('focusModeBtn');
  backBtn = document.getElementById('focusBackBtn');

  if (focusBtn) {
    focusBtn.addEventListener('click', toggleFocusMode);
  }
  if (backBtn) {
    backBtn.addEventListener('click', exitFocusMode);
  }

  store.subscribe(({ focusMode }) => {
    document.body.classList.toggle('focus-mode', focusMode);
    if (focusBtn) focusBtn.classList.toggle('active', focusMode);
    if (backBtn) backBtn.style.display = focusMode ? 'flex' : 'none';
  });
}

function toggleFocusMode() {
  const { focusMode, focusedTaskId, tasks } = store.getState();

  if (!focusMode && !focusedTaskId) {
    // Auto-focus first incomplete task
    const first = tasks.find((t) => !t.completed);
    if (first) {
      store.setState({ focusedTaskId: first.id });
    }
  }

  store.setState({ focusMode: !focusMode });
  sounds.click();
}

function exitFocusMode() {
  store.setState({ focusMode: false });
  sounds.click();
}
