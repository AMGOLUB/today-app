export function processRecurrence(tasks) {
  const today = new Date().toDateString();

  return tasks.map((task) => {
    if (!task.recurrence) return task;

    if (
      task.completed ||
      (task.subtasks?.length > 0 && task.subtasks.every((st) => st.completed))
    ) {
      // Completed recurring task → reset for next day, increment streak
      return {
        ...task,
        completed: false,
        subtasks: (task.subtasks || []).map((st) => ({ ...st, completed: false })),
        streak: (task.streak || 0) + 1,
        lastCompletedDate: today,
      };
    }

    // Not completed → check if streak should reset
    if (task.lastCompletedDate && task.lastCompletedDate !== today) {
      const lastDate = new Date(task.lastCompletedDate);
      const now = new Date();
      const daysDiff = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

      if (daysDiff > 1) {
        return { ...task, streak: 0 };
      }
    }

    return task;
  });
}

export function shouldRecur(task) {
  if (!task.recurrence) return false;
  const { type } = task.recurrence;
  const now = new Date();

  switch (type) {
    case 'daily':
      return true;
    case 'weekly': {
      const days = task.recurrence.days || [];
      return days.includes(now.getDay());
    }
    case 'monthly':
      return now.getDate() === (task.recurrence.dayOfMonth || 1);
    default:
      return true;
  }
}
