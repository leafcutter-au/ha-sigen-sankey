// Render harness scenarios in headless Chromium; save a screenshot per scenario and DOM geometry.
// Serve the repo root on :8765 first (python3 -m http.server 8765 --bind 127.0.0.1).
// Usage: node dev/harness/shoot.mjs <outDir> [build=current|baseline] [cfg=proposed|mitch] [scenarios] [overridesJson]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

// Playwright isn't a dependency of this repo; point PLAYWRIGHT_PROJECT at any project that has it installed
const require = createRequire(`${process.env.PLAYWRIGHT_PROJECT || '/Users/mitch/node_projs/slidemaker'}/package.json`);
const { chromium } = require('playwright');

const [outDir, build = 'current', cfg = 'proposed', scen = '', overrides = ''] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 880, height: 900 }, deviceScaleFactor: 2 });
page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
page.on('pageerror', e => console.error('pageerror:', e.message));
const q = new URLSearchParams({ build, cfg });
if (scen) q.set('s', scen);
if (overrides) q.set('o', overrides);
await page.goto(`http://127.0.0.1:8765/dev/harness/index.html?${q}`);
await page.waitForSelector('body[data-ready="1"]', { timeout: 20000 });

const geometry = await page.evaluate(() => {
  const r = el => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
  return [...document.querySelectorAll('.slot')].map(slot => {
    const card = slot.querySelector('sigen-sankey');
    const base = card.shadowRoot.querySelector('sigen-sankey-base');
    const sr = base.shadowRoot;
    const haCard = sr.querySelector('ha-card');
    const sections = [...sr.querySelectorAll('.section')].map(sec =>
      [...sec.querySelectorAll('.box')].filter(b => !b.classList.contains('type-passthrough')).map(box => {
        const bar = box.querySelector('div');
        const parts = {};
        for (const cls of ['entity-type', 'state', 'unit', 'percentage', 'values', 'label']) {
          const el = box.querySelector('.' + cls);
          if (el) parts[cls] = r(el);
        }
        const st = box.querySelector('.state');
        return {
          bar: r(bar),
          parts,
          text: box.querySelector('.label')?.innerText.replace(/\s+/g, ' ').trim(),
          stateFont: st ? getComputedStyle(st).fontSize : null,
          tier: box.querySelector('.label')?.dataset.tier || null,
        };
      }),
    );
    return { scenario: slot.dataset.scenario, host: r(card), card: r(haCard), sections };
  });
});

for (const g of geometry) {
  const slot = await page.$(`.slot[data-scenario="${g.scenario}"] sigen-sankey`);
  await slot.screenshot({ path: path.join(outDir, `${g.scenario}.png`) });
}
fs.writeFileSync(path.join(outDir, 'geometry.json'), JSON.stringify(geometry, null, 1));
await browser.close();
console.log('ok', geometry.length, 'scenarios ->', outDir);
