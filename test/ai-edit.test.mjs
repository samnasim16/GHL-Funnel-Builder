import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEditPrompt, applyOps, localIntent, pageSnapshot, punchier } from '../js/ai-edit.js';
import { buildTemplate } from '../js/templates.js';

test('prompt carries the page, design options and the request', () => {
  const f = buildTemplate('email-sms-audit');
  const p = buildEditPrompt({ funnel: f, stepIdx: 0, selIdx: 2, message: 'make it punchier' });
  assert.match(p, /make it punchier/);
  assert.match(p, /section 2 selected/);
  assert.match(p, /"op":"setText"/);
  assert.ok(!JSON.stringify(pageSnapshot(f, 0)).includes('webhook'), 'links and settings are not exposed');
});

test('applyOps applies valid edits and skips unsafe or invalid ones', () => {
  const f = buildTemplate('email-sms-audit');
  const hero = f.steps[0].sections.findIndex((s) => s.type === 'hero');
  const n = f.steps[0].sections.length;
  const r = applyOps(f, [
    { op: 'setText', step: 0, idx: hero, field: 'headline', value: 'New Headline' },
    { op: 'setText', step: 0, idx: hero, field: 'ctaLink', value: 'javascript:alert(1)' },
    { op: 'setText', step: 0, idx: 99, field: 'headline', value: 'x' },
    { op: 'addSection', step: 0, at: hero + 1, type: 'testimonials', props: { headline: 'Loved By Clients', bogus: 'x' } },
    { op: 'addSection', step: 0, type: 'nope' },
    { op: 'setTheme', patch: { buttonShape: 'pill', primary: '#123456', headingFont: 'Comic Sans', radius: 99 } },
    { op: 'applyLook', id: 'glass' },
    { op: 'moveSection', step: 0, from: 0, to: 1 },
    { op: 'removeSection', step: 0, idx: 999 },
    { op: 'eval', code: 'x' },
  ]);
  assert.equal(r.applied, 5);
  assert.equal(r.skipped, 5);
  const secs = f.steps[0].sections;
  assert.equal(secs.length, n + 1);
  assert.ok(secs.some((s) => s.props.headline === 'New Headline'));
  assert.ok(secs.every((s) => s.props.ctaLink !== 'javascript:alert(1)'));
  assert.equal(f.theme.headingFont, 'Manrope', 'glass look applied after the theme patch');
});

test('built-in commands understand common requests without AI', () => {
  const f = buildTemplate('email-sms-audit');
  const hero = f.steps[0].sections.findIndex((s) => s.type === 'hero');
  const ops = (m, sel = -1) => localIntent(m, f, 0, sel)?.ops?.[0];
  assert.deepEqual(ops('Change the headline to Get More Leads Today'), { op: 'setText', step: 0, idx: hero, field: 'headline', value: 'Get More Leads Today' });
  assert.equal(ops('remove the FAQ').op, 'removeSection');
  const add = ops('add testimonials after the top');
  assert.equal(add.type, 'testimonials');
  assert.equal(add.at, hero + 1);
  assert.equal(ops('make it feel more luxury').id, 'minimal-luxe');
  assert.equal(ops('use blue colors').op, 'setTheme');
  assert.equal(ops('pill-shaped buttons please').patch.buttonShape, 'pill');
  assert.equal(localIntent('what is the meaning of life', f, 0), null);
});

test('no-AI: punchier headline and font switch', () => {
  assert.equal(punchier('We help busy coaches get more clients, without ads or cold calls'), 'We help busy coaches get more clients.');
  assert.equal(punchier('Grow your business really fast with our simple proven system that works'), 'Grow your business fast.');
  const f = buildTemplate('email-sms-audit');
  const hero = f.steps[0].sections.findIndex((s) => s.type === 'hero');
  const op = localIntent('Make the headline punchier', f, 0)?.ops?.[0];
  assert.equal(op.op, 'setText');
  assert.equal(op.idx, hero);
  assert.ok(op.value.split(' ').length <= 8);
  assert.equal(localIntent('change the font to Playfair Display', f, 0).ops[0].patch.headingFont, 'Playfair Display');
});
