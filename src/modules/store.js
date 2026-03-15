function createStore(initialState) {
  let state = { ...initialState };
  const listeners = new Set();

  return {
    getState() {
      return state;
    },

    setState(partial) {
      state = { ...state, ...partial };
      listeners.forEach((fn) => fn(state));
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

// Load persisted state
const savedTasks = JSON.parse(localStorage.getItem('today_tasks') || '[]');
const savedTheme = localStorage.getItem('today_theme') || 'minimal';
const savedSound = localStorage.getItem('today_sound') !== 'false';

// Username: env var > localStorage > default
const envUsername =
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_USERNAME;
const savedUsername = localStorage.getItem('today_username') || envUsername || 'Aiden';

export const store = createStore({
  tasks: savedTasks,
  theme: savedTheme,
  soundEnabled: savedSound,
  username: savedUsername,
  syncStatus: { status: 'offline', text: 'Local Only' },
});
