import { sounds } from './sounds.js';

let overlay, modal;

export function initReview() {
  overlay = document.getElementById('reviewOverlay');
  modal = document.getElementById('reviewModal');
  if (!overlay || !modal) return;

  document.getElementById('reviewBtn')?.addEventListener('click', openReview);
  overlay.addEventListener('click', closeReview);
  modal.querySelector('.review-modal-close')?.addEventListener('click', closeReview);
}

export function recordCompletion() {
  const history = getHistory();
  const today = new Date().toISOString().split('T')[0];
  history[today] = (history[today] || 0) + 1;
  localStorage.setItem('today_completion_history', JSON.stringify(history));
}

function getHistory() {
  return JSON.parse(localStorage.getItem('today_completion_history') || '{}');
}

function openReview() {
  sounds.click();
  renderReview();
  overlay.classList.add('open');
  modal.classList.add('open');
}

function closeReview() {
  sounds.click();
  overlay.classList.remove('open');
  modal.classList.remove('open');
}

function renderReview() {
  const content = modal.querySelector('.review-content');
  if (!content) return;

  const history = getHistory();
  const today = new Date();

  // Last 7 days data
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    days.push({ key, dayName, count: history[key] || 0 });
  }

  const todayCount = days[6].count;
  const weekTotal = days.reduce((sum, d) => sum + d.count, 0);
  const maxCount = Math.max(...days.map((d) => d.count), 1);
  const bestDay = days.reduce((best, d) => (d.count > best.count ? d : best), days[0]);

  // All-time stats
  const allCounts = Object.values(history);
  const allTimeTotal = allCounts.reduce((sum, c) => sum + c, 0);

  content.innerHTML = `
    <div class="review-stats">
      <div class="review-stat">
        <div class="review-stat-number">${todayCount}</div>
        <div class="review-stat-label">Today</div>
      </div>
      <div class="review-stat">
        <div class="review-stat-number">${weekTotal}</div>
        <div class="review-stat-label">This Week</div>
      </div>
      <div class="review-stat">
        <div class="review-stat-number">${allTimeTotal}</div>
        <div class="review-stat-label">All Time</div>
      </div>
    </div>

    <div class="review-chart">
      ${days
        .map(
          (d) => `
        <div class="review-chart-col">
          <div class="review-chart-bar" style="height: ${(d.count / maxCount) * 100}%">
            ${d.count > 0 ? `<span class="review-chart-value">${d.count}</span>` : ''}
          </div>
          <div class="review-chart-label">${d.dayName}</div>
        </div>
      `,
        )
        .join('')}
    </div>

    ${weekTotal > 0 ? `<div class="review-summary">Your most productive day was <strong>${bestDay.dayName}</strong> with ${bestDay.count} tasks!</div>` : '<div class="review-summary">Complete some tasks to see your stats!</div>'}
  `;
}
