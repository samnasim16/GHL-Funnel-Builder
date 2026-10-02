// Pre-renders every template into examples/<template>/ so the funnels can be
// browsed (and shared) without opening the builder.
// Usage: node scripts/build-examples.mjs
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEMPLATES, buildTemplate } from '../js/templates.js';
import { renderStepPage } from '../js/renderer.js';
import { setupGuidePage } from '../js/setup-guide.js';
import { auditFunnel } from '../js/audit.js';
import { esc } from '../js/sections.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'examples');
rmSync(root, { recursive: true, force: true });
mkdirSync(root, { recursive: true });

// Navigation bar on every generated page: Back (browser history, falling back
// to the parent page), the parent page, and Home (the cover page of the deploy).
function navBar({ up, upLabel, home, homeLabel = 'Home', note = '' }) {
  return `<nav class="ff-nav" style="position:relative;z-index:99;display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;padding:8px 16px;background:#111;color:#ddd;font:600 13px/1.4 system-ui,sans-serif">
  <button type="button" data-ff-back="${up}" style="all:unset;cursor:pointer;background:#ffd400;color:#111;border-radius:7px;padding:5px 12px;font-weight:800">← Back</button>
  <a href="${up}" style="color:#fff">${upLabel}</a><span style="opacity:.4">·</span><a href="${home}" style="color:#fff">${homeLabel}</a>
  ${note ? `<span style="flex:1;min-width:200px;text-align:right;opacity:.7;font-weight:500">${note}</span>` : ''}
</nav>
<button type="button" data-ff-back="${up}" aria-label="Back" style="all:unset;cursor:pointer;position:fixed;left:16px;bottom:calc(16px + env(safe-area-inset-bottom, 0px));z-index:100;background:#111;color:#fff;border-radius:999px;padding:10px 16px;font:700 14px/1 system-ui,sans-serif;box-shadow:0 8px 24px -8px rgba(0,0,0,.6)">← Back</button>
<script>document.querySelectorAll('[data-ff-back]').forEach(function(b){b.addEventListener('click',function(){var fb=b.getAttribute('data-ff-back');if(history.length>1){var here=location.href;history.back();setTimeout(function(){if(location.href===here)location.href=fb;},400);}else location.href=fb;});});</script>`;
}
// Example pages also say plainly that they are concept demos, not live BAD pages.
const DEMO_NOTE = 'Concept demo by Sam Nasim for BAD Marketing. Not a live BAD Marketing page; the forms send nothing.';
const withNav = (html, opts) => html.replace('<body>', '<body>\n' + navBar(opts));

const fileFor = (step) => `${step.path.replace(/^\//, '') || 'index'}.html`;
const cards = [];

for (const t of TEMPLATES.filter((x) => x.id !== 'blank')) {
  const f = buildTemplate(t.id);
  const dir = join(root, t.id);
  mkdirSync(dir, { recursive: true });
  // Point each step's "next" path at the sibling file so the demo clicks through.
  const local = { ...f, steps: f.steps.map((s) => ({ ...s, path: './' + fileFor(s) })) };
  const nav = { up: '../index.html', upLabel: 'All examples', home: '../../index.html', homeLabel: 'Builder' };
  f.steps.forEach((s, i) => writeFileSync(join(dir, fileFor(s)), withNav(renderStepPage(local, i), { ...nav, note: DEMO_NOTE })));
  writeFileSync(join(dir, 'setup.html'), withNav(setupGuidePage(f), nav));
  writeFileSync(join(dir, 'funnel.json'), JSON.stringify(f, null, 2));
  const { score } = auditFunnel(f);
  cards.push(`<article><div class="sw"><i style="background:${f.theme.primary}"></i><i style="background:${f.theme.accent}"></i><i style="background:${f.theme.dark}"></i></div>
  <small>${esc(t.category)}</small><h2>${esc(t.name)}</h2><p>${esc(t.description)}</p>
  <ol>${f.steps.map((s) => `<li><a href="${t.id}/${fileFor(s)}">${esc(s.name)}</a> <code>${esc(s.path)}</code></li>`).join('')}</ol>
  <p class="meta">${f.blueprint.workflows.length} GHL workflows · ${f.blueprint.pipeline.stages.length}-stage pipeline · ${f.blueprint.tags.length} tags · launch score ${score} before wiring</p>
  <a class="b" href="${t.id}/setup.html">Open the setup guide →</a></article>`);
}

writeFileSync(
  join(root, 'index.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FunnelForge Examples</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#0b0b0f;color:#fff}main{max-width:1100px;margin:0 auto;padding:48px 20px}h1{font-size:2.4rem;margin:0}
.lead{opacity:.7;margin:8px 0 32px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px}
article{background:#16161d;border:1px solid #26262f;border-radius:14px;padding:20px}article small{color:#ffd400;text-transform:uppercase;letter-spacing:.1em;font-weight:700;font-size:.72rem}
article h2{margin:6px 0 8px;font-size:1.25rem}article p{opacity:.75;font-size:.92rem;line-height:1.5}a{color:#fff}code{opacity:.5;font-size:.8rem}
ol{padding-left:20px;line-height:1.9}.meta{font-size:.8rem!important;opacity:.55!important}.b{display:inline-block;margin:6px 6px 0 0;padding:6px 12px;border-radius:8px;background:#e11d2e;text-decoration:none;font-weight:700;font-size:.85rem}
.sw{display:flex;height:6px;border-radius:4px;overflow:hidden;margin-bottom:14px}.sw i{flex:1}</style></head>
<body>${navBar({ up: '../index.html', upLabel: 'Open the builder', home: '../pitch.html', homeLabel: 'Pitch' })}<main><h1>FunnelForge example funnels</h1><p class="lead">Every page below was generated by the builder. Each funnel also ships its GoHighLevel back end: pipeline, tags, custom fields, calendars and workflows. These are concept pages by Sam Nasim, not live BAD Marketing pages.</p>
<div class="grid">${cards.join('\n')}</div></main></body></html>`
);
console.log(`Wrote ${cards.length} example funnels to examples/`);
