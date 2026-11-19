// Progress store: the earned set lives in localStorage and can be exported to
// a file and imported back. Nothing here touches the network.
export const STORAGE_KEY = 'gta6-trophy-guide-01-progress-v1';

// Load the earned trophy names (by exact trophy name) from localStorage.
export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((name) => typeof name === 'string'));
  } catch {
    return new Set();
  }
}

// Save the earned set to localStorage.
export function saveProgress(earned) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned]));
}

// Toggle one trophy in the earned set and persist it.
export function toggleEarned(earned, name) {
  if (earned.has(name)) earned.delete(name);
  else earned.add(name);
  saveProgress(earned);
  return earned;
}

// Build the export payload: game, version, export date and earned names.
export function buildExportPayload(earned) {
  return {
    game: 'Grand Theft Auto VI',
    guide: 'Leonida Trophy Guide',
    version: 1,
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort(),
  };
}

// Download the progress as a JSON file (a blob URL, no network).
export function exportProgress(earned) {
  const blob = new Blob([JSON.stringify(buildExportPayload(earned), null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(url);
}

// Parse an imported file's text into an earned set, keeping only names the
// guide actually lists. Returns { earned } or { error }.
export function parseImportedProgress(text, knownNames) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: 'That file is not valid JSON.' };
  }
  const names = Array.isArray(parsed) ? parsed : parsed.earned;
  if (!Array.isArray(names)) {
    return { error: 'That file has no earned trophy list in it.' };
  }
  const known = new Set(knownNames);
  const earned = new Set(names.filter((name) => known.has(name)));
  return { earned };
}

// Clear the saved progress entirely.
export function resetProgress() {
  localStorage.removeItem(STORAGE_KEY);
  return new Set();
}
