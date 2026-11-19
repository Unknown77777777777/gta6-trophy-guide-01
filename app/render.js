// Rendering: the trophy checklist, the filters, the spoiler setting and the
// detail panel (a trophy's guide and its sources). All text is set with
// textContent except source links, which are anchors built from the data.
import { toggleEarned } from './store.js';

export const SPOILER_STORAGE_KEY = 'gta6-trophy-guide-01-spoilers-v1';

// A trophy counts as a story trophy for the spoiler setting.
export function isStoryTrophy(trophy) {
  return trophy.kind === 'story';
}

// Filter the list by kind, grade and search text. The "missable" kind filters
// on the missable flag; "online" matches nothing, because the game lists no
// online trophies (PowerPyx).
export function filterTrophies(trophies, { kind, grade, query }) {
  const q = query.trim().toLowerCase();
  return trophies.filter((t) => {
    if (kind === 'missable' && !t.missable) return false;
    if (kind === 'online') return false;
    if (kind !== 'all' && kind !== 'missable' && kind !== 'online' && t.kind !== kind) return false;
    if (grade !== 'all' && t.grade !== grade) return false;
    if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))) return false;
    return true;
  });
}

// Count trophies per filter kind, for the filter buttons.
export function countByKind(trophies) {
  const counts = { all: trophies.length, story: 0, missable: 0, collectibles: 0, activities: 0, online: 0 };
  for (const t of trophies) {
    if (t.kind === 'story') counts.story += 1;
    if (t.kind === 'collectibles') counts.collectibles += 1;
    if (t.kind === 'activities') counts.activities += 1;
    if (t.missable) counts.missable += 1;
  }
  return counts;
}

// One grade chip, e.g. "silver".
export function gradeChip(grade) {
  const span = document.createElement('span');
  span.className = `tag ${grade}`;
  span.textContent = grade;
  return span;
}

// Human-readable count for a trophy that tracks one, e.g. "250 stunts".
export function countLabel(trophy) {
  if (trophy.count === null || trophy.count === undefined) return null;
  if (trophy.id === 52) return '$250,000 laundered';
  if (trophy.id === 53) return '$100,000 spent';
  if (trophy.id === 48) return '500 choices tracked';
  return `${trophy.count} to go`;
}

// Render the progress header: "N of 55 earned" and the bar.
export function renderProgress(earned, total) {
  const pct = total === 0 ? 0 : Math.round((earned.size / total) * 100);
  document.getElementById('progressText').textContent = `${earned.size} of ${total} earned`;
  document.getElementById('progressPct').textContent = `${pct}%`;
  document.getElementById('progressFill').style.width = `${pct}%`;
  const sub = document.getElementById('progressSub');
  if (earned.size === total && total > 0) {
    sub.textContent = 'Platinum earned — Vice Got a Price! You are a Leonida Legend.';
  } else if (earned.size === 0) {
    sub.textContent = 'Tick a trophy to save it in this browser.';
  } else {
    sub.textContent = `${total - earned.size} to go until the platinum.`;
  }
}

// Render one trophy row. With spoilers on, story trophies the player has not
// earned show a placeholder instead of their name and description.
export function trophyCard(trophy, { earned, spoilersOn, selected, onSelect, onToggle }) {
  const li = document.createElement('li');
  li.className = 'trophy-card';
  if (earned.has(trophy.name)) li.classList.add('earned');
  if (selected === trophy.name) li.classList.add('selected');

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(trophy.name);
  box.setAttribute('aria-label', `Earned: ${trophy.name}`);
  box.addEventListener('click', (event) => event.stopPropagation());
  box.addEventListener('change', () => onToggle(trophy.name));

  const nameEl = document.createElement('span');
  nameEl.className = 'trophy-name';
  const descEl = document.createElement('span');
  descEl.className = 'trophy-desc';
  const hiddenBySpoilers = spoilersOn && isStoryTrophy(trophy) && !earned.has(trophy.name);
  if (hiddenBySpoilers) {
    nameEl.textContent = 'Story trophy — hidden to avoid spoilers';
    descEl.textContent = 'Earn it (or turn spoilers off) to reveal its name and description.';
  } else {
    nameEl.textContent = trophy.name;
    descEl.textContent = trophy.description;
  }

  const tags = document.createElement('span');
  tags.className = 'trophy-tags';
  tags.append(gradeChip(trophy.grade));
  if (trophy.missable) {
    const miss = document.createElement('span');
    miss.className = 'tag missable';
    miss.textContent = 'Missable';
    tags.append(miss);
  }
  if (trophy.hidden) {
    const hid = document.createElement('span');
    hid.className = 'tag hidden';
    hid.textContent = 'Hidden on PSN';
    tags.append(hid);
  }
  const count = countLabel(trophy);
  if (count) {
    const countTag = document.createElement('span');
    countTag.className = 'tag count';
    countTag.textContent = count;
    tags.append(countTag);
  }

  li.append(box, nameEl, descEl, tags);
  li.addEventListener('click', () => onSelect(trophy.name));
  return li;
}

// Render the whole filtered list.
export function renderTrophyList(listEl, emptyEl, trophies, state) {
  listEl.replaceChildren();
  for (const t of trophies) {
    listEl.append(trophyCard(t, state));
  }
  emptyEl.hidden = trophies.length !== 0;
}

// Render the detail panel for one trophy: official name and description,
// grade, kind, roadmap stage, guide in our own words, and its sources.
export function renderTrophyDetail(trophy, earned, spoilersOn) {
  const empty = document.getElementById('detailEmpty');
  const card = document.getElementById('detailCard');
  empty.hidden = true;
  card.hidden = false;

  const gradeBadge = document.getElementById('detailGradeBadge');
  gradeBadge.replaceChildren(gradeChip(trophy.grade));
  document.getElementById('detailKind').textContent = trophy.kind === 'platinum' ? 'platinum' : `${trophy.kind} trophy`;
  document.getElementById('detailHidden').hidden = !trophy.hidden;

  const hiddenBySpoilers = spoilersOn && isStoryTrophy(trophy) && !earned.has(trophy.name);
  document.getElementById('detailName').textContent = hiddenBySpoilers
    ? 'Story trophy — hidden to avoid spoilers'
    : trophy.name;
  document.getElementById('detailDesc').textContent = hiddenBySpoilers
    ? 'Turn spoilers off, or earn this trophy, to reveal its official name and description.'
    : trophy.description;

  const bits = [];
  if (trophy.chapter) bits.push(trophy.chapter);
  bits.push(`Roadmap stage ${trophy.stage}`);
  const count = countLabel(trophy);
  if (count) bits.push(`Target: ${count}`);
  if (trophy.hidden) bits.push('Hidden on PlayStation until earned');
  document.getElementById('detailMeta').textContent = bits.join(' · ');

  const missable = document.getElementById('detailMissable');
  missable.hidden = !trophy.missable;

  const earnedBox = document.getElementById('detailEarned');
  earnedBox.checked = earned.has(trophy.name);
  earnedBox.onchange = () => {
    toggleEarned(earned, trophy.name);
    document.dispatchEvent(new CustomEvent('progress-changed'));
  };

  document.getElementById('detailGuide').textContent = trophy.guide;

  const sources = document.getElementById('detailSources');
  sources.replaceChildren();
  for (const source of trophy.sources ?? []) {
    const li = document.createElement('li');
    if (source.url) {
      const a = document.createElement('a');
      a.href = source.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = source.name;
      li.append(a);
    } else {
      li.textContent = source.name;
    }
    sources.append(li);
  }
}

// Hide the detail panel back to its empty state.
export function clearTrophyDetail() {
  document.getElementById('detailEmpty').hidden = false;
  document.getElementById('detailCard').hidden = true;
}
