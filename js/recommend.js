// Recommendations: specific, conversion-focused suggestions for one page, each
// with a one-click fix the builder can apply. Pure: takes data, returns data.
import { lines } from './sections.js?v=bef4208695';

const GENERIC_BUTTONS = /^(submit|send|click here|go|continue|next|ok|enter)\W*$/i;
const PLACEHOLDER = /\[[A-Z][^\]]{2,40}\]/;
const words = (s = '') => String(s).trim().split(/\s+/).filter(Boolean).length;

// Where to insert a new section: after the hero, before the form, or before the footer.
function spot(step, where) {
  const idx = (t) => step.sections.findIndex((s) => s.type === t);
  const n = step.sections.length;
  const beforeFooter = idx('footer') >= 0 ? idx('footer') : n;
  if (where === 'top') return 0;
  if (where === 'afterHero') return idx('hero') >= 0 ? idx('hero') + 1 : Math.min(1, n);
  if (where === 'beforeForm') {
    const f = idx('form') >= 0 ? idx('form') : idx('calendar') >= 0 ? idx('calendar') : idx('checkout');
    return f >= 0 ? f : beforeFooter;
  }
  if (where === 'afterOffer') {
    const o = idx('checkout') >= 0 ? idx('checkout') : idx('offer');
    return o >= 0 ? o + 1 : beforeFooter;
  }
  return beforeFooter;
}

/**
 * @returns {Array<{id, level: 'high'|'medium'|'tip', title, why, fix: {label, type, ...}}>}
 * fix types: add {section, at, props?} · set {idx, key, value} · select {idx, field?}
 */
export function recommend(funnel, stepIndex) {
  const step = funnel.steps[stepIndex];
  if (!step) return [];
  const S = step.sections;
  const has = (t) => S.some((s) => s.type === t);
  const at = (t) => S.findIndex((s) => s.type === t);
  const isThanks = has('thankyou');
  const collects = has('form') || has('calendar') || has('checkout');
  const out = [];

  // Unfilled placeholders are the most embarrassing thing to launch with.
  const ph = S.findIndex((s) => PLACEHOLDER.test(JSON.stringify(s.props)));
  if (ph >= 0)
    out.push({
      id: 'placeholders',
      level: 'high',
      title: 'Replace the [placeholder] text',
      why: 'Visitors notice template text right away and stop trusting the page.',
      fix: { label: 'Show me', type: 'select', idx: ph },
    });

  // Form not connected: leads would go nowhere.
  const fi = at('form');
  if (fi >= 0 && !String(S[fi].props.webhook || '').trim() && !String(S[fi].props.ghlEmbed || '').trim())
    out.push({
      id: 'form-connect',
      level: 'high',
      title: 'Connect your form to GoHighLevel',
      why: 'Right now form answers don\'t go anywhere. Paste your GoHighLevel webhook link.',
      fix: { label: 'Open form settings', type: 'select', idx: fi, field: 'webhook' },
    });

  // Phone number enables the 60-second text that doubles contact rates.
  if (fi >= 0 && !S[fi].props.ghlEmbed && !lines(S[fi].props.fields).some((l) => /\|\s*phone\s*(\||$)/i.test(l)))
    out.push({
      id: 'form-phone',
      level: 'high',
      title: 'Ask for a phone number',
      why: 'Texting a lead within a minute roughly doubles how many you reach.',
      fix: { label: 'Add phone field', type: 'set', idx: fi, key: 'fields', value: `${String(S[fi].props.fields).trim()}\nPhone | phone | phone` },
    });

  // Too many questions kills completion, especially on phones.
  if (fi >= 0 && lines(S[fi].props.fields).length > 6)
    out.push({
      id: 'form-long',
      level: 'medium',
      title: `Shorten the form (${lines(S[fi].props.fields).length} questions)`,
      why: 'Each extra question loses people. Keep the first form to 3-5 and ask the rest later.',
      fix: { label: 'Edit questions', type: 'select', idx: fi, field: 'fields' },
    });

  // Generic button text.
  S.forEach((s, i) => {
    const key = s.type === 'form' ? 'button' : 'cta';
    const v = s.props[key];
    if (v && GENERIC_BUTTONS.test(v.trim()) && !out.some((o) => o.id === 'button-text'))
      out.push({
        id: 'button-text',
        level: 'medium',
        title: `Make the "${v.trim()}" button say what they get`,
        why: 'Buttons that name the benefit ("Get My Free Audit") get more clicks than "Submit".',
        fix: { label: 'Use "Get My Free Plan →"', type: 'set', idx: i, key, value: 'Get My Free Plan →' },
      });
  });

  // Long headline.
  const hi = at('hero');
  if (hi >= 0 && words(S[hi].props.headline) > 12)
    out.push({
      id: 'headline-long',
      level: 'medium',
      title: `Tighten the headline (${words(S[hi].props.headline)} words)`,
      why: 'Visitors decide in a few seconds. Aim for 6-10 words with one clear promise.',
      fix: { label: 'Edit headline', type: 'select', idx: hi, field: 'headline' },
    });

  // No call to action near the top.
  if (!isThanks && hi >= 0 && !S[hi].props.cta && !S.slice(0, 3).some((s) => ['form', 'calendar', 'checkout', 'video'].includes(s.type)))
    out.push({
      id: 'hero-cta',
      level: 'high',
      title: 'Add a button to the top of the page',
      why: 'Most visitors never scroll. Give them a way to act on the first screen.',
      fix: { label: 'Add button', type: 'set', idx: hi, key: 'cta', value: 'Get Started →' },
    });

  // Proof.
  if (!isThanks && collects && !['testimonials', 'caseStudies', 'stats', 'logos'].some(has))
    out.push({
      id: 'proof',
      level: 'high',
      title: 'Add proof that it works',
      why: 'Pages with client results or quotes convert noticeably better than pages without.',
      fix: { label: 'Add client results', type: 'add', section: 'caseStudies', at: spot(step, 'afterHero') },
    });

  // Guarantee near a price.
  if ((has('offer') || has('checkout')) && !has('guarantee'))
    out.push({
      id: 'guarantee',
      level: 'medium',
      title: 'Add a guarantee next to your offer',
      why: 'A clear promise removes the risk of saying yes.',
      fix: { label: 'Add guarantee', type: 'add', section: 'guarantee', at: spot(step, 'afterOffer') },
    });

  // FAQ before the ask.
  if (!isThanks && collects && !has('faq') && S.length >= 4)
    out.push({
      id: 'faq',
      level: 'tip',
      title: 'Answer common questions',
      why: 'An FAQ handles objections without a sales call.',
      fix: { label: 'Add FAQ', type: 'add', section: 'faq', at: spot(step, 'footer') },
    });

  // Booking page reassurance.
  if (has('calendar') && !has('steps') && !has('testimonials'))
    out.push({
      id: 'calendar-why',
      level: 'tip',
      title: 'Tell them what happens on the call',
      why: 'People book more when they know what they\'ll get from the call.',
      fix: { label: 'Add "How it works"', type: 'add', section: 'steps', at: spot(step, 'footer') },
    });

  // Urgency on opt-in pages.
  if (!isThanks && collects && !has('announcement') && !has('calendar'))
    out.push({
      id: 'urgency',
      level: 'tip',
      title: 'Give a reason to act today',
      why: 'A short urgency bar (limited spots, a deadline) lifts sign-ups. Keep it honest.',
      fix: { label: 'Add urgency bar', type: 'add', section: 'announcement', at: spot(step, 'top') },
    });

  // Thank-you page: show-up video.
  if (isThanks && !has('video'))
    out.push({
      id: 'thanks-video',
      level: 'tip',
      title: 'Add a short "what\'s next" video',
      why: 'A 60-second welcome video raises show-up rates for calls and classes.',
      fix: { label: 'Add video', type: 'add', section: 'video', at: spot(step, 'footer'), props: { headline: 'Watch This Before Our Call', cta: '' } },
    });

  if (!has('footer'))
    out.push({
      id: 'footer',
      level: 'medium',
      title: 'Add a footer with privacy and terms links',
      why: 'Facebook and Google ads can reject pages without them.',
      fix: { label: 'Add footer', type: 'add', section: 'footer', at: S.length },
    });

  const order = { high: 0, medium: 1, tip: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}
