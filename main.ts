// Leonida Trophy Guide — entrypoint (Node 22, standard library only).
// The guide itself is plain static files in app/ (index.html, style.css, ES
// modules, data/trophies.json): a browser opens app/index.html and it works
// with the network off. This program hands the entry in: it copies app/ and
// screenshots/ from beside this file into the output directory and writes
// output/dossier.json with the vendored make.fun library — the summary the
// judge reads (screenshots, first-load files and bytes, and the source).
// vendor/makefun-frontend.ts is the kit's copy and must stay unchanged: the
// scorer rebuilds the dossier with its own copy and compares byte for byte.
//
// Run it locally as:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output. Both runs
// must write the same bytes: the copy is a plain file copy and the dossier
// is a pure function of the files, so a second run matches the first.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function countFiles(dir) {
  let files = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files += countFiles(path);
    else if (entry.isFile()) files += 1;
  }
  return files;
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(out, 'dossier.json'), dossier);

// Sanity check the handover before reporting it: the dossier must be the
// file the library wrote, so hash the bytes on disk and print the digest —
// a second run prints the same digest when the entry is deterministic.
const written = readFileSync(join(out, 'dossier.json'));
const digest = createHash('sha256').update(written).digest('hex');
if (!written.equals(Buffer.from(dossier))) throw new Error('dossier.json on disk differs from what buildDossier returned');

const appFiles = countFiles(join(out, 'app'));
const shots = readdirSync(join(out, 'screenshots')).filter((name) => {
  const st = statSync(join(out, 'screenshots', name));
  return st.isFile();
});
console.log(`handed in ${appFiles} app files and ${shots.length} screenshots; dossier.json is ${dossier.length} bytes, sha256 ${digest}`);
