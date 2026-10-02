// Turns a funnel step into a complete, standalone HTML page that can be pasted
// into a GoHighLevel "Custom Code" element or hosted anywhere.
import { SECTIONS, esc } from './sections.js?v=56fc796f51';

// Curated Google Fonts. Modern faces first; the classics stay for old funnels.
export const FONTS = {
  'Bricolage Grotesque': 'Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800',
  Geist: 'Geist:wght@400;500;600;700;800',
  Sora: 'Sora:wght@400;600;800',
  Outfit: 'Outfit:wght@400;600;800',
  'Plus Jakarta Sans': 'Plus+Jakarta+Sans:wght@400;600;800',
  Unbounded: 'Unbounded:wght@500;700;900',
  Syne: 'Syne:wght@500;700;800',
  'Instrument Sans': 'Instrument+Sans:wght@400;600;700',
  'Familjen Grotesk': 'Familjen+Grotesk:wght@400;600;700',
  'DM Sans': 'DM+Sans:wght@400;600;800',
  Inter: 'Inter:wght@400;600;800',
  Montserrat: 'Montserrat:wght@400;600;800;900',
  Poppins: 'Poppins:wght@400;600;800',
  Oswald: 'Oswald:wght@400;600;700',
  'Archivo Black': 'Archivo+Black',
};

// One-click font pairings shown in the Style tab.
export const FONT_PAIRS = [
  { name: 'Bold & modern', heading: 'Bricolage Grotesque', body: 'Geist' },
  { name: 'Clean tech', heading: 'Sora', body: 'Geist' },
  { name: 'Friendly', heading: 'Outfit', body: 'Plus Jakarta Sans' },
  { name: 'Statement', heading: 'Unbounded', body: 'Instrument Sans' },
  { name: 'Editorial', heading: 'Syne', body: 'DM Sans' },
  { name: 'Straight talk', heading: 'Familjen Grotesk', body: 'Geist' },
];

export const DEFAULT_THEME = {
  primary: '#e11d2e',
  accent: '#ffd400',
  dark: '#0b0b0f',
  bg: '#ffffff',
  alt: '#f4f4f6',
  text: '#16161d',
  headingFont: 'Bricolage Grotesque',
  bodyFont: 'Geist',
  radius: 10,
  maxWidth: 1080,
};

// Readable text colour for a given background hex.
export function contrastText(hex) {
  const h = String(hex).replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6 ? '#111111' : '#ffffff';
}

export function pageCSS(t = DEFAULT_THEME) {
  const th = { ...DEFAULT_THEME, ...t };
  const r = Number(th.radius) || 0;
  return `
:root{--p:${th.primary};--pt:${contrastText(th.primary)};--a:${th.accent};--at:${contrastText(th.accent)};--d:${th.dark};--bg:${th.bg};--alt:${th.alt};--tx:${th.text};--r:${r}px;--mw:${Number(th.maxWidth) || 1080}px;--hf:'${th.headingFont}',system-ui,sans-serif;--bf:'${th.bodyFont}',system-ui,sans-serif}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;font-family:var(--bf);color:var(--tx);background:var(--bg);line-height:1.6;-webkit-font-smoothing:antialiased}
img{max-width:100%;display:block}
h1,h2,h3{font-family:var(--hf);line-height:1.12;margin:0 0 .6em;letter-spacing:-.01em}
h1{font-size:clamp(2rem,5vw,3.4rem);font-weight:900}
h2{font-size:clamp(1.6rem,3.4vw,2.4rem);font-weight:800}
h3{font-size:1.2rem;font-weight:800}
p{margin:0 0 1em}
.fb-s{padding:72px 20px}
.fb-wrap{max-width:var(--mw);margin:0 auto}
.fb-narrow{max-width:720px;margin:0 auto}
.fb-center{text-align:center}
.fb-row{display:flex;align-items:center;justify-content:space-between;gap:16px}
.fb-bg-alt{background:var(--alt)}
.fb-bg-dark{background:var(--d);color:#fff}
.fb-bg-primary{background:var(--p);color:var(--pt)}
.fb-bg-primary .fb-btn{background:var(--a);color:var(--at)}
.fb-eyebrow{display:inline-block;text-transform:uppercase;letter-spacing:.14em;font-size:.78rem;font-weight:700;color:var(--p);margin-bottom:14px}
.fb-bg-dark .fb-eyebrow{color:var(--a)}
.fb-lead{font-size:1.18rem;opacity:.85;max-width:720px;margin-left:auto;margin-right:auto}
.fb-split .fb-lead{margin-left:0}
.fb-note,.fb-muted{font-size:.9rem;opacity:.7;margin-top:10px}
.fb-hl{color:var(--p)}.fb-bg-dark .fb-hl{color:var(--a)}
.fb-btn{display:inline-block;background:var(--p);color:var(--pt);text-decoration:none;font-weight:800;font-family:var(--hf);padding:14px 26px;border-radius:var(--r);border:0;cursor:pointer;font-size:1rem;transition:transform .15s,box-shadow .15s;box-shadow:0 6px 18px -6px rgba(0,0,0,.35)}
.fb-btn:hover{transform:translateY(-2px);box-shadow:0 10px 24px -8px rgba(0,0,0,.45)}
.fb-btn-lg{padding:18px 34px;font-size:1.12rem}
.fb-btn-sm{padding:10px 18px;font-size:.9rem}
.fb-btn-block{width:100%}
.fb-cta-row{margin-top:26px}
.fb-announcement{padding:10px 16px;background:var(--a);color:var(--at);text-align:center;font-weight:700;font-size:.92rem}
.fb-countdown{display:inline-block;margin-left:8px;padding:2px 10px;border-radius:999px;background:rgba(0,0,0,.85);color:#fff;font-variant-numeric:tabular-nums}
.fb-header{padding:16px 20px;background:var(--bg);border-bottom:1px solid rgba(0,0,0,.06);position:sticky;top:0;z-index:5}
.fb-logo{font-family:var(--hf);font-weight:900;font-size:1.3rem;letter-spacing:.02em}
.fb-logo-img{max-height:40px}
.fb-hero{padding:96px 20px}
.fb-split{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center}
.fb-hero-img{border-radius:var(--r);box-shadow:0 30px 60px -20px rgba(0,0,0,.4)}
.fb-checks,.fb-x,.fb-todo{list-style:none;padding:0;margin:18px auto;max-width:640px;text-align:left}
.fb-checks li,.fb-x li{padding:8px 0 8px 34px;position:relative;font-size:1.05rem}
.fb-checks li:before{content:'✔';position:absolute;left:0;top:8px;color:var(--p);font-weight:900}
.fb-bg-dark .fb-checks li:before{color:var(--a)}
.fb-x li:before{content:'✖';position:absolute;left:0;top:8px;color:var(--p);font-weight:900}
.fb-todo{counter-reset:t}.fb-todo li{counter-increment:t;padding:14px 16px 14px 56px;position:relative;background:var(--alt);border-radius:var(--r);margin:10px 0;font-weight:600}
.fb-todo li:before{content:counter(t);position:absolute;left:14px;top:12px;width:28px;height:28px;border-radius:50%;background:var(--p);color:var(--pt);display:grid;place-items:center;font-size:.9rem}
.fb-video{position:relative;aspect-ratio:16/9;max-width:860px;margin:24px auto 0;border-radius:var(--r);overflow:hidden;background:#000;box-shadow:0 30px 60px -20px rgba(0,0,0,.45)}
.fb-video iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.fb-placeholder{display:grid;place-items:center;text-align:center;min-height:240px;height:100%;background:repeating-linear-gradient(45deg,#1b1b22,#1b1b22 12px,#22222b 12px,#22222b 24px);color:#bbb;font-weight:600;padding:24px;border-radius:var(--r)}
.fb-logos{padding:40px 20px}
.fb-logo-row{display:flex;flex-wrap:wrap;gap:20px 44px;justify-content:center;align-items:center;margin-top:8px;opacity:.65}
.fb-logo-row span{font-family:var(--hf);font-weight:800;font-size:1.15rem;letter-spacing:.04em;text-transform:uppercase}
.fb-logo-row img{max-height:34px;filter:grayscale(1)}
.fb-grid{display:grid;gap:22px;margin-top:28px}
.fb-grid-4{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}
.fb-grid-auto{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.fb-stats{padding:56px 20px}
.fb-stat{text-align:center}
.fb-stat-n{font-family:var(--hf);font-weight:900;font-size:clamp(2rem,4vw,2.8rem);line-height:1}
.fb-stat-l{opacity:.85;margin-top:6px;font-size:.95rem}
.fb-card{background:var(--bg);color:var(--tx);border-radius:var(--r);padding:26px;box-shadow:0 1px 0 rgba(0,0,0,.04),0 10px 30px -14px rgba(0,0,0,.18);border:1px solid rgba(0,0,0,.05)}
.fb-bg-default .fb-card,.fb-s:not([class*=fb-bg-]) .fb-card{background:var(--alt)}
.fb-card-icon{font-size:1.8rem;margin-bottom:10px}
.fb-card p{margin:0;opacity:.8}
.fb-case-r{font-family:var(--hf);font-weight:900;font-size:2.4rem;color:var(--p);line-height:1}
.fb-case-c{font-weight:700;margin:8px 0 10px}
.fb-step{text-align:center;padding:10px}
.fb-step-n{width:52px;height:52px;border-radius:50%;margin:0 auto 14px;display:grid;place-items:center;background:var(--p);color:var(--pt);font-family:var(--hf);font-weight:900;font-size:1.3rem}
.fb-quote{margin:0}.fb-quote blockquote{margin:8px 0 14px;font-size:1.05rem}
.fb-quote figcaption span{display:block;opacity:.65;font-size:.88rem}
.fb-stars{color:#f5b301;letter-spacing:2px}
.fb-offer-box{max-width:720px;margin:0 auto;background:var(--bg);color:var(--tx);border:3px dashed var(--p);border-radius:calc(var(--r) * 1.5);padding:36px}
.fb-stack{list-style:none;padding:0;margin:0}
.fb-stack li{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid rgba(0,0,0,.08);font-weight:600}
.fb-val{color:var(--p);white-space:nowrap}
.fb-total{display:flex;justify-content:space-between;padding:14px 0;font-weight:800;opacity:.7}
.fb-price{text-align:center;font-family:var(--hf);font-weight:900;font-size:3rem;color:var(--p);line-height:1.1}
.fb-offer-box .fb-cta-row{text-align:center}
.fb-form-box{max-width:560px;margin:0 auto;background:var(--bg);color:var(--tx);border-radius:calc(var(--r) * 1.5);padding:34px;box-shadow:0 30px 70px -30px rgba(0,0,0,.45);border-top:6px solid var(--p)}
.fb-form label{display:block;margin-bottom:14px}
.fb-form label span{display:block;font-weight:700;font-size:.88rem;margin-bottom:6px}
.fb-form input,.fb-form select,.fb-form textarea{width:100%;padding:14px;border:2px solid #dcdce3;border-radius:var(--r);font:inherit;background:#fff;color:#111}
.fb-form input:focus,.fb-form select:focus,.fb-form textarea:focus{outline:none;border-color:var(--p)}
.fb-form .fb-invalid{border-color:#d92d20;background:#fff5f5}
.fb-form-msg{margin-top:10px;font-weight:600;text-align:center}
.fb-consent{font-size:.72rem;opacity:.6;margin-top:12px;line-height:1.4}
.fb-co-row{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:14px 0;border-bottom:1px solid rgba(0,0,0,.08);font-weight:700;font-size:1.1rem}.fb-co-row strong{font-family:var(--hf);font-size:1.8rem;color:var(--p)}
.fb-checkout .fb-checks{margin:16px 0}
.fb-cal{max-width:900px;margin:24px auto 0;background:var(--bg);border-radius:var(--r);overflow:hidden}
.fb-cal iframe{width:100%;min-height:720px;border:0;display:block}
.fb-guarantee{display:flex;gap:24px;align-items:center;max-width:760px;margin:0 auto;padding:28px;border-radius:var(--r);background:var(--alt);color:var(--tx)}
.fb-seal{font-size:3.4rem}
.fb-faq{border-bottom:1px solid rgba(0,0,0,.1);padding:16px 0}
.fb-faq summary{cursor:pointer;font-weight:800;font-size:1.05rem;list-style:none;display:flex;justify-content:space-between;gap:12px}
.fb-faq summary:after{content:'+';color:var(--p);font-weight:900}
.fb-faq[open] summary:after{content:'–'}
.fb-faq p{margin:10px 0 0;opacity:.85}
.fb-check-big{width:84px;height:84px;margin:0 auto 20px;border-radius:50%;background:var(--p);color:var(--pt);display:grid;place-items:center;font-size:2.6rem;font-weight:900}
.fb-footer{padding:36px 20px;background:var(--d);color:rgba(255,255,255,.7);font-size:.85rem}
.fb-footer-links{display:flex;gap:18px;justify-content:center;margin-bottom:10px}
.fb-footer a{color:#fff}
.fb-disclaimer{max-width:760px;margin:14px auto 0;font-size:.72rem;opacity:.6}
@media(max-width:680px){.fb-s{padding:52px 18px}.fb-announcement{padding:10px 16px}.fb-header{padding:12px 16px}.fb-footer{padding:32px 18px}.fb-logos{padding:32px 18px}.fb-hero{padding:64px 18px}.fb-split{grid-template-columns:1fr}.fb-guarantee{flex-direction:column;text-align:center}.fb-offer-box,.fb-form-box{padding:24px}.fb-btn-lg{width:100%}}
`;
}

// Runtime shipped with every exported page: countdowns, UTM capture,
// webhook form submission to GHL, and contact prefill into the GHL calendar.
export const RUNTIME_JS = `
(function(){
  var qs=new URLSearchParams(location.search);
  var KEYS=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','gclid','ttclid'];
  try{KEYS.forEach(function(k){if(qs.get(k))sessionStorage.setItem('fb_'+k,qs.get(k));});}catch(e){}
  function tracking(){var o={};KEYS.forEach(function(k){var v=qs.get(k);try{v=v||sessionStorage.getItem('fb_'+k);}catch(e){}if(v)o[k]=v;});return o;}

  document.querySelectorAll('.fb-countdown').forEach(function(el){
    var end=new Date(el.getAttribute('data-deadline').replace(' ','T')).getTime();
    function tick(){var d=Math.max(0,end-Date.now());var h=Math.floor(d/36e5),m=Math.floor(d%36e5/6e4),s=Math.floor(d%6e4/1e3);
      el.textContent=(h>47?Math.floor(h/24)+'d ':'')+String(h>47?h%24:h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
    tick();setInterval(tick,1000);
  });

  // Prefill the GHL booking widget with what the lead already typed.
  document.querySelectorAll('.fb-cal iframe').forEach(function(f){
    try{var u=new URL(f.src);['first_name','last_name','name','email','phone'].forEach(function(k){if(qs.get(k))u.searchParams.set(k,qs.get(k));});f.src=u.toString();}catch(e){}
  });

  document.querySelectorAll('form.fb-form').forEach(function(form){
    form.addEventListener('submit',function(ev){
      ev.preventDefault();
      var ok=true,data={};
      form.querySelectorAll('input,select,textarea').forEach(function(el){
        var v=(el.value||'').trim();el.classList.remove('fb-invalid');
        if(el.required&&!v)ok=false,el.classList.add('fb-invalid');
        if(v&&el.type==='email'&&!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(v))ok=false,el.classList.add('fb-invalid');
        if(v&&el.type==='tel'&&v.replace(/\\D/g,'').length<10)ok=false,el.classList.add('fb-invalid');
        data[el.name]=v;
      });
      var msg=form.querySelector('.fb-form-msg');
      if(!ok){msg.textContent='Please fix the highlighted fields.';return;}
      var t=tracking();Object.keys(t).forEach(function(k){data[k]=t[k];});
      data.funnel_step=form.getAttribute('data-step')||'';data.page_url=location.href;data.submitted_at=new Date().toISOString();
      var btn=form.querySelector('button');btn.disabled=true;btn.dataset.l=btn.textContent;btn.textContent='Sending…';
      var hook=form.getAttribute('data-webhook'),next=form.getAttribute('data-redirect');
      function go(){
        if(window.fbq)try{fbq('track','Lead');}catch(e){}
        if(window.gtag)try{gtag('event','generate_lead');}catch(e){}
        if(next&&next!=='#'){var u=new URL(next,location.href);['first_name','email','phone'].forEach(function(k){if(data[k])u.searchParams.set(k,data[k]);});Object.keys(t).forEach(function(k){u.searchParams.set(k,t[k]);});location.href=u.toString();}
        else{msg.textContent='Thanks! We\\'ll be in touch shortly.';btn.textContent=btn.dataset.l;}
      }
      if(!hook){go();return;}
      fetch(hook,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
        .then(go).catch(function(){btn.disabled=false;btn.textContent=btn.dataset.l;msg.textContent='Something went wrong. Please try again.';});
    });
  });
})();
`;

// Runs inside the editor canvas only: in-place text editing, section toolbar,
// "add section" buttons and selection. Talks to the builder via postMessage.
const EDITOR_JS = `
(function(){
  var post=function(m){parent.postMessage(Object.assign({fb:1},m),'*');};
  var idxOf=function(el){var s=el.closest('.fb-edit');return s?+s.dataset.idx:-1;};
  document.querySelectorAll('[data-f]').forEach(function(el){
    try{el.contentEditable='plaintext-only';}catch(e){}
    if(el.contentEditable!=='plaintext-only')el.contentEditable='true';
    el.spellcheck=true;
  });
  document.addEventListener('focusin',function(e){var f=e.target.closest('[data-f]');if(f)post({type:'editstart',idx:idxOf(f)});});
  document.addEventListener('input',function(e){var f=e.target.closest('[data-f]');if(!f)return;post({type:'text',idx:idxOf(f),key:f.dataset.f,value:f.innerText.replace(/\\n+$/,'')});});
  document.addEventListener('keydown',function(e){var f=e.target.closest('[data-f]');if(f&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();f.blur();}if(f&&e.key==='Escape')f.blur();});
  document.addEventListener('paste',function(e){var f=e.target.closest('[data-f]');if(!f)return;e.preventDefault();document.execCommand('insertText',false,(e.clipboardData||window.clipboardData).getData('text/plain'));});
  document.addEventListener('click',function(e){
    var t=e.target.closest('.fb-tools button');if(t){e.preventDefault();post({type:'tool',idx:idxOf(t),action:t.dataset.t});return;}
    var a=e.target.closest('.fb-add');if(a){e.preventDefault();post({type:'add',after:+a.dataset.after});return;}
    if(e.target.closest('summary'))return;
    e.preventDefault();
    var s=e.target.closest('.fb-edit');if(s)post({type:'select',idx:+s.dataset.idx});
  },true);
  document.addEventListener('submit',function(e){e.preventDefault();},true);
  window.addEventListener('message',function(e){var d=e.data||{};if(d.fb==='highlight'){document.querySelectorAll('.fb-edit').forEach(function(el){var on=+el.dataset.idx===d.idx;el.classList.toggle('fb-sel',on);if(on&&d.scroll)el.scrollIntoView({behavior:'smooth',block:'center'});});}});
})();
`;

export function fontLink(theme = DEFAULT_THEME) {
  const fams = [...new Set([theme.headingFont, theme.bodyFont])].map((f) => FONTS[f]).filter(Boolean);
  if (!fams.length) return '';
  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?${fams
    .map((f) => 'family=' + f)
    .join('&')}&display=swap" rel="stylesheet">`;
}

export function renderSections(step, ctx = {}) {
  return step.sections
    .map((s, i) => {
      const def = SECTIONS[s.type];
      if (!def) return '';
      const html = def.render(s.props, ctx);
      if (!ctx.editor) return html;
      return `<div class="fb-edit" data-idx="${i}" data-id="${s.id}"><div class="fb-tools" contenteditable="false"><span class="fb-tools-name">${esc(def.name)}</span><button data-t="up" title="Move up">↑</button><button data-t="down" title="Move down">↓</button><button data-t="dup" title="Duplicate">⧉</button><button data-t="del" title="Delete">🗑</button></div>${html}</div><div class="fb-add" data-after="${i}"><button>+ Add a section here</button></div>`;
    })
    .join('\n');
}

// Full page. ctx.editor adds selection hooks used by the builder canvas.
export function renderStepPage(funnel, stepIndex, ctx = {}) {
  const step = funnel.steps[stepIndex];
  const next = funnel.steps[stepIndex + 1];
  const theme = { ...DEFAULT_THEME, ...funnel.theme };
  const rctx = { ...ctx, stepName: step.name, nextUrl: next ? next.path || '' : '' };
  const seo = step.seo || {};
  const tracking = funnel.tracking || {};
  const pixel = /^\d{6,20}$/.test(String(tracking.metaPixel || '').trim()) && !ctx.editor
    ? `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${String(tracking.metaPixel).trim()}');fbq('track','PageView');</script>`
    : '';
  const editorCSS = ctx.editor
    ? `.fb-edit{position:relative}.fb-edit:hover{outline:2px dashed #7c6cff;outline-offset:-2px}.fb-edit.fb-sel{outline:3px solid #6d5dfc;outline-offset:-3px}
.fb-edit a:not([data-f]),.fb-edit button:not([data-t]),.fb-edit iframe{pointer-events:none}
[data-f]{cursor:text;border-radius:4px;transition:box-shadow .12s}[data-f]:hover{box-shadow:0 0 0 2px rgba(109,93,252,.45)}[data-f]:focus{outline:none;box-shadow:0 0 0 3px #6d5dfc;background:rgba(109,93,252,.06)}
.fb-tools{position:absolute;top:8px;right:8px;z-index:30;display:none;gap:2px;align-items:center;background:#15151d;color:#fff;border-radius:10px;padding:4px;box-shadow:0 8px 24px -8px rgba(0,0,0,.5);font:600 12px/1 Inter,system-ui,sans-serif}
.fb-edit:hover .fb-tools,.fb-edit.fb-sel .fb-tools{display:flex}
.fb-tools-name{padding:0 8px;opacity:.75}.fb-tools button{all:unset;cursor:pointer;padding:6px 8px;border-radius:7px}.fb-tools button:hover{background:#2c2c38}
.fb-add{position:relative;height:0;z-index:25;display:flex;justify-content:center}
.fb-add button{all:unset;cursor:pointer;transform:translateY(-50%);opacity:0;transition:opacity .15s;background:#6d5dfc;color:#fff;font:700 12px/1 Inter,system-ui,sans-serif;padding:8px 14px;border-radius:999px;box-shadow:0 6px 18px -6px rgba(109,93,252,.8)}
.fb-add:hover button,.fb-edit:hover+.fb-add button{opacity:1}`
    : '';
  const editorJS = ctx.editor ? `<script>${EDITOR_JS}</script>` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(seo.title || `${step.name} | ${funnel.name}`)}</title>
${seo.description ? `<meta name="description" content="${esc(seo.description)}">` : ''}
${fontLink(theme)}
<style>${pageCSS(theme)}${editorCSS}</style>
${pixel}
</head>
<body>
${renderSections(step, rctx)}
<script>${RUNTIME_JS}</script>
${editorJS}
</body>
</html>`;
}

// Snippet for a GHL "Custom Code" element: no <html>/<head>, scoped styles.
export function renderGhlSnippet(funnel, stepIndex) {
  const step = funnel.steps[stepIndex];
  const next = funnel.steps[stepIndex + 1];
  const theme = { ...DEFAULT_THEME, ...funnel.theme };
  const ctx = { stepName: step.name, nextUrl: next ? next.path || '' : '' };
  return `<!-- ${esc(funnel.name)} / ${esc(step.name)} : paste into a GHL Custom Code element (full-width section, no padding) -->
${fontLink(theme)}
<style>${pageCSS(theme).replace(/body\{/, '.fb-root{')}</style>
<div class="fb-root">
${renderSections(step, ctx)}
</div>
<script>${RUNTIME_JS}</script>`;
}
