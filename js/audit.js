// Conversion audit: scores each step against the checklist a senior funnel
// builder runs before launch. Pure function so it can be unit-tested.
import { lines } from './sections.js';

const has = (step, type) => step.sections.some((s) => s.type === type);
const first = (step, type) => step.sections.find((s) => s.type === type);

const RULES = [
  {
    id: 'cta-above-fold',
    label: 'Clear CTA in the first screen',
    weight: 3,
    applies: (step) => !has(step, 'thankyou'),
    test: (step) =>
      step.sections.slice(0, 3).some((s) => (s.props.cta && s.props.cta.trim()) || s.type === 'form' || s.type === 'calendar'),
    fix: 'Add a button to the hero (or put the form/calendar in the first three sections).',
  },
  {
    id: 'one-goal',
    label: 'One goal per page (no competing exits)',
    weight: 2,
    applies: () => true,
    test: (step) => {
      const hdr = first(step, 'header');
      return !hdr || !hdr.props.ctaLink || /^#|^tel:/.test(hdr.props.ctaLink);
    },
    fix: 'Header button should anchor to the form (#form) or a phone link, not leave the page.',
  },
  {
    id: 'proof',
    label: 'Social proof present',
    weight: 2,
    applies: (step) => step.sections.length > 3,
    test: (step) => ['testimonials', 'caseStudies', 'stats', 'logos'].some((t) => has(step, t)),
    fix: 'Add Case Studies, Stats, Testimonials or a Logo Bar.',
  },
  {
    id: 'placeholders',
    label: 'No unfilled [placeholders]',
    weight: 2,
    applies: () => true,
    test: (step) => !JSON.stringify(step.sections.map((s) => s.props)).match(/\[[A-Z][^\]]{2,40}\]/),
    fix: 'Replace every [Bracketed placeholder] with real copy, names and quotes.',
  },
  {
    id: 'form-connected',
    label: 'Form is wired to GHL',
    weight: 3,
    applies: (step) => has(step, 'form'),
    test: (step) => {
      const f = first(step, 'form').props;
      return Boolean((f.webhook && f.webhook.trim()) || (f.ghlEmbed && f.ghlEmbed.trim()));
    },
    fix: 'Paste a GHL Inbound Webhook URL (Automation → Workflow → Inbound Webhook trigger) or a native GHL form embed.',
  },
  {
    id: 'form-phone',
    label: 'Form captures phone for speed-to-lead SMS',
    weight: 2,
    applies: (step) => has(step, 'form') && !first(step, 'form').props.ghlEmbed,
    test: (step) => lines(first(step, 'form').props.fields).some((l) => /\|\s*phone\s*(\||$)/i.test(l)),
    fix: 'Add a "Phone | phone | phone" field. SMS within 60s roughly doubles contact rates.',
  },
  {
    id: 'form-consent',
    label: 'SMS consent language (A2P 10DLC)',
    weight: 2,
    applies: (step) => has(step, 'form') && !first(step, 'form').props.ghlEmbed,
    test: (step) => /stop/i.test(first(step, 'form').props.consent || ''),
    fix: 'Add consent text with opt-out ("Reply STOP"). Carriers block unregistered/non-compliant SMS.',
  },
  {
    id: 'form-length',
    label: 'Form is short enough (≤ 8 fields)',
    weight: 1,
    applies: (step) => has(step, 'form') && !first(step, 'form').props.ghlEmbed,
    test: (step) => lines(first(step, 'form').props.fields).length <= 8,
    fix: 'Cut fields or move qualifying questions to a second step.',
  },
  {
    id: 'calendar',
    label: 'Calendar URL set',
    weight: 3,
    applies: (step) => has(step, 'calendar'),
    test: (step) => /^https?:\/\//.test(first(step, 'calendar').props.url || ''),
    fix: 'Paste the GHL booking widget URL (Calendars → Share → Embed).',
  },
  {
    id: 'checkout',
    label: 'Payment link set',
    weight: 3,
    applies: (step) => has(step, 'checkout'),
    test: (step) => {
      const c = first(step, 'checkout').props;
      return /^https?:\/\//.test(c.payLink || '') || Boolean((c.ghlEmbed || '').trim());
    },
    fix: 'Paste a GoHighLevel payment link (Payments → Payment Links) or an order form.',
  },
  {
    id: 'video',
    label: 'Video URL set',
    weight: 2,
    applies: (step) => has(step, 'video'),
    test: (step) => step.sections.filter((s) => s.type === 'video').every((s) => /^https?:\/\//.test(s.props.url || '')),
    fix: 'Add your VSL / prep video link (YouTube, Vimeo, Loom or Wistia).',
  },
  {
    id: 'seo',
    label: 'Page title set',
    weight: 1,
    applies: () => true,
    test: (step) => Boolean(step.seo && step.seo.title),
    fix: 'Set a page title in Step settings (shows in browser tab and link previews).',
  },
  {
    id: 'footer',
    label: 'Footer with privacy/terms (required for Meta & Google ads)',
    weight: 1,
    applies: () => true,
    test: (step) => has(step, 'footer') && /privacy/i.test(first(step, 'footer').props.links || ''),
    fix: 'Add a Footer with Privacy Policy and Terms links.',
  },
];

export function auditStep(step) {
  const results = RULES.filter((r) => r.applies(step)).map((r) => ({
    id: r.id,
    label: r.label,
    weight: r.weight,
    pass: Boolean(r.test(step)),
    fix: r.fix,
  }));
  const total = results.reduce((s, r) => s + r.weight, 0);
  const got = results.reduce((s, r) => s + (r.pass ? r.weight : 0), 0);
  return { score: total ? Math.round((got / total) * 100) : 100, results };
}

export function auditFunnel(funnel) {
  const steps = funnel.steps.map((s) => ({ name: s.name, ...auditStep(s) }));
  const funnelChecks = [
    { label: 'Meta Pixel ID set', pass: /^\d{6,20}$/.test(String(funnel.tracking?.metaPixel || '')), fix: 'Add your Pixel ID in Settings (PageView + Lead events fire automatically).' },
    { label: 'Every step has a unique path', pass: new Set(funnel.steps.map((s) => s.path)).size === funnel.steps.length, fix: 'Give each step its own path, e.g. /audit, /audit-book.' },
    { label: 'Workflows mapped', pass: (funnel.blueprint?.workflows || []).length > 0, fix: 'Add at least a speed-to-lead workflow in the GHL Blueprint.' },
  ];
  const score = Math.round(
    (steps.reduce((s, x) => s + x.score, 0) / Math.max(1, steps.length)) * 0.85 +
      (funnelChecks.filter((c) => c.pass).length / funnelChecks.length) * 15
  );
  return { score, steps, funnelChecks };
}
