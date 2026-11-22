// Night Archive — the hand-in program (Node 22, standard library only).
//
// The game is plain static files under game/ (game/index.html and its ES
// modules, no build step and no network request). This program hands it in:
// it copies game/ and screenshots/ from beside this file to the output
// directory and writes output/dossier.json, the summary the judge reads,
// with the vendored make.fun library.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for
// /output, so a local check is:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The output directory is emptied first, so running the program twice
// writes the same bytes twice.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

const screenshotsDir = join(repoRoot, 'screenshots');
if (existsSync(screenshotsDir)) {
  cpSync(screenshotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The caps are the scorer's own: more than 4 screenshots, one over
// 256 KiB, more than 993 entries in game/ or 48 MiB of game files, or a
// game path over 1000 bytes would refuse the entry, so the program fails
// here instead of handing in something the scorer would refuse.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`wrote ${join(outputDir, 'dossier.json')} (${dossier.length} bytes)`);
