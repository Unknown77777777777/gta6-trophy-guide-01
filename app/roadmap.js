// Roadmap to the platinum: the three stages PowerPyx lays out — play the
// story, work the 100% checklist after it, then clean up. Each stage lists
// its trophies in the order to earn them, built from the official
// descriptions (chapters, missions, collectibles and counts).
export const ROADMAP_STAGES = [
  {
    stage: 1,
    title: 'Stage 1 — Play the story',
    time: 'about 60–80 hours',
    blurb:
      'Play the five chapters and take the optional missions as they appear. Scan vehicles and study animals on the way — it all counts toward the 100% checklist later. Do the Chapter 1 meditation the moment the game offers it: it is the one missable trophy.',
    order: 'chapter',
  },
  {
    stage: 2,
    title: 'Stage 2 — The 100% checklist',
    time: 'about 100 hours',
    blurb:
      'After the credits, the checklist appears under Progress > Stats > 100% Completion. It is lenient — roughly 60% of true completion — and most of it comes from the other trophies. Only 70 of 80 Challenges are needed, so skip the hardest ones.',
    order: 'list',
  },
  {
    stage: 3,
    title: 'Stage 3 — Cleanup and the platinum',
    time: 'about 10 hours',
    blurb:
      'Finish the Strangers & Freaks strands and anything still unchecked, then the platinum unlocks. All 55 trophies are single-player and offline.',
    order: 'list',
  },
];

// One line per trophy in a stage: name, grade and the note that places it.
function roadmapLine(trophy) {
  const li = document.createElement('li');
  const name = document.createElement('span');
  name.className = 'trophy-name';
  name.textContent = trophy.name;
  li.append(name);
  const note = document.createElement('span');
  note.className = 'trophy-note';
  const bits = [trophy.grade];
  if (trophy.chapter) bits.push(trophy.chapter);
  if (trophy.count !== null && trophy.count !== undefined) {
    bits.push(trophy.id === 52 ? '$250,000' : trophy.id === 53 ? '$100,000' : `${trophy.count}`);
  }
  if (trophy.missable) bits.push('MISSABLE');
  if (trophy.hidden) bits.push('hidden on PSN');
  note.textContent = ` — ${bits.join(' · ')}`;
  li.append(note);
  return li;
}

// Story order for stage 1: opening, chapters 1–4, final mission, then the
// story missions and side-character finales in list order.
function storySort(a, b) {
  const chapterRank = (t) => {
    if (!t.chapter) return 99;
    if (t.chapter.startsWith('Opening')) return 0;
    if (t.chapter.startsWith('Chapter 1')) return 1;
    if (t.chapter.startsWith('Chapter 2')) return 2;
    if (t.chapter.startsWith('Chapter 3')) return 3;
    if (t.chapter.startsWith('Chapter 4')) return 4;
    if (t.chapter.startsWith('Chapter 5')) return 5;
    return 90;
  };
  return chapterRank(a) - chapterRank(b) || a.id - b.id;
}

// Render all three roadmap stages into the roadmap container.
export function renderRoadmap(container, trophies) {
  container.replaceChildren();
  for (const stage of ROADMAP_STAGES) {
    const section = document.createElement('section');
    section.className = 'stage';
    const heading = document.createElement('h3');
    heading.textContent = stage.title;
    const time = document.createElement('span');
    time.className = 'stage-time';
    time.textContent = ` — ${stage.time}`;
    heading.append(time);
    const blurb = document.createElement('p');
    blurb.textContent = stage.blurb;
    const list = document.createElement('ol');
    const stageTrophies = trophies.filter((t) => t.stage === stage.stage);
    if (stage.order === 'chapter') stageTrophies.sort(storySort);
    else stageTrophies.sort((a, b) => a.id - b.id);
    for (const trophy of stageTrophies) list.append(roadmapLine(trophy));
    section.append(heading, blurb, list);
    container.append(section);
  }
}
