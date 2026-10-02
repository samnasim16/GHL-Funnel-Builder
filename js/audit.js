// Conversion audit: scores each step against the checklist a senior funnel
// builder runs before launch. Pure function so it can be unit-tested.
import { lines } from './sections.js?v=1898ac068b';

const has = (step, type) => step.sections.some((s) => s.type === type);
const first = (step, type) => step.sections.find((s) => s.type === type);
const idxOf = (step, type) => step.sections.findIndex((s) => s.type === type);
const PLACEHOLDER = /\[[A-Z][^\]]{2,40}\]/;

// Where each problem lives, so the Checklist can jump straight to it:
//   {idx, field}  a field of a section on this page
//   {page: key}   a page setting (title, path)
//   {add, at}     a section that is missing
//   {funnel: key} / {view}  funnel-wide settings

const RULES = [
  {
    id: 'cta-above-fold',
    label: 'A button at the top of the page',
    weight: 3,
    applies: (step) => !has(step, 'thankyou'),
    test: (step) =>
      step.sections.slice(0, 3).some((s) => (s.props.cta && s.props.cta.trim()) || s.type === 'form' || s.type === 'calendar'),
    fix: 'Add a button to the top of the page so visitors can act without scrolling.',
    target: (step) => (idxOf(step, 'hero') >= 0 ? { idx: idxOf(step, 'hero'), field: 'cta' } : { idx: 0 }),
  },
  {
    id: 'one-goal',
    label: 'The top button keeps visitors on the page',
    weight: 2,
    applies: () => true,
    test: (step) => {
      const hdr = first(step, 'header');
      return !hdr || !hdr.props.ctaLink || /^#|^tel:/.test(hdr.props.ctaLink);
    },
    fix: 'Point the top button at your form (#form) or a phone number, so it doesn\'t send visitors away.',
    target: (step) => ({ idx: idxOf(step, 'header'), field: 'ctaLink' }),
  },
  {
    id: 'proof',
    label: 'Proof that it works (results, quotes or logos)',
    weight: 2,
    applies: (step) => step.sections.length > 3,
    test: (step) => ['testimonials', 'caseStudies', 'stats', 'logos'].some((t) => has(step, t)),
    fix: 'Add client results, big numbers, quotes or logos.',
    target: (step) => ({ add: 'caseStudies', at: Math.max(0, idxOf(step, 'hero') + 1) }),
  },
  {
    id: 'placeholders',
    label: 'No leftover [placeholder] text',
    weight: 2,
    applies: () => true,
    test: (step) => !JSON.stringify(step.sections.map((s) => s.props)).match(/\[[A-Z][^\]]{2,40}\]/),
    fix: 'Replace every [bracketed placeholder] with your real words, names and quotes.',
    target: (step) => {
      const idx = step.sections.findIndex((s) => PLACEHOLDER.test(JSON.stringify(s.props)));
      const field = idx >= 0 ? Object.keys(step.sections[idx].props).find((k) => PLACEHOLDER.test(String(step.sections[idx].props[k]))) : undefined;
      return { idx: Math.max(0, idx), field };
    },
  },
  {
    id: 'form-connected',
    label: 'Form connected to GoHighLevel',
    weight: 3,
    applies: (step) => has(step, 'form'),
    test: (step) => {
      const f = first(step, 'form').props;
      return Boolean((f.webhook && f.webhook.trim()) || (f.ghlEmbed && f.ghlEmbed.trim()));
    },
    fix: 'Paste your GoHighLevel webhook link so form answers reach GoHighLevel.',
    target: (step) => ({ idx: idxOf(step, 'form'), field: 'webhook' }),
  },
  {
    id: 'form-phone',
    label: 'Form asks for a phone number',
    weight: 2,
    applies: (step) => has(step, 'form') && !first(step, 'form').props.ghlEmbed,
    test: (step) => lines(first(step, 'form').props.fields).some((l) => /\|\s*phone\s*(\||$)/i.test(l)),
    fix: 'Add a phone question. Texting within a minute roughly doubles how many leads you reach.',
    target: (step) => ({ idx: idxOf(step, 'form'), field: 'fields' }),
  },
  {
    id: 'form-consent',
    label: 'Text-message permission wording',
    weight: 2,
    applies: (step) => has(step, 'form') && !first(step, 'form').props.ghlEmbed,
    test: (step) => /stop/i.test(first(step, 'form').props.consent || ''),
    fix: 'Add text-message permission wording that mentions "Reply STOP". Phone carriers require it.',
    target: (step) => ({ idx: idxOf(step, 'form'), field: 'consent' }),
  },
  {
    id: 'form-length',
    label: 'Form is short (8 questions or fewer)',
    weight: 1,
    applies: (step) => has(step, 'form') && !first(step, 'form').props.ghlEmbed,
    test: (step) => lines(first(step, 'form').props.fields).length <= 8,
    fix: 'Remove some questions, or ask them on a later page.',
    target: (step) => ({ idx: idxOf(step, 'form'), field: 'fields' }),
  },
  {
    id: 'calendar',
    label: 'Calendar link added',
    weight: 3,
    applies: (step) => has(step, 'calendar'),
    test: (step) => /^https?:\/\//.test(first(step, 'calendar').props.url || ''),
    fix: 'Paste your GoHighLevel calendar link (Calendars → Share).',
    target: (step) => ({ idx: idxOf(step, 'calendar'), field: 'url' }),
  },
  {
    id: 'checkout',
    label: 'Payment link added',
    weight: 3,
    applies: (step) => has(step, 'checkout'),
    test: (step) => {
      const c = first(step, 'checkout').props;
      return /^https?:\/\//.test(c.payLink || '') || Boolean((c.ghlEmbed || '').trim());
    },
    fix: 'Paste your GoHighLevel payment link (Payments → Payment Links).',
    target: (step) => ({ idx: idxOf(step, 'checkout'), field: 'payLink' }),
  },
  {
    id: 'video',
    label: 'Video link added',
    weight: 2,
    applies: (step) => has(step, 'video'),
    test: (step) => step.sections.filter((s) => s.type === 'video').every((s) => /^https?:\/\//.test(s.props.url || '')),
    fix: 'Paste your video link (YouTube, Vimeo, Loom or Wistia).',
    target: (step) => ({ idx: step.sections.findIndex((s) => s.type === 'video' && !/^https?:\/\//.test(s.props.url || '')), field: 'url' }),
  },
  {
    id: 'seo',
    label: 'Browser tab title added',
    weight: 1,
    applies: () => true,
    test: (step) => Boolean(step.seo && step.seo.title),
    fix: 'Give the page a browser tab title (also shown when the link is shared).',
    target: () => ({ page: 'title' }),
  },
  {
    id: 'footer',
    label: 'Footer with privacy and terms links',
    weight: 1,
    applies: () => true,
    test: (step) => has(step, 'footer') && /privacy/i.test(first(step, 'footer').props.links || ''),
    fix: 'Add a footer with Privacy Policy and Terms links. Ad platforms require them.',
    target: (step) => (has(step, 'footer') ? { idx: idxOf(step, 'footer'), field: 'links' } : { add: 'footer', at: step.sections.length }),
  },
];

export function auditStep(step) {
  const results = RULES.filter((r) => r.applies(step)).map((r) => ({
    id: r.id,
    label: r.label,
    weight: r.weight,
    pass: Boolean(r.test(step)),
    fix: r.fix,
    target: r.pass ? null : r.target ? r.target(step) : null,
  }));
  const total = results.reduce((s, r) => s + r.weight, 0);
  const got = results.reduce((s, r) => s + (r.pass ? r.weight : 0), 0);
  return { score: total ? Math.round((got / total) * 100) : 100, results };
}

export function auditFunnel(funnel) {
  const steps = funnel.steps.map((s) => ({ name: s.name, ...auditStep(s) }));
  const paths = funnel.steps.map((s) => s.path);
  const dup = paths.findIndex((p, i) => paths.indexOf(p) !== i);
  const funnelChecks = [
    { label: 'Facebook/Meta Pixel ID added', pass: /^\d{6,20}$/.test(String(funnel.tracking?.metaPixel || '')), fix: 'Add your Pixel ID so your ads know who signed up.', target: { funnel: 'metaPixel' } },
    { label: 'Every page has its own web address', pass: dup < 0, fix: 'Give each page a different address, like /audit and /audit-book.', target: { step: Math.max(0, dup), page: 'path' } },
    { label: 'Automations planned', pass: (funnel.blueprint?.workflows || []).length > 0, fix: 'Add at least one follow-up automation.', target: { view: 'blueprint' } },
  ];
  const score = Math.round(
    (steps.reduce((s, x) => s + x.score, 0) / Math.max(1, steps.length)) * 0.85 +
      (funnelChecks.filter((c) => c.pass).length / funnelChecks.length) * 15
  );
  return { score, steps, funnelChecks };
}
