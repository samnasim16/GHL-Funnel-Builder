import { SECTIONS, makeSection, uid, esc, lines } from './sections.js';
import { renderStepPage, renderGhlSnippet, FONTS, DEFAULT_THEME } from './renderer.js';
import { TEMPLATES, buildTemplate } from './templates.js';
import { auditFunnel, auditStep } from './audit.js';
import { blueprintMarkdown, systemMap } from './blueprint.js';

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
function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ funnel: state.funnel, step: state.step }));
  } catch (e) {
    /* storage unavailable: builder still works for this session */
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
const PRESETS = [
  { name: 'Bold red', primary: '#e11d2e', accent: '#ffd400', dark: '#0b0b0f' },
  { name: 'Bold yellow', primary: '#ffd400', accent: '#e11d2e', dark: '#0a0a0a' },
  { name: 'Orange', primary: '#ff9900', accent: '#0b0b0f', dark: '#111827' },
  { name: 'Purple', primary: '#6d28d9', accent: '#facc15', dark: '#140b2e' },
  { name: 'Green', primary: '#0e7c66', accent: '#ffb703', dark: '#0f2a24' },
  { name: 'Blue', primary: '#2563eb', accent: '#22d3ee', dark: '#0b1220' },
];
function renderTheme() {
  const t = { ...DEFAULT_THEME, ...state.funnel.theme };
  $('#presets').innerHTML = PRESETS.map(
    (p, i) =>
      `<button data-p="${i}" class="${p.primary === t.primary && p.dark === t.dark ? 'on' : ''}"><div class="sw"><i style="background:${p.primary}"></i><i style="background:${p.accent}"></i><i style="background:${p.dark}"></i></div>${p.name}</button>`
  ).join('');
  const color = (k, l) =>
    `<label><span>${l}</span><div class="color"><input type="color" data-k="${k}" value="${esc(t[k])}" aria-label="${l}"><input type="text" data-k="${k}" value="${esc(t[k])}" aria-label="${l} code"></div></label>`;
  const font = (k, l) =>
    `<label><span>${l}</span><select data-k="${k}">${Object.keys(FONTS)
      .map((f) => `<option ${f === t[k] ? 'selected' : ''}>${f}</option>`)
      .join('')}</select></label>`;
  $('#themeForm').innerHTML =
    color('primary', 'Main color (buttons)') +
    color('accent', 'Second color (highlights)') +
    color('dark', 'Dark sections') +
    color('text', 'Text') +
    font('headingFont', 'Headline font') +
    font('bodyFont', 'Text font') +
    `<label><span>Rounded corners: ${t.radius}px</span><input type="range" min="0" max="28" data-k="radius" value="${t.radius}"></label>`;
}
let themeSnap = false;
$('#themeForm').addEventListener('focusin', () => (themeSnap = false));
$('#themeForm').addEventListener('input', (e) => {
  const k = e.target.dataset.k;
  if (!k) return;
  let v = e.target.value;
  if (k === 'radius') v = Number(v);
  if (e.target.type === 'text' && !/^#[0-9a-f]{6}$/i.test(v)) return;
  if (!themeSnap) pushHistory(), (themeSnap = true);
  state.funnel.theme = { ...state.funnel.theme, [k]: v };
  $$(`[data-k="${k}"]`, $('#themeForm')).forEach((el) => el !== e.target && (el.value = v));
  if (k === 'radius') e.target.previousElementSibling.textContent = `Rounded corners: ${v}px`;
  save();
  renderFrame();
});
$('#presets').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const { name, ...p } = PRESETS[+b.dataset.p];
  commit(() => (state.funnel.theme = { ...state.funnel.theme, ...p }));
  toast(`${name} look applied`);
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
function fieldHTML(k, f, v) {
  const help = f.help ? `<div class="help">${esc(f.help)}</div>` : '';
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
    const todo = a.results.filter((r) => !r.pass);
    box.innerHTML = `
      <div class="tip"><b>How to edit</b><span>👆 Click any text on the page and type over it.</span><span>➕ Hover between sections and click <b>+</b> to add one.</span><span>🧩 Click a section to see all its settings here.</span></div>
      <div class="score-ring"><div class="n" style="color:${scoreColor(a.score)}">${a.score}</div><div><b>This page is ${a.score >= 85 ? 'ready' : 'almost ready'}</b><br><span class="muted small">${todo.length ? `${todo.length} thing${todo.length > 1 ? 's' : ''} to fix before you launch` : 'Nothing left to fix'}</span></div></div>
      ${todo.length ? `<ul class="checks">${todo.map((r) => `<li class="fail"><span class="st">!</span><div>${esc(r.label)}<small>${esc(r.fix)}</small></div></li>`).join('')}</ul>` : ''}
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
  const content = entries.filter(([k]) => k !== 'bg' && !LINKISH.test(k));
  const links = entries.filter(([k]) => k !== 'bg' && LINKISH.test(k));
  const look = entries.filter(([k]) => k === 'bg');
  box.innerHTML = `<div class="insp-head"><h3>${def.icon} ${esc(def.name)}</h3><div class="insp-actions">
      <button data-a="up" title="Move up">↑</button><button data-a="down" title="Move down">↓</button><button data-a="dup" title="Duplicate">⧉</button><button data-a="del" class="danger" title="Delete">🗑</button><button data-a="close" title="Done">✓</button></div></div>
    <p class="insp-desc">${esc(def.desc || '')}</p>
    <div class="form">
      ${content.map(([k, f]) => fieldHTML(k, f, sec.props[k] ?? '')).join('')}
      ${links.length ? `<div class="group">Links and connections</div>${links.map(([k, f]) => fieldHTML(k, f, sec.props[k] ?? '')).join('')}` : ''}
      ${look.length ? `<div class="group">Look</div>${look.map(([k, f]) => fieldHTML(k, f, sec.props[k] ?? '')).join('')}` : ''}
    </div>`;
}
let inspSnap = false;
const insp = $('#inspector');
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
  const a = e.target.closest('[data-a]')?.dataset.a;
  if (!a) return;
  if (a === 'close') return select(-1, false);
  sectionAction(a, state.sel);
});

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
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:24px"><button class="btn" data-bp="dl">Download the setup guide</button><button class="btn sec" data-bp="copy">Copy the setup guide</button></div>
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
  if (a === 'dl') return download(`${slug(state.funnel.name)}-setup-guide.md`, blueprintMarkdown(state.funnel), 'text/markdown');
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

// ---------- checklist ----------
const scoreColor = (n) => (n >= 85 ? 'var(--ok)' : n >= 60 ? 'var(--warn)' : 'var(--bad)');
function updateScore() {
  const { score } = auditFunnel(state.funnel);
  const b = $('#scoreBadge');
  b.textContent = score;
  b.className = `badge ${score >= 85 ? 'ok' : score >= 60 ? 'warn' : 'bad'}`;
  if (state.sel < 0 && state.view === 'pages' && !insp.contains(document.activeElement)) renderInspector();
}
const checkItem = (r) => `<li class="${r.pass ? 'pass' : 'fail'}"><span class="st">${r.pass ? '✓' : '!'}</span><div>${esc(r.label)}${r.pass ? '' : `<small>${esc(r.fix)}</small>`}</div></li>`;
function renderAudit() {
  const a = auditFunnel(state.funnel);
  $('#auditView').innerHTML = `<div class="doc">
    <h1>Ready to launch?</h1>
    <p class="lead">Before you spend money on ads, check these. A score of 85 or more means you're good to go.</p>
    <div class="score-ring" style="margin-top:18px;background:#fff"><div class="n" style="color:${scoreColor(a.score)};font-size:44px">${a.score}</div><div><b>${a.score >= 85 ? 'Ready to launch' : 'A few things to fix'}</b><br><span class="muted">Fix the items marked ! and the score goes up.</span></div></div>
    <h2>Whole funnel</h2>
    <div class="card"><ul class="checks">${a.funnelChecks.map(checkItem).join('')}</ul></div>
    ${a.steps.map((s, i) => `<h2>Page ${i + 1}: ${esc(s.name)} <span style="color:${scoreColor(s.score)}">${s.score}</span> <button class="btn sec sm" data-goto="${i}" style="margin-left:8px">Open page</button></h2><div class="card"><ul class="checks">${s.results.map(checkItem).join('')}</ul></div>`).join('')}
  </div>`;
}
$('#auditView').addEventListener('click', (e) => {
  const g = e.target.dataset.goto;
  if (g === undefined) return;
  state.step = +g;
  state.sel = -1;
  setView('pages');
  renderAll();
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
$('#newBtn').addEventListener('click', () => $('#templateDialog').showModal());
$('#changeGoal').addEventListener('click', () => $('#templateDialog').showModal());
$('#templateGrid').addEventListener('click', (e) => {
  const b = e.target.closest('.tpl');
  if (!b) return;
  commit(() => {
    state.funnel = buildTemplate(b.dataset.id);
    state.step = 0;
    state.sel = -1;
  });
  $('#templateDialog').close();
  setView('pages');
  toast('Your funnel is ready. Click any text on the page to change it.');
});
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
      <li><div><h3>Turn on the automatic follow-ups</h3><p>The setup guide lists every text, email and reminder to create, step by step.</p><button class="btn sec sm" data-pub="guide">Download the setup guide</button> <button class="btn sec sm" data-pub="auto">See them in plain English</button></div></li>
      <li><div><h3>Test it yourself</h3><p>Open your live page on your phone, fill in the form with your own details, and check that the text message arrives and you show up in GoHighLevel.</p></div></li>
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
  if (a === 'guide') download(`${slug(f.name)}-setup-guide.md`, blueprintMarkdown(f), 'text/markdown');
  if (a === 'auto') $('#publishDialog').close(), setView('blueprint');
  if (a === 'html') download(`${slug(curStep().path || curStep().name)}.html`, renderStepPage(f, state.step));
  if (a === 'allhtml') f.steps.forEach((st, i) => setTimeout(() => download(`${i + 1}-${slug(st.path || st.name)}.html`, renderStepPage(f, i)), i * 400));
  if (a === 'json') download(`${slug(f.name)}.funnel.json`, JSON.stringify(f, null, 2), 'application/json');
  if (a === 'import') $('#importFile').click();
});

// ---------- help ----------
$('#helpBody').innerHTML = `<div class="dlg-head"><h2>Words you'll see</h2><button class="x" data-close aria-label="Close">✕</button></div>
  <p class="muted">New to funnels? Here's what everything means.</p>
  <div class="gloss">${GLOSSARY.map(([w, d]) => `<div><b>${esc(w)}</b><p>${esc(d)}</p></div>`).join('')}</div>`;
$('#helpBtn').addEventListener('click', () => $('#helpDialog').showModal());

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
if (!saved) $('#templateDialog').showModal();
