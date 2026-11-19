// Leonida Trophy Guide — bootstrap: load the trophy data, wire the tracker
// controls (filters, search, spoiler setting, export/import), the two views
// (checklist and platinum roadmap) and the detail panel. The app fetches one
// file of its own, data/trophies.json, and nothing else.
import {
  loadProgress,
  saveProgress,
  exportProgress,
  parseImportedProgress,
  resetProgress,
} from './store.js';
import {
  SPOILER_STORAGE_KEY,
  countByKind,
  filterTrophies,
  renderProgress,
  renderTrophyList,
  renderTrophyDetail,
  clearTrophyDetail,
} from './render.js';
import { renderRoadmap } from './roadmap.js';

// Load the trophy data (one relative fetch of the app's own data file).
async function loadTrophyData() {
  const response = await fetch('data/trophies.json');
  if (!response.ok) throw new Error(`could not load data/trophies.json: ${response.status}`);
  const doc = await response.json();
  return doc.trophies;
}

// Read the deep-link state from the URL (?view=roadmap, ?filter=story,
// ?grade=silver, ?spoilers=on, ?open=28, ?q=meditation), so a view can be
// shared as a link and screenshots can open an exact state.
function readUrlState() {
  const params = new URLSearchParams(location.search);
  const view = params.get('view') === 'roadmap' ? 'roadmap' : 'checklist';
  const kinds = ['all', 'story', 'missable', 'collectibles', 'activities', 'online'];
  const kind = kinds.includes(params.get('filter')) ? params.get('filter') : 'all';
  const grades = ['all', 'platinum', 'gold', 'silver', 'bronze'];
  const grade = grades.includes(params.get('grade')) ? params.get('grade') : 'all';
  const spoilers = params.get('spoilers') === 'on';
  const open = Number(params.get('open')) || null;
  const query = params.get('q') ?? '';
  return { view, kind, grade, spoilers, open, query };
}

// Keep the URL in step with the controls, without reloading the page.
function writeUrlState(state) {
  const params = new URLSearchParams();
  if (state.view === 'roadmap') params.set('view', 'roadmap');
  if (state.kind !== 'all') params.set('filter', state.kind);
  if (state.grade !== 'all') params.set('grade', state.grade);
  if (state.spoilers) params.set('spoilers', 'on');
  if (state.selected) params.set('open', String(state.selected));
  if (state.query) params.set('q', state.query);
  const url = `${location.pathname}${params.toString() ? `?${params}` : ''}`;
  history.replaceState(null, '', url);
}

async function boot() {
  const trophies = await loadTrophyData();
  const byId = new Map(trophies.map((t) => [t.id, t]));
  const byName = new Map(trophies.map((t) => [t.name, t]));
  let earned = loadProgress();
  const initial = readUrlState();
  const state = {
    view: initial.view,
    kind: initial.kind,
    grade: initial.grade,
    query: initial.query,
    spoilers: initial.spoilers || localStorage.getItem(SPOILER_STORAGE_KEY) === 'on',
    selected: initial.open ? byId.get(initial.open)?.name ?? null : null,
  };

  const listEl = document.getElementById('trophyList');
  const emptyEl = document.getElementById('emptyState');
  const searchEl = document.getElementById('search');
  const gradeEl = document.getElementById('grade');
  const spoilersEl = document.getElementById('spoilers');
  searchEl.value = state.query;
  gradeEl.value = state.grade;
  spoilersEl.checked = state.spoilers;

  // Filter button counts (All 55, Story 17, Missable 1, ...).
  const counts = countByKind(trophies);
  document.getElementById('countAll').textContent = counts.all;
  document.getElementById('countStory').textContent = counts.story;
  document.getElementById('countMissable').textContent = counts.missable;
  document.getElementById('countCollectibles').textContent = counts.collectibles;
  document.getElementById('countActivities').textContent = counts.activities;
  document.getElementById('countOnline').textContent = counts.online;

  function refresh() {
    const visible = filterTrophies(trophies, state);
    renderTrophyList(listEl, emptyEl, visible, {
      earned,
      spoilersOn: state.spoilers,
      selected: state.selected,
      onSelect: selectTrophy,
      onToggle: toggleTrophy,
    });
    renderProgress(earned, trophies.length);
    if (state.selected) {
      const trophy = byName.get(state.selected);
      if (trophy) renderTrophyDetail(trophy, earned, state.spoilers);
    }
    writeUrlState(state);
  }

  function selectTrophy(name) {
    state.selected = name;
    refresh();
  }

  function toggleTrophy(name) {
    if (earned.has(name)) earned.delete(name);
    else earned.add(name);
    saveProgress(earned);
    refresh();
  }

  // The detail panel's own Earned checkbox reports back through this event.
  document.addEventListener('progress-changed', () => {
    earned = loadProgress();
    refresh();
  });

  // Tabs: checklist vs platinum roadmap.
  function setView(view) {
    state.view = view;
    document.getElementById('tabChecklist').classList.toggle('active', view === 'checklist');
    document.getElementById('tabRoadmap').classList.toggle('active', view === 'roadmap');
    document.getElementById('checklistView').hidden = view !== 'checklist';
    document.getElementById('roadmapView').hidden = view !== 'roadmap';
    if (view === 'roadmap') renderRoadmap(document.getElementById('roadmapStages'), trophies);
    writeUrlState(state);
  }
  document.getElementById('tabChecklist').addEventListener('click', () => setView('checklist'));
  document.getElementById('tabRoadmap').addEventListener('click', () => setView('roadmap'));

  // Filter buttons.
  for (const button of document.querySelectorAll('.filter')) {
    button.addEventListener('click', () => {
      state.kind = button.dataset.kind;
      for (const other of document.querySelectorAll('.filter')) {
        other.classList.toggle('active', other === button);
      }
      refresh();
    });
    button.classList.toggle('active', button.dataset.kind === state.kind);
  }

  gradeEl.addEventListener('change', () => {
    state.grade = gradeEl.value;
    refresh();
  });
  searchEl.addEventListener('input', () => {
    state.query = searchEl.value;
    refresh();
  });

  // Spoiler setting: hide story trophies' names and descriptions until earned.
  // The choice is remembered in this browser.
  spoilersEl.addEventListener('change', () => {
    state.spoilers = spoilersEl.checked;
    localStorage.setItem(SPOILER_STORAGE_KEY, state.spoilers ? 'on' : 'off');
    refresh();
  });

  // Export, import and reset.
  document.getElementById('exportBtn').addEventListener('click', () => exportProgress(earned));
  document.getElementById('importFile').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const result = parseImportedProgress(await file.text(), trophies.map((t) => t.name));
    if (result.error) {
      alert(result.error);
    } else {
      earned = result.earned;
      saveProgress(earned);
      refresh();
    }
    event.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Clear all saved progress?')) {
      earned = resetProgress();
      state.selected = null;
      clearTrophyDetail();
      refresh();
    }
  });

  setView(state.view);
  refresh();
}

boot().catch((error) => {
  document.getElementById('listHint').textContent = `Could not load the trophy data: ${error.message}`;
});
