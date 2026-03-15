import { store } from './store.js';
import { sounds } from './sounds.js';

const WORK_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;
const LONG_BREAK_DURATION = 15 * 60;

let widget, displayEl, taskNameEl, progressEl, modeEl;
let intervalId = null;
let remaining = 0;
let totalDuration = 0;
let mode = 'work'; // 'work' | 'break' | 'longBreak'
let activeTaskId = null;
let sessionsCompleted = 0;
let accumulatedTime = 0;

export function initTimer() {
  widget = document.getElementById('timerWidget');
  if (!widget) return;

  displayEl = widget.querySelector('.timer-display');
  taskNameEl = widget.querySelector('.timer-task-name');
  progressEl = widget.querySelector('.timer-progress-fill');
  modeEl = widget.querySelector('.timer-mode');

  widget.querySelector('.timer-pause')?.addEventListener('click', togglePause);
  widget.querySelector('.timer-skip')?.addEventListener('click', skipTimer);
  widget.querySelector('.timer-stop')?.addEventListener('click', stopTimer);
}

export function startTimer(taskId) {
  const { tasks } = store.getState();
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  activeTaskId = taskId;
  mode = 'work';
  remaining = WORK_DURATION;
  totalDuration = WORK_DURATION;
  accumulatedTime = 0;

  if (taskNameEl) taskNameEl.textContent = task.text;
  if (modeEl) modeEl.textContent = 'Focus';
  widget.style.display = 'flex';
  widget.classList.add('active');

  sounds.click();
  startInterval();
  updateDisplay();

  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function startInterval() {
  clearInterval(intervalId);
  intervalId = setInterval(() => {
    remaining--;
    if (mode === 'work') accumulatedTime++;

    updateDisplay();

    if (remaining <= 0) {
      onTimerComplete();
    }
  }, 1000);
}

function togglePause() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    widget.classList.add('paused');
    saveTimeSpent();
  } else {
    startInterval();
    widget.classList.remove('paused');
  }
  sounds.click();
}

function skipTimer() {
  onTimerComplete();
}

function stopTimer() {
  clearInterval(intervalId);
  intervalId = null;
  saveTimeSpent();
  widget.style.display = 'none';
  widget.classList.remove('active', 'paused');
  activeTaskId = null;
  sounds.click();
}

function onTimerComplete() {
  clearInterval(intervalId);
  intervalId = null;

  sounds.timerDone();
  notifyUser();
  saveTimeSpent();

  if (mode === 'work') {
    sessionsCompleted++;
    if (sessionsCompleted % 4 === 0) {
      mode = 'longBreak';
      remaining = LONG_BREAK_DURATION;
      totalDuration = LONG_BREAK_DURATION;
      if (modeEl) modeEl.textContent = 'Long Break';
    } else {
      mode = 'break';
      remaining = BREAK_DURATION;
      totalDuration = BREAK_DURATION;
      if (modeEl) modeEl.textContent = 'Break';
    }
    accumulatedTime = 0;
    startInterval();
    updateDisplay();
  } else {
    mode = 'work';
    remaining = WORK_DURATION;
    totalDuration = WORK_DURATION;
    accumulatedTime = 0;
    if (modeEl) modeEl.textContent = 'Focus';
    startInterval();
    updateDisplay();
  }
}

function saveTimeSpent() {
  if (!activeTaskId || accumulatedTime === 0) return;
  const { tasks } = store.getState();
  const updated = tasks.map((t) =>
    t.id === activeTaskId ? { ...t, timeSpent: (t.timeSpent || 0) + accumulatedTime * 1000 } : t,
  );
  store.setState({ tasks: updated });
  localStorage.setItem('today_tasks', JSON.stringify(updated));
  accumulatedTime = 0;
}

function updateDisplay() {
  if (!displayEl) return;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  displayEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  if (progressEl && totalDuration > 0) {
    const pct = ((totalDuration - remaining) / totalDuration) * 100;
    progressEl.style.width = `${pct}%`;
  }
}

function notifyUser() {
  if ('Notification' in window && Notification.permission === 'granted') {
    const title = mode === 'work' ? 'Focus session complete!' : 'Break is over!';
    new Notification(title, { body: 'Time for the next round.', icon: './assets/icon.svg' });
  }
}

export function formatTimeSpent(ms) {
  if (!ms || ms < 60000) return '';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}
