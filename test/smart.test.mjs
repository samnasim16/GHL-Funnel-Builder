import test from 'node:test';
import assert from 'node:assert/strict';
import { recommend } from '../js/recommend.js';
import { collectFillable, buildPrompt, applyFill, quickFill } from '../js/ai-fill.js';
import { buildTemplate, TEMPLATES } from '../js/templates.js';
import { SECTIONS } from '../js/sections.js';

test('recommendations are sorted, valid and their fixes point at real things', () => {
  for (const t of TEMPLATES) {
    const f = buildTemplate(t.id);
    f.steps.forEach((step, si) => {
      const recs = recommend(f, si);
      const order = { high: 0, medium: 1, tip: 2 };
      recs.forEach((r, i) => {
        if (i) assert.ok(order[recs[i - 1].level] <= order[r.level], `${t.id}: sorted`);
        if (r.fix.type === 'add') {
          assert.ok(SECTIONS[r.fix.section], r.id);
          assert.ok(r.fix.at >= 0 && r.fix.at <= step.sections.length, `${t.id}/${r.id} at`);
        } else assert.ok(step.sections[r.fix.idx], `${t.id}/${r.id} idx`);
      });
    });
  }
});

test('specific recommendations fire and go away once fixed', () => {
  const f = buildTemplate('blank');
  const ids = () => recommend(f, 0).map((r) => r.id);
  assert.ok(ids().includes('form-connect'));
  assert.ok(ids().includes('proof'));
  const form = f.steps[0].sections.find((s) => s.type === 'form');
  form.props.webhook = 'https://services.leadconnectorhq.com/hooks/x';
  f.steps[0].sections.splice(2, 0, { id: 'x', type: 'testimonials', props: { ...SECTIONS.testimonials.defaults, items: 'Great | Ann | Owner' } });
  assert.ok(!ids().includes('form-connect'));
  assert.ok(!ids().includes('proof'));
  form.props.button = 'Submit';
  assert.ok(ids().includes('button-text'));
});

test('AI fill: only text fields are offered, links and settings are not', () => {
  const items = collectFillable(buildTemplate('email-sms-audit'));
  const keys = items.flatMap((i) => Object.keys(i.fields));
  assert.ok(keys.includes('headline'));
  for (const bad of ['webhook', 'ctaLink', 'url', 'bg', 'ghlEmbed', 'fields', 'redirect']) assert.ok(!keys.includes(bad), bad);
  const prompt = buildPrompt({ business: 'Acme', sells: 'roofing' }, items);
  assert.match(prompt, /Acme/);
  assert.match(prompt, /Reply with only a JSON object/);
});

test('AI fill: applies only allowed fields on known sections', () => {
  const f = buildTemplate('email-sms-audit');
  const items = collectFillable(f);
  const hero = items.find((i) => i.section === 'Top of page');
  const changed = applyFill(
    f,
    {
      sections: [
        { step: hero.step, idx: hero.idx, props: { headline: 'Roofs Done Right In One Day', ctaLink: 'javascript:alert(1)', bogus: 'x' } },
        { step: 99, idx: 0, props: { headline: 'nope' } },
        { step: hero.step, idx: hero.idx, props: { sub: 42 } },
      ],
    },
    items
  );
  assert.equal(changed, 1);
  const p = f.steps[hero.step].sections[hero.idx].props;
  assert.equal(p.headline, 'Roofs Done Right In One Day');
  assert.equal(p.ctaLink, '#form');
  assert.equal(applyFill(f, null, items), 0);
});

test('quick fill drops the brief into obvious places without inventing results', () => {
  const f = buildTemplate('webinar');
  const n = quickFill(f, { business: 'Peak Coaching', sells: 'fitness coaching', audience: 'busy dads', price: '$497' });
  assert.ok(n > 0);
  const all = JSON.stringify(f);
  assert.match(all, /Peak Coaching/);
  assert.match(all, /For busy dads/);
  assert.equal(f.steps[2].sections.find((s) => s.type === 'checkout').props.price, '$497');
});
