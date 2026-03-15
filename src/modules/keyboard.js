import { store } from './store.js';
import { sounds } from './sounds.js';

let shortcutsOverlay;

export function initKeyboard() {
  shortcutsOverlay = document.getElementById('shortcutsOverlay');
  document.addEventListener('keydown', handleGlobalKeydown);
}

function handleGlobalKeydown(e) {
  const tag = e.target.tagName;
  const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

  // Quick capture: Cmd/Ctrl+Shift+T or Cmd/Ctrl+N
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 't') {
    e.preventDefault();
    document.getElementById('taskInput')?.focus();
    return;
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
    e.preventDefault();
    document.getElementById('taskInput')?.focus();
    return;
  }

  // Don't handle navigation keys when in an input
  if (isInput) return;

  const { focusedTaskId, focusMode } = store.getState();

  switch (e.key) {
    case 'j':
    case 'ArrowDown':
      e.preventDefault();
      moveFocus(1);
      break;
    case 'k':
    case 'ArrowUp':
      e.preventDefault();
      moveFocus(-1);
      break;
    case 'Enter':
      if (focusedTaskId) {
        e.preventDefault();
        clickElement(focusedTaskId, '.task-checkbox');
      }
      break;
    case 'x':
      if (focusedTaskId) {
        e.preventDefault();
        clickElement(focusedTaskId, '.task-delete');
      }
      break;
    case 'Tab':
      if (focusedTaskId) {
        e.preventDefault();
        clickElement(focusedTaskId, '.task-add-subtask');
      }
      break;
    case 'f':
      if (focusedTaskId) {
        e.preventDefault();
        store.setState({ focusMode: !focusMode });
      }
      break;
    case 'Escape':
      if (focusMode) {
        store.setState({ focusMode: false });
      } else if (focusedTaskId) {
        store.setState({ focusedTaskId: null });
      }
      closeModals();
      break;
    case '?':
      e.preventDefault();
      toggleShortcuts();
      break;
  }
}

function moveFocus(direction) {
  const taskItems = Array.from(document.querySelectorAll('.task-item[data-id]'));
  if (taskItems.length === 0) return;

  const { focusedTaskId } = store.getState();
  const currentIndex = taskItems.findIndex((el) => el.dataset.id === focusedTaskId);

  let nextIndex;
  if (currentIndex === -1) {
    nextIndex = direction > 0 ? 0 : taskItems.length - 1;
  } else {
    nextIndex = Math.max(0, Math.min(taskItems.length - 1, currentIndex + direction));
  }

  const nextId = taskItems[nextIndex].dataset.id;
  store.setState({ focusedTaskId: nextId });
  sounds.click();

  taskItems[nextIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function clickElement(taskId, selector) {
  const taskEl = document.querySelector(`.task-item[data-id="${taskId}"]`);
  const target = taskEl?.querySelector(selector);
  if (target) target.click();
}

function closeModals() {
  document.getElementById('themeOverlay')?.classList.remove('open');
  document.getElementById('themeModal')?.classList.remove('open');
  document.getElementById('templatesOverlay')?.classList.remove('open');
  document.getElementById('templatesModal')?.classList.remove('open');
  document.getElementById('reviewOverlay')?.classList.remove('open');
  document.getElementById('reviewModal')?.classList.remove('open');
  if (shortcutsOverlay) shortcutsOverlay.classList.remove('open');
}

function toggleShortcuts() {
  if (!shortcutsOverlay) return;
  shortcutsOverlay.classList.toggle('open');
}
