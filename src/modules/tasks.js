import { store } from './store.js';
import { sounds } from './sounds.js';
import {
  escapeHtml,
  generateId,
  MAX_TASK_LENGTH,
  MAX_SUBTASK_LENGTH,
  MAX_TASKS,
  MAX_SUBTASKS_PER_TASK,
  PRIORITY_ORDER,
} from './utils.js';
import { saveTaskToFirebase, deleteTaskFromFirebase, updateTaskInFirebase } from './firebase.js';
import { getProjectColor } from './projects.js';
import { startTimer, formatTimeSpent } from './timer.js';
import { recordCompletion } from './review.js';
import { allComplete, streakMilestone, updateCompletionBadge } from './celebrations.js';
import { processRecurrence } from './recurrence.js';

let taskListEl, announcer;
let pendingPriority = 'none';

// ============================================
// DATA MIGRATION
// ============================================
export function migrateTasks(tasks) {
  return tasks.map((task) => ({
    priority: 'none',
    dueDate: null,
    dueTime: null,
    project: null,
    tags: [],
    recurrence: null,
    streak: 0,
    lastCompletedDate: null,
    timeSpent: 0,
    ...task,
    id: typeof task.id === 'number' ? String(task.id) : task.id,
    createdAt: task.createdAt || (typeof task.id === 'number' ? task.id : Date.now()),
    subtasks: (task.subtasks || []).map((st) => ({
      ...st,
      id: typeof st.id === 'number' ? String(st.id) : st.id,
    })),
  }));
}

// ============================================
// INITIALIZATION
// ============================================
export function initTasks() {
  taskListEl = document.getElementById('taskList');
  announcer = document.getElementById('statusAnnouncer');

  // Migrate existing data
  const { tasks } = store.getState();
  const migrated = migrateTasks(tasks);

  // Day reset
  const today = new Date().toDateString();
  const lastDate = localStorage.getItem('today_date');
  let resetTasks = migrated;
  if (lastDate !== today) {
    resetTasks = processRecurrence(migrated);
    resetTasks = resetTasks.filter((t) => {
      if (t.recurrence) return true; // keep recurring tasks
      if (t.subtasks && t.subtasks.length > 0) {
        return !t.subtasks.every((st) => st.completed);
      }
      return !t.completed;
    });
    localStorage.setItem('today_date', today);
  }
  store.setState({ tasks: resetTasks });
  saveTasks();

  // Event delegation
  taskListEl.addEventListener('click', handleTaskListClick);
  taskListEl.addEventListener('keydown', handleTaskListKeydown);

  // Task input
  const addBtn = document.getElementById('addBtn');
  const taskInput = document.getElementById('taskInput');

  addBtn.addEventListener('click', () => {
    if (taskInput.value.trim()) {
      sounds.pop();
      addTask(taskInput.value);
      taskInput.value = '';
      taskInput.focus();
    }
  });

  taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && taskInput.value.trim()) {
      sounds.pop();
      addTask(taskInput.value);
      taskInput.value = '';
    }
  });

  document.getElementById('clearCompletedBtn').addEventListener('click', clearCompleted);

  // Priority picker
  document.querySelector('.priority-picker')?.addEventListener('click', (e) => {
    const dot = e.target.closest('.priority-picker-dot');
    if (!dot) return;
    const p = dot.dataset.priority;
    pendingPriority = pendingPriority === p ? 'none' : p;
    document.querySelectorAll('.priority-picker-dot').forEach((d) => {
      d.classList.toggle('active', d.dataset.priority === pendingPriority);
    });
    sounds.click();
  });

  store.subscribe(renderTasks);
  renderTasks();
}

// ============================================
// EVENT DELEGATION
// ============================================
function handleTaskListClick(e) {
  const taskItem = e.target.closest('.task-item');
  if (!taskItem) return;
  const taskId = taskItem.dataset.id;

  // Focus this task for keyboard nav
  store.setState({ focusedTaskId: taskId });

  if (e.target.closest('.task-checkbox')) return toggleTask(taskId);
  if (e.target.closest('.task-delete')) return deleteTask(taskId);
  if (e.target.closest('.task-expand')) return toggleExpand(taskId);
  if (e.target.closest('.task-add-subtask')) return toggleAddSubtask(taskId);
  if (e.target.closest('.task-start-focus')) return startTimer(taskId);
  if (e.target.closest('.priority-dot')) return cyclePriority(taskId);
  if (e.target.closest('.subtask-checkbox')) {
    const si = e.target.closest('.subtask-item');
    if (si) toggleSubtask(taskId, si.dataset.subtaskId);
    return;
  }
  if (e.target.closest('.subtask-delete')) {
    const si = e.target.closest('.subtask-item');
    if (si) deleteSubtask(taskId, si.dataset.subtaskId);
    return;
  }
  if (e.target.closest('.subtask-add-btn')) return addSubtaskFromInput(taskId);
}

function handleTaskListKeydown(e) {
  if (e.key === 'Enter' && e.target.classList.contains('subtask-input')) {
    const ti = e.target.closest('.task-item');
    if (ti) addSubtaskFromInput(ti.dataset.id);
    return;
  }
  if (e.key === 'Enter' || e.key === ' ') {
    if (e.target.classList.contains('task-checkbox')) {
      e.preventDefault();
      const ti = e.target.closest('.task-item');
      if (ti) toggleTask(ti.dataset.id);
    } else if (e.target.classList.contains('subtask-checkbox')) {
      e.preventDefault();
      const ti = e.target.closest('.task-item');
      const si = e.target.closest('.subtask-item');
      if (ti && si) toggleSubtask(ti.dataset.id, si.dataset.subtaskId);
    }
  }
}

function announce(message) {
  if (announcer) announcer.textContent = message;
}

// ============================================
// TASK CRUD
// ============================================
function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > MAX_TASK_LENGTH) return;

  const { tasks, activeProject } = store.getState();
  if (tasks.length >= MAX_TASKS) return;

  const dueDateInput = document.getElementById('dueDateInput');
  const projectSelect = document.getElementById('projectSelect');
  const recurrenceSelect = document.getElementById('recurrenceSelect');

  const newTask = {
    id: generateId(),
    text: trimmed,
    completed: false,
    subtasks: [],
    expanded: false,
    createdAt: Date.now(),
    priority: pendingPriority,
    dueDate: dueDateInput?.value || null,
    dueTime: null,
    project:
      projectSelect?.value ||
      (activeProject !== 'all' && activeProject !== 'none' ? activeProject : null),
    tags: [],
    recurrence: recurrenceSelect?.value ? { type: recurrenceSelect.value } : null,
    streak: 0,
    lastCompletedDate: null,
    timeSpent: 0,
  };

  store.setState({ tasks: [...tasks, newTask] });
  saveTasks();
  saveTaskToFirebase(newTask);
  announce(`Task added: ${trimmed}`);

  // Reset inputs
  if (dueDateInput) dueDateInput.value = '';
  if (recurrenceSelect) recurrenceSelect.value = '';
  pendingPriority = 'none';
  document.querySelectorAll('.priority-picker-dot').forEach((d) => d.classList.remove('active'));
}

function toggleTask(id) {
  const { tasks } = store.getState();
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  const taskEl = taskListEl.querySelector(`.task-item[data-id="${id}"]`);
  const wasCompleted = task.completed;

  if (!wasCompleted && taskEl) {
    taskEl.classList.add('completing');
    sounds.complete();
  } else {
    sounds.uncomplete();
  }

  setTimeout(
    () => {
      const updated = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
      store.setState({ tasks: updated });
      saveTasks();
      updateTaskInFirebase({ ...task, completed: !task.completed });

      if (!wasCompleted) {
        recordCompletion();
        updateCompletionBadge();
        if (task.streak > 0) streakMilestone(task.streak);
      }

      announce(wasCompleted ? `Task uncompleted: ${task.text}` : `Task completed: ${task.text}`);

      // 100% check
      const total = updated.length;
      const completed = updated.filter((t) => t.completed).length;
      if (total > 0 && completed === total && !wasCompleted) {
        setTimeout(() => {
          sounds.fanfare();
          allComplete();
        }, 200);
      }
    },
    wasCompleted ? 0 : 300,
  );
}

function deleteTask(id) {
  const { tasks } = store.getState();
  const task = tasks.find((t) => t.id === id);
  sounds.remove();
  deleteTaskFromFirebase(id);
  store.setState({ tasks: tasks.filter((t) => t.id !== id) });
  saveTasks();
  if (task) announce(`Task deleted: ${task.text}`);
}

function clearCompleted() {
  const { tasks } = store.getState();
  const completedTasks = tasks.filter((t) => {
    if (t.subtasks && t.subtasks.length > 0) return t.subtasks.every((st) => st.completed);
    return t.completed;
  });
  if (completedTasks.length > 0) {
    sounds.remove();
    completedTasks.forEach((t) => deleteTaskFromFirebase(t.id));
    store.setState({ tasks: tasks.filter((t) => !completedTasks.some((ct) => ct.id === t.id)) });
    saveTasks();
    announce(`Cleared ${completedTasks.length} completed tasks`);
  }
}

function cyclePriority(taskId) {
  const cycle = ['none', 'low', 'medium', 'high'];
  const { tasks } = store.getState();
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;
  const next = cycle[(cycle.indexOf(task.priority || 'none') + 1) % cycle.length];
  const updated = tasks.map((t) => (t.id === taskId ? { ...t, priority: next } : t));
  store.setState({ tasks: updated });
  saveTasks();
  sounds.click();
}

// ============================================
// SUBTASK FUNCTIONS
// ============================================
function toggleExpand(taskId) {
  const { tasks } = store.getState();
  const updated = tasks.map((t) => (t.id === taskId ? { ...t, expanded: !t.expanded } : t));
  sounds.click();
  store.setState({ tasks: updated });
  saveTasks();
}

function toggleAddSubtask(taskId) {
  const { tasks } = store.getState();
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;
  const updated = tasks.map((t) => (t.id === taskId ? { ...t, expanded: !t.expanded } : t));
  sounds.click();
  store.setState({ tasks: updated });
  saveTasks();
  if (!task.expanded) {
    setTimeout(() => {
      const el = taskListEl.querySelector(`.task-item[data-id="${taskId}"] .subtask-input`);
      if (el) el.focus();
    }, 100);
  }
}

function addSubtaskFromInput(taskId) {
  const el = taskListEl.querySelector(`.task-item[data-id="${taskId}"] .subtask-input`);
  if (el && el.value.trim()) {
    addSubtask(taskId, el.value.trim());
    el.value = '';
    el.focus();
  }
}

function addSubtask(taskId, text) {
  if (text.length > MAX_SUBTASK_LENGTH) return;
  const { tasks } = store.getState();
  const task = tasks.find((t) => t.id === taskId);
  if (!task || (task.subtasks || []).length >= MAX_SUBTASKS_PER_TASK) return;

  const updatedTask = {
    ...task,
    subtasks: [...(task.subtasks || []), { id: generateId(), text, completed: false }],
    expanded: true,
  };
  sounds.pop();
  store.setState({ tasks: tasks.map((t) => (t.id === taskId ? updatedTask : t)) });
  saveTasks();
  announce(`Subtask added: ${text}`);
}

function toggleSubtask(taskId, subtaskId) {
  const { tasks } = store.getState();
  const task = tasks.find((t) => t.id === taskId);
  if (!task?.subtasks) return;
  const subtask = task.subtasks.find((st) => st.id === subtaskId);
  if (!subtask) return;

  const wasCompleted = subtask.completed;
  wasCompleted ? sounds.uncomplete() : sounds.complete();

  const updatedSubs = task.subtasks.map((st) =>
    st.id === subtaskId ? { ...st, completed: !st.completed } : st,
  );
  const updatedTask = { ...task, subtasks: updatedSubs };
  store.setState({ tasks: tasks.map((t) => (t.id === taskId ? updatedTask : t)) });
  saveTasks();

  if (!wasCompleted) {
    recordCompletion();
    updateCompletionBadge();
  }

  announce(
    wasCompleted ? `Subtask uncompleted: ${subtask.text}` : `Subtask completed: ${subtask.text}`,
  );

  if (updatedSubs.every((st) => st.completed)) {
    setTimeout(() => {
      sounds.fanfare();
      allComplete();
    }, 200);
  }
}

function deleteSubtask(taskId, subtaskId) {
  const { tasks } = store.getState();
  const task = tasks.find((t) => t.id === taskId);
  if (!task?.subtasks) return;
  sounds.remove();
  const updatedTask = { ...task, subtasks: task.subtasks.filter((st) => st.id !== subtaskId) };
  store.setState({ tasks: tasks.map((t) => (t.id === taskId ? updatedTask : t)) });
  saveTasks();
}

// ============================================
// PERSISTENCE
// ============================================
function saveTasks() {
  localStorage.setItem('today_tasks', JSON.stringify(store.getState().tasks));
}

// ============================================
// RENDERING HELPERS
// ============================================
function formatTaskTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getSubtaskProgress(task) {
  if (!task.subtasks || task.subtasks.length === 0) return '';
  const done = task.subtasks.filter((st) => st.completed).length;
  return `<span class="task-progress">${done}/${task.subtasks.length}</span>`;
}

function getDueBadge(task) {
  if (!task.dueDate) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.dueDate + 'T00:00:00');
  const diff = Math.floor((due - today) / (1000 * 60 * 60 * 24));

  if (diff < 0) return '<span class="due-badge due-overdue">Overdue</span>';
  if (diff === 0) return '<span class="due-badge due-today">Due today</span>';
  if (diff === 1) return '<span class="due-badge due-tomorrow">Tomorrow</span>';
  if (diff <= 7)
    return `<span class="due-badge due-upcoming">${due.toLocaleDateString('en-US', { weekday: 'short' })}</span>`;
  return `<span class="due-badge due-upcoming">${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>`;
}

function getStreakBadge(task) {
  if (!task.streak || task.streak <= 0) return '';
  return `<span class="streak-badge">\uD83D\uDD25 ${task.streak}</span>`;
}

function getProjectBadge(task) {
  if (!task.project) return '';
  const color = getProjectColor(task.project);
  return `<span class="project-badge" style="--badge-color: ${color}">${escapeHtml(task.project)}</span>`;
}

function renderSubtasks(task) {
  const subtasks = task.subtasks || [];
  const html = subtasks
    .map(
      (st) => `
    <li class="subtask-item ${st.completed ? 'completed' : ''}" data-subtask-id="${st.id}">
      <div class="subtask-checkbox ${st.completed ? 'checked' : ''}" role="checkbox" aria-checked="${st.completed}" tabindex="0">
        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </div>
      <span class="subtask-text">${escapeHtml(st.text)}</span>
      <button class="subtask-delete" aria-label="Delete subtask">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </li>`,
    )
    .join('');

  return `<div class="subtask-container">
    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;">${html}</ul>
    <div class="subtask-input-container">
      <input type="text" class="subtask-input" placeholder="Add subtask..." maxlength="${MAX_SUBTASK_LENGTH}">
      <button class="subtask-add-btn">Add</button>
    </div>
  </div>`;
}

// ============================================
// MAIN RENDER
// ============================================
function renderTasks() {
  if (!taskListEl) return;
  const { tasks, activeProject, focusedTaskId } = store.getState();

  // Filter by project
  let filtered = tasks;
  if (activeProject === 'none') {
    filtered = tasks.filter((t) => !t.project);
  } else if (activeProject && activeProject !== 'all') {
    filtered = tasks.filter((t) => t.project === activeProject);
  }

  if (filtered.length === 0) {
    taskListEl.innerHTML = `<li class="empty-state">
      <div class="empty-illustration">\u2728</div>
      <h3 class="empty-title">Your day is wide open</h3>
      <p class="empty-subtitle">Add your first task to get started</p>
    </li>`;
    return;
  }

  // Sort: completion → priority → dueDate → createdAt
  const sorted = [...filtered].sort((a, b) => {
    const ac = a.subtasks?.length > 0 ? a.subtasks.every((st) => st.completed) : a.completed;
    const bc = b.subtasks?.length > 0 ? b.subtasks.every((st) => st.completed) : b.completed;
    if (ac !== bc) return ac ? 1 : -1;

    const pa = PRIORITY_ORDER[a.priority || 'none'] ?? 3;
    const pb = PRIORITY_ORDER[b.priority || 'none'] ?? 3;
    if (pa !== pb) return pa - pb;

    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;

    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  taskListEl.innerHTML = sorted
    .map((task) => {
      const hasSub = task.subtasks && task.subtasks.length > 0;
      const exp = task.expanded || false;
      const allDone = hasSub && task.subtasks.every((st) => st.completed);
      const isFocused = task.id === focusedTaskId;
      const timeStr = formatTimeSpent(task.timeSpent);

      return `<li class="task-item ${task.completed || allDone ? 'completed' : ''} ${hasSub ? 'has-subtasks' : ''} ${exp ? 'expanded' : ''} ${isFocused ? 'focused' : ''}" data-id="${task.id}">
        ${
          hasSub
            ? `<button class="task-expand" aria-label="Expand subtasks" aria-expanded="${exp}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>`
            : `<div class="task-checkbox ${task.completed ? 'checked' : ''}" role="checkbox" aria-checked="${task.completed}" tabindex="0">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>`
        }
        ${task.priority && task.priority !== 'none' ? `<div class="priority-dot priority-${task.priority}" title="Priority: ${task.priority}"></div>` : ''}
        <div class="task-content">
          <span class="task-text">${escapeHtml(task.text)}${getSubtaskProgress(task)}${getProjectBadge(task)}${getStreakBadge(task)}${timeStr ? `<span class="task-time-spent">${timeStr} spent</span>` : ''}</span>
          <span class="task-time">${formatTaskTime(task.createdAt || task.id)}${getDueBadge(task)}${task.recurrence ? ' <span class="recurrence-indicator">\u{1F501}</span>' : ''}</span>
        </div>
        <button class="task-start-focus" aria-label="Start focus timer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </button>
        <button class="task-add-subtask" aria-label="${exp ? 'Collapse' : 'Add subtask'}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            ${exp ? '<line x1="5" y1="12" x2="19" y2="12"></line>' : '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>'}
          </svg>
        </button>
        <button class="task-delete" aria-label="Delete task">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        ${exp ? renderSubtasks(task) : ''}
      </li>`;
    })
    .join('');
}
