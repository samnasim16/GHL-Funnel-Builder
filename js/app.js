import { SECTIONS, makeSection, uid, esc } from './sections.js';
import { renderStepPage, renderGhlSnippet, FONTS, DEFAULT_THEME } from './renderer.js';
import { TEMPLATES, buildTemplate } from './templates.js';
import { auditFunnel, auditStep } from './audit.js';
import { blueprintMarkdown } from './blueprint.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const STORE_KEY = 'funnelforge.v1';

const state = {
  funnel: null,
  step: 0,
  sel: -1,
  device: 'desktop',
  view: 'pages',
  past: [],
  future: [],
};

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
}
function redo() {
  if (!state.future.length) return toast('Nothing to redo');
  state.past.push(snap());
  restore(state.future.pop());
}
// Apply a structural change: snapshot, mutate, re-render everything.
function commit(fn) {
  pushHistory();
  fn();
  renderAll();
}

const curStep = () => state.funnel.steps[state.step];

// ---------- toast ----------
let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2200);
}

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
    const domain = state.funnel.tracking?.domain || 'your-domain.com';
    $('#urlBar').textContent = `https://${domain}${curStep().path || ''}`;
  };
  immediate ? go() : (frameT = setTimeout(go, 160));
}
function highlight(scroll) {
  const f = $('#frame');
  f.contentWindow && f.contentWindow.postMessage({ fb: 'highlight', idx: state.sel, scroll }, '*');
}
window.addEventListener('message', (e) => {
  if (e.source !== $('#frame').contentWindow) return;
  if (e.data && e.data.fb === 'select') {
    state.sel = e.data.idx;
    renderSectionList();
    renderInspector();
    highlight(false);
  }
});

// ---------- left: steps ----------
function renderSteps() {
  const ul = $('#stepList');
  ul.innerHTML = state.funnel.steps
    .map(
      (s, i) => `<li class="${i === state.step ? 'on' : ''}" data-i="${i}"><span class="step-n">${i + 1}</span><span class="nm">${esc(s.name)}<div class="pth">${esc(s.path || '')}</div></span>
      <button class="icon-btn" data-act="up" title="Move up">↑</button><button class="icon-btn" data-act="dup" title="Duplicate">⧉</button><button class="icon-btn" data-act="del" title="Delete">✕</button></li>`
    )
    .join('');
}
let armedDelete = -1;
let armedT;
$('#stepList').addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  const i = +li.dataset.i;
  const act = e.target.dataset.act;
  if (act === 'del') {
    if (state.funnel.steps.length === 1) return toast('A funnel needs at least one step');
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
      c.path = (c.path || '/step') + '-copy';
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
    state.funnel.steps.push({
      name: `Step ${n}`,
      path: `/step-${n}`,
      seo: { title: '' },
      sections: [makeSection('header'), makeSection('hero'), makeSection('footer')],
    });
    state.step = state.funnel.steps.length - 1;
    state.sel = -1;
  })
);

// ---------- left: sections (drag to reorder) ----------
function sectionLabel(s) {
  const p = s.props;
  const t = p.headline || p.text || p.logo || p.title || '';
  return String(t).split('\n')[0].slice(0, 34);
}
function renderSectionList() {
  const ul = $('#sectionList');
  ul.innerHTML = curStep()
    .sections.map((s, i) => {
      const d = SECTIONS[s.type] || { name: s.type, icon: '?' };
      return `<li draggable="true" data-i="${i}" class="${i === state.sel ? 'on' : ''}"><span class="ic">${d.icon}</span><span class="nm">${esc(d.name)}<br><small class="muted">${esc(sectionLabel(s))}</small></span><button class="icon-btn" data-act="del" title="Remove">✕</button></li>`;
    })
    .join('');
}
let dragFrom = -1;
const secList = $('#sectionList');
secList.addEventListener('dragstart', (e) => {
  const li = e.target.closest('li');
  dragFrom = +li.dataset.i;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(dragFrom));
});
secList.addEventListener('dragover', (e) => {
  e.preventDefault();
  $$('li', secList).forEach((l) => l.classList.remove('drag-over'));
  const li = e.target.closest('li');
  li && li.classList.add('drag-over');
});
secList.addEventListener('dragleave', (e) => e.target.closest('li')?.classList.remove('drag-over'));
secList.addEventListener('drop', (e) => {
  e.preventDefault();
  const li = e.target.closest('li');
  if (!li || dragFrom < 0) return;
  const to = +li.dataset.i;
  if (to === dragFrom) return;
  commit(() => {
    const arr = curStep().sections;
    const [m] = arr.splice(dragFrom, 1);
    arr.splice(to, 0, m);
    state.sel = to;
  });
  dragFrom = -1;
});
secList.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  const i = +li.dataset.i;
  if (e.target.dataset.act === 'del') {
    return commit(() => {
      curStep().sections.splice(i, 1);
      state.sel = -1;
    });
  }
  state.sel = i;
  renderSectionList();
  renderInspector();
  highlight(true);
});

// ---------- left: library ----------
function renderLibrary() {
  $('#library').innerHTML = Object.entries(SECTIONS)
    .map(([k, d]) => `<button data-type="${k}"><span class="ic">${d.icon}</span>${esc(d.name)}</button>`)
    .join('');
}
$('#library').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  commit(() => {
    const arr = curStep().sections;
    const at = state.sel >= 0 ? state.sel + 1 : Math.max(0, arr.length - (arr.at(-1)?.type === 'footer' ? 1 : 0));
    arr.splice(at, 0, makeSection(b.dataset.type));
    state.sel = at;
  });
  setTimeout(() => highlight(true), 350);
  toast(`${SECTIONS[b.dataset.type].name} added`);
});

// ---------- left: theme ----------
const PRESETS = [
  { name: 'BAD Red', primary: '#e11d2e', accent: '#ffd400', dark: '#0b0b0f' },
  { name: 'Bold Yellow', primary: '#ffd400', accent: '#e11d2e', dark: '#0a0a0a' },
  { name: 'Amazon', primary: '#ff9900', accent: '#0b0b0f', dark: '#111827' },
  { name: 'Royal', primary: '#6d28d9', accent: '#facc15', dark: '#140b2e' },
  { name: 'Local Green', primary: '#0e7c66', accent: '#ffb703', dark: '#0f2a24' },
  { name: 'Ocean', primary: '#2563eb', accent: '#22d3ee', dark: '#0b1220' },
];
function renderTheme() {
  const t = { ...DEFAULT_THEME, ...state.funnel.theme };
  const color = (k, l) =>
    `<label><span>${l}</span><div class="color"><input type="color" data-k="${k}" value="${esc(t[k])}"><input type="text" data-k="${k}" value="${esc(t[k])}"></div></label>`;
  const font = (k, l) =>
    `<label><span>${l}</span><select data-k="${k}">${Object.keys(FONTS)
      .map((f) => `<option ${f === t[k] ? 'selected' : ''}>${f}</option>`)
      .join('')}</select></label>`;
  $('#themeForm').innerHTML =
    color('primary', 'Primary (buttons, highlights)') +
    color('accent', 'Accent (urgency bar, badges)') +
    color('dark', 'Dark sections') +
    color('bg', 'Page background') +
    color('alt', 'Alternate section background') +
    color('text', 'Text') +
    font('headingFont', 'Heading font') +
    font('bodyFont', 'Body font') +
    `<label><span>Corner radius: ${t.radius}px</span><input type="range" min="0" max="28" data-k="radius" value="${t.radius}"></label>` +
    `<label><span>Content width</span><select data-k="maxWidth">${[960, 1080, 1200]
      .map((w) => `<option ${+t.maxWidth === w ? 'selected' : ''}>${w}</option>`)
      .join('')}</select></label>`;
  $('#presets').innerHTML = PRESETS.map(
    (p, i) => `<button data-p="${i}"><div class="sw"><i style="background:${p.primary}"></i><i style="background:${p.accent}"></i><i style="background:${p.dark}"></i></div>${p.name}</button>`
  ).join('');
}
let themeSnap = false;
$('#themeForm').addEventListener('focusin', () => (themeSnap = false));
$('#themeForm').addEventListener('input', (e) => {
  const k = e.target.dataset.k;
  if (!k) return;
  if (!themeSnap) pushHistory(), (themeSnap = true);
  let v = e.target.value;
  if (k === 'radius' || k === 'maxWidth') v = Number(v);
  if (e.target.type === 'text' && !/^#[0-9a-f]{6}$/i.test(v)) return;
  state.funnel.theme = { ...state.funnel.theme, [k]: v };
  $$(`[data-k="${k}"]`, $('#themeForm')).forEach((el) => el !== e.target && (el.value = v));
  if (k === 'radius') e.target.previousElementSibling.textContent = `Corner radius: ${v}px`;
  save();
  renderFrame();
});
$('#themeForm').addEventListener('change', () => (themeSnap = false));
$('#presets').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const { name, ...p } = PRESETS[+b.dataset.p];
  commit(() => (state.funnel.theme = { ...state.funnel.theme, ...p }));
  toast(`${name} applied`);
});

// ---------- left: settings ----------
function renderSettings() {
  const f = state.funnel;
  const s = curStep();
  $('#settingsForm').innerHTML = `
    <div class="label">This step</div>
    <label><span>Step name</span><input type="text" data-s="name" value="${esc(s.name)}"></label>
    <label><span>Path</span><input type="text" data-s="path" value="${esc(s.path || '')}"><div class="help">Must match the step path in GHL. Forms redirect here from the previous step.</div></label>
    <label><span>SEO title</span><input type="text" data-seo="title" value="${esc(s.seo?.title || '')}"></label>
    <label><span>SEO description</span><textarea data-seo="description">${esc(s.seo?.description || '')}</textarea></label>
    <div class="label">Funnel</div>
    <label><span>Domain</span><input type="text" data-t="domain" value="${esc(f.tracking?.domain || '')}"><div class="help">Connect under Settings → Domains in your GHL sub-account.</div></label>
    <label><span>Meta Pixel ID</span><input type="text" data-t="metaPixel" value="${esc(f.tracking?.metaPixel || '')}"><div class="help">Exports fire PageView on load and Lead on form submit. UTMs + fbclid/gclid are captured and sent to GHL.</div></label>`;
}
let settingsSnap = false;
$('#settingsForm').addEventListener('focusin', () => (settingsSnap = false));
$('#settingsForm').addEventListener('input', (e) => {
  const el = e.target;
  if (!settingsSnap) pushHistory(), (settingsSnap = true);
  const s = curStep();
  if (el.dataset.s) s[el.dataset.s] = el.value;
  if (el.dataset.seo) s.seo = { ...(s.seo || {}), [el.dataset.seo]: el.value };
  if (el.dataset.t) state.funnel.tracking = { ...(state.funnel.tracking || {}), [el.dataset.t]: el.value.trim() };
  save();
  renderSteps();
  renderFrame();
  updateScore();
});

// ---------- right: inspector ----------
function renderInspector() {
  const box = $('#inspector');
  const step = curStep();
  const sec = step.sections[state.sel];
  if (!sec) {
    const a = auditStep(step);
    box.innerHTML = `<div class="insp-head"><h3>${esc(step.name)}</h3></div>
      <p class="muted">Click any section on the page to edit it.</p>
      <div class="score-ring"><div class="n" style="color:${scoreColor(a.score)}">${a.score}</div><div><b>Conversion score</b><br><span class="muted">Pre-launch checklist for this step</span></div></div>
      <ul class="checks">${a.results
        .map((r) => `<li class="${r.pass ? 'pass' : 'fail'}"><span class="st">${r.pass ? '✓' : '✕'}</span><div>${esc(r.label)}${r.pass ? '' : `<small>${esc(r.fix)}</small>`}</div></li>`)
        .join('')}</ul>`;
    return;
  }
  const def = SECTIONS[sec.type];
  box.innerHTML = `<div class="insp-head"><h3>${def.icon} ${esc(def.name)}</h3><div class="insp-actions">
      <button data-a="up" title="Move up">↑</button><button data-a="down" title="Move down">↓</button><button data-a="dup" title="Duplicate">⧉</button><button data-a="del" class="danger" title="Delete">🗑</button><button data-a="close" title="Close">✕</button></div></div>
    <div class="form">${Object.entries(def.fields)
      .map(([k, f]) => {
        const v = sec.props[k] ?? '';
        if (f.type === 'textarea')
          return `<label><span>${esc(f.label)}</span><textarea data-f="${k}" rows="${String(v).split('\n').length > 3 ? 6 : 3}">${esc(v)}</textarea></label>`;
        if (f.type === 'select')
          return `<label><span>${esc(f.label)}</span><select data-f="${k}">${f.options
            .map((o) => `<option ${o === v ? 'selected' : ''}>${o}</option>`)
            .join('')}</select></label>`;
        return `<label><span>${esc(f.label)}</span><input type="text" data-f="${k}" value="${esc(v)}"></label>`;
      })
      .join('')}</div>`;
}
let inspSnap = false;
$('#inspector').addEventListener('focusin', () => (inspSnap = false));
$('#inspector').addEventListener('input', (e) => {
  const k = e.target.dataset.f;
  if (!k) return;
  if (!inspSnap) pushHistory(), (inspSnap = true);
  curStep().sections[state.sel].props[k] = e.target.value;
  save();
  renderFrame();
  renderSectionList();
  updateScore();
});
$('#inspector').addEventListener('change', (e) => {
  if (e.target.tagName === 'SELECT') inspSnap = false;
});
$('#inspector').addEventListener('click', (e) => {
  const a = e.target.closest('[data-a]')?.dataset.a;
  if (!a) return;
  const arr = curStep().sections;
  const i = state.sel;
  if (a === 'close') {
    state.sel = -1;
    renderSectionList();
    renderInspector();
    return highlight(false);
  }
  commit(() => {
    if (a === 'del') arr.splice(i, 1), (state.sel = -1);
    if (a === 'dup') arr.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(arr[i])), id: uid() }), (state.sel = i + 1);
    if (a === 'up' && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]], (state.sel = i - 1);
    if (a === 'down' && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]], (state.sel = i + 1);
  });
  setTimeout(() => highlight(true), 350);
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
  if (!v) return;
  setView(v);
});
function setView(v) {
  state.view = v;
  $$('.views button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
  $('#pagesView').hidden = v !== 'pages';
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

// ---------- blueprint view ----------
function renderBlueprint() {
  const f = state.funnel;
  const b = f.blueprint || {};
  const stageCount = (b.pipeline?.stages || []).length;
  $('#blueprintView').innerHTML = `<div class="doc">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
      <div><h1>GHL Blueprint</h1><div class="muted">Everything to configure in the GoHighLevel sub-account for <b>${esc(f.name)}</b>.</div></div>
      <div style="display:flex;gap:8px"><button class="btn sec" data-bp="copy">Copy build sheet</button><button class="btn" data-bp="dl">Download build sheet (.md)</button></div>
    </div>
    <h2>Funnel flow</h2>
    <div class="flow">${f.steps
      .map((s, i) => `${i ? '<div class="arrow">→</div>' : ''}<div class="node"><b>${i + 1}. ${esc(s.name)}</b><small>${esc(s.path || '')}</small><br><small>${s.sections.length} sections${s.sections.some((x) => x.type === 'form') ? ' · form' : ''}${s.sections.some((x) => x.type === 'calendar') ? ' · calendar' : ''}</small></div>`)
      .join('')}<div class="arrow">→</div><div class="node"><b>GHL Pipeline</b><small>${esc(b.pipeline?.name || '')}</small><br><small>${stageCount} stages</small></div></div>
    ${b.pipeline ? `<h2>Pipeline: ${esc(b.pipeline.name)}</h2><div class="pipeline">${b.pipeline.stages.map((s, i) => `<div class="stage"><small>Stage ${i + 1}</small>${esc(s)}</div>`).join('')}</div>` : ''}
    <div class="cards" style="margin-top:20px">
      <div class="card"><h3>Tags</h3><div class="chips">${(b.tags || []).map((t) => `<span class="chip">${esc(t)}</span>`).join('') || '<span class="muted">None</span>'}</div></div>
      <div class="card"><h3>Custom values</h3>${(b.customValues || []).map((v) => `<div><code>{{custom_values.${esc(v.key)}}}</code><div class="muted" style="font-size:12px;margin:2px 0 8px">${esc(v.value)}</div></div>`).join('') || '<span class="muted">None</span>'}</div>
      <div class="card"><h3>Calendars</h3>${(b.calendars || []).map((c) => `<div><b>${esc(c.name)}</b><div class="muted" style="font-size:12px;margin-bottom:8px">${esc(c.type)} · ${esc(c.duration)}${c.notes ? ' · ' + esc(c.notes) : ''}</div></div>`).join('') || '<span class="muted">None</span>'}</div>
    </div>
    ${(b.customFields || []).length ? `<h2>Custom fields</h2><table class="t"><tr><th>Name</th><th>Merge key</th><th>Type</th></tr>${b.customFields.map((c) => `<tr><td>${esc(c.name)}</td><td><code>{{contact.${esc(c.key)}}}</code></td><td>${esc(c.type)}</td></tr>`).join('')}</table>` : ''}
    <h2>Workflows (${(b.workflows || []).length})</h2>
    ${(b.workflows || [])
      .map(
        (w) => `<div class="wf"><div class="wf-head"><h3>${esc(w.name)}</h3><div class="trg">⚡ Trigger: ${esc(w.trigger)}</div>${w.goal ? `<div class="goal">🎯 ${esc(w.goal)}</div>` : ''}</div>
        <ol class="wf-steps">${w.actions.map((a) => `<li><span class="when">${esc(a.delay)}</span><span class="what">${esc(a.type)}</span><span>${esc(a.detail)}</span></li>`).join('')}</ol></div>`
      )
      .join('')}
    ${(b.kpis || []).length ? `<h2>KPIs</h2><table class="t"><tr><th>Metric</th><th>Target</th></tr>${b.kpis.map((k) => `<tr><td>${esc(k.metric)}</td><td><b>${esc(k.target)}</b></td></tr>`).join('')}</table>` : ''}
    <h2>Edit blueprint (JSON)</h2>
    <p class="muted">Tweak stages, tags, workflows or KPIs, then apply. The build sheet updates with it.</p>
    <textarea id="bpJson" style="width:100%;min-height:260px;font-family:ui-monospace,monospace;font-size:12px;border:1px solid var(--line);border-radius:10px;padding:12px">${esc(JSON.stringify(b, null, 2))}</textarea>
    <div style="margin-top:8px"><button class="btn" data-bp="apply">Apply changes</button></div>
  </div>`;
}
$('#blueprintView').addEventListener('click', async (e) => {
  const a = e.target.dataset.bp;
  if (!a) return;
  if (a === 'dl') return download(`${slug(state.funnel.name)}-ghl-build-sheet.md`, blueprintMarkdown(state.funnel), 'text/markdown');
  if (a === 'copy') return copy(blueprintMarkdown(state.funnel), 'Build sheet copied');
  if (a === 'apply') {
    try {
      const v = JSON.parse($('#bpJson').value);
      commit(() => (state.funnel.blueprint = v));
      renderBlueprint();
      toast('Blueprint updated');
    } catch (err) {
      toast('Invalid JSON: ' + err.message);
    }
  }
});

// ---------- audit view ----------
const scoreColor = (n) => (n >= 85 ? 'var(--ok)' : n >= 60 ? 'var(--warn)' : 'var(--bad)');
function updateScore() {
  const { score } = auditFunnel(state.funnel);
  const b = $('#scoreBadge');
  b.textContent = score;
  b.className = `badge ${score >= 85 ? 'ok' : score >= 60 ? 'warn' : 'bad'}`;
}
function renderAudit() {
  const a = auditFunnel(state.funnel);
  $('#auditView').innerHTML = `<div class="doc">
    <h1>Launch Audit</h1><div class="muted">What a senior funnel builder checks before a single dollar of ad spend hits the page.</div>
    <div class="score-ring" style="margin-top:18px;background:#fff;border:1px solid var(--line)"><div class="n" style="color:${scoreColor(a.score)};font-size:44px">${a.score}</div><div><b>Funnel launch score</b><br><span class="muted">85+ is ready to take traffic.</span></div></div>
    <h2>Funnel-level</h2>
    <div class="card"><ul class="checks">${a.funnelChecks.map((c) => `<li class="${c.pass ? 'pass' : 'fail'}"><span class="st">${c.pass ? '✓' : '✕'}</span><div>${esc(c.label)}${c.pass ? '' : `<small>${esc(c.fix)}</small>`}</div></li>`).join('')}</ul></div>
    ${a.steps
      .map(
        (s, i) => `<h2>${i + 1}. ${esc(s.name)} <span style="color:${scoreColor(s.score)}">${s.score}</span> <button class="btn sec" data-goto="${i}" style="margin-left:8px;font-size:12px;padding:4px 10px">Open step</button></h2>
      <div class="card"><ul class="checks">${s.results.map((r) => `<li class="${r.pass ? 'pass' : 'fail'}"><span class="st">${r.pass ? '✓' : '✕'}</span><div>${esc(r.label)}${r.pass ? '' : `<small>${esc(r.fix)}</small>`}</div></li>`).join('')}</ul></div>`
      )
      .join('')}
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

// ---------- templates ----------
function renderTemplates() {
  $('#templateGrid').innerHTML = TEMPLATES.map((t) => {
    const f = t.build();
    const th = f.theme;
    return `<button class="tpl" data-id="${t.id}"><div class="sw"><i style="background:${th.primary}"></i><i style="background:${th.accent}"></i><i style="background:${th.dark}"></i></div>
      <div class="cat">${esc(t.category)}</div><h3>${esc(t.name)}</h3><p>${esc(t.description)}</p>
      <div class="meta">${f.steps.length} steps · ${f.blueprint.workflows.length} workflows · ${f.steps.map((s) => esc(s.name)).join(' → ')}</div></button>`;
  }).join('');
}
$('#templatesBtn').addEventListener('click', () => $('#templateDialog').showModal());
$('#templateGrid').addEventListener('click', (e) => {
  const b = e.target.closest('.tpl');
  if (!b) return;
  commit(() => {
    state.funnel = buildTemplate(b.dataset.id);
    state.step = 0;
    state.sel = -1;
  });
  $('#templateDialog').close();
  toast(`Loaded "${state.funnel.name}"`);
});

// ---------- export ----------
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
    download('snippet.txt', text, 'text/plain');
    toast('Clipboard blocked, downloaded instead');
  }
}
$('#exportBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  $('#exportMenu').hidden = !$('#exportMenu').hidden;
});
document.addEventListener('click', () => ($('#exportMenu').hidden = true));
$('#exportMenu').addEventListener('click', (e) => {
  const x = e.target.dataset.export;
  if (!x) return;
  const f = state.funnel;
  const s = curStep();
  if (x === 'snippet') copy(renderGhlSnippet(f, state.step), 'GHL Custom Code copied. Paste into a Custom Code element.');
  if (x === 'html') download(`${slug(s.path || s.name)}.html`, renderStepPage(f, state.step));
  if (x === 'allhtml') f.steps.forEach((st, i) => setTimeout(() => download(`${i + 1}-${slug(st.path || st.name)}.html`, renderStepPage(f, i)), i * 400));
  if (x === 'preview') {
    const w = window.open(URL.createObjectURL(new Blob([renderStepPage(f, state.step)], { type: 'text/html' })), '_blank');
    if (!w) toast('Pop-up blocked');
  }
  if (x === 'sop') download(`${slug(f.name)}-ghl-build-sheet.md`, blueprintMarkdown(f), 'text/markdown');
  if (x === 'json') download(`${slug(f.name)}.funnel.json`, JSON.stringify(f, null, 2), 'application/json');
  if (x === 'import') $('#importFile').click();
});
$('#importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    if (!Array.isArray(d.steps) || !d.steps.length) throw new Error('missing steps');
    d.steps.forEach((s) => (s.sections || []).forEach((x) => {
      if (!SECTIONS[x.type]) throw new Error(`unknown section "${x.type}"`);
      x.id = x.id || uid();
      x.props = { ...SECTIONS[x.type].defaults, ...x.props };
    }));
    commit(() => {
      state.funnel = { theme: { ...DEFAULT_THEME }, tracking: {}, blueprint: {}, ...d };
      state.step = 0;
      state.sel = -1;
    });
    toast(`Imported "${d.name || 'funnel'}"`);
  } catch (err) {
    toast('Import failed: ' + err.message);
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
  if (e.key === 'Escape' && state.sel >= 0 && !typing) {
    state.sel = -1;
    renderSectionList();
    renderInspector();
    highlight(false);
  }
});

// ---------- boot ----------
function renderAll() {
  $('#funnelName').value = state.funnel.name;
  renderSteps();
  renderSectionList();
  renderTheme();
  renderSettings();
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
renderLibrary();
renderTemplates();
renderAll();
if (!saved) $('#templateDialog').showModal();
