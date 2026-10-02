import test from 'node:test';
import assert from 'node:assert/strict';
import { SECTIONS, makeSection, videoEmbedUrl, esc } from '../js/sections.js';
import { renderStepPage, renderGhlSnippet, RUNTIME_JS, contrastText } from '../js/renderer.js';
import { TEMPLATES, buildTemplate } from '../js/templates.js';
import { auditFunnel, auditStep } from '../js/audit.js';
import { blueprintMarkdown, systemMap } from '../js/blueprint.js';

test('every section renders with defaults and no "undefined"', () => {
  for (const [type, def] of Object.entries(SECTIONS)) {
    const html = def.render(makeSection(type).props, {});
    assert.ok(html.length > 20, type);
    assert.ok(!html.includes('undefined'), `${type} leaks undefined`);
    for (const k of Object.keys(def.fields)) assert.ok(k in def.defaults, `${type}.${k} missing default`);
  }
});

test('every template step renders to a full page and a GHL snippet', () => {
  for (const t of TEMPLATES) {
    const f = buildTemplate(t.id);
    assert.ok(f.steps.length >= 1);
    f.steps.forEach((s, i) => {
      for (const sec of s.sections) assert.ok(SECTIONS[sec.type], `${t.id}: unknown ${sec.type}`);
      const page = renderStepPage(f, i);
      assert.match(page, /^<!doctype html>/);
      assert.ok(!page.includes('undefined'), `${t.id} step ${i} leaks undefined`);
      const snip = renderGhlSnippet(f, i);
      assert.ok(!/<html|<head[ >]/.test(snip), 'snippet must not contain html/head');
      assert.ok(snip.includes('.fb-root{'));
    });
  }
});

test('step paths are unique and forms redirect to the next step', () => {
  for (const t of TEMPLATES) {
    const f = buildTemplate(t.id);
    assert.equal(new Set(f.steps.map((s) => s.path)).size, f.steps.length, t.id);
    f.steps.forEach((s, i) => {
      if (!s.sections.some((x) => x.type === 'form') || !f.steps[i + 1]) return;
      assert.ok(renderStepPage(f, i).includes(`data-redirect="${f.steps[i + 1].path}"`), `${t.id} step ${i}`);
    });
  }
});

test('user text is escaped', () => {
  const s = makeSection('hero', { headline: '<script>alert(1)</script>', highlight: '', ctaLink: 'javascript:alert(1)' });
  const html = SECTIONS.hero.render(s.props);
  assert.ok(!html.includes('<script>alert'));
  assert.ok(!html.includes('javascript:'));
  assert.equal(esc(`"'<>&`), '&quot;&#39;&lt;&gt;&amp;');
});

test('video links become embeds', () => {
  assert.equal(videoEmbedUrl('https://youtu.be/dQw4w9WgXcQ'), 'https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1');
  assert.equal(videoEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3'), 'https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1');
  assert.equal(videoEmbedUrl('https://vimeo.com/123456'), 'https://player.vimeo.com/video/123456');
  assert.equal(videoEmbedUrl('https://www.loom.com/share/abc123'), 'https://www.loom.com/embed/abc123');
  assert.equal(videoEmbedUrl('javascript:alert(1)'), '');
});

test('runtime JS is valid JavaScript', () => {
  assert.doesNotThrow(() => new Function(RUNTIME_JS));
});

test('meta pixel only injected for numeric IDs', () => {
  const f = buildTemplate('email-sms-audit');
  f.tracking.metaPixel = "123'); alert(1);//";
  assert.ok(!renderStepPage(f, 0).includes('fbevents'));
  f.tracking.metaPixel = '1234567890';
  assert.ok(renderStepPage(f, 0).includes("fbq('init','1234567890')"));
});

test('audit flags missing wiring and rewards fixes', () => {
  const f = buildTemplate('email-sms-audit');
  const before = auditStep(f.steps[0]);
  assert.equal(before.results.find((r) => r.id === 'form-connected').pass, false);
  f.steps[0].sections.find((s) => s.type === 'form').props.webhook = 'https://services.leadconnectorhq.com/hooks/abc/webhook-trigger/xyz';
  const after = auditStep(f.steps[0]);
  assert.equal(after.results.find((r) => r.id === 'form-connected').pass, true);
  assert.ok(after.score > before.score);
  const fa = auditFunnel(f);
  assert.ok(fa.score >= 0 && fa.score <= 100);
});

test('build sheet covers every blueprint area', () => {
  const md = blueprintMarkdown(buildTemplate('paid-ads-application'));
  for (const h of ['Funnel steps', 'Pipeline', 'Custom fields', 'Custom values', 'Tags', 'Calendars', 'Workflows', 'KPIs', 'Launch QA']) {
    assert.ok(md.includes(h), h);
  }
});

test('contrastText picks readable colours', () => {
  assert.equal(contrastText('#ffd400'), '#111111');
  assert.equal(contrastText('#0b0b0f'), '#ffffff');
});

test('system map reflects which GoHighLevel tools a funnel uses', () => {
  const used = (id) => Object.fromEntries(systemMap(buildTemplate(id)).map((t) => [t.id, t.used]));
  const web = used('webinar');
  assert.equal(web.payments, true);
  assert.equal(web.courses, true);
  const audit = used('email-sms-audit');
  assert.equal(audit.calendar, true);
  assert.equal(audit.payments, false);
  assert.equal(used('local-quote').reviews, true);
});

test('editor-only markup never leaks into exports', () => {
  for (const t of TEMPLATES) {
    const f = buildTemplate(t.id);
    f.steps.forEach((_, i) => {
      const page = renderStepPage(f, i);
      assert.ok(!/data-f=|fb-tools|fb-add/.test(page), `${t.id} step ${i}`);
      assert.ok(renderStepPage(f, i, { editor: true }).includes('fb-tools'));
    });
  }
});

test('setup guide has a tick box per task and copy buttons for SMS copy', async () => {
  const { setupGuidePage, guideScript } = await import('../js/setup-guide.js');
  for (const t of TEMPLATES) {
    const f = buildTemplate(t.id);
    const page = setupGuidePage(f);
    assert.match(page, /^<!doctype html>/);
    assert.ok(!page.includes('undefined'), t.id);
    const tasks = (page.match(/class="task"/g) || []).length;
    const sms = f.blueprint.workflows.flatMap((w) => w.actions).filter((a) => /sms/i.test(a.type)).length;
    assert.ok(tasks >= f.steps.length + f.blueprint.tags.length, `${t.id}: ${tasks} tasks`);
    assert.equal((page.match(/>Copy message</g) || []).length, sms, t.id);
    assert.ok(page.includes('Save it as a Snapshot'));
  }
  assert.doesNotThrow(() => new Function(guideScript('x')));
});
