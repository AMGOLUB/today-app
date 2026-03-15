import { store } from './store.js';
import { sounds } from './sounds.js';

export const THEMES = [
  {
    id: 'minimal',
    name: 'Minimal',
    gradient: 'linear-gradient(135deg, #faf9f7 0%, #f0efed 100%)',
  },
  {
    id: 'sunrise',
    name: 'Sunrise',
    gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 50%, #ff9a9e 100%)',
  },
  {
    id: 'forest',
    name: 'Forest',
    gradient: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 50%, #84fab0 100%)',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    gradient: 'linear-gradient(135deg, #a8edea 0%, #89d4cf 50%, #667eea 100%)',
  },
  {
    id: 'mountain',
    name: 'Mountain',
    gradient: 'linear-gradient(135deg, #d5d5d5 0%, #c4c4c4 50%, #8e9eab 100%)',
  },
  {
    id: 'sakura',
    name: 'Sakura',
    gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb6bb 50%, #ff9a9e 100%)',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    gradient: 'linear-gradient(135deg, #e0c3fc 0%, #c4b5fd 50%, #a78bfa 100%)',
  },
  {
    id: 'mint',
    name: 'Mint',
    gradient: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #6ee7b7 100%)',
  },
  {
    id: 'peach',
    name: 'Peach',
    gradient: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 50%, #fb923c 100%)',
  },
];

// Cached DOM references
let bgLayer, themeGrid, themeDot, themeOverlay, themeModal;

export function initThemes() {
  bgLayer = document.getElementById('bgLayer');
  themeGrid = document.getElementById('themeGrid');
  themeDot = document.querySelector('.theme-btn .dot');
  themeOverlay = document.getElementById('themeOverlay');
  themeModal = document.getElementById('themeModal');

  renderThemeGrid();
  setTheme(store.getState().theme);

  document.getElementById('themeBtn').addEventListener('click', openThemeModal);
  themeOverlay.addEventListener('click', closeThemeModal);
  document.getElementById('themeClose').addEventListener('click', closeThemeModal);

  // Event delegation on the grid — single listener, no leaks
  themeGrid.addEventListener('click', handleThemeClick);
}

function renderThemeGrid() {
  const currentTheme = store.getState().theme;
  themeGrid.innerHTML = THEMES.map(
    (theme) => `
    <div class="theme-card ${currentTheme === theme.id ? 'active' : ''}"
         data-id="${theme.id}"
         data-name="${theme.name}"
         style="background: ${theme.gradient};"
         role="button"
         aria-label="Theme: ${theme.name}"
         tabindex="0">
    </div>
  `,
  ).join('');
}

function handleThemeClick(e) {
  const card = e.target.closest('.theme-card');
  if (!card) return;
  sounds.themeChange();
  setTheme(card.dataset.id);
  closeThemeModal();
}

function setTheme(themeId) {
  const theme = THEMES.find((t) => t.id === themeId);
  if (!theme) return;

  store.setState({ theme: themeId });
  localStorage.setItem('today_theme', themeId);

  bgLayer.style.background = theme.gradient;
  bgLayer.classList.add('active');

  // Update active state in grid
  themeGrid.querySelectorAll('.theme-card').forEach((card) => {
    card.classList.toggle('active', card.dataset.id === themeId);
  });

  // Update theme button dot
  if (themeDot) {
    themeDot.style.background = theme.gradient;
  }
}

function openThemeModal() {
  sounds.click();
  themeOverlay.classList.add('open');
  themeModal.classList.add('open');
}

function closeThemeModal() {
  sounds.click();
  themeOverlay.classList.remove('open');
  themeModal.classList.remove('open');
}
