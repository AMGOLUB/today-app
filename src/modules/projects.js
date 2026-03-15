import { store } from './store.js';
import { sounds } from './sounds.js';

const PROJECT_COLORS = {
  Personal: '#818cf8',
  Work: '#f472b6',
  Health: '#34d399',
  Study: '#fbbf24',
  Home: '#fb923c',
};

let filterBar;

export function initProjects() {
  filterBar = document.getElementById('projectFilterBar');
  if (!filterBar) return;

  renderFilterBar();
  store.subscribe(renderFilterBar);

  // Event delegation on filter bar
  filterBar.addEventListener('click', handleFilterClick);
}

export function getProjectColor(name) {
  return PROJECT_COLORS[name] || '#888';
}

function handleFilterClick(e) {
  const pill = e.target.closest('.project-filter-pill');
  if (!pill) return;

  sounds.click();
  const project = pill.dataset.project;
  store.setState({ activeProject: project });
  localStorage.setItem('today_active_project', project);
}

function renderFilterBar() {
  const { projects, activeProject, tasks } = store.getState();

  // Count tasks per project
  const allCount = tasks.length;
  const counts = {};
  projects.forEach((p) => {
    counts[p] = tasks.filter((t) => t.project === p).length;
  });
  const noProjectCount = tasks.filter((t) => !t.project).length;

  filterBar.innerHTML = `
    <button class="project-filter-pill ${activeProject === 'all' ? 'active' : ''}"
            data-project="all" aria-label="Show all tasks">
      All <span class="filter-count">${allCount}</span>
    </button>
    ${projects
      .map(
        (p) => `
      <button class="project-filter-pill ${activeProject === p ? 'active' : ''}"
              data-project="${p}" aria-label="Filter by ${p}"
              style="--pill-color: ${getProjectColor(p)}">
        <span class="pill-dot" style="background: ${getProjectColor(p)}"></span>
        ${p} <span class="filter-count">${counts[p] || 0}</span>
      </button>
    `,
      )
      .join('')}
    ${
      noProjectCount > 0
        ? `
      <button class="project-filter-pill ${activeProject === 'none' ? 'active' : ''}"
              data-project="none" aria-label="Tasks without project">
        No project <span class="filter-count">${noProjectCount}</span>
      </button>
    `
        : ''
    }
  `;
}
