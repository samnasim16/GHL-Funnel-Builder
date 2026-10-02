import test from 'node:test';
import assert from 'node:assert/strict';
import { runPush, planPush, ghlDataType } from '../js/ghl-push.js';
import { buildTemplate } from '../js/templates.js';

// Minimal fake of the GoHighLevel API that records every request.
function fakeGhl({ tags = [], fail = {}, status = {} } = {}) {
  const calls = [];
  const fetch = async (url, opts) => {
    const u = new URL(url);
    const body = opts.body ? JSON.parse(opts.body) : null;
    calls.push({ method: opts.method, path: u.pathname, query: Object.fromEntries(u.searchParams), headers: opts.headers, body });
    const key = `${opts.method} ${u.pathname}`;
    const json = (code, data) => ({ ok: code < 300, status: code, json: async () => data });
    if (status[key]) return json(status[key], { message: 'nope' });
    if (fail[key]) throw new TypeError('Failed to fetch');
    if (opts.method === 'GET' && u.pathname.endsWith('/tags')) return json(200, { tags: tags.map((name) => ({ name })) });
    if (opts.method === 'GET' && u.pathname.endsWith('/customFields')) return json(200, { customFields: [] });
    if (opts.method === 'GET' && u.pathname.endsWith('/customValues')) return json(200, { customValues: [] });
    if (opts.method === 'GET' && u.pathname === '/products/') return json(200, { products: [] });
    if (opts.method === 'GET' && u.pathname === '/calendars/') return json(200, { calendars: [] });
    if (opts.method === 'GET' && u.pathname === '/opportunities/pipelines') return json(200, { pipelines: [] });
    if (opts.method === 'POST' && u.pathname === '/products/') return json(201, { _id: 'prod1' });
    return json(201, {});
  };
  return { fetch, calls };
}

test('creates tags, fields, values, products with price and calendars with the documented requests', async () => {
  const f = buildTemplate('webinar');
  f.blueprint.calendars = [{ name: 'Strategy Call', type: 'Round Robin', duration: '45 min', notes: '' }];
  const { fetch, calls } = fakeGhl({ tags: ['webinar-registered'] });
  const res = await runPush({ funnel: f, token: 'pit-1', locationId: 'LOC', fetch });

  const posts = calls.filter((c) => c.method === 'POST');
  assert.ok(calls.every((c) => c.headers.Authorization === 'Bearer pit-1'));
  // Existing tag skipped, others created.
  assert.equal(res.find((r) => r.name === 'webinar-registered').status, 'exists');
  assert.equal(posts.filter((c) => c.path === '/locations/LOC/tags').length, f.blueprint.tags.length - 1);
  // Custom field body
  const field = posts.find((c) => c.path === '/locations/LOC/customFields');
  assert.deepEqual(Object.keys(field.body).sort(), ['dataType', 'model', 'name']);
  assert.equal(field.headers.Version, '2021-07-28');
  // Product then price with numeric amount
  const prod = posts.find((c) => c.path === '/products/');
  assert.equal(prod.body.locationId, 'LOC');
  assert.equal(prod.body.productType, 'DIGITAL');
  const price = posts.find((c) => c.path === '/products/prod1/price');
  assert.equal(price.body.amount, 997);
  assert.equal(price.body.type, 'one_time');
  // Calendar uses its own API version
  const cal = posts.find((c) => c.path === '/calendars/');
  assert.equal(cal.headers.Version, '2021-04-15');
  assert.equal(cal.body.slotDuration, 45);
  // Pipeline missing → manual; workflows → manual; nothing posted to workflows/pipelines
  assert.equal(res.find((r) => r.area === 'Pipeline').status, 'manual');
  assert.equal(res.filter((r) => r.area === 'Automations').length, f.blueprint.workflows.length);
  assert.ok(!posts.some((c) => /pipelines|workflows/.test(c.path)));
});

test('a missing permission on one area does not stop the others', async () => {
  const f = buildTemplate('email-sms-audit');
  const { fetch } = fakeGhl({ status: { 'POST /locations/LOC/customValues': 403 } });
  const res = await runPush({ funnel: f, token: 't', locationId: 'LOC', fetch });
  const cv = res.find((r) => r.area === 'Saved values' && r.status === 'failed');
  assert.match(cv.detail, /permission/);
  assert.ok(res.some((r) => r.area === 'Calendars' && r.status === 'created'));
});

test('a bad token or blocked connection stops early with a clear reason', async () => {
  const f = buildTemplate('email-sms-audit');
  const bad = await runPush({ funnel: f, token: 't', locationId: 'LOC', fetch: fakeGhl({ status: { 'GET /locations/LOC/tags': 401 } }).fetch });
  assert.equal(bad.length, 1);
  assert.match(bad[0].detail, /token/);
  const blocked = await runPush({ funnel: f, token: 't', locationId: 'LOC', fetch: fakeGhl({ fail: { 'GET /locations/LOC/tags': 1 } }).fetch });
  assert.equal(blocked.length, 1);
  assert.equal(blocked[0].network, true);
});

test('plan lists what is automatic and what stays manual', () => {
  const { auto, manual } = planPush(buildTemplate('paid-ads-application'));
  assert.ok(auto.some((i) => i.area === 'Tags'));
  assert.ok(manual.some((i) => i.area === 'Automations'));
  assert.ok(manual.some((i) => i.area === 'Pipeline'));
  assert.equal(ghlDataType('Large text'), 'LARGE_TEXT');
  assert.equal(ghlDataType('Dropdown (single)'), 'TEXT');
});
