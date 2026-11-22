// The walls' guard. Build first: node prototypes/pacman/build.mjs season-dress; then
// node prototypes/pacman/season-dress/guard.mjs: for every scene, the wall dress never leaves the stone (outside the
// silhouette byte-equal with the dress off), makes no light corners, and the walls themselves are
// the game's (inside the silhouette equal to the season as it is). Exit code 1 on a failure.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 800, height: 600 } });
await p.goto(pathToFileURL(join(here, '..', 'season-dress.html')).href + '?mode=full');
await p.waitForTimeout(1500);
const rows = [];
let bad = 0;
for (const id of ['autumn', 'winter', 'spring-hanami', 'spring-easter', 'summer-beach', 'summer-fair']) {
  const r = await p.evaluate((id) => window.__guard(id), id);
  const ok = r.outside === 0 && r.cornerLight === 0 && r.wallsChanged === 0;
  if (!ok) bad += 1;
  rows.push({ ...r, ok });
}
console.table(rows);
await b.close();
process.exit(bad ? 1 : 0);
