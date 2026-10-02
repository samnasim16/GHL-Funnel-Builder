// Interactive GoHighLevel setup guide: a standalone page with a tick box on
// every task, a copy button on every value, and saved progress. Used by the
// builder's "Setup guide" tab and written next to each example funnel.
import { esc } from './sections.js?v=56fc796f51';
import { systemMap, blueprintMarkdown } from './blueprint.js?v=56fc796f51';

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const copyBtn = (text, label = 'Copy') => `<button class="cp" type="button" data-copy="${esc(text)}">${label}</button>`;
const where = (path) => `<div class="where">In GoHighLevel: ${path.split('→').map((p) => `<b>${esc(p.trim())}</b>`).join(' → ')}</div>`;
const isMessage = (type) => /sms|email|notification/i.test(type);

// One tick-box row. `id` must be stable so saved progress survives edits elsewhere.
function task(id, body) {
  return `<div class="task" data-task="${esc(id)}"><input type="checkbox" id="t-${esc(id)}" aria-label="Done"><div class="task-body">${body}</div></div>`;
}

function section(n, title, intro, path, inner) {
  return `<section class="step" id="s${n}"><header><span class="num">${n}</span><div><h2>${esc(title)}</h2>${intro ? `<p>${intro}</p>` : ''}${path ? where(path) : ''}</div><span class="count" data-count></span></header><div class="tasks">${inner}</div></section>`;
}

export function setupGuideBody(funnel) {
  const b = funnel.blueprint || {};
  const used = systemMap(funnel).filter((t) => t.used);
  const parts = [];
  let n = 0;

  parts.push(
    section(
      ++n,
      'Create the funnel and its pages',
      'One step per page, with the same web address. On each step add a full-width section, drag in a <b>Custom Code</b> element, and paste that page\'s code from the builder (Put in GoHighLevel → Copy code).',
      'Sites → Funnels → New Funnel',
      task('funnel', `<div class="row"><span>Name the funnel</span><code>${esc(funnel.name)}</code>${copyBtn(funnel.name)}</div>`) +
        funnel.steps
          .map((s, i) =>
            task(`page-${i}`, `<div class="row"><span>Step ${i + 1}: <b>${esc(s.name)}</b></span><code>${esc(s.path || '')}</code>${copyBtn(s.path || '', 'Copy address')}</div>`)
          )
          .join('')
    )
  );

  if (b.customFields?.length)
    parts.push(
      section(
        ++n,
        'Add the contact fields',
        'Extra boxes on each contact, so you can see their answers (like revenue) in GoHighLevel. Copy the name exactly so the form answers land in the right place.',
        'Settings → Custom Fields → Add Field',
        b.customFields
          .map((f) => task(`field-${f.key}`, `<div class="row"><span><b>${esc(f.name)}</b> <small>${esc(f.type)}</small></span><code>{{contact.${esc(f.key)}}}</code>${copyBtn(f.name, 'Copy name')}</div>`))
          .join('')
      )
    );

  if (b.customValues?.length)
    parts.push(
      section(
        ++n,
        'Add the saved values',
        'Text you reuse in many messages, like your booking link. Change it once here and every message updates.',
        'Settings → Custom Values → Add',
        b.customValues
          .map((v) =>
            task(`value-${v.key}`, `<div class="row"><span><b>${esc(v.name)}</b></span>${copyBtn(v.name, 'Copy name')}</div><div class="row sub"><code>${esc(v.value)}</code>${copyBtn(v.value, 'Copy value')}</div>`)
          )
          .join('')
      )
    );

  if (b.tags?.length)
    parts.push(
      section(
        ++n,
        'Create the tags',
        'Labels that workflows put on leads, so you can sort and filter them.',
        'Settings → Tags → Add Tag',
        b.tags.map((t) => task(`tag-${t}`, `<div class="row"><code>${esc(t)}</code>${copyBtn(t)}</div>`)).join('')
      )
    );

  if (b.pipeline)
    parts.push(
      section(
        ++n,
        'Build the pipeline',
        'The board that shows where every lead is. Add the stages in this order.',
        'Opportunities → Pipelines → Create New Pipeline',
        task('pipeline', `<div class="row"><span>Pipeline name</span><code>${esc(b.pipeline.name)}</code>${copyBtn(b.pipeline.name)}</div>`) +
          task(
            'stages',
            `<div class="row"><span>Stages</span>${copyBtn(b.pipeline.stages.join('\n'), 'Copy all')}</div><ol class="stages">${b.pipeline.stages.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`
          )
      )
    );

  if (b.calendars?.length)
    parts.push(
      section(
        ++n,
        'Set up the calendar',
        'Then copy its booking link into the calendar section of your page in the builder.',
        'Calendars → Calendar Settings → Create Calendar',
        b.calendars
          .map((c, i) => task(`cal-${i}`, `<div class="row"><span><b>${esc(c.name)}</b> <small>${esc(c.type)} · ${esc(c.duration)}</small></span>${copyBtn(c.name, 'Copy name')}</div>${c.notes ? `<p class="note">${esc(c.notes)}</p>` : ''}`))
          .join('')
      )
    );

  if (b.products?.length)
    parts.push(
      section(
        ++n,
        'Add the product',
        'Then create a payment link for it and paste that into the checkout section of your page.',
        'Payments → Products → Create Product',
        b.products
          .map((p, i) => task(`product-${i}`, `<div class="row"><span><b>${esc(p.name)}</b> <small>${esc(p.price)}${p.delivers ? ' · delivers ' + esc(p.delivers) : ''}</small></span>${copyBtn(p.name, 'Copy name')}</div>`))
          .join('')
      )
    );

  if (b.workflows?.length)
    parts.push(
      section(
        ++n,
        'Build the automations',
        'One workflow per card. Add the trigger, then each action in order. Message wording is ready to copy.',
        'Automation → Workflows → Create Workflow → Start from scratch',
        b.workflows
          .map(
            (w, wi) => `<div class="wf"><div class="wf-head">${task(`wf-${wi}`, `<div class="row"><b>${esc(w.name)}</b>${copyBtn(w.name, 'Copy name')}</div><div class="trig">Starts when: ${esc(w.trigger)}</div>${w.goal ? `<div class="goal">Goal: ${esc(w.goal)}</div>` : ''}`)}</div>
            ${w.actions
              .map((a, ai) =>
                task(
                  `wf-${wi}-${ai}`,
                  `<div class="row"><span class="when">${esc(a.delay)}</span><span class="what">${esc(a.type)}</span></div>${
                    isMessage(a.type)
                      ? `<div class="msg"><p>${esc(a.detail)}</p>${copyBtn(a.detail, /sms/i.test(a.type) ? 'Copy message' : 'Copy')}</div>`
                      : `<p class="note">${esc(a.detail)}</p>`
                  }`
                )
              )
              .join('')}</div>`
          )
          .join('')
      )
    );

  parts.push(
    section(
      ++n,
      'Test it like a lead would',
      'Use your own phone and email.',
      '',
      [
        'Open the first page on your phone and fill in the form',
        'You show up in Contacts with your answers and the tags',
        'The text message arrives within a minute',
        'You appear in the pipeline in the first stage',
        b.calendars?.length ? 'Book a test call: the confirmation and reminders start' : '',
        b.products?.length ? 'Make a test purchase (then refund it): course access arrives' : '',
      ]
        .filter(Boolean)
        .map((t, i) => task(`qa-${i}`, `<span>${esc(t)}</span>`))
        .join('')
    )
  );

  parts.push(
    section(
      ++n,
      'Save it as a Snapshot',
      'This is how agencies reuse a funnel: a Snapshot packages the pages, fields, tags, pipeline, calendars and workflows. Next client, you load the Snapshot into their account in one click instead of repeating this guide.',
      'Agency view → Account Snapshots → Create New Snapshot',
      task('snap-make', `<span>Create a Snapshot from this sub-account, named <code>${esc(funnel.name)}</code></span>${copyBtn(funnel.name, 'Copy name')}`) +
        task('snap-share', '<span>Optional: use <b>Share</b> on the Snapshot to get a link you can send to another GoHighLevel account</span>')
    )
  );

  return `<div class="guide-wrap">
    <header class="hero">
      <div class="kicker">GoHighLevel setup guide</div>
      <h1>${esc(funnel.name)}</h1>
      <p>Work top to bottom. Tick each box as you go; your progress is saved in this browser. This funnel uses ${used.length} GoHighLevel tools: ${used.map((t) => esc(t.name.toLowerCase())).join(', ')}.</p>
      <div class="bar"><div class="fill" id="fill"></div></div>
      <div class="bar-row"><span id="progress">0 done</span><span class="actions">${copyBtn(blueprintMarkdown(funnel), 'Copy whole guide as text')}<button class="cp ghost" type="button" id="reset">Clear ticks</button></span></div>
      <nav class="toc" aria-label="Jump to step">${parts.map((_, i) => `<a href="#s${i + 1}" data-step="s${i + 1}" title="Go to step ${i + 1}">${i + 1}</a>`).join('')}</nav>
    </header>
    ${parts.join('')}
  </div>`;
}

export const GUIDE_CSS = `
:root{--bg:#f6f7f9;--card:#fff;--ink:#14161c;--muted:#5f6675;--line:#e3e6ec;--brand:#5b4be8;--brand-soft:#efedff;--ok:#0f9d63;--ok-soft:#e8f8f0;--code:#f1f2f5}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#111317;--card:#1a1d23;--ink:#eceef2;--muted:#9aa1ad;--line:#2b2f37;--brand:#8b7dff;--brand-soft:#26224a;--ok:#3ccf8e;--ok-soft:#173326;--code:#24272e;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#111317;--card:#1a1d23;--ink:#eceef2;--muted:#9aa1ad;--line:#2b2f37;--brand:#8b7dff;--brand-soft:#26224a;--ok:#3ccf8e;--ok-soft:#173326;--code:#24272e;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 Inter,system-ui,-apple-system,sans-serif;padding-inline:16px}
.guide-wrap{max-width:860px;margin:0 auto;padding-block:32px 64px;display:flex;flex-direction:column;gap:16px}
.hero{display:flex;flex-direction:column;gap:8px;margin-bottom:8px}
.kicker{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--brand)}
h1{margin:0;font-size:clamp(1.6rem,4vw,2.2rem);line-height:1.15;text-wrap:balance}
.hero p{margin:0;color:var(--muted);max-width:65ch}
.bar{height:10px;background:var(--line);border-radius:99px;overflow:hidden;margin-top:8px}
.fill{height:100%;width:0;background:var(--ok);border-radius:99px;transition:width .3s}
.bar-row{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;font-weight:600;font-variant-numeric:tabular-nums}
.actions{display:flex;gap:6px;flex-wrap:wrap}
.toc{display:flex;gap:6px;flex-wrap:wrap}
.toc a{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;background:var(--card);border:1px solid var(--line);color:var(--ink);text-decoration:none;font-weight:700;font-size:13px}
.toc a.done{background:var(--ok);border-color:var(--ok);color:#fff}
.toc a:hover{border-color:var(--brand)}
.step{scroll-margin-top:16px}
.step.flash{animation:flash 1.4s ease-out}
@keyframes flash{0%,30%{box-shadow:0 0 0 4px var(--brand)}100%{box-shadow:0 0 0 0 transparent}}
@media(prefers-reduced-motion:reduce){.step.flash{animation:none}}
.step{background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden}
.step>header{display:flex;gap:14px;align-items:flex-start;padding:18px;border-bottom:1px solid var(--line)}
.step>header>div{flex:1;min-width:0}
.num{flex:none;width:32px;height:32px;border-radius:50%;background:var(--brand);color:#fff;display:grid;place-items:center;font-weight:800}
.step.complete .num{background:var(--ok)}
.step h2{margin:2px 0 4px;font-size:18px}
.step header p{margin:0;color:var(--muted);font-size:14px;max-width:65ch}
.where{margin-top:8px;font-size:13px;color:var(--muted)}
.where b{color:var(--ink);background:var(--code);padding:1px 7px;border-radius:6px;font-weight:600}
.count{flex:none;font-size:12px;font-weight:700;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}
.tasks{padding:6px 18px 12px}
.task{display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px dashed var(--line)}
.task:last-child{border-bottom:0}
.task input{flex:none;width:20px;height:20px;margin-top:3px;accent-color:var(--ok);cursor:pointer}
.task-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.task.done .task-body{opacity:.5}
.task.done .task-body .row>span,.task.done .task-body>span{text-decoration:line-through}
.row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.row>span{flex:1;min-width:140px}
.row small{color:var(--muted)}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;background:var(--code);padding:2px 7px;border-radius:6px;overflow-wrap:anywhere}
.cp{flex:none;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:8px;padding:5px 10px;font:600 12px/1.2 inherit;cursor:pointer;white-space:nowrap}
.cp:hover{border-color:var(--brand);color:var(--brand)}
.cp.copied{background:var(--ok);border-color:var(--ok);color:#fff}
.cp.ghost{color:var(--muted)}
.cp:focus-visible,.task input:focus-visible,.toc a:focus-visible{outline:3px solid var(--brand-soft);outline-offset:2px}
.note{margin:0;color:var(--muted);font-size:14px}
.msg{display:flex;gap:10px;align-items:flex-start;background:var(--brand-soft);border-radius:10px;padding:10px 12px}
.msg p{margin:0;flex:1;min-width:0;font-size:14px}
.stages{margin:0;padding-left:22px;color:var(--muted)}
.wf{border:1px solid var(--line);border-radius:12px;margin:10px 0;padding:0 14px}
.wf-head{border-bottom:1px solid var(--line)}
.wf-head .task{border:0}
.trig{font-size:13px;color:var(--muted)}
.goal{font-size:13px;color:var(--ok);font-weight:600}
.row>.when,.row>.what{flex:none;min-width:0}
.when{min-width:84px!important;font-weight:700;color:var(--brand);font-variant-numeric:tabular-nums}
.what{font-weight:600}
@media(prefers-reduced-motion:reduce){.fill{transition:none}}
`;

// Copy buttons, tick boxes and saved progress. `key` scopes saved ticks to one funnel.
export const guideScript = (key) => `
(function(){
  var KEY='ff-guide:'+${JSON.stringify(key)};
  var saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}');}catch(e){}
  function store(){try{localStorage.setItem(KEY,JSON.stringify(saved));}catch(e){}}
  var boxes=[].slice.call(document.querySelectorAll('.task input'));
  function refresh(){
    var done=0;
    boxes.forEach(function(b){var t=b.closest('.task');t.classList.toggle('done',b.checked);if(b.checked)done++;});
    document.getElementById('fill').style.width=(boxes.length?done/boxes.length*100:0)+'%';
    document.getElementById('progress').textContent=done+' of '+boxes.length+' done'+(done===boxes.length&&done?' 🎉':'');
    document.querySelectorAll('.step').forEach(function(s,i){
      var bs=s.querySelectorAll('.task input'),d=s.querySelectorAll('.task input:checked').length;
      s.querySelector('[data-count]').textContent=d+' / '+bs.length;
      s.classList.toggle('complete',d===bs.length);
      var a=document.querySelectorAll('.toc a')[i];if(a)a.classList.toggle('done',d===bs.length);
    });
  }
  boxes.forEach(function(b){var id=b.closest('.task').dataset.task;b.checked=!!saved[id];b.addEventListener('change',function(){saved[id]=b.checked;store();refresh();});});
  // Jump links scroll in place. Plain #anchors would navigate the builder's
  // embedded frame back to the builder itself.
  document.querySelectorAll('.toc a').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();var t=document.getElementById(a.getAttribute('data-step'));if(!t)return;t.scrollIntoView({behavior:'smooth',block:'start'});t.classList.remove('flash');void t.offsetWidth;t.classList.add('flash');});});
  document.getElementById('reset').addEventListener('click',function(){saved={};store();boxes.forEach(function(b){b.checked=false;});refresh();});
  function fallbackCopy(text){var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();var ok=false;try{ok=document.execCommand('copy');}catch(e){}ta.remove();return ok;}
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-copy]');if(!b)return;
    var text=b.getAttribute('data-copy'),label=b.textContent;
    function done(ok){b.textContent=ok?'Copied ✓':'Select and copy';b.classList.toggle('copied',ok);setTimeout(function(){b.textContent=label;b.classList.remove('copied');},1400);}
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){done(true);},function(){done(fallbackCopy(text));});}
    else done(fallbackCopy(text));
  });
  refresh();
})();`;

export function setupGuidePage(funnel) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(funnel.name)} setup guide</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>${GUIDE_CSS}</style>
</head>
<body>
${setupGuideBody(funnel)}
<script>${guideScript(slug(funnel.name))}</script>
</body>
</html>`;
}
