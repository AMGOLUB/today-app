import { store } from './store.js';

const CIRCUMFERENCE = 283; // 2 * PI * 45 (SVG circle radius)

let remainingEl, completedEl, percentEl, ringEl;

export function initProgress() {
  remainingEl = document.getElementById('remainingCount');
  completedEl = document.getElementById('completedCount');
  percentEl = document.getElementById('progressPercent');
  ringEl = document.getElementById('progressRing');

  store.subscribe(updateProgress);
  updateProgress();
}

function updateProgress() {
  const { tasks } = store.getState();
  let total = 0;
  let completed = 0;

  tasks.forEach((task) => {
    if (task.subtasks && task.subtasks.length > 0) {
      total += task.subtasks.length;
      completed += task.subtasks.filter((st) => st.completed).length;
    } else {
      total += 1;
      if (task.completed) completed += 1;
    }
  });

  const remaining = total - completed;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (remainingEl) remainingEl.textContent = remaining;
  if (completedEl) completedEl.textContent = completed;
  if (percentEl) percentEl.textContent = `${percent}%`;

  if (ringEl) {
    const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;
    ringEl.style.strokeDashoffset = offset;
  }
}
