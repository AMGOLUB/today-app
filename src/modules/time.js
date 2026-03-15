let intervalId = null;

export function initTime() {
  updateTime();
  intervalId = setInterval(updateTime, 1000);
}

export function destroyTime() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function updateTime() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');

  const displayHours = hours % 12 || 12;

  const timeEl = document.getElementById('timeDisplay');
  if (timeEl) timeEl.textContent = `${displayHours}:${minutes}`;

  let timeOfDay = 'morning';
  if (hours >= 12 && hours < 17) timeOfDay = 'afternoon';
  else if (hours >= 17) timeOfDay = 'evening';

  const todEl = document.getElementById('timeOfDay');
  if (todEl) todEl.textContent = timeOfDay;

  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  const dateEl = document.getElementById('dateDisplay');
  if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', options);
}
