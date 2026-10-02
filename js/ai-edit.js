// "Ask AI to edit": chat-driven edits to any part of the funnel. The AI (or the
// built-in command parser when no AI is available) returns a list of edit
// operations; applyOps validates every one before changing anything.
import { SECTIONS, makeSection } from './sections.js?v=f5a5c58fd9';
import { LOOKS, PALETTES, paletteFromColor } from './styles.js?v=f5a5c58fd9';
import { FONTS } from './renderer.js?v=f5a5c58fd9';

const TEXT_SKIP = /link|url|webhook|redirect|embed|deadline|image|payLink|^bg$|^fields$|images/i;
const THEME_KEYS = {
  primary: 'color', accent: 'color', dark: 'color', bg: 'color', alt: 'color', text: 'color',
  headingFont: 'font', bodyFont: 'font', radius: 'number',
  buttonShape: ['rounded', 'pill', 'square'], buttonStyle: ['solid', 'gradient', 'outline', 'glow'],
  cardStyle: ['shadow', 'border', 'flat', 'glass'], spacing: ['compact', 'normal', 'airy'],
  headingCase: ['normal', 'upper'], effect: ['none', 'mesh', 'grid', 'dots', 'noise'],
};

/** Compact view of one page for the prompt: section index, type and text fields. */
export function pageSnapshot(funnel, stepIdx) {
  const step = funnel.steps[stepIdx];
  return step.sections.map((s, idx) => {
    const def = SECTIONS[s.type];
    const fields = {};
    for (const [k, f] of Object.entries(def?.fields || {})) {
      if (TEXT_SKIP.test(k) || f.type === 'select' || f.type === 'image' || f.type === 'gallery') continue;
      fields[k] = String(s.props[k] ?? '').slice(0, 600);
    }
    return { idx, type: s.type, name: def?.name, background: s.props.bg, fields };
  });
}

export function buildEditPrompt({ funnel, stepIdx, selIdx = -1, message, history = [] }) {
  const t = funnel.theme || {};
  const listCols = Object.fromEntries(
    Object.entries(SECTIONS).flatMap(([type, d]) =>
      Object.entries(d.fields).filter(([, f]) => f.type === 'list').map(([k, f]) => [`${type}.${k}`, f.cols.map((c) => (typeof c === 'string' ? c : c.label)).join(' | ')])
    )
  );
  return `You edit a sales funnel page in a website builder. Apply the user's request by returning edit operations.

Pages: ${funnel.steps.map((s, i) => `${i}: ${s.name}${i === stepIdx ? ' (open now)' : ''}`).join(', ')}
${selIdx >= 0 ? `The user has section ${selIdx} selected; "this" means that section.` : ''}

Open page sections (JSON):
${JSON.stringify(pageSnapshot(funnel, stepIdx))}

Current design: ${JSON.stringify(Object.fromEntries(Object.keys(THEME_KEYS).map((k) => [k, t[k]])))}
Section types you can add: ${Object.entries(SECTIONS).map(([k, d]) => `${k} (${d.name})`).join(', ')}
Looks: ${LOOKS.map((l) => `${l.id} (${l.desc})`).join('; ')}
Fonts allowed: ${Object.keys(FONTS).join(', ')}
Theme options: buttonShape rounded|pill|square, buttonStyle solid|gradient|outline|glow, cardStyle shadow|border|flat|glass, spacing compact|normal|airy, headingCase normal|upper, effect none|mesh|grid|dots|noise, colors as #rrggbb, radius 0-28.
Section background values: default, alt, dark, primary.
List fields are one item per line with columns separated by " | ": ${JSON.stringify(listCols)}

Operations:
- {"op":"setText","step":N,"idx":N,"field":"name","value":"text"}
- {"op":"setBackground","step":N,"idx":N,"value":"default|alt|dark|primary"}
- {"op":"addSection","step":N,"at":N,"type":"typeName","props":{"field":"text"}}
- {"op":"removeSection","step":N,"idx":N}
- {"op":"moveSection","step":N,"from":N,"to":N}
- {"op":"setTheme","patch":{"key":"value"}}
- {"op":"applyLook","id":"lookId"}
Rules: keep the same voice unless asked; never invent client names, results or quotes (use [placeholders]); change only what the user asked for.
${history.length ? `Earlier in this chat:\n${history.slice(-6).map((h) => `${h.role}: ${h.text}`).join('\n')}\n` : ''}
User request: ${message}

Reply with only JSON: {"reply":"one short sentence saying what you changed","ops":[...]}`;
}

/**
 * Validates and applies operations to the funnel (mutates it).
 * Returns {applied: n, skipped: n, notes: [...]}. Invalid ops are skipped.
 */
export function applyOps(funnel, ops) {
  let applied = 0;
  let skipped = 0;
  const notes = [];
  const stepAt = (n) => funnel.steps[Number(n)];
  for (const o of Array.isArray(ops) ? ops : []) {
    try {
      const step = stepAt(o.step ?? 0);
      if (o.op === 'setText') {
        const sec = step?.sections[Number(o.idx)];
        const f = sec && SECTIONS[sec.type]?.fields[o.field];
        if (!f || TEXT_SKIP.test(o.field) || f.type === 'select' || f.type === 'image' || typeof o.value !== 'string') throw 0;
        sec.props[o.field] = o.value.slice(0, 4000);
      } else if (o.op === 'setBackground') {
        const sec = step?.sections[Number(o.idx)];
        if (!sec || !SECTIONS[sec.type]?.fields.bg || !['default', 'alt', 'dark', 'primary'].includes(o.value)) throw 0;
        sec.props.bg = o.value;
      } else if (o.op === 'addSection') {
        if (!step || !SECTIONS[o.type]) throw 0;
        const props = {};
        for (const [k, v] of Object.entries(o.props || {})) {
          const f = SECTIONS[o.type].fields[k];
          if (f && typeof v === 'string' && !TEXT_SKIP.test(k) && f.type !== 'image') props[k] = v.slice(0, 4000);
        }
        const at = Math.max(0, Math.min(step.sections.length, Number.isFinite(+o.at) ? +o.at : step.sections.length));
        step.sections.splice(at, 0, makeSection(o.type, props));
      } else if (o.op === 'removeSection') {
        const i = Number(o.idx);
        if (!step?.sections[i]) throw 0;
        step.sections.splice(i, 1);
      } else if (o.op === 'moveSection') {
        const from = Number(o.from);
        const to = Number(o.to);
        if (!step?.sections[from] || to < 0 || to >= step.sections.length) throw 0;
        const [m] = step.sections.splice(from, 1);
        step.sections.splice(to, 0, m);
      } else if (o.op === 'setTheme') {
        const patch = {};
        for (const [k, v] of Object.entries(o.patch || {})) {
          const rule = THEME_KEYS[k];
          if (rule === 'color' && /^#[0-9a-f]{6}$/i.test(v)) patch[k] = v;
          else if (rule === 'font' && FONTS[v]) patch[k] = v;
          else if (rule === 'number' && Number.isFinite(+v)) patch[k] = Math.max(0, Math.min(28, +v));
          else if (Array.isArray(rule) && rule.includes(v)) patch[k] = v;
        }
        if (!Object.keys(patch).length) throw 0;
        funnel.theme = { ...funnel.theme, ...patch };
      } else if (o.op === 'applyLook') {
        const look = LOOKS.find((l) => l.id === o.id);
        if (!look) throw 0;
        funnel.theme = { ...funnel.theme, ...look.theme };
      } else throw 0;
      applied++;
    } catch (e) {
      skipped++;
      notes.push(`Skipped: ${JSON.stringify(o).slice(0, 80)}`);
    }
  }
  return { applied, skipped, notes };
}

// ---- built-in commands (no AI) ---------------------------------------------
const COLOR_WORDS = {
  red: '#e11d2e', blue: '#2563eb', green: '#0e7c66', purple: '#6d28d9', orange: '#ff7a1a', pink: '#ff4fa3',
  yellow: '#ffd400', teal: '#0d9488', black: '#111111', gold: '#c8a24a', navy: '#1e3a8a', coral: '#ff6b6b',
};
const SECTION_WORDS = [
  [/testimonial|review|quote/, 'testimonials'], [/case stud|result/, 'caseStudies'], [/faq|question/, 'faq'],
  [/guarantee/, 'guarantee'], [/urgen|countdown|timer/, 'announcement'], [/video/, 'video'],
  [/gallery/, 'gallery'], [/picture|image|photo/, 'image'], [/stat|number/, 'stats'], [/logo bar|trusted/, 'logos'],
  [/how it works|steps|process/, 'steps'], [/form|sign.?up/, 'form'], [/calendar|booking/, 'calendar'],
  [/checkout|payment/, 'checkout'], [/offer|what they get/, 'offer'], [/footer/, 'footer'], [/button|cta/, 'cta'],
];
const findType = (text) => SECTION_WORDS.find(([re]) => re.test(text))?.[1];

/**
 * Understands common requests without AI. Returns {reply, ops} or null.
 * Examples: "change the headline to Get More Leads", "make buttons pill",
 * "use blue colors", "add testimonials after the top", "remove the faq",
 * "make it luxury", "dark background", "uppercase headlines".
 */
// No-AI headline tightening: first clause, filler words out, at most 8 words.
const FILLER = /\b(just|really|very|simply|actually|basically|literally|that will|in order to)\b\s*/gi;
export function punchier(text) {
  let t = String(text || '').replace(/<[^>]*>/g, '').trim();
  if (!t) return '';
  t = t.replace(/\([^)]*\)/g, '').split(/\s[—–-]\s|[:;,.!?](?=\s|$)/)[0].replace(FILLER, '').replace(/\s+/g, ' ').trim();
  let words = t.split(' ');
  if (words.length > 7) {
    // Cut before the last connector word that leaves 3-8 words.
    let cut = -1;
    words.forEach((w, i) => i >= 3 && i <= 8 && /^(without|in|with|by|so|while|that|because|when|even|from)$/i.test(w) && (cut = i));
    if (cut > 0) words = words.slice(0, cut);
  }
  t = words.slice(0, 8).join(' ');
  t = t.replace(/\b(and|or|to|for|with|the|a|an|of|in|your|our)$/i, '').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) + '.' : '';
}

export function localIntent(message, funnel, stepIdx, selIdx = -1) {
  const m = String(message).trim();
  const low = m.toLowerCase();
  const step = funnel.steps[stepIdx];
  const idxOf = (type) => step.sections.findIndex((s) => s.type === type);
  const target = selIdx >= 0 ? selIdx : idxOf('hero');

  let mm = m.match(/(?:change|set|make)\s+(?:the\s+)?(headline|title|heading|sub-?headline|subtitle|button(?: text)?)\s+(?:to|say|into)\s+["“]?(.+?)["”]?$/i);
  if (mm && target >= 0) {
    const what = mm[1].toLowerCase();
    const sec = step.sections[target];
    const field = /button/.test(what) ? (sec.type === 'form' ? 'button' : 'cta') : /sub/.test(what) ? 'sub' : 'headline';
    if (SECTIONS[sec.type].fields[field]) return { reply: `Changed the ${what}.`, ops: [{ op: 'setText', step: stepIdx, idx: target, field, value: mm[2] }] };
  }
  if (/(punch|short|tight|snapp|simpl|catch)/.test(low) && /(headline|title|heading)/.test(low) && target >= 0) {
    const sec = step.sections[target];
    const value = punchier(sec.props?.headline);
    const bare = (x) => String(x || '').replace(/[.!?\s]+$/, '').toLowerCase();
    if (SECTIONS[sec.type].fields.headline && value && bare(value) === bare(sec.props.headline))
      return { reply: 'That headline is already short and punchy. For new wording, connect full AI or type "change the headline to …".', ops: [] };
    if (SECTIONS[sec.type].fields.headline && value)
      return { reply: `Tightened the headline to "${value}". Want different words? Try "change the headline to …".`, ops: [{ op: 'setText', step: stepIdx, idx: target, field: 'headline', value }] };
  }
  mm = low.match(/(?:font|typeface)\s+(?:to\s+)?([a-z][a-z ]+)$|(?:use|try|switch to)\s+([a-z][a-z ]+?)\s+(?:font|for)/);
  if (mm) {
    const want = (mm[1] || mm[2]).trim();
    const font = Object.keys(FONTS).find((f) => f.toLowerCase() === want);
    if (font) return { reply: `Headlines now use ${font}.`, ops: [{ op: 'setTheme', patch: { headingFont: font } }] };
  }
  mm = low.match(/^(?:remove|delete)\s+(?:the\s+)?(.+)$/);
  if (mm) {
    const type = findType(mm[1]);
    const i = type ? idxOf(type) : -1;
    if (i >= 0) return { reply: `Removed the ${SECTIONS[type].name}.`, ops: [{ op: 'removeSection', step: stepIdx, idx: i }] };
  }
  mm = low.match(/^add\s+(?:a\s+|an\s+|some\s+)?(.+?)(?:\s+(after|below|before|above|at the (?:top|bottom|end))\s*(?:the\s+)?(.*))?$/);
  if (mm) {
    const type = findType(mm[1]);
    if (type) {
      let at = Math.max(0, step.sections.length - (step.sections.at(-1)?.type === 'footer' ? 1 : 0));
      if (mm[2] && /top/.test(mm[2])) at = type === 'announcement' ? 0 : Math.max(0, idxOf('hero') + 1);
      else if (mm[2] && mm[3]) {
        const ref = /top|hero/.test(mm[3]) ? idxOf('hero') : idxOf(findType(mm[3]) || '');
        if (ref >= 0) at = /after|below/.test(mm[2]) ? ref + 1 : ref;
      } else if (selIdx >= 0) at = selIdx + 1;
      return { reply: `Added ${SECTIONS[type].name}.`, ops: [{ op: 'addSection', step: stepIdx, at, type }] };
    }
  }
  const look = [
    [/luxur|elegant|premium|high.?end/, 'minimal-luxe'], [/glass|frosted/, 'glass'], [/neon|techy|futur|cyber/, 'neon-night'],
    [/brutal|loud|raw/, 'brutalist'], [/friendly|soft|warm/, 'soft-friendly'], [/editorial|magazine/, 'editorial'],
    [/gradient|modern/, 'modern-gradient'], [/clean|minimal|simple|saas/, 'clean-saas'], [/poster|bold/, 'poster'],
  ].find(([re]) => re.test(low) && /(look|feel|style|make it|more)/.test(low));
  if (look) return { reply: `Switched to the ${LOOKS.find((l) => l.id === look[1]).name} look.`, ops: [{ op: 'applyLook', id: look[1] }] };
  const color = Object.keys(COLOR_WORDS).find((c) => new RegExp(`\\b${c}\\b`).test(low));
  if (color && /(color|colour|theme|palette|brand)/.test(low)) {
    const named = PALETTES.find((p) => p.name.toLowerCase().includes(color));
    const { name: _n, ...pal } = named || { name: '', ...paletteFromColor(COLOR_WORDS[color]) };
    if (!named) pal.accent = pal.primary; // "use blue" should look blue, not blue + a contrast color
    return { reply: `Changed the colors to ${color}.`, ops: [{ op: 'setTheme', patch: pal }] };
  }
  for (const [re, patch, say] of [
    [/pill|rounded button/, { buttonShape: 'pill' }, 'Buttons are now pill-shaped.'],
    [/square button|sharp/, { buttonShape: 'square' }, 'Buttons are now square.'],
    [/gradient button/, { buttonStyle: 'gradient' }, 'Buttons now use a gradient.'],
    [/outline button/, { buttonStyle: 'outline' }, 'Buttons are now outlined.'],
    [/glow/, { buttonStyle: 'glow' }, 'Buttons now glow.'],
    [/uppercase|all caps/, { headingCase: 'upper' }, 'Headlines are now uppercase.'],
    [/more space|airy|spacious/, { spacing: 'airy' }, 'Added more space between sections.'],
    [/less space|tighter|compact/, { spacing: 'compact' }, 'Tightened the spacing.'],
    [/glass card/, { cardStyle: 'glass' }, 'Cards are now frosted glass.'],
  ]) if (re.test(low)) return { reply: say, ops: [{ op: 'setTheme', patch }] };
  if (/dark (background|section)|make (this|it) dark|darker/.test(low) && target >= 0) return { reply: 'Made that section dark.', ops: [{ op: 'setBackground', step: stepIdx, idx: target, value: 'dark' }] };
  return null;
}
