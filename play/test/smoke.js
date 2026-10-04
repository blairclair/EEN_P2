#!/usr/bin/env node
/* =========================================================================
 * Smoke test (Playwright, headless Chromium).
 *
 *   node test/smoke.js ch05           run one chapter in autoplay until it completes
 *   node test/smoke.js --all          New Game -> every non-hidden chapter in order -> end
 *   node test/smoke.js --list         list manifest chapters
 * Options: --timeout=120 (seconds), --pick=random, --headed, --quiet
 *
 * Asserts: chapter(s) complete, no console errors, no page errors,
 * G.testState.errors empty; --all also checks completion order and that
 * flags carry across chapters. Screenshots -> test/artifacts/.
 * Exit code 0 = PASS, 1 = FAIL.
 * ========================================================================= */
'use strict';
const path = require('path');
const fs = require('fs');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const ART = path.join(__dirname, 'artifacts');
const args = process.argv.slice(2);
const opt = (name, def) => { const a = args.find((x) => x.startsWith('--' + name + '=')); return a ? a.split('=')[1] : def; };
const flag = (name) => args.includes('--' + name);
const positional = args.filter((a) => !a.startsWith('--'));

function readManifest() {
  const src = fs.readFileSync(path.join(ROOT, 'chapters', 'manifest.js'), 'utf8');
  const ctx = { G: {} };
  vm.runInNewContext(src, ctx);
  return ctx.G.manifest;
}

async function main() {
  const manifest = readManifest();
  if (flag('list')) {
    for (const c of manifest.chapters) console.log(`${c.id.padEnd(6)} #${String(c.number).padEnd(3)} ${c.hidden ? '(hidden) ' : ''}${c.title}  [${(c.files || []).join(', ')}]`);
    return 0;
  }
  const all = flag('all');
  const chapter = positional[0];
  if (!all && !chapter) { console.log('usage: node test/smoke.js <chapterId> | --all | --list'); return 1; }
  if (!all && !manifest.chapters.some((c) => c.id === chapter)) { console.log(`FAIL: ${chapter} is not in chapters/manifest.js`); return 1; }

  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) { console.log('Playwright missing: run `npm install` in play/ (and `npx playwright install chromium`).'); return 1; }
  fs.mkdirSync(ART, { recursive: true });
  const timeoutS = +opt('timeout', all ? 600 : 120);
  const pick = opt('pick', null);
  const tag = all ? 'all' : chapter;
  const qs = all ? 'newgame=1&auto=1&dev=1' : `chapter=${chapter}&auto=1&dev=1`;
  const url = 'file://' + path.join(ROOT, 'index.html') + '?' + qs + (pick ? '&pick=' + pick : '');

  const browser = await chromium.launch({ headless: !flag('headed') });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const consoleErrors = [], pageErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); else if (!flag('quiet') && m.type() === 'warning') console.log('  [warn]', m.text()); });
  page.on('pageerror', (e) => pageErrors.push(String(e && e.stack || e)));

  const t0 = Date.now();
  console.log(`Loading ${url}`);
  await page.goto(url);
  let state = null, shots = 0, lastShot = 0, done = false, reason = '';
  try { await page.waitForFunction(() => window.G && G.testState && G.testState.ready, null, { timeout: 15000 }); }
  catch (e) { reason = 'engine never became ready (G.testState.ready)'; }

  const expected = all ? await page.evaluate(() => G.chapterList(false).map((c) => c.id)).catch(() => []) : [chapter];
  while (!reason) {
    state = await page.evaluate(() => JSON.parse(JSON.stringify(G.testState))).catch((e) => ({ errors: ['evaluate failed: ' + e.message], chapterCompleted: [] }));
    const elapsed = (Date.now() - t0) / 1000;
    if (shots < 3 && elapsed - lastShot > 2) { await page.screenshot({ path: path.join(ART, `${tag}-${++shots}.png`) }); lastShot = elapsed; }
    if (state.errors.length || pageErrors.length || consoleErrors.length) { reason = 'errors'; break; }
    if (all ? state.gameCompleted : state.chapterCompleted.includes(chapter)) { done = true; break; }
    if (elapsed > timeoutS) { reason = `timeout after ${timeoutS}s (current: ${state.currentChapter}, completed: [${state.chapterCompleted.join(', ')}])`; break; }
    await new Promise((r) => setTimeout(r, 250));
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ART, `${tag}-final.png`) }).catch(() => {});
  state = await page.evaluate(() => JSON.parse(JSON.stringify(G.testState))).catch(() => state);
  await browser.close();

  const problems = [];
  if (!done) problems.push(reason || 'did not complete');
  if (state && state.errors.length) problems.push('G.testState.errors:\n    ' + state.errors.join('\n    '));
  if (pageErrors.length) problems.push('page errors:\n    ' + pageErrors.join('\n    '));
  if (consoleErrors.length) problems.push('console errors:\n    ' + consoleErrors.join('\n    '));
  if (all && done) {
    const got = state.chapterCompleted;
    if (JSON.stringify(got) !== JSON.stringify(expected)) problems.push(`completion order mismatch:\n    expected ${expected.join(',')}\n    got      ${got.join(',')}`);
    for (let i = 1; i < expected.length; i++) {
      const prev = state.flagSnapshots[expected[i - 1]] || [], cur = state.flagSnapshots[expected[i]] || [];
      const lost = prev.filter((k) => !cur.includes(k));
      if (lost.length) problems.push(`flags lost between ${expected[i - 1]} and ${expected[i]}: ${lost.join(', ')}`);
    }
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (problems.length) {
    console.log(`\nFAIL ${tag} (${secs}s)`);
    problems.forEach((p) => console.log('  - ' + p));
    if (state && state.log) { console.log('  last log lines:'); state.log.slice(-15).forEach((l) => console.log('    ' + l)); }
  } else {
    console.log(`\nPASS ${tag} (${secs}s) completed: [${state.chapterCompleted.join(', ')}]`);
    if (state.warnings && state.warnings.length) console.log('  warnings:\n    ' + state.warnings.join('\n    '));
  }
  console.log(`  screenshots: ${path.relative(process.cwd(), ART)}/${tag}-*.png`);
  return problems.length ? 1 : 0;
}
main().then((c) => process.exit(c), (e) => { console.error(e); process.exit(1); });
