import { SECTIONS, makeSection, uid, esc, lines } from './sections.js?v=b9ff416fb7';
import { renderStepPage, renderGhlSnippet, FONTS, FONT_META, FONT_GROUPS, FONT_PAIRS, DEFAULT_THEME, fontLink } from './renderer.js?v=b9ff416fb7';
import { LOOKS, PALETTES, paletteFromColor, paletteFromPixels, suggestLook } from './styles.js?v=b9ff416fb7';
import { openCropper, compressImage, readFile, samplePixels } from './images.js?v=b9ff416fb7';
import { TEMPLATES, buildTemplate } from './templates.js?v=b9ff416fb7';
import { auditFunnel, auditStep } from './audit.js?v=b9ff416fb7';
import { blueprintMarkdown, systemMap } from './blueprint.js?v=b9ff416fb7';
import { setupGuidePage } from './setup-guide.js?v=b9ff416fb7';
import { planPush, runPush, REQUIRED_SCOPES } from './ghl-push.js?v=b9ff416fb7';
import { recommend } from './recommend.js?v=b9ff416fb7';
import { collectFillable, buildPrompt, applyFill, quickFill, BRIEF_FIELDS, TONES } from './ai-fill.js?v=b9ff416fb7';
import { startTour } from './tour.js?v=b9ff416fb7';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const STORE_KEY = 'funnelforge.v1';

const state = { funnel: null, step: 0, sel: -1, device: 'desktop', view: 'pages', past: [], future: [] };

// ---------- plain-language copy ----------
// What each goal means to someone who has never built a funnel.
const GOALS = {
  'email-sms-audit': { em: '🎁', goal: 'Offer a free audit and book calls', who: 'Give away a free review of their business, then get them on a call.' },
  'paid-ads-application': { em: '🚀', goal: 'Get big clients to apply to work with you', who: 'A video, an application form, then a call. Only good-fit clients reach your calendar.' },
  'amazon-growth': { em: '📦', goal: 'Book calls for a service you sell', who: 'One page that explains your service, then they pick a time to talk.' },
  webinar: { em: '🎓', goal: 'Sign people up for a free online class', who: 'They register, get reminders, watch the class, pay, and get their course login automatically.' },
  'local-quote': { em: '🏠', goal: 'Get quote requests for a local business', who: 'A quick quote form for things like med spas, roofers or cleaners.' },
  blank: { em: '✨', goal: 'Start from a blank page', who: 'Build it yourself, block by block.' },
};

// What a page does, in a few words, based on what's on it.
function pagePurpose(step) {
  const has = (t) => step.sections.some((s) => s.type === t);
  if (has('thankyou')) return 'Says "you\'re in" and what happens next';
  if (has('checkout')) return 'Visitors pay for your offer';
  if (has('calendar')) return 'Visitors pick a time for a call';
  if (has('form') && has('video')) return 'Visitors watch a video, then apply';
  if (has('form')) return 'Visitors type in their details';
  if (has('offer')) return 'Shows your offer';
  if (has('video')) return 'Visitors watch a video';
  return 'A page of your funnel';
}

// Turns a technical workflow into one sentence.
const AUTOMATION_STORIES = [
  [/speed to lead/i, '💬', 'Text them within a minute', 'They get a text from you right away and your team gets an alert.'],
  [/qualif/i, '🎯', 'Sort good-fit leads', 'Big prospects go to your senior people. Everyone else gets helpful emails.'],
  [/abandon/i, '🔔', 'Nudge people who don\'t book', 'If they fill the form but skip the calendar, they get reminders to book.'],
  [/show-up|reminder/i, '⏰', 'Remind them before the call', 'Texts and emails 1 day, 2 hours and 10 minutes before, so they show up.'],
  [/no-show/i, '🔁', 'Win back missed calls', 'If they miss the call, they get a friendly message to pick a new time.'],
  [/proposal/i, '📄', 'Follow up on proposals', 'After you send a proposal, they get check-ins until they decide.'],
  [/indoctrination|registration/i, '📣', 'Warm them up before the class', 'Welcome message, helpful emails, and reminders right before it starts.'],
  [/replay|cart/i, '🎬', 'Send the replay and offer', 'Everyone gets the replay and a deadline to buy.'],
  [/missed call/i, '📞', 'Text back missed calls', 'If you miss a call, they get a text right away so you don\'t lose them.'],
  [/review/i, '⭐', 'Ask for Google reviews', 'Happy customers get asked for a review automatically.'],
];
function storyFor(w) {
  const hit = AUTOMATION_STORIES.find(([re]) => re.test(w.name));
  return hit ? { em: hit[1], title: hit[2], text: hit[3] } : { em: '⚙️', title: w.name.replace(/^\d+\s*\|\s*/, ''), text: w.goal || '' };
}

const GLOSSARY = [
  ['Funnel', 'A few web pages in a row that turn a visitor into a lead or a customer.'],
  ['Page (or step)', 'One page of the funnel. Visitors go from one to the next.'],
  ['Lead', 'Someone who gave you their name, email or phone.'],
  ['GoHighLevel (GHL)', 'The software that hosts your pages, stores your leads and sends texts and emails for you.'],
  ['Form', 'The boxes where visitors type their details.'],
  ['Calendar', 'Where visitors book a call with you. It lives in GoHighLevel.'],
  ['Automation (workflow)', 'Messages and tasks GoHighLevel does on its own, like texting a new lead.'],
  ['Pipeline', 'A board that shows where each lead is: new, booked, showed up, won.'],
  ['Tag', 'A label on a lead, like "booked-call", so you can sort and filter.'],
  ['Webhook link', 'A link from GoHighLevel. Paste it into your form so answers go into GoHighLevel.'],
  ['VSL', 'Video sales letter: a video that explains your offer.'],
  ['Opt-in', 'When someone fills your form and agrees to hear from you.'],
  ['Speed to lead', 'How fast you contact a new lead. Under a minute is best.'],
  ['Pixel', 'A small code from Facebook/Meta that tells your ads who signed up.'],
];

// ---------- persistence & history ----------
let storageWarned = false;
function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ funnel: state.funnel, step: state.step }));
  } catch (e) {
    // Usually the browser's storage is full of uploaded pictures.
    if (!storageWarned && e && /quota/i.test(e.name + e.message)) {
      storageWarned = true;
      toast('Your browser is full, so the latest changes may not be saved after closing. Use smaller pictures or picture links.');
    }
  }
}
function loadSaved() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && d.funnel && Array.isArray(d.funnel.steps) ? d : null;
  } catch (e) {
    return null;
  }
}
const snap = () => JSON.stringify({ funnel: state.funnel, step: state.step, sel: state.sel });
function pushHistory() {
  state.past.push(snap());
  if (state.past.length > 100) state.past.shift();
  state.future = [];
}
function restore(s) {
  const d = JSON.parse(s);
  state.funnel = d.funnel;
  state.step = Math.min(d.step, d.funnel.steps.length - 1);
  state.sel = d.sel;
  renderAll();
}
function undo() {
  if (!state.past.length) return toast('Nothing to undo');
  state.future.push(snap());
  restore(state.past.pop());
  toast('Undone');
}
function redo() {
  if (!state.future.length) return toast('Nothing to redo');
  state.past.push(snap());
  restore(state.future.pop());
}
function commit(fn) {
  pushHistory();
  fn();
  renderAll();
}
const curStep = () => state.funnel.steps[state.step];

let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2400);
}
function closeOnBackdrop(d) {
  d.addEventListener('click', (e) => {
    if (e.target === d || e.target.closest('[data-close]')) d.close();
  });
}
$$('dialog').forEach(closeOnBackdrop);

// ---------- canvas ----------
let frameT;
function renderFrame(immediate) {
  clearTimeout(frameT);
  const go = () => {
    const f = $('#frame');
    let y = 0;
    try {
      y = f.contentWindow.scrollY;
    } catch (e) {}
    f.onload = () => {
      try {
        f.contentWindow.scrollTo(0, y);
      } catch (e) {}
      highlight(false);
    };
    f.srcdoc = renderStepPage(state.funnel, state.step, { editor: true });
    $('#urlBar').textContent = `${state.funnel.tracking?.domain || 'your-website.com'}${curStep().path || ''}`;
  };
  immediate ? go() : (frameT = setTimeout(go, 160));
}
function highlight(scroll) {
  const f = $('#frame');
  f.contentWindow && f.contentWindow.postMessage({ fb: 'highlight', idx: state.sel, scroll }, '*');
}
function select(i, scroll) {
  state.sel = i;
  renderSectionList();
  renderInspector();
  highlight(scroll);
}

let canvasSnap = false;
let scoreT;
window.addEventListener('message', (e) => {
  if (e.source !== $('#frame').contentWindow) return;
  const d = e.data || {};
  if (!d.fb) return;
  if (d.type === 'select') select(d.idx, false);
  if (d.type === 'editstart') {
    canvasSnap = false;
    if (state.sel !== d.idx) select(d.idx, false);
  }
  if (d.type === 'text') {
    const sec = curStep().sections[d.idx];
    if (!sec) return;
    if (!canvasSnap) pushHistory(), (canvasSnap = true);
    sec.props[d.key] = d.value;
    const input = $(`#inspector [data-f="${d.key}"]`);
    if (input && state.sel === d.idx) input.value = d.value;
    renderSectionList();
    save();
    clearTimeout(scoreT);
    scoreT = setTimeout(updateScore, 400);
  }
  if (d.type === 'tool') sectionAction(d.action, d.idx);
  if (d.type === 'add') openAddDialog(d.after + 1);
});

function sectionAction(a, i) {
  const arr = curStep().sections;
  commit(() => {
    if (a === 'del') arr.splice(i, 1), (state.sel = -1);
    if (a === 'dup') arr.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(arr[i])), id: uid() }), (state.sel = i + 1);
    if (a === 'up' && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]], (state.sel = i - 1);
    if (a === 'down' && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]], (state.sel = i + 1);
  });
  if (a === 'del') toast('Section removed. Press Undo to bring it back.');
  setTimeout(() => highlight(true), 350);
}
function insertSection(type, at) {
  commit(() => {
    curStep().sections.splice(at, 0, makeSection(type));
    state.sel = at;
  });
  setTimeout(() => highlight(true), 350);
  toast(`${SECTIONS[type].name} added`);
}
function defaultInsertAt() {
  const arr = curStep().sections;
  if (state.sel >= 0) return state.sel + 1;
  return Math.max(0, arr.length - (arr.at(-1)?.type === 'footer' ? 1 : 0));
}

// ---------- left: pages ----------
let armedDelete = -1;
let armedT;
function renderSteps() {
  $('#stepList').innerHTML = state.funnel.steps
    .map(
      (s, i) => `<li class="${i === state.step ? 'on' : ''}" data-i="${i}"><span class="step-n">${i + 1}</span><span class="nm"><b>${esc(s.name)}</b><small>${esc(pagePurpose(s))}</small></span>
      <span class="acts"><button class="icon-btn" data-act="up" title="Move earlier">↑</button><button class="icon-btn" data-act="dup" title="Copy this page">⧉</button><button class="icon-btn" data-act="del" title="Delete page">✕</button></span></li>`
    )
    .join('');
}
$('#stepList').addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  const i = +li.dataset.i;
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'del') {
    if (state.funnel.steps.length === 1) return toast('A funnel needs at least one page');
    // Two-click confirm: native confirm() is unavailable in sandboxed viewers.
    if (armedDelete !== i) {
      armedDelete = i;
      clearTimeout(armedT);
      armedT = setTimeout(() => (armedDelete = -1), 3000);
      return toast(`Click ✕ again to delete "${state.funnel.steps[i].name}"`);
    }
    armedDelete = -1;
    return commit(() => {
      state.funnel.steps.splice(i, 1);
      state.step = Math.max(0, Math.min(state.step, state.funnel.steps.length - 1));
      state.sel = -1;
    });
  }
  if (act === 'dup') {
    return commit(() => {
      const c = JSON.parse(JSON.stringify(state.funnel.steps[i]));
      c.name += ' (copy)';
      c.path = (c.path || '/page') + '-copy';
      c.sections.forEach((s) => (s.id = uid()));
      state.funnel.steps.splice(i + 1, 0, c);
      state.step = i + 1;
      state.sel = -1;
    });
  }
  if (act === 'up') {
    if (i === 0) return;
    return commit(() => {
      const [s] = state.funnel.steps.splice(i, 1);
      state.funnel.steps.splice(i - 1, 0, s);
      state.step = i - 1;
    });
  }
  state.step = i;
  state.sel = -1;
  renderAll();
});
$('#addStep').addEventListener('click', () =>
  commit(() => {
    const n = state.funnel.steps.length + 1;
    state.funnel.steps.push({ name: `Page ${n}`, path: `/page-${n}`, seo: { title: '' }, sections: [makeSection('hero'), makeSection('footer')] });
    state.step = state.funnel.steps.length - 1;
    state.sel = -1;
  })
);

function sectionLabel(s) {
  const p = s.props;
  return String(p.headline || p.text || p.logo || p.title || '').split('\n')[0].slice(0, 40);
}
function renderSectionList() {
  $('#sectionList').innerHTML = curStep()
    .sections.map((s, i) => {
      const d = SECTIONS[s.type] || { name: s.type, icon: '?' };
      return `<li draggable="true" data-i="${i}" class="${i === state.sel ? 'on' : ''}"><span class="ic">${d.icon}</span><span class="nm">${esc(d.name)}<small>${esc(sectionLabel(s)) || '&nbsp;'}</small></span><button class="icon-btn" data-act="del" title="Remove">✕</button></li>`;
    })
    .join('');
}
let dragFrom = -1;
const secList = $('#sectionList');
secList.addEventListener('dragstart', (e) => {
  dragFrom = +e.target.closest('li').dataset.i;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(dragFrom));
});
secList.addEventListener('dragover', (e) => {
  e.preventDefault();
  $$('li', secList).forEach((l) => l.classList.remove('drag-over'));
  e.target.closest('li')?.classList.add('drag-over');
});
secList.addEventListener('drop', (e) => {
  e.preventDefault();
  const li = e.target.closest('li');
  if (!li || dragFrom < 0) return;
  const to = +li.dataset.i;
  if (to !== dragFrom) {
    commit(() => {
      const arr = curStep().sections;
      const [m] = arr.splice(dragFrom, 1);
      arr.splice(to, 0, m);
      state.sel = to;
    });
  }
  dragFrom = -1;
});
secList.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  const i = +li.dataset.i;
  if (e.target.closest('[data-act="del"]')) return sectionAction('del', i);
  select(i, true);
});

// ---------- add sections ----------
const libraryHTML = () =>
  Object.entries(SECTIONS)
    .map(([k, d]) => `<button data-type="${k}"><span class="ic">${d.icon}</span><span><b>${esc(d.name)}</b><small>${esc(d.desc || '')}</small></span></button>`)
    .join('');
$('#library').innerHTML = libraryHTML();
$('#addGrid').innerHTML = libraryHTML();
$('#library').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-type]');
  if (b) insertSection(b.dataset.type, defaultInsertAt());
});
let addAt = 0;
function openAddDialog(at) {
  addAt = at;
  $('#addDialog').showModal();
}
$('#addGrid').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-type]');
  if (!b) return;
  $('#addDialog').close();
  insertSection(b.dataset.type, addAt);
});

// ---------- style ----------
const SHAPE_CONTROLS = [
  ['buttonShape', 'Button shape', [['rounded', 'Rounded'], ['pill', 'Pill'], ['square', 'Square']]],
  ['buttonStyle', 'Button style', [['solid', 'Solid'], ['gradient', 'Gradient'], ['outline', 'Outline'], ['glow', 'Glow']]],
  ['cardStyle', 'Cards and boxes', [['shadow', 'Shadow'], ['border', 'Outline'], ['flat', 'Flat'], ['glass', 'Glass']]],
  ['spacing', 'Spacing', [['compact', 'Tight'], ['normal', 'Normal'], ['airy', 'Airy']]],
  ['headingCase', 'Headlines', [['normal', 'Normal'], ['upper', 'UPPERCASE']]],
  ['effect', 'Dark section background', [['none', 'Plain'], ['mesh', 'Glow'], ['grid', 'Grid'], ['dots', 'Dots'], ['noise', 'Grain']]],
];
let fontTarget = 'headingFont';
let fontGroup = 'All';
function lookPreview(th) {
  const r = { pill: '999px', square: '0', rounded: Math.min(th.radius, 12) + 'px' }[th.buttonShape];
  const btnBg = th.buttonStyle === 'gradient' ? `linear-gradient(120deg,${th.primary},${th.accent})` : th.buttonStyle === 'outline' ? 'transparent' : th.primary;
  const btnBorder = th.buttonStyle === 'outline' ? `box-shadow:inset 0 0 0 2px #fff;` : th.buttonStyle === 'glow' ? `box-shadow:0 4px 14px -2px ${th.primary};` : '';
  return `<div class="lp" style="background:${th.dark};${th.effect === 'mesh' ? `background-image:radial-gradient(80% 90% at 0% 0%,${th.primary}66,transparent 60%),radial-gradient(70% 80% at 100% 0%,${th.accent}55,transparent 60%);` : ''}">
    <span class="lp-h" style="font-family:'${th.headingFont}',sans-serif;${th.headingCase === 'upper' ? 'text-transform:uppercase;' : ''}">Aa</span>
    <span class="lp-b" style="background:${btnBg};border-radius:${r};${btnBorder}"></span></div>`;
}
function renderTheme() {
  const t = { ...DEFAULT_THEME, ...state.funnel.theme };
  $('#looks').innerHTML = LOOKS.map(
    (l, i) =>
      `<button type="button" data-look="${i}" class="look ${l.theme.primary === t.primary && l.theme.headingFont === t.headingFont ? 'on' : ''}" title="${esc(l.desc)}">${lookPreview(l.theme)}<b>${esc(l.name)}</b><small>${esc(l.desc)}</small></button>`
  ).join('');
  $('#palettes').innerHTML = PALETTES.map(
    (p, i) =>
      `<button type="button" data-pal="${i}" class="${p.primary === t.primary && p.dark === t.dark ? 'on' : ''}" title="${esc(p.name)}"><span class="sw"><i style="background:${p.primary}"></i><i style="background:${p.accent}"></i><i style="background:${p.dark}"></i></span><span class="pn">${esc(p.name)}</span></button>`
  ).join('');
  $('#seedColor').value = /^#[0-9a-f]{6}$/i.test(t.primary) ? t.primary : '#6d5dfc';
  $('#fontPairs').innerHTML = FONT_PAIRS.map(
    (fp, i) =>
      `<button data-fp="${i}" class="${fp.heading === t.headingFont && fp.body === t.bodyFont ? 'on' : ''}"><span class="fp-h" style="font-family:'${fp.heading}',sans-serif">${esc(fp.name)}</span><span class="fp-b" style="font-family:'${fp.body}',sans-serif">${esc(fp.heading)} + ${esc(fp.body)}</span></button>`
  ).join('');
  renderFontList();
  $('#shapeForm').innerHTML = SHAPE_CONTROLS.map(
    ([k, label, opts]) =>
      `<div class="sc"><span>${label}</span><div class="seg2" data-shape-k="${k}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" class="${t[k] === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>`
  ).join('') + `<label class="sc"><span>Rounded corners: <b id="radiusVal">${t.radius}px</b></span><input type="range" min="0" max="28" id="radiusRange" value="${t.radius}"></label>`;
  const color = (k, l) =>
    `<label><span>${l}</span><div class="color"><input type="color" data-k="${k}" value="${esc(t[k])}" aria-label="${l}"><input type="text" data-k="${k}" value="${esc(t[k])}" aria-label="${l} code"></div></label>`;
  $('#themeForm').innerHTML =
    color('primary', 'Main color (buttons)') + color('accent', 'Second color (highlights)') + color('dark', 'Dark sections') + color('alt', 'Light sections') + color('bg', 'Page background') + color('text', 'Text');
}
function renderFontList() {
  const t = { ...DEFAULT_THEME, ...state.funnel.theme };
  const q = ($('#fontSearch')?.value || '').toLowerCase();
  $('#fontGroups').innerHTML = ['All', ...FONT_GROUPS].map((g) => `<button type="button" data-fg="${g}" class="${g === fontGroup ? 'on' : ''}">${g}</button>`).join('');
  $$('.font-target button').forEach((b) => b.classList.toggle('on', b.dataset.ft === fontTarget));
  $('#fontList').innerHTML = Object.entries(FONT_META)
    .filter(([name, [, g]]) => (fontGroup === 'All' || g === fontGroup) && name.toLowerCase().includes(q))
    .map(([name, [, g]]) => `<button type="button" data-font="${esc(name)}" class="${t[fontTarget] === name ? 'on' : ''}"><span style="font-family:'${esc(name)}',sans-serif">${esc(name)}</span><small>${g}</small></button>`)
    .join('') || '<p class="muted small">No fonts match.</p>';
}
function applyTheme(patch, msg) {
  commit(() => (state.funnel.theme = { ...state.funnel.theme, ...patch }));
  if (msg) toast(msg);
}
let themeSnap = false;
$('#themeForm').addEventListener('focusin', () => (themeSnap = false));
$('#themeForm').addEventListener('input', (e) => {
  const k = e.target.dataset.k;
  if (!k) return;
  const v = e.target.value;
  if (e.target.type === 'text' && !/^#[0-9a-f]{6}$/i.test(v)) return;
  if (!themeSnap) pushHistory(), (themeSnap = true);
  state.funnel.theme = { ...state.funnel.theme, [k]: v };
  $$(`[data-k="${k}"]`, $('#themeForm')).forEach((el) => el !== e.target && (el.value = v));
  save();
  renderFrame();
});
$('#looks').addEventListener('click', (e) => {
  const b = e.target.closest('[data-look]');
  if (b) applyTheme(LOOKS[+b.dataset.look].theme, `${LOOKS[+b.dataset.look].name} look applied. Undo to go back.`);
});
$('#palettes').addEventListener('click', (e) => {
  const b = e.target.closest('[data-pal]');
  if (!b) return;
  const { name, ...colors } = PALETTES[+b.dataset.pal];
  applyTheme(colors, `${name} colors applied`);
});
$('#seedColor').addEventListener('change', (e) => applyTheme(paletteFromColor(e.target.value), 'Built a full palette from your color'));
$('#logoColors').addEventListener('click', () => $('#logoFile').click());
$('#logoFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const src = await readFile(file);
    const pal = paletteFromPixels(await samplePixels(src));
    if (!pal) return toast('Couldn\'t find strong colors in that picture. Try your logo on a plain background.');
    applyTheme(pal, 'Colors matched to your logo');
  } catch (err) {
    toast(err.message);
  }
});
let fontsLoaded = false;
function loadAllFonts() {
  if (fontsLoaded) return;
  fontsLoaded = true;
  const fams = Object.values(FONTS).map((f) => 'family=' + f).join('&');
  document.head.insertAdjacentHTML('beforeend', `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fams}&display=swap">`);
}
$('#fontBrowser').addEventListener('toggle', (e) => e.target.open && loadAllFonts());
$('#fontBrowser').addEventListener('click', (e) => {
  const ft = e.target.closest('[data-ft]')?.dataset.ft;
  if (ft) return (fontTarget = ft), renderFontList();
  const fg = e.target.closest('[data-fg]')?.dataset.fg;
  if (fg) return (fontGroup = fg), renderFontList();
  const font = e.target.closest('[data-font]')?.dataset.font;
  if (font) applyTheme({ [fontTarget]: font }, `${fontTarget === 'headingFont' ? 'Headlines' : 'Text'} now use ${font}`);
});
$('#fontSearch').addEventListener('input', renderFontList);
$('#shapeForm').addEventListener('click', (e) => {
  const b = e.target.closest('[data-shape-k] button');
  if (b) applyTheme({ [b.parentElement.dataset.shapeK]: b.dataset.v });
});
let radiusSnap = false;
$('#shapeForm').addEventListener('input', (e) => {
  if (e.target.id !== 'radiusRange') return;
  if (!radiusSnap) pushHistory(), (radiusSnap = true);
  state.funnel.theme = { ...state.funnel.theme, radius: Number(e.target.value) };
  $('#radiusVal').textContent = e.target.value + 'px';
  save();
  renderFrame();
});
$('#shapeForm').addEventListener('change', () => (radiusSnap = false));
// Load pairing + look fonts once (one request) so previews render in their own faces.
{
  const fams = new Set();
  FONT_PAIRS.forEach((fp) => fams.add(fp.heading).add(fp.body));
  LOOKS.forEach((l) => fams.add(l.theme.headingFont).add(l.theme.bodyFont));
  const q = [...fams].map((f) => FONTS[f]).filter(Boolean).map((f) => 'family=' + f).join('&');
  document.head.insertAdjacentHTML('beforeend', `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${q}&display=swap">`);
}
$('#fontPairs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-fp]');
  if (!b) return;
  const fp = FONT_PAIRS[+b.dataset.fp];
  applyTheme({ headingFont: fp.heading, bodyFont: fp.body }, `${fp.name} fonts applied`);
});

// ✨ Pick a look: AI when available, otherwise matched from the business type.
$('#aiLook').addEventListener('click', async () => {
  const brief = state.funnel.brief || {};
  if (!brief.business && !brief.sells) {
    toast('Tell us about your business first, then press ✨ Pick a look again.');
    return openBrief();
  }
  const btn = $('#aiLook');
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = 'Picking a look…';
  try {
    await aiState.ready;
    let look = suggestLook(brief);
    let extra = {};
    let why = 'matched to your type of business';
    if (aiState.claude) {
      const answer = await aiState.claude.json(
        `Pick a website design for this business.\nBusiness: ${brief.business}\nSells: ${brief.sells}\nAudience: ${brief.audience || '-'}\nTone: ${brief.tone || '-'}\n\nChoose one look id from: ${LOOKS.map((l) => `${l.id} (${l.desc})`).join('; ')}.\nOptionally a primary brand color as a hex that fits the business, and fonts from this list only: ${Object.keys(FONTS).join(', ')}.\nReply with only JSON: {"look":"id","primary":"#rrggbb","headingFont":"name","bodyFont":"name","why":"one short sentence"}`,
        { modelTier: 'quick', cache: false }
      );
      look = LOOKS.find((l) => l.id === answer?.look) || look;
      if (/^#[0-9a-f]{6}$/i.test(answer?.primary || '')) extra = { ...paletteFromColor(answer.primary), primary: answer.primary };
      if (FONTS[answer?.headingFont]) extra.headingFont = answer.headingFont;
      if (FONTS[answer?.bodyFont]) extra.bodyFont = answer.bodyFont;
      if (answer?.why) why = String(answer.why).slice(0, 120);
    }
    applyTheme({ ...look.theme, ...extra }, `${look.name}: ${why}. Undo to go back.`);
  } catch (err) {
    const look = suggestLook(brief);
    applyTheme(look.theme, `${look.name} look applied (matched to your type of business).`);
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
});

// ---------- right: inspector ----------
const LONG_COLS = /description|quote|answer|what you did/i;
function listHTML(key, f, value) {
  const cols = f.cols.map((c) => (typeof c === 'string' ? { label: c } : c));
  const rows = lines(value).map((l) => l.split('|').map((x) => x.trim()));
  const row = (cells) =>
    `<div class="row ${cols.length === 1 ? 'one' : ''}"><div class="cells">${cols
      .map((c, ci) => {
        const v = esc(cells[ci] || '');
        if (c.options)
          return `<select data-c="${ci}" aria-label="${esc(c.label)}">${c.options.map((o) => `<option ${o === cells[ci] ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
        if (LONG_COLS.test(c.label)) return `<textarea data-c="${ci}" placeholder="${esc(c.label)}" aria-label="${esc(c.label)}">${v}</textarea>`;
        return `<input type="text" data-c="${ci}" value="${v}" placeholder="${esc(c.label)}" aria-label="${esc(c.label)}">`;
      })
      .join('')}</div><button class="icon-btn" data-row-del title="Remove">✕</button></div>`;
  return `<div class="list" data-list="${key}" data-cols="${cols.length}">${rows.map(row).join('')}<button class="add-row" data-row-add>+ Add</button><template>${row([])}</template></div>`;
}
function serializeList(listEl) {
  return $$('.row', listEl)
    .filter((r) => !r.closest('template'))
    .map((r) => {
      const cells = $$('[data-c]', r).map((el) => el.value.replace(/\|/g, '/').replace(/\n/g, ' ').trim());
      while (cells.length && !cells.at(-1)) cells.pop();
      return cells.join(' | ');
    })
    .filter(Boolean)
    .join('\n');
}
const IMG_HELP = 'Tip: for the fastest pages, upload big photos to GoHighLevel → Media and paste the link instead.';
function imageFieldHTML(k, f, v) {
  const has = Boolean(String(v).trim());
  const isData = /^data:image/.test(v);
  return `<div class="imgf" data-img="${k}" data-aspect="${esc(f.aspect || 'original')}">
    <div class="imgf-prev">${has ? `<img src="${esc(v)}" alt="">` : '<span>No picture yet</span>'}</div>
    <div class="imgf-btns"><button type="button" class="btn sm" data-img-act="upload">${has ? 'Replace' : '⬆ Upload'}</button>${
      has ? `<button type="button" class="btn sec sm" data-img-act="crop">✂ Crop & adjust</button><button type="button" class="btn sec sm" data-img-act="remove">Remove</button>` : ''
    }</div>
    <input type="text" class="imgf-url" data-img-url="${k}" value="${isData ? '' : esc(v)}" placeholder="or paste a picture link (https://…)">
    <input type="file" accept="image/*" data-img-file="${k}" hidden>
  </div>`;
}
function galleryFieldHTML(k, v) {
  const pics = lines(v);
  return `<div class="galf" data-gal="${k}">
    <div class="galf-grid">${pics.map((src, i) => `<div class="galf-item"><img src="${esc(src)}" alt=""><div class="galf-tools"><button type="button" data-gal-act="crop" data-i="${i}" title="Crop">✂</button><button type="button" data-gal-act="left" data-i="${i}" title="Move left">←</button><button type="button" data-gal-act="del" data-i="${i}" title="Remove">✕</button></div></div>`).join('')}
      <button type="button" class="galf-add" data-gal-act="add">+ Add pictures</button></div>
    <input type="file" accept="image/*" multiple data-gal-file="${k}" hidden>
  </div>`;
}
function fieldHTML(k, f, v) {
  const help = f.help ? `<div class="help">${esc(f.help)}</div>` : '';
  if (f.type === 'image') return `<div class="field"><span class="flabel">${esc(f.label)}</span>${imageFieldHTML(k, f, v)}</div>`;
  if (f.type === 'gallery') return `<div class="field"><span class="flabel">${esc(f.label)}</span>${galleryFieldHTML(k, v)}<div class="help">${IMG_HELP}</div></div>`;
  if (f.type === 'list') return `<label><span>${esc(f.label)}</span>${listHTML(k, f, v)}${help}</label>`;
  if (f.type === 'select' && k === 'bg') {
    const t = { ...DEFAULT_THEME, ...state.funnel.theme };
    const sw = { default: t.bg, alt: t.alt, dark: t.dark, primary: t.primary };
    return `<label><span>${esc(f.label)}</span><div class="seg" data-seg="${k}">${f.options
      .map((o, i) => `<button type="button" data-v="${o}" class="${o === v ? 'on' : ''}"><i style="background:${sw[o]}"></i>${esc(f.optionLabels?.[i] || o)}</button>`)
      .join('')}</div></label>`;
  }
  if (f.type === 'select')
    return `<label><span>${esc(f.label)}</span><select data-f="${k}">${f.options
      .map((o, i) => `<option value="${o}" ${o === v ? 'selected' : ''}>${esc(f.optionLabels?.[i] || o)}</option>`)
      .join('')}</select>${help}</label>`;
  if (f.type === 'textarea')
    return `<label><span>${esc(f.label)}</span><textarea data-f="${k}" rows="${String(v).split('\n').length > 3 ? 6 : 3}">${esc(v)}</textarea>${help}</label>`;
  return `<label><span>${esc(f.label)}</span><input type="text" data-f="${k}" value="${esc(v)}">${help}</label>`;
}
const LINKISH = /link|url|webhook|redirect|embed|deadline|consent/i;
function renderInspector() {
  const box = $('#inspector');
  const step = curStep();
  const sec = step.sections[state.sel];
  if (!sec) {
    const a = auditStep(step);
    const recs = recommend(state.funnel, state.step);
    const LEVEL = { high: 'Do this first', medium: 'Worth doing', tip: 'Nice to have' };
    box.innerHTML = `
      <div class="score-ring"><div class="n" style="color:${scoreColor(a.score)}">${a.score}</div><div><b>${esc(step.name)} is ${a.score >= 85 ? 'ready to launch' : 'almost ready'}</b><br><span class="muted small">Click any text on the page to change it.</span></div></div>
      <div class="recs-head"><h3>Suggestions</h3><span class="muted small">${recs.length ? `${recs.length} ways to get more sign-ups` : 'Nothing to improve here'}</span></div>
      <ul class="recs">${recs
        .map(
          (r, k) => `<li class="rec lv-${r.level}"><div class="rec-top"><span class="rec-lv">${LEVEL[r.level]}</span></div><b>${esc(r.title)}</b><p>${esc(r.why)}</p><button class="btn sm ${r.level === 'high' ? '' : 'sec'}" data-rec="${k}">${esc(r.fix.label)}</button></li>`
        )
        .join('')}</ul>
      <button class="btn sec full" data-a="ai-page" style="margin:6px 0 14px">✨ Rewrite this page with AI</button>
      <details class="panel" style="margin-top:14px"><summary>Page settings</summary><div class="form" id="pageForm">
        <label><span>Page name</span><input type="text" data-s="name" value="${esc(step.name)}"></label>
        <label><span>Web address</span><input type="text" data-s="path" value="${esc(step.path || '')}"><div class="help">The end of the link, like /free-audit. Use the same one in GoHighLevel.</div></label>
        <label><span>Browser tab title</span><input type="text" data-seo="title" value="${esc(step.seo?.title || '')}"></label>
        <label><span>Google description (optional)</span><textarea data-seo="description">${esc(step.seo?.description || '')}</textarea></label>
      </div></details>
      <details class="panel"><summary>Funnel settings</summary><div class="form" id="funnelForm">
        <label><span>Your website address</span><input type="text" data-t="domain" value="${esc(state.funnel.tracking?.domain || '')}"><div class="help">Connect it in GoHighLevel under Settings → Domains.</div></label>
        <label><span>Facebook/Meta Pixel ID (optional)</span><input type="text" data-t="metaPixel" value="${esc(state.funnel.tracking?.metaPixel || '')}"><div class="help">A number from Meta Events Manager. Lets your ads know who signed up.</div></label>
      </div></details>`;
    return;
  }
  const def = SECTIONS[sec.type];
  const entries = Object.entries(def.fields);
  const isPic = (f) => f.type === 'image' || f.type === 'gallery';
  const content = entries.filter(([k, f]) => k !== 'bg' && (isPic(f) || !LINKISH.test(k)));
  const links = entries.filter(([k, f]) => k !== 'bg' && !isPic(f) && LINKISH.test(k));
  const look = entries.filter(([k]) => k === 'bg');
  box.innerHTML = `<div class="insp-head"><h3>${def.icon} ${esc(def.name)}</h3><div class="insp-actions">
      <button data-a="up" title="Move up">↑</button><button data-a="down" title="Move down">↓</button><button data-a="dup" title="Duplicate">⧉</button><button data-a="del" class="danger" title="Delete">🗑</button><button data-a="close" title="Done">✓</button></div></div>
    <p class="insp-desc">${esc(def.desc || '')}</p>
    <button class="btn sec sm ai-sm" data-a="ai-section">✨ Rewrite this section with AI</button>
    <div class="form">
      ${content.map(([k, f]) => fieldHTML(k, f, sec.props[k] ?? '')).join('')}
      ${links.length ? `<div class="group">Links and connections</div>${links.map(([k, f]) => fieldHTML(k, f, sec.props[k] ?? '')).join('')}` : ''}
      ${look.length ? `<div class="group">Look</div>${look.map(([k, f]) => fieldHTML(k, f, sec.props[k] ?? '')).join('')}` : ''}
    </div>`;
}
let inspSnap = false;
const insp = $('#inspector');

// ---- pictures in the settings panel ----
function setPic(k, v) {
  inspSnap = false;
  setProp(k, v);
  renderInspector();
}
insp.addEventListener('click', async (e) => {
  const imgBox = e.target.closest('[data-img]');
  const act = e.target.closest('[data-img-act]')?.dataset.imgAct;
  if (imgBox && act) {
    e.preventDefault();
    const k = imgBox.dataset.img;
    if (act === 'upload') return $(`[data-img-file="${k}"]`, imgBox).click();
    if (act === 'remove') return setPic(k, '');
    if (act === 'crop') {
      const cur = curStep().sections[state.sel].props[k];
      try {
        const out = await openCropper(cur, { shape: imgBox.dataset.aspect });
        if (out) setPic(k, out);
      } catch (err) {
        toast(/^https?:/.test(cur) ? 'Pictures from links can\'t be cropped here. Upload the file instead.' : err.message);
      }
    }
    return;
  }
  const gal = e.target.closest('[data-gal]');
  const gact = e.target.closest('[data-gal-act]')?.dataset.galAct;
  if (gal && gact) {
    e.preventDefault();
    const k = gal.dataset.gal;
    const pics = lines(curStep().sections[state.sel].props[k]);
    const i = +e.target.closest('[data-gal-act]').dataset.i;
    if (gact === 'add') return $(`[data-gal-file="${k}"]`, gal).click();
    if (gact === 'del') pics.splice(i, 1);
    if (gact === 'left' && i > 0) [pics[i - 1], pics[i]] = [pics[i], pics[i - 1]];
    if (gact === 'crop') {
      try {
        const out = await openCropper(pics[i], { shape: '1:1' });
        if (!out) return;
        pics[i] = out;
      } catch (err) {
        return toast(err.message);
      }
    }
    setPic(k, pics.join('\n'));
  }
});
insp.addEventListener('change', async (e) => {
  const k = e.target.dataset.imgFile;
  if (k) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const src = await readFile(file);
      const box = e.target.closest('[data-img]');
      const out = await openCropper(src, { shape: box?.dataset.aspect || 'original' });
      if (out) setPic(k, out), toast('Picture added');
    } catch (err) {
      toast(err.message);
    }
    return;
  }
  const g = e.target.dataset.galFile;
  if (g) {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    toast(`Adding ${files.length} picture${files.length > 1 ? 's' : ''}…`);
    const pics = lines(curStep().sections[state.sel].props[g]);
    for (const f of files) {
      try {
        pics.push(await compressImage(await readFile(f)));
      } catch (err) {
        toast(err.message);
      }
    }
    setPic(g, pics.join('\n'));
  }
});
insp.addEventListener('focusin', () => (inspSnap = false));
function setProp(k, v, { refreshList = true } = {}) {
  if (!inspSnap) pushHistory(), (inspSnap = true);
  curStep().sections[state.sel].props[k] = v;
  save();
  renderFrame();
  if (refreshList) renderSectionList();
  clearTimeout(scoreT);
  scoreT = setTimeout(updateScore, 400);
}
insp.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.imgUrl !== undefined) {
    const v = el.value.trim();
    if (!v || /^https?:\/\//i.test(v)) setProp(el.dataset.imgUrl, v);
    return;
  }
  if (el.dataset.imgFile !== undefined || el.dataset.galFile !== undefined) return;
  if (el.dataset.f && state.sel >= 0) return setProp(el.dataset.f, el.value);
  const list = el.closest('[data-list]');
  if (list) return setProp(list.dataset.list, serializeList(list), { refreshList: false });
  // page / funnel settings
  if (!inspSnap) pushHistory(), (inspSnap = true);
  const s = curStep();
  if (el.dataset.s) s[el.dataset.s] = el.value;
  if (el.dataset.seo) s.seo = { ...(s.seo || {}), [el.dataset.seo]: el.value };
  if (el.dataset.t) state.funnel.tracking = { ...(state.funnel.tracking || {}), [el.dataset.t]: el.value.trim() };
  save();
  renderSteps();
  renderFrame();
  clearTimeout(scoreT);
  scoreT = setTimeout(updateScore, 400);
});
insp.addEventListener('change', (e) => {
  if (e.target.tagName === 'SELECT') inspSnap = false;
});
insp.addEventListener('click', (e) => {
  const list = e.target.closest('[data-list]');
  if (list && e.target.closest('[data-row-add]')) {
    e.preventDefault();
    const tpl = $('template', list).content.firstElementChild.cloneNode(true);
    list.insertBefore(tpl, e.target.closest('[data-row-add]'));
    $('input,textarea', tpl)?.focus();
    return;
  }
  if (list && e.target.closest('[data-row-del]')) {
    e.preventDefault();
    e.target.closest('.row').remove();
    inspSnap = false;
    return setProp(list.dataset.list, serializeList(list), { refreshList: false });
  }
  const seg = e.target.closest('[data-seg] button');
  if (seg) {
    e.preventDefault();
    $$('button', seg.parentElement).forEach((b) => b.classList.toggle('on', b === seg));
    inspSnap = false;
    return setProp(seg.parentElement.dataset.seg, seg.dataset.v);
  }
  const rec = e.target.closest('[data-rec]');
  if (rec) return applyRecommendation(recommend(state.funnel, state.step)[+rec.dataset.rec]);
  const a = e.target.closest('[data-a]')?.dataset.a;
  if (!a) return;
  if (a === 'close') return select(-1, false);
  if (a === 'ai-section') return aiRewrite({ step: state.step, idx: state.sel });
  if (a === 'ai-page') return aiRewrite({ step: state.step });
  sectionAction(a, state.sel);
});

function applyRecommendation(r) {
  if (!r) return;
  const f = r.fix;
  if (f.type === 'select') {
    select(f.idx, true);
    if (f.field) setTimeout(() => $(`#inspector [data-f="${f.field}"], #inspector [data-list="${f.field}"] input`)?.focus(), 50);
    return;
  }
  if (f.type === 'set') {
    commit(() => {
      curStep().sections[f.idx].props[f.key] = f.value;
      state.sel = -1;
    });
    setTimeout(() => {
      state.sel = f.idx;
      highlight(true);
      state.sel = -1;
    }, 350);
    return toast('Done. Press Undo if you prefer it the old way.');
  }
  if (f.type === 'add') {
    commit(() => {
      curStep().sections.splice(f.at, 0, makeSection(f.section, f.props || {}));
      state.sel = f.at;
    });
    setTimeout(() => highlight(true), 350);
    toast(`${SECTIONS[f.section].name} added. Click its text to make it yours.`);
  }
}

// ---------- tabs / views / devices ----------
$('.tabs').addEventListener('click', (e) => {
  const t = e.target.closest('button')?.dataset.tab;
  if (!t) return;
  $$('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  $$('.left .tab').forEach((el) => (el.hidden = el.id !== `tab-${t}`));
});
$('.views').addEventListener('click', (e) => {
  const v = e.target.closest('button')?.dataset.view;
  if (v) setView(v);
});
function setView(v) {
  state.view = v;
  $$('.views button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
  $('#pagesView').hidden = v !== 'pages';
  $('#guide').hidden = v !== 'pages';
  $('#blueprintView').hidden = v !== 'blueprint';
  $('#auditView').hidden = v !== 'audit';
  $('#guideView').hidden = v !== 'guide';
  if (v === 'guide') renderGuide();
  if (v === 'blueprint') renderBlueprint();
  if (v === 'audit') renderAudit();
}
$('.devices').addEventListener('click', (e) => {
  const d = e.target.closest('button')?.dataset.device;
  if (!d) return;
  state.device = d;
  $$('.devices button').forEach((b) => b.classList.toggle('on', b.dataset.device === d));
  $('#frame').className = `frame ${d}`;
});

// ---------- automations ----------
function renderBlueprint() {
  const f = state.funnel;
  const b = f.blueprint || {};
  const wfs = b.workflows || [];
  const sys = systemMap(f);
  const usedN = sys.filter((t) => t.used).length;
  $('#blueprintView').innerHTML = `<div class="doc">
    <h1>Your all-in-one system</h1>
    <p class="lead">GoHighLevel does the jobs of many separate apps. This funnel uses ${usedN} of them, all connected, so nothing needs Zapier or copy-pasting between tools.</p>
    <div class="sys">${sys.map((t) => `<div class="sys-card ${t.used ? 'on' : ''}"><div class="sys-top"><span class="em">${t.em}</span><span class="status ${t.used ? 'ok' : 'off'}">${t.used ? 'Used here' : 'Available'}</span></div><b>${esc(t.name)}</b><p>${esc(t.does)}</p><small>Replaces ${esc(t.replaces)}</small></div>`).join('')}</div>
    <h1 style="margin-top:36px">What happens automatically</h1>
    <p class="lead">After someone fills in your form, GoHighLevel does these things for you. Nobody has to remember to follow up.</p>
    ${wfs.length ? `<div class="story">${wfs.map((w) => { const s = storyFor(w); return `<div class="card"><span class="em">${s.em}</span><div><b>${esc(s.title)}</b><p>${esc(s.text)}</p></div></div>`; }).join('')}</div>` : '<p class="muted">No automations yet.</p>'}
    ${b.pipeline ? `<h2>Where your leads move</h2><p class="lead" style="margin-bottom:12px">GoHighLevel shows every lead on a board. They move along as they book, show up and buy.</p><div class="pipeline">${b.pipeline.stages.map((s, i) => `${i ? '<span class="arr">→</span>' : ''}<div class="stage">${esc(s)}</div>`).join('')}</div>` : ''}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:24px"><button class="btn" data-bp="push">⚡ Push to GoHighLevel</button><button class="btn sec" data-bp="guide">Open the setup guide</button><button class="btn sec" data-bp="copy">Copy it as text (for Notion or Google Docs)</button></div>
    <details class="tech">
      <summary>Technical details for your GoHighLevel setup</summary>
      <p class="muted">The exact tags, fields, calendars and workflow steps to create. The setup guide above has all of this as a checklist.</p>
      <div class="cards" style="margin-top:16px">
        <div class="card"><h3>Tags (labels on leads)</h3><div class="chips">${(b.tags || []).map((t) => `<span class="chip">${esc(t)}</span>`).join('') || '<span class="muted">None</span>'}</div></div>
        <div class="card"><h3>Saved values</h3>${(b.customValues || []).map((v) => `<div><code>{{custom_values.${esc(v.key)}}}</code><div class="muted small" style="margin:2px 0 8px">${esc(v.value)}</div></div>`).join('') || '<span class="muted">None</span>'}</div>
        <div class="card"><h3>Calendars</h3>${(b.calendars || []).map((c) => `<div><b>${esc(c.name)}</b><div class="muted small" style="margin-bottom:8px">${esc(c.type)} · ${esc(c.duration)}</div></div>`).join('') || '<span class="muted">None</span>'}</div>
      </div>
      ${(b.customFields || []).length ? `<h2>Extra lead fields</h2><div class="t-wrap"><table class="t"><tr><th>Name</th><th>GoHighLevel key</th><th>Type</th></tr>${b.customFields.map((c) => `<tr><td>${esc(c.name)}</td><td><code>{{contact.${esc(c.key)}}}</code></td><td>${esc(c.type)}</td></tr>`).join('')}</table></div>` : ''}
      <h2>Workflow steps</h2>
      ${wfs.map((w) => `<div class="wf"><div class="wf-head"><h3>${esc(w.name)}</h3><div class="trg">Starts when: ${esc(w.trigger)}</div>${w.goal ? `<div class="goal">Goal: ${esc(w.goal)}</div>` : ''}</div><ol class="wf-steps">${w.actions.map((a) => `<li><span class="when">${esc(a.delay)}</span><span class="what">${esc(a.type)}</span><span>${esc(a.detail)}</span></li>`).join('')}</ol></div>`).join('')}
      ${(b.kpis || []).length ? `<h2>Numbers to watch</h2><div class="t-wrap"><table class="t"><tr><th>Number</th><th>Good target</th></tr>${b.kpis.map((k) => `<tr><td>${esc(k.metric)}</td><td><b>${esc(k.target)}</b></td></tr>`).join('')}</table></div>` : ''}
      <h2>Edit (advanced)</h2>
      <textarea id="bpJson" aria-label="Automation settings as JSON" style="width:100%;min-height:220px;font-family:ui-monospace,monospace;font-size:12px;border:1px solid var(--line);border-radius:10px;padding:12px">${esc(JSON.stringify(b, null, 2))}</textarea>
      <div style="margin-top:8px"><button class="btn" data-bp="apply">Save changes</button></div>
    </details>
  </div>`;
}
$('#blueprintView').addEventListener('click', (e) => {
  const a = e.target.dataset.bp;
  if (!a) return;
  if (a === 'guide') return setView('guide');
  if (a === 'push') return openPush();
  if (a === 'copy') return copy(blueprintMarkdown(state.funnel), 'Setup guide copied');
  if (a === 'apply') {
    try {
      const v = JSON.parse($('#bpJson').value);
      commit(() => (state.funnel.blueprint = v));
      renderBlueprint();
      toast('Saved');
    } catch (err) {
      toast('That isn\'t valid JSON: ' + err.message);
    }
  }
});

// ---------- setup guide ----------
function renderGuide() {
  $('#guideFrame').srcdoc = setupGuidePage(state.funnel);
}

// ---------- checklist ----------
const scoreColor = (n) => (n >= 85 ? 'var(--ok)' : n >= 60 ? 'var(--warn)' : 'var(--bad)');
function updateScore() {
  const { score } = auditFunnel(state.funnel);
  const b = $('#scoreBadge');
  b.textContent = score;
  b.className = `badge ${score >= 85 ? 'ok' : score >= 60 ? 'warn' : 'bad'}`;
  if (state.sel < 0 && state.view === 'pages' && !insp.contains(document.activeElement)) renderInspector();
}
// Checklist items: failing ones are clickable and jump to the exact fix.
let auditTargets = [];
const checkItem = (r, stepIdx) => {
  if (r.pass) return `<li class="pass"><span class="st">✓</span><div>${esc(r.label)}</div></li>`;
  const k = auditTargets.push({ step: r.target?.step ?? stepIdx, target: r.target }) - 1;
  return `<li class="fail jump" data-jump="${k}" tabindex="0" role="button" aria-label="${esc(r.label)}: fix this"><span class="st">!</span><div>${esc(r.label)}<small>${esc(r.fix)}</small></div><span class="fix-link">Fix this →</span></li>`;
};
function renderAudit() {
  const a = auditFunnel(state.funnel);
  auditTargets = [];
  const todo = a.funnelChecks.filter((c) => !c.pass).length + a.steps.reduce((n, s) => n + s.results.filter((r) => !r.pass).length, 0);
  $('#auditView').innerHTML = `<div class="doc">
    <h1>Ready to launch?</h1>
    <p class="lead">Before you spend money on ads, check these. Click any item marked <b>!</b> and you'll go straight to the spot to fix it.</p>
    <div class="score-ring" style="margin-top:18px;background:#fff"><div class="n" style="color:${scoreColor(a.score)};font-size:44px">${a.score}</div><div><b>${a.score >= 85 ? 'Ready to launch' : `${todo} thing${todo === 1 ? '' : 's'} left to fix`}</b><br><span class="muted">85 or more means you're good to go.</span></div></div>
    <h2>Whole funnel</h2>
    <div class="card"><ul class="checks">${a.funnelChecks.map((c) => checkItem(c, 0)).join('')}</ul></div>
    ${a.steps.map((s, i) => `<h2>Page ${i + 1}: ${esc(s.name)} <span style="color:${scoreColor(s.score)}">${s.score}</span> <button class="btn sec sm" data-goto="${i}" style="margin-left:8px">Open page</button></h2><div class="card"><ul class="checks">${s.results.map((r) => checkItem(r, i)).join('')}</ul></div>`).join('')}
  </div>`;
}

// Jump to the exact place a problem lives and put the cursor there.
function flash(el) {
  if (!el) return;
  const box = el.closest('label') || el;
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  box.classList.remove('flash');
  void box.offsetWidth;
  box.classList.add('flash');
  setTimeout(() => el.focus({ preventScroll: true }), 350);
}
function goToFix(stepIdx, t = {}) {
  if (t.view) return setView(t.view);
  setView('pages');
  state.step = Math.min(Math.max(0, stepIdx), state.funnel.steps.length - 1);
  if (t.add) {
    commit(() => {
      curStep().sections.splice(t.at, 0, makeSection(t.add));
      state.sel = t.at;
    });
    setTimeout(() => highlight(true), 350);
    return toast(`${SECTIONS[t.add].name} added. Click its text to make it yours.`);
  }
  if (t.idx !== undefined && t.idx >= 0 && curStep().sections[t.idx]) {
    state.sel = t.idx;
    renderAll();
    setTimeout(() => highlight(true), 300);
    if (t.field) flash($(`#inspector [data-f="${t.field}"]`) || $(`#inspector [data-list="${t.field}"] input, #inspector [data-list="${t.field}"] textarea`) || $(`#inspector [data-list="${t.field}"]`));
    return;
  }
  // Page or funnel settings live in the panel shown when nothing is selected.
  state.sel = -1;
  renderAll();
  const panel = t.funnel ? $('#funnelForm') : $('#pageForm');
  panel?.closest('details')?.setAttribute('open', '');
  const sel = t.funnel ? `[data-t="${t.funnel}"]` : t.page === 'title' ? '[data-seo="title"]' : `[data-s="${t.page || 'path'}"]`;
  flash(panel?.querySelector(sel));
}
function onAuditJump(e) {
  const li = e.target.closest('[data-jump]');
  if (li) {
    const j = auditTargets[+li.dataset.jump];
    return goToFix(j.step, j.target || {});
  }
  const g = e.target.dataset.goto;
  if (g === undefined) return;
  state.step = +g;
  state.sel = -1;
  setView('pages');
  renderAll();
}
$('#auditView').addEventListener('click', onAuditJump);
$('#auditView').addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-jump]')) e.preventDefault(), onAuditJump(e);
});

// ---------- new funnel (goal picker) ----------
function renderTemplates() {
  $('#templateGrid').innerHTML = TEMPLATES.map((t) => {
    const f = t.build();
    const g = GOALS[t.id] || { em: '📄', goal: t.name, who: t.description };
    const n = f.blueprint.workflows.length;
    return `<button class="tpl" data-id="${t.id}"><span class="em">${g.em}</span><h3>${esc(g.goal)}</h3><p>${esc(g.who)}</p>
      <div class="pages">${f.steps.map((s, i) => `${i ? '→' : ''}<span>${esc(s.name)}</span>`).join('')}</div>
      ${n ? `<div class="auto">+ ${n} automatic follow-up${n > 1 ? 's' : ''}</div>` : ''}</button>`;
  }).join('');
}
function openWelcome({ intro = false } = {}) {
  $('#welcomeIntro').hidden = !intro;
  $('#goalStep').hidden = false;
  $('#briefStep').hidden = true;
  if (!$('#templateDialog').open) $('#templateDialog').showModal();
  setTimeout(() => $('#templateGrid .tpl')?.focus(), 30);
}
$('#newBtn').addEventListener('click', () => openWelcome());
$('#changeGoal').addEventListener('click', () => openWelcome());
$('#templateGrid').addEventListener('click', (e) => {
  const b = e.target.closest('.tpl');
  if (!b) return;
  commit(() => {
    state.funnel = buildTemplate(b.dataset.id);
    state.step = 0;
    state.sel = -1;
  });
  setView('pages');
  openBrief({ fromWelcome: true });
});

// ---------- AI: brief + providers ----------
let briefFromWelcome = false;
let briefTarget = null; // null = whole funnel, {step} = one page, {step, idx} = one section
function renderBriefForm() {
  const b = state.funnel.brief || {};
  $('#briefForm').innerHTML =
    BRIEF_FIELDS.map((f) => `<label for="bf-${f.key}"><span>${esc(f.label)}${f.required ? '' : ''}</span><input id="bf-${f.key}" data-bf="${f.key}" value="${esc(b[f.key] || '')}" placeholder="${esc(f.placeholder)}" autocomplete="off"></label>`).join('') +
    `<label for="bf-tone"><span>Tone</span><select id="bf-tone" data-bf="tone">${TONES.map((t) => `<option ${t === b.tone ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
     <label for="bf-key" class="api-key" ${aiState.claude ? 'hidden' : ''}><span>Anthropic API key <small class="muted">(only needed outside claude.ai)</small></span><input id="bf-key" type="password" data-bf-key placeholder="sk-ant-…" autocomplete="off"><span class="help">Used for this request only, never saved. Get one at console.anthropic.com.</span></label>`;
}
function readBrief() {
  const b = {};
  $$('[data-bf]', $('#briefForm')).forEach((el) => (b[el.dataset.bf] = el.value.trim()));
  return b;
}
function openBrief({ fromWelcome = false, target = null } = {}) {
  briefFromWelcome = fromWelcome;
  briefTarget = target;
  $('#welcomeIntro').hidden = true;
  $('#goalStep').hidden = true;
  $('#briefStep').hidden = false;
  $('#briefKicker').textContent = fromWelcome ? 'Step 2 of 2' : target ? (target.idx !== undefined ? 'Rewrite one section' : 'Rewrite this page') : 'Write with AI';
  $('#briefSkip').textContent = fromWelcome ? "Skip, I'll edit it myself" : 'Cancel';
  $('#briefQuick').hidden = Boolean(target);
  $('#briefStatus').hidden = true;
  renderBriefForm();
  if (!$('#templateDialog').open) $('#templateDialog').showModal();
  setTimeout(() => $('#bf-business')?.focus(), 30);
}
function finishBrief() {
  $('#templateDialog').close();
  if (briefFromWelcome) maybeStartTour();
}
$('#briefSkip').addEventListener('click', () => {
  finishBrief();
  if (briefFromWelcome) toast('Your funnel is ready. Click any text on the page to change it.');
});
$('#briefQuick').addEventListener('click', () => {
  const b = readBrief();
  if (!b.business && !b.sells) return briefMsg('Add your business name or what you sell first.', 'bad');
  commit(() => {
    state.funnel.brief = b;
    quickFill(state.funnel, b);
  });
  finishBrief();
  toast('Filled in the basics. Use ✨ AI write to rewrite every section, or click any text to edit.');
});
$('#aiBtn').addEventListener('click', () => openBrief());

const aiState = { claude: null, ready: null };
// claude.use resolves the sample function inside claude.ai, or null elsewhere (~10 s).
aiState.ready = (window.claude?.use ? window.claude.use('sample').catch(() => null) : Promise.resolve(null)).then((fn) => {
  aiState.claude = fn;
  if (fn && $('#briefStep') && !$('#briefStep').hidden) renderBriefForm();
  return fn;
});

function parseJsonLoose(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const m = String(text).match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('The AI reply was not in the expected format. Try again.');
  }
}
// Visitor's own key (local use). Official SDK, loaded only when needed.
async function askWithKey(apiKey, prompt, signal) {
  const { default: Anthropic } = await import('https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk/+esm');
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const msg = await client.beta.messages
    .stream(
      {
        model: 'claude-opus-5-5',
        max_tokens: 32000,
        output_config: { effort: 'medium' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        messages: [{ role: 'user', content: prompt }],
      },
      { signal }
    )
    .finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('Claude declined this request. Try describing the business differently.');
  return parseJsonLoose(msg.content.filter((b) => b.type === 'text').map((b) => b.text).join(''));
}
const AI_ERRORS = {
  not_granted: 'AI was not allowed for this page. You can still use Quick fill or edit by hand.',
  sampling_disabled: 'AI is not available on this account. Use Quick fill or edit by hand.',
  rate_limited: 'Too many AI requests right now. Wait a minute and try again.',
  invalid_json: 'The AI reply came back in the wrong format. Try again.',
  refused: 'Claude declined this request. Try describing the business differently.',
  session_expired: 'Please sign in to claude.ai again, then retry.',
};
function briefMsg(text, kind = '') {
  const el = $('#briefStatus');
  el.hidden = false;
  el.className = `brief-status ${kind}`;
  el.innerHTML = text;
}
let aiCtl = null;
async function runAI() {
  const b = readBrief();
  if (!b.business || !b.sells) return briefMsg('Add your business name and what you sell so the AI has something to work with.', 'bad');
  const key = $('#bf-key')?.value.trim();
  await aiState.ready;
  if (!aiState.claude && !key)
    return briefMsg('AI writing works inside claude.ai, or here with your own Anthropic API key (box above). No key? Use <b>Quick fill</b> instead.', 'bad');
  const items = collectFillable(state.funnel, briefTarget && briefTarget.idx !== undefined ? briefTarget : undefined).filter((it) => !briefTarget || it.step === briefTarget.step);
  const goal = (GOALS[state.funnel.templateId] || {}).goal || '';
  const prompt = buildPrompt(b, items, goal);
  aiCtl = new AbortController();
  $('#briefAI').disabled = true;
  $('#briefStop').hidden = false;
  briefMsg(`<span class="spin"></span> Writing ${items.length} section${items.length > 1 ? 's' : ''} for ${esc(b.business)}… this usually takes 20-60 seconds.`);
  try {
    const answer = aiState.claude
      ? await aiState.claude.json(prompt, { modelTier: 'default', signal: aiCtl.signal, cache: false })
      : await askWithKey(key, prompt, aiCtl.signal);
    let changed = 0;
    commit(() => {
      state.funnel.brief = b;
      changed = applyFill(state.funnel, answer, items);
    });
    if (!changed) return briefMsg('The AI didn\'t return any changes. Try adding more detail and run it again.', 'bad');
    finishBrief();
    toast(`AI rewrote ${changed} piece${changed > 1 ? 's' : ''} of text. Press Undo to go back.`);
  } catch (e) {
    if (e?.code === 'cancelled' || e?.name === 'AbortError') return briefMsg('Stopped. Nothing was changed.');
    briefMsg(esc(AI_ERRORS[e?.code] || e?.message || 'Something went wrong. Try again.'), 'bad');
  } finally {
    $('#briefAI').disabled = false;
    $('#briefStop').hidden = true;
    aiCtl = null;
  }
}
$('#briefAI').addEventListener('click', runAI);
$('#briefStop').addEventListener('click', () => aiCtl?.abort());
function aiRewrite(target) {
  openBrief({ target });
}

// ---------- guided tour ----------
const TOUR_KEY = 'funnelforge.tour.v1';
const TOUR = [
  { target: '#frame', title: 'This is your page', text: 'Click any headline, sentence or button <b>right on the page</b> and type. Everything saves automatically.' },
  { target: '#stepList', title: 'Your funnel\'s pages', text: 'A funnel is a few pages in a row. Visitors go from page 1 to the next. Click a page to edit it.', before: () => $('.tabs button[data-tab="steps"]').click() },
  { target: '#inspector', title: 'Suggestions and settings', text: 'With nothing selected you get <b>suggestions</b> to get more sign-ups, each with a one-click fix. Click a section to see its settings here.' },
  { target: '#aiBtn', title: 'Let AI write it', text: 'Describe your business in a few words and AI rewrites every page to match.' },
  { target: '.tabs', title: 'Add blocks and change the look', text: '<b>Add</b> more sections, or open <b>Style</b> to change colors and fonts in one click.' },
  { target: '.views', title: 'Your system and checklist', text: 'See what GoHighLevel does automatically, the step-by-step setup guide, and what\'s left before launch.' },
  { target: '#publishBtn', title: 'Go live', text: 'When you\'re happy, <b>Go live</b> walks you through putting it in GoHighLevel, one step at a time.' },
];
function runTour() {
  setView('pages');
  startTour(TOUR, {
    onDone: () => {
      try {
        localStorage.setItem(TOUR_KEY, '1');
      } catch (e) {}
    },
  });
}
function maybeStartTour() {
  let seen = false;
  try {
    seen = localStorage.getItem(TOUR_KEY) === '1';
  } catch (e) {}
  if (!seen) setTimeout(runTour, 400);
}
$('#importLink').addEventListener('click', () => $('#importFile').click());

// ---------- put it in GoHighLevel ----------
function renderPublish() {
  const f = state.funnel;
  const forms = f.steps.flatMap((s) => s.sections.filter((x) => x.type === 'form').map((x) => ({ step: s, sec: x })));
  const cals = f.steps.flatMap((s) => s.sections.filter((x) => x.type === 'calendar').map((x) => ({ step: s, sec: x })));
  const formOk = forms.every(({ sec }) => (sec.props.webhook || '').trim() || (sec.props.ghlEmbed || '').trim());
  const calOk = cals.every(({ sec }) => /^https?:\/\//.test(sec.props.url || ''));
  $('#publishBody').innerHTML = `<div class="dlg-head"><div><div class="kicker">Step 3 of 3</div><h2>Put your funnel in GoHighLevel</h2></div><button class="x" data-close aria-label="Close">✕</button></div>
    <p class="muted">Follow these in order. It takes about 15 minutes the first time.</p>
    <ol class="pub-steps">
      <li><div><h3>Create the funnel in GoHighLevel</h3><p>Log in to GoHighLevel → <b>Sites</b> → <b>Funnels</b> → <b>New Funnel</b>. Name it "${esc(f.name)}".</p></div></li>
      <li><div><h3>Add one step for each page</h3><p>Click <b>Add New Step</b> for each page below and use the same web address. Then open the step, add a full-width section, drag in a <b>Custom Code</b> element, and paste that page's code.</p>
        <div class="page-rows">${f.steps.map((s, i) => `<div><span class="step-n">${i + 1}</span><b>${esc(s.name)}</b><code>${esc(s.path || '')}</code><button class="btn sm" data-copy="${i}">Copy code</button></div>`).join('')}</div></div></li>
      ${forms.length ? `<li><div><h3>Connect your form ${formOk ? '<span class="status ok">Done</span>' : '<span class="status bad">To do</span>'}</h3><p>So form answers go into GoHighLevel: <b>Automation</b> → <b>Workflows</b> → <b>Create Workflow</b> → trigger <b>Inbound Webhook</b>. Copy the link it gives you. Back here, click the form on your page and paste the link into "Where answers go".</p></div></li>` : ''}
      ${cals.length ? `<li><div><h3>Connect your calendar ${calOk ? '<span class="status ok">Done</span>' : '<span class="status bad">To do</span>'}</h3><p>In GoHighLevel: <b>Calendars</b> → your calendar → <b>Share</b> → copy the booking link. Back here, click the calendar on your page and paste it.</p></div></li>` : ''}
      <li><div><h3>Turn on the automatic follow-ups</h3><p><b>Push to GoHighLevel</b> creates the tags, contact fields, saved values, products and calendars for you. The setup guide covers the rest (pipeline and automations), with a copy button on every message.</p><button class="btn sm" data-pub="push">⚡ Push to GoHighLevel</button> <button class="btn sec sm" data-pub="guide">Open the setup guide</button> <button class="btn sec sm" data-pub="auto">See them in plain English</button></div></li>
      <li><div><h3>Test it yourself</h3><p>Open your live page on your phone, fill in the form with your own details, and check that the text message arrives and you show up in GoHighLevel.</p></div></li>
      <li><div><h3>Save it as a Snapshot (reuse it for every client)</h3><p>In GoHighLevel's agency view: <b>Account Snapshots</b> → <b>Create New Snapshot</b>. A Snapshot packages the pages, fields, tags, pipeline, calendars and automations, so the next client's account is set up in one click.</p></div></li>
    </ol>
    <details class="panel" style="margin-top:16px"><summary>Other files</summary>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn sec sm" data-pub="html">Download this page as HTML</button>
        <button class="btn sec sm" data-pub="allhtml">Download all pages as HTML</button>
        <button class="btn sec sm" data-pub="json">Save funnel file</button>
        <button class="btn sec sm" data-pub="import">Open a funnel file</button>
      </div></details>`;
}
function openPublish() {
  renderPublish();
  $('#publishDialog').showModal();
}
$('#publishBtn').addEventListener('click', openPublish);
$('#goPublish').addEventListener('click', openPublish);
$('#publishDialog').addEventListener('click', (e) => {
  const f = state.funnel;
  const c = e.target.dataset.copy;
  if (c !== undefined) return copy(renderGhlSnippet(f, +c), `Code for "${f.steps[+c].name}" copied. Paste it into a Custom Code element.`);
  const a = e.target.dataset.pub;
  if (a === 'guide') $('#publishDialog').close(), setView('guide');
  if (a === 'push') $('#publishDialog').close(), openPush();
  if (a === 'auto') $('#publishDialog').close(), setView('blueprint');
  if (a === 'html') download(`${slug(curStep().path || curStep().name)}.html`, renderStepPage(f, state.step));
  if (a === 'allhtml') f.steps.forEach((st, i) => setTimeout(() => download(`${i + 1}-${slug(st.path || st.name)}.html`, renderStepPage(f, i)), i * 400));
  if (a === 'json') download(`${slug(f.name)}.funnel.json`, JSON.stringify(f, null, 2), 'application/json');
  if (a === 'import') $('#importFile').click();
});

// ---------- push to GoHighLevel ----------
const STATUS_LABEL = { created: '✓ Created', exists: '• Already there', found: '✓ Found', manual: '→ By hand', failed: '✗ Failed' };
function renderPushDialog() {
  const { auto, manual } = planPush(state.funnel);
  const li = (i) => `<li>${esc(i.area)}: <b>${esc(i.name)}</b>${i.note ? ` <small>(${esc(i.note)})</small>` : ''}</li>`;
  $('#pushBody').innerHTML = `<div class="dlg-head"><div><div class="kicker">Shortcut</div><h2>Push to GoHighLevel</h2></div><button class="x" data-close aria-label="Close">✕</button></div>
    <p class="muted">Creates part of the setup in your GoHighLevel account for you. It's safe to run twice: anything that already exists is skipped.</p>
    <div class="push-cols">
      <div class="card"><h3>✓ Created for you (${auto.length})</h3><ul>${auto.map(li).join('') || '<li class="muted">Nothing for this funnel</li>'}</ul></div>
      <div class="card"><h3>→ Still done by hand (${manual.length})</h3><ul>${manual.map(li).join('')}</ul><p class="muted small" style="margin:8px 0 0">GoHighLevel's API can't create these. The setup guide walks you through them.</p></div>
    </div>
    <div class="push-form">
      <label for="pushLoc">1. Your Location ID<input id="pushLoc" autocomplete="off" placeholder="e.g. ve9EPM428h8vShlRW1KT"><span class="help">In GoHighLevel: <b>Settings → Business Profile</b>. Or copy the part after <code>/location/</code> in your GoHighLevel web address.</span></label>
      <label for="pushToken">2. A Private Integration token<input id="pushToken" type="password" autocomplete="off" placeholder="pit-…"><span class="help">In GoHighLevel: <b>Settings → Private Integrations → Create new integration</b>, tick these permissions, then copy the token. It's only used for this push and never saved.</span>
        <span class="scopes">${REQUIRED_SCOPES.map((x) => `<code>${esc(x)}</code>`).join('')}</span>
        <button type="button" class="btn sec sm" data-push="scopes" style="align-self:flex-start">Copy permission list</button></label>
    </div>
    <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap"><button class="btn" data-push="go">Push now</button><button class="btn sec" data-push="guide">Open the setup guide instead</button></div>
    <div id="pushOut"></div>`;
}
function pushFallback(locationId) {
  const file = `${slug(state.funnel.name)}.funnel.json`;
  const cmd = `GHL_TOKEN=paste-your-token node scripts/push-to-ghl.mjs ${file} --location ${locationId || 'YOUR_LOCATION_ID'}`;
  return `<div class="fallback"><b>Your browser couldn't reach GoHighLevel from this page.</b>
    <span>This is common: browsers often aren't allowed to call GoHighLevel directly, and the shared online version of FunnelForge blocks all outside connections. The command version does the same push from your computer in about a minute:</span>
    <span>1. <button class="btn sec sm" data-push="file">Save the funnel file</button> into the FunnelForge folder.</span>
    <span>2. Open a terminal in that folder and run (put your token in place of <code>paste-your-token</code>):</span>
    <pre>${esc(cmd)}</pre><button class="btn sec sm" data-push="cmd" data-cmd="${esc(cmd)}" style="align-self:flex-start">Copy command</button>
    <span class="muted small">Needs Node.js 18 or newer. Add <code>--dry-run</code> to preview without changing anything.</span></div>`;
}
let pushing = false;
async function doPush() {
  if (pushing) return;
  const locationId = $('#pushLoc').value.trim();
  const token = $('#pushToken').value.trim();
  const out = $('#pushOut');
  if (!locationId || !token) return toast('Add your Location ID and token first');
  pushing = true;
  out.innerHTML = '<ul class="results" id="pushResults"></ul>';
  const row = (r) => `<li class="s-${r.status}"><span class="st">${STATUS_LABEL[r.status] || r.status}</span><span>${esc(r.area)}: <b>${esc(r.name)}</b>${r.detail ? `<small>${esc(r.detail)}</small>` : ''}</span></li>`;
  try {
    const results = await runPush({
      funnel: state.funnel,
      token,
      locationId,
      fetch: window.fetch.bind(window),
      onProgress: (r) => $('#pushResults')?.insertAdjacentHTML('beforeend', row(r)),
    });
    const n = (st) => results.filter((r) => r.status === st).length;
    if (results.some((r) => r.network)) out.insertAdjacentHTML('beforeend', pushFallback(locationId));
    else out.insertAdjacentHTML('afterbegin', `<p><b>Done:</b> ${n('created')} created, ${n('exists') + n('found')} already there, ${n('failed')} failed, ${n('manual')} to do by hand in the setup guide.</p>`);
  } catch (err) {
    out.innerHTML = `<p class="status bad">${esc(err.message)}</p>`;
  } finally {
    pushing = false;
    $('#pushToken').value = '';
  }
}
function openPush() {
  renderPushDialog();
  $('#pushDialog').showModal();
}
$('#pushDialog').addEventListener('click', (e) => {
  const a = e.target.closest('[data-push]')?.dataset.push;
  if (a === 'go') doPush();
  if (a === 'guide') $('#pushDialog').close(), setView('guide');
  if (a === 'scopes') copy(REQUIRED_SCOPES.join('\n'), 'Permission list copied');
  if (a === 'cmd') copy(e.target.dataset.cmd, 'Command copied');
  if (a === 'file') download(`${slug(state.funnel.name)}.funnel.json`, JSON.stringify(state.funnel, null, 2), 'application/json');
});

// ---------- help ----------
$('#helpBody').innerHTML = `<div class="dlg-head"><h2>Help</h2><button class="x" data-close aria-label="Close">✕</button></div>
  <div class="help-actions"><button class="btn" data-help="tour">▶ Take the 1-minute tour</button><a class="btn sec" href="examples/index.html">See finished examples</a><a class="btn sec" href="pitch.html">Read the pitch</a></div>
  <h3 style="margin:20px 0 0">Words you'll see</h3>
  <p class="muted">New to funnels? Here's what everything means.</p>
  <div class="gloss">${GLOSSARY.map(([w, d]) => `<div><b>${esc(w)}</b><p>${esc(d)}</p></div>`).join('')}</div>`;
$('#helpBtn').addEventListener('click', () => $('#helpDialog').showModal());
$('#helpDialog').addEventListener('click', (e) => {
  if (e.target.closest('[data-help="tour"]')) $('#helpDialog').close(), runTour();
});

// ---------- files ----------
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page';
function download(name, text, type = 'text/html') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => (URL.revokeObjectURL(a.href), a.remove()), 1000);
}
async function copy(text, msg) {
  try {
    await navigator.clipboard.writeText(text);
    toast(msg);
  } catch (e) {
    download('code.txt', text, 'text/plain');
    toast('Copying was blocked, so we downloaded it instead');
  }
}
$('#previewBtn').addEventListener('click', () => {
  const w = window.open(URL.createObjectURL(new Blob([renderStepPage(state.funnel, state.step)], { type: 'text/html' })), '_blank');
  if (!w) toast('Your browser blocked the preview window. Switch to 📱 Phone to check the page here.');
});
$('#importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    if (!Array.isArray(d.steps) || !d.steps.length) throw new Error('no pages found');
    d.steps.forEach((s) =>
      (s.sections || []).forEach((x) => {
        if (!SECTIONS[x.type]) throw new Error(`unknown section "${x.type}"`);
        x.id = x.id || uid();
        x.props = { ...SECTIONS[x.type].defaults, ...x.props };
      })
    );
    commit(() => {
      state.funnel = { theme: { ...DEFAULT_THEME }, tracking: {}, blueprint: {}, ...d };
      state.step = 0;
      state.sel = -1;
    });
    $$('dialog[open]').forEach((dl) => dl.close());
    toast(`Opened "${d.name || 'funnel'}"`);
  } catch (err) {
    toast('Couldn\'t open that file: ' + err.message);
  }
  e.target.value = '';
});

// ---------- top bar ----------
let nameSnap = false;
$('#funnelName').addEventListener('focus', () => (nameSnap = false));
$('#funnelName').addEventListener('input', (e) => {
  if (!nameSnap) pushHistory(), (nameSnap = true);
  state.funnel.name = e.target.value;
  save();
});
$('#undoBtn').addEventListener('click', undo);
$('#redoBtn').addEventListener('click', redo);
document.addEventListener('keydown', (e) => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !typing) {
    e.preventDefault();
    e.shiftKey ? redo() : undo();
  }
  if (e.key === 'Escape' && state.sel >= 0 && !typing && !$('dialog[open]')) select(-1, false);
});

// ---------- boot ----------
function renderAll() {
  $('#funnelName').value = state.funnel.name;
  $('#goalName').textContent = (GOALS[state.funnel.templateId] || {}).goal || 'Done';
  renderSteps();
  renderSectionList();
  renderTheme();
  renderInspector();
  renderFrame(true);
  updateScore();
  if (state.view === 'blueprint') renderBlueprint();
  if (state.view === 'audit') renderAudit();
  if (state.view === 'guide') renderGuide();
  save();
}


const saved = loadSaved();
if (saved) {
  state.funnel = saved.funnel;
  state.step = Math.min(saved.step || 0, saved.funnel.steps.length - 1);
} else {
  state.funnel = buildTemplate('email-sms-audit');
}
renderTemplates();
renderAll();
if (!saved) openWelcome({ intro: true });
