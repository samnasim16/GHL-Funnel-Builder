// AI auto-fill: turns a short business brief into copy for every page.
// The builder chooses a provider (Claude inside claude.ai, or the visitor's own
// API key when running locally); this module builds the prompt, validates the
// answer and applies it. Pure functions apart from the provider calls.
import { SECTIONS } from './sections.js?v=bef4208695';

// Fields that are links, codes or settings: never rewritten by AI.
const SKIP = /link|url|webhook|redirect|embed|deadline|image|logoUrl|payLink|^bg$|^fields$/i;

export const TONES = ['Bold and direct', 'Friendly and warm', 'Professional', 'Playful'];

export const BRIEF_FIELDS = [
  { key: 'business', label: 'Business name', placeholder: 'e.g. Peak Performance Coaching', required: true },
  { key: 'sells', label: 'What do you sell?', placeholder: 'e.g. 1:1 fitness coaching for busy dads', required: true },
  { key: 'audience', label: 'Who is it for?', placeholder: 'e.g. men 35-50 who want to lose 20 lbs' },
  { key: 'offer', label: 'What do they get from this funnel?', placeholder: 'e.g. a free 30-minute strategy call' },
  { key: 'results', label: 'Real results or proof (optional)', placeholder: 'e.g. 400+ clients, avg 18 lbs lost in 90 days' },
  { key: 'price', label: 'Price (optional)', placeholder: 'e.g. $997' },
];

/** Every text field the AI may rewrite, grouped by page and section. */
export function collectFillable(funnel, only) {
  const items = [];
  funnel.steps.forEach((step, si) => {
    step.sections.forEach((sec, idx) => {
      if (only && (only.step !== si || only.idx !== idx)) return;
      const def = SECTIONS[sec.type];
      if (!def) return;
      const fields = {};
      for (const [k, f] of Object.entries(def.fields)) {
        if (SKIP.test(k) || f.type === 'select') continue;
        const cols = f.type === 'list' ? f.cols.map((c) => (typeof c === 'string' ? c : c.label)) : null;
        fields[k] = { label: f.label, value: String(sec.props[k] ?? ''), ...(cols ? { list: cols } : {}) };
      }
      if (Object.keys(fields).length) items.push({ step: si, idx, page: step.name, section: def.name, fields });
    });
  });
  return items;
}

/** The instruction Claude receives. Asks for JSON only, keyed by step/idx. */
export function buildPrompt(brief, items, funnelGoal = '') {
  const b = Object.fromEntries(BRIEF_FIELDS.map((f) => [f.label, brief[f.key] || '(not given)']));
  const payload = items.map((it) => ({
    step: it.step,
    idx: it.idx,
    page: it.page,
    section: it.section,
    fields: Object.fromEntries(
      Object.entries(it.fields).map(([k, f]) => [k, f.list ? { current: f.value, format: `one item per line, columns separated by " | ": ${f.list.join(' | ')}` } : f.value])
    ),
  }));
  return `You are a direct-response copywriter building a sales funnel in GoHighLevel.

Business brief:
${Object.entries(b).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
- Tone: ${brief.tone || TONES[0]}
${funnelGoal ? `- Funnel goal: ${funnelGoal}` : ''}

Rewrite the copy for each section below so it fits this business. Rules:
- Keep each field's purpose (a headline stays a headline, a button stays a short button label).
- Headlines: one clear promise, 6-10 words. Buttons: 2-5 words naming what they get.
- List fields: return the same format: one item per line, columns separated by " | ", similar number of items.
- Only use results or numbers from the brief. If none were given, write proof sections as clearly marked placeholders like "[Client name]" instead of inventing results, names or quotes.
- Plain, specific language. No hype words like "revolutionary" or "game-changing".
- Return every field listed, even if you keep it the same.

Sections (JSON):
${JSON.stringify(payload)}

Reply with only a JSON object: {"sections":[{"step":0,"idx":0,"props":{"fieldKey":"new text"}}]}`;
}

/** Applies an AI answer. Only known string fields on known sections change. Returns the count changed. */
export function applyFill(funnel, answer, items) {
  const allowed = new Map(items.map((it) => [`${it.step}:${it.idx}`, new Set(Object.keys(it.fields))]));
  let changed = 0;
  for (const s of Array.isArray(answer?.sections) ? answer.sections : []) {
    const keys = allowed.get(`${Number(s.step)}:${Number(s.idx)}`);
    const sec = funnel.steps[Number(s.step)]?.sections[Number(s.idx)];
    if (!keys || !sec || !s.props || typeof s.props !== 'object') continue;
    for (const [k, v] of Object.entries(s.props)) {
      if (!keys.has(k) || typeof v !== 'string' || !v.trim()) continue;
      if (sec.props[k] !== v) {
        sec.props[k] = v.trim();
        changed++;
      }
    }
  }
  return changed;
}

/**
 * No-AI fallback: drops the brief into the obvious places (brand name, who
 * it's for, the offer, the price). Never invents results.
 */
export function quickFill(funnel, brief) {
  const name = (brief.business || '').trim();
  const offer = (brief.offer || '').trim();
  const who = (brief.audience || '').trim();
  const sells = (brief.sells || '').trim();
  let changed = 0;
  const set = (p, k, v) => {
    if (v && p[k] !== v) (p[k] = v), changed++;
  };
  const title = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
  for (const step of funnel.steps)
    for (const sec of step.sections) {
      const p = sec.props;
      if (sec.type === 'header' && name) set(p, 'logo', name.toUpperCase());
      if (sec.type === 'footer' && name) set(p, 'text', `© ${new Date().getFullYear()} ${name}. All rights reserved.`);
      if (sec.type === 'announcement' && offer) set(p, 'text', `Now booking: ${offer.replace(/^(a|an)\s+/i, '')}. Limited spots each week.`);
      if (sec.type === 'hero') {
        if (sells) {
          set(p, 'headline', title(sells).split(/\s+/).slice(0, 10).join(' '));
          set(p, 'highlight', '');
        }
        if (who) set(p, 'eyebrow', `For ${who}`);
        if (sells) set(p, 'sub', `${name ? name + ' helps ' : 'We help '}${who || 'you'} with ${sells}.`);
        if (offer) set(p, 'cta', `Get ${title(offer.replace(/^(a|an|the)\s+/i, ''))} →`.slice(0, 40));
      }
      if (sec.type === 'form' && offer) set(p, 'headline', `Claim ${offer.replace(/^(a|an)\s+/i, 'Your ')}`);
      if (sec.type === 'calendar' && offer) set(p, 'headline', `Pick A Time For ${title(offer.replace(/^(a|an|the)\s+/i, 'Your '))}`);
      if (sec.type === 'checkout') {
        if (sells) set(p, 'product', title(sells).slice(0, 60));
        if (brief.price) set(p, 'price', brief.price);
      }
      if (sec.type === 'offer' && brief.price) set(p, 'price', brief.price);
      if (sec.type === 'stats' && brief.results) set(p, 'title', brief.results);
    }
  if (name) funnel.name = name + ' | ' + (funnel.name.split('|').pop() || '').trim();
  return changed;
}
