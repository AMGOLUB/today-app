export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function generateId() {
  return crypto.randomUUID();
}

export const MAX_TASK_LENGTH = 500;
export const MAX_SUBTASK_LENGTH = 200;
export const MAX_TASKS = 100;
export const MAX_SUBTASKS_PER_TASK = 20;

export const QUOTES = [
  'The secret of getting ahead is getting started.',
  'Small steps every day lead to big changes.',
  'Focus on progress, not perfection.',
  "You don't have to be great to start, but you have to start to be great.",
  'The best time to plant a tree was 20 years ago. The second best time is now.',
  'Done is better than perfect.',
  'Every accomplishment starts with the decision to try.',
  'Your future is created by what you do today.',
  'Progress is progress, no matter how small.',
  'The only way to do great work is to love what you do.',
];
