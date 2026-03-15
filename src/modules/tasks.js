import { store } from './store.js';
import { sounds } from './sounds.js';
import {
  escapeHtml,
  generateId,
  MAX_TASK_LENGTH,
  MAX_SUBTASK_LENGTH,
  MAX_TASKS,
  MAX_SUBTASKS_PER_TASK,
} from './utils.js';
import { saveTaskToFirebase, deleteTaskFromFirebase, updateTaskInFirebase } from './firebase.js';

let taskListEl, announcer;

// ============================================
// DATA MIGRATION — handle old numeric IDs
// ============================================
function migrateTasks(tasks) {
  return tasks.map((task) => ({
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
  store.setState({ tasks: migrated });

  // Day reset — clear completed tasks on new day
  const today = new Date().toDateString();
  const lastDate = localStorage.getItem('today_date');
  if (lastDate !== today) {
    const current = store.getState().tasks;
    const filtered = current.filter((t) => {
      if (t.subtasks && t.subtasks.length > 0) {
        return !t.subtasks.every((st) => st.completed);
      }
      return !t.completed;
    });
    store.setState({ tasks: filtered });
    localStorage.setItem('today_date', today);
  }

  // Event delegation on the task list
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

  // Subscribe to store — re-render on any task change
  store.subscribe(renderTasks);

  // Initial render
  renderTasks();
}

// ============================================
// EVENT DELEGATION
// ============================================
function handleTaskListClick(e) {
  const taskItem = e.target.closest('.task-item');
  if (!taskItem) return;
  const taskId = taskItem.dataset.id;

  if (e.target.closest('.task-checkbox')) {
    toggleTask(taskId);
    return;
  }
  if (e.target.closest('.task-delete')) {
    deleteTask(taskId);
    return;
  }
  if (e.target.closest('.task-expand')) {
    toggleExpand(taskId);
    return;
  }
  if (e.target.closest('.task-add-subtask')) {
    toggleAddSubtask(taskId);
    return;
  }
  if (e.target.closest('.subtask-checkbox')) {
    const subtaskItem = e.target.closest('.subtask-item');
    if (subtaskItem) toggleSubtask(taskId, subtaskItem.dataset.subtaskId);
    return;
  }
  if (e.target.closest('.subtask-delete')) {
    const subtaskItem = e.target.closest('.subtask-item');
    if (subtaskItem) deleteSubtask(taskId, subtaskItem.dataset.subtaskId);
    return;
  }
  if (e.target.closest('.subtask-add-btn')) {
    addSubtaskFromInput(taskId);
    return;
  }
}

function handleTaskListKeydown(e) {
  // Enter on subtask input
  if (e.key === 'Enter' && e.target.classList.contains('subtask-input')) {
    const taskItem = e.target.closest('.task-item');
    if (taskItem) addSubtaskFromInput(taskItem.dataset.id);
    return;
  }

  // Space/Enter on custom checkboxes
  if (e.key === 'Enter' || e.key === ' ') {
    if (e.target.classList.contains('task-checkbox')) {
      e.preventDefault();
      const taskItem = e.target.closest('.task-item');
      if (taskItem) toggleTask(taskItem.dataset.id);
      return;
    }
    if (e.target.classList.contains('subtask-checkbox')) {
      e.preventDefault();
      const taskItem = e.target.closest('.task-item');
      const subtaskItem = e.target.closest('.subtask-item');
      if (taskItem && subtaskItem) {
        toggleSubtask(taskItem.dataset.id, subtaskItem.dataset.subtaskId);
      }
    }
  }
}

// ============================================
// ANNOUNCE (accessibility)
// ============================================
function announce(message) {
  if (announcer) announcer.textContent = message;
}

// ============================================
// TASK CRUD
// ============================================
function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  if (trimmed.length > MAX_TASK_LENGTH) return;

  const { tasks } = store.getState();
  if (tasks.length >= MAX_TASKS) return;

  const newTask = {
    id: generateId(),
    text: trimmed,
    completed: false,
    subtasks: [],
    expanded: false,
    createdAt: Date.now(),
  };

  store.setState({ tasks: [...tasks, newTask] });
  saveTasks();
  saveTaskToFirebase(newTask);
  announce(`Task added: ${trimmed}`);
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
      announce(wasCompleted ? `Task uncompleted: ${task.text}` : `Task completed: ${task.text}`);

      // Check for 100% completion
      const total = updated.length;
      const completed = updated.filter((t) => t.completed).length;
      if (total > 0 && completed === total && !wasCompleted) {
        setTimeout(() => sounds.fanfare(), 200);
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
    if (t.subtasks && t.subtasks.length > 0) {
      return t.subtasks.every((st) => st.completed);
    }
    return t.completed;
  });

  if (completedTasks.length > 0) {
    sounds.remove();
    completedTasks.forEach((t) => deleteTaskFromFirebase(t.id));
    store.setState({
      tasks: tasks.filter((t) => !completedTasks.some((ct) => ct.id === t.id)),
    });
    saveTasks();
    announce(`Cleared ${completedTasks.length} completed tasks`);
  }
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
  const task = updated.find((t) => t.id === taskId);
  if (task) saveTaskToFirebase(task);
}

function toggleAddSubtask(taskId) {
  const { tasks } = store.getState();
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  const updated = tasks.map((t) => (t.id === taskId ? { ...t, expanded: !t.expanded } : t));
  sounds.click();
  store.setState({ tasks: updated });
  saveTasks();
  saveTaskToFirebase({ ...task, expanded: !task.expanded });

  // Focus the input if expanding
  if (!task.expanded) {
    setTimeout(() => {
      const taskEl = taskListEl.querySelector(`.task-item[data-id="${taskId}"]`);
      const input = taskEl?.querySelector('.subtask-input');
      if (input) input.focus();
    }, 100);
  }
}

function addSubtaskFromInput(taskId) {
  const taskEl = taskListEl.querySelector(`.task-item[data-id="${taskId}"]`);
  const input = taskEl?.querySelector('.subtask-input');
  if (input && input.value.trim()) {
    addSubtask(taskId, input.value.trim());
    input.value = '';
    input.focus();
  }
}

function addSubtask(taskId, text) {
  if (text.length > MAX_SUBTASK_LENGTH) return;

  const { tasks } = store.getState();
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  const subtasks = task.subtasks || [];
  if (subtasks.length >= MAX_SUBTASKS_PER_TASK) return;

  const newSubtask = {
    id: generateId(),
    text,
    completed: false,
  };

  const updatedTask = {
    ...task,
    subtasks: [...subtasks, newSubtask],
    expanded: true,
  };

  const updated = tasks.map((t) => (t.id === taskId ? updatedTask : t));
  sounds.pop();
  store.setState({ tasks: updated });
  saveTasks();
  saveTaskToFirebase(updatedTask);
  announce(`Subtask added: ${text}`);
}

function toggleSubtask(taskId, subtaskId) {
  const { tasks } = store.getState();
  const task = tasks.find((t) => t.id === taskId);
  if (!task || !task.subtasks) return;

  const subtask = task.subtasks.find((st) => st.id === subtaskId);
  if (!subtask) return;

  const wasCompleted = subtask.completed;
  if (!wasCompleted) {
    sounds.complete();
  } else {
    sounds.uncomplete();
  }

  const updatedSubtasks = task.subtasks.map((st) =>
    st.id === subtaskId ? { ...st, completed: !st.completed } : st,
  );
  const updatedTask = { ...task, subtasks: updatedSubtasks };
  const updated = tasks.map((t) => (t.id === taskId ? updatedTask : t));

  store.setState({ tasks: updated });
  saveTasks();
  saveTaskToFirebase(updatedTask);

  announce(
    wasCompleted ? `Subtask uncompleted: ${subtask.text}` : `Subtask completed: ${subtask.text}`,
  );

  // Check if all subtasks are done
  if (updatedSubtasks.every((st) => st.completed)) {
    setTimeout(() => sounds.fanfare(), 200);
  }
}

function deleteSubtask(taskId, subtaskId) {
  const { tasks } = store.getState();
  const task = tasks.find((t) => t.id === taskId);
  if (!task || !task.subtasks) return;

  const subtask = task.subtasks.find((st) => st.id === subtaskId);
  sounds.remove();

  const updatedTask = {
    ...task,
    subtasks: task.subtasks.filter((st) => st.id !== subtaskId),
  };
  const updated = tasks.map((t) => (t.id === taskId ? updatedTask : t));

  store.setState({ tasks: updated });
  saveTasks();
  saveTaskToFirebase(updatedTask);
  if (subtask) announce(`Subtask deleted: ${subtask.text}`);
}

// ============================================
// PERSISTENCE
// ============================================
function saveTasks() {
  localStorage.setItem('today_tasks', JSON.stringify(store.getState().tasks));
}

// ============================================
// RENDERING
// ============================================
function formatTaskTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getSubtaskProgress(task) {
  if (!task.subtasks || task.subtasks.length === 0) return '';
  const done = task.subtasks.filter((st) => st.completed).length;
  return `<span class="task-progress">${done}/${task.subtasks.length}</span>`;
}

function renderSubtasks(task) {
  const subtasks = task.subtasks || [];

  const subtasksHtml = subtasks
    .map(
      (subtask) => `
    <li class="subtask-item ${subtask.completed ? 'completed' : ''}" data-subtask-id="${subtask.id}">
      <div class="subtask-checkbox ${subtask.completed ? 'checked' : ''}"
           role="checkbox" aria-checked="${subtask.completed}" tabindex="0"
           aria-label="Mark subtask ${subtask.completed ? 'incomplete' : 'complete'}">
        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </div>
      <span class="subtask-text">${escapeHtml(subtask.text)}</span>
      <button class="subtask-delete" aria-label="Delete subtask">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </li>
  `,
    )
    .join('');

  return `
    <div class="subtask-container">
      <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;">
        ${subtasksHtml}
      </ul>
      <div class="subtask-input-container">
        <input type="text" class="subtask-input" placeholder="Add subtask..."
               maxlength="${MAX_SUBTASK_LENGTH}" aria-label="New subtask text">
        <button class="subtask-add-btn" aria-label="Add subtask">Add</button>
      </div>
    </div>
  `;
}

function renderTasks() {
  if (!taskListEl) return;

  const { tasks } = store.getState();

  if (tasks.length === 0) {
    taskListEl.innerHTML = `
      <li class="empty-state">
        <div class="empty-illustration">\u2728</div>
        <h3 class="empty-title">Your day is wide open</h3>
        <p class="empty-subtitle">Add your first task to get started</p>
      </li>
    `;
    return;
  }

  // Sort: incomplete first, then by creation time (newest first for incomplete)
  const sortedTasks = [...tasks].sort((a, b) => {
    const aComplete = a.subtasks?.length > 0 ? a.subtasks.every((st) => st.completed) : a.completed;
    const bComplete = b.subtasks?.length > 0 ? b.subtasks.every((st) => st.completed) : b.completed;

    if (aComplete !== bComplete) return aComplete ? 1 : -1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  taskListEl.innerHTML = sortedTasks
    .map((task) => {
      const hasSubtasks = task.subtasks && task.subtasks.length > 0;
      const isExpanded = task.expanded || false;
      const allSubtasksDone = hasSubtasks && task.subtasks.every((st) => st.completed);

      return `
      <li class="task-item ${task.completed || allSubtasksDone ? 'completed' : ''} ${hasSubtasks ? 'has-subtasks' : ''} ${isExpanded ? 'expanded' : ''}" data-id="${task.id}">
        ${
          hasSubtasks
            ? `
          <button class="task-expand" aria-label="Expand subtasks" aria-expanded="${isExpanded}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        `
            : `
          <div class="task-checkbox ${task.completed ? 'checked' : ''}"
               role="checkbox" aria-checked="${task.completed}" tabindex="0"
               aria-label="Mark task ${task.completed ? 'incomplete' : 'complete'}">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
        `
        }
        <div class="task-content">
          <span class="task-text">${escapeHtml(task.text)}${getSubtaskProgress(task)}</span>
          <span class="task-time">Added at ${formatTaskTime(task.createdAt || task.id)}</span>
        </div>
        <button class="task-add-subtask" aria-label="${isExpanded ? 'Collapse' : 'Add subtask'}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            ${
              isExpanded
                ? '<line x1="5" y1="12" x2="19" y2="12"></line>'
                : '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>'
            }
          </svg>
        </button>
        <button class="task-delete" aria-label="Delete task">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        ${isExpanded ? renderSubtasks(task) : ''}
      </li>
    `;
    })
    .join('');
}
