import { store } from './store.js';
import { sounds } from './sounds.js';
import { generateId } from './utils.js';

const BUILTIN_TEMPLATES = [
  {
    id: 'weekly-review',
    name: 'Weekly Review',
    builtin: true,
    tasks: [
      { text: 'Review completed tasks', priority: 'high' },
      { text: 'Plan next week goals', priority: 'medium' },
      { text: 'Clear inbox', priority: 'low' },
    ],
  },
  {
    id: 'morning-routine',
    name: 'Morning Routine',
    builtin: true,
    tasks: [
      { text: 'Exercise', priority: 'high', recurrence: { type: 'daily' } },
      { text: 'Review calendar', priority: 'medium' },
      { text: 'Set top 3 priorities', priority: 'high' },
    ],
  },
  {
    id: 'study-session',
    name: 'Study Session',
    builtin: true,
    tasks: [
      { text: 'Review notes', priority: 'medium' },
      { text: 'Practice problems', priority: 'high' },
      { text: 'Summary write-up', priority: 'low' },
    ],
  },
];

let overlay, modal;

export function initTemplates() {
  overlay = document.getElementById('templatesOverlay');
  modal = document.getElementById('templatesModal');
  if (!overlay || !modal) return;

  document.getElementById('templatesBtn')?.addEventListener('click', openModal);
  overlay.addEventListener('click', closeModal);
  modal.querySelector('.templates-modal-close')?.addEventListener('click', closeModal);

  // Save template button
  document.getElementById('saveTemplateBtn')?.addEventListener('click', saveCurrentAsTemplate);
}

function getAllTemplates() {
  const custom = JSON.parse(localStorage.getItem('today_templates') || '[]');
  return [...BUILTIN_TEMPLATES, ...custom];
}

function openModal() {
  sounds.click();
  renderTemplates();
  overlay.classList.add('open');
  modal.classList.add('open');
}

function closeModal() {
  sounds.click();
  overlay.classList.remove('open');
  modal.classList.remove('open');
}

function renderTemplates() {
  const grid = modal.querySelector('.templates-grid');
  if (!grid) return;

  const templates = getAllTemplates();
  grid.innerHTML = templates
    .map(
      (t) => `
    <div class="template-card" data-id="${t.id}">
      <div class="template-name">${t.name}</div>
      <div class="template-preview">${t.tasks.map((task) => `<div class="template-task-preview">${task.text}</div>`).join('')}</div>
      <div class="template-actions">
        <button class="template-apply" data-id="${t.id}">Use Template</button>
        ${!t.builtin ? `<button class="template-delete" data-id="${t.id}">Delete</button>` : ''}
      </div>
    </div>
  `,
    )
    .join('');

  grid.addEventListener('click', handleGridClick);
}

function handleGridClick(e) {
  const applyBtn = e.target.closest('.template-apply');
  if (applyBtn) {
    applyTemplate(applyBtn.dataset.id);
    return;
  }
  const deleteBtn = e.target.closest('.template-delete');
  if (deleteBtn) {
    deleteTemplate(deleteBtn.dataset.id);
    return;
  }
}

function applyTemplate(templateId) {
  const templates = getAllTemplates();
  const template = templates.find((t) => t.id === templateId);
  if (!template) return;

  const { tasks } = store.getState();
  const newTasks = template.tasks.map((t) => ({
    id: generateId(),
    text: t.text,
    completed: false,
    subtasks: [],
    expanded: false,
    createdAt: Date.now(),
    priority: t.priority || 'none',
    dueDate: null,
    dueTime: null,
    project: null,
    tags: [],
    recurrence: t.recurrence || null,
    streak: 0,
    lastCompletedDate: null,
    timeSpent: 0,
  }));

  store.setState({ tasks: [...tasks, ...newTasks] });
  localStorage.setItem('today_tasks', JSON.stringify(store.getState().tasks));
  sounds.pop();
  closeModal();
}

function deleteTemplate(templateId) {
  const custom = JSON.parse(localStorage.getItem('today_templates') || '[]');
  const filtered = custom.filter((t) => t.id !== templateId);
  localStorage.setItem('today_templates', JSON.stringify(filtered));
  renderTemplates();
  sounds.remove();
}

function saveCurrentAsTemplate() {
  const { tasks } = store.getState();
  if (tasks.length === 0) return;

  const name = prompt('Template name:');
  if (!name) return;

  const template = {
    id: generateId(),
    name,
    builtin: false,
    tasks: tasks.map((t) => ({
      text: t.text,
      priority: t.priority || 'none',
      recurrence: t.recurrence || null,
    })),
  };

  const custom = JSON.parse(localStorage.getItem('today_templates') || '[]');
  custom.push(template);
  localStorage.setItem('today_templates', JSON.stringify(custom));
  sounds.pop();
}
