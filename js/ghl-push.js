// "Push to GoHighLevel": creates the parts of a funnel's back end that the
// GoHighLevel API (v2, services.leadconnectorhq.com) can create, and reports
// what still has to be built by hand. Endpoints and fields follow the official
// OpenAPI specs in github.com/GoHighLevel/highlevel-api-docs.
//
// Can create: tags, contact custom fields, custom values, products (+ price),
//             calendars.
// Read only:  pipelines (checked for), workflows. Funnels have no create API.
//
// Pure module: pass in `fetch`, so it runs in the browser, in Node and in tests.

export const GHL_API = 'https://services.leadconnectorhq.com';

// Scopes to tick when creating the Private Integration token.
export const REQUIRED_SCOPES = [
  'locations/tags.write',
  'locations/tags.readonly',
  'locations/customFields.write',
  'locations/customFields.readonly',
  'locations/customValues.write',
  'locations/customValues.readonly',
  'products.write',
  'products.readonly',
  'products/prices.write',
  'calendars.write',
  'calendars.readonly',
  'opportunities.readonly',
];

// Our field types → GHL dataType. Dropdowns are created as text because the
// sub-account endpoint takes no option list; switch them in GHL if wanted.
const DATA_TYPES = { text: 'TEXT', 'large text': 'LARGE_TEXT', date: 'DATE', number: 'NUMERICAL', phone: 'PHONE', email: 'EMAIL' };
export const ghlDataType = (type = '') => DATA_TYPES[String(type).toLowerCase()] || 'TEXT';

const norm = (s) => String(s || '').trim().toLowerCase();
const minutes = (d = '') => parseInt(String(d), 10) || 30;
const money = (p = '') => parseFloat(String(p).replace(/[^0-9.]/g, '')) || 0;

// What a push would do, without calling anything. Used for the preview list.
export function planPush(funnel) {
  const b = funnel.blueprint || {};
  const auto = [
    ...(b.tags || []).map((t) => ({ area: 'Tags', name: t })),
    ...(b.customFields || []).map((f) => ({ area: 'Contact fields', name: f.name, note: /dropdown/i.test(f.type) ? 'created as text' : '' })),
    ...(b.customValues || []).map((v) => ({ area: 'Saved values', name: v.name })),
    ...(b.products || []).map((p) => ({ area: 'Products', name: p.name, note: p.price })),
    ...(b.calendars || []).map((c) => ({ area: 'Calendars', name: c.name, note: 'assign your team after' })),
  ];
  const manual = [
    ...(b.pipeline ? [{ area: 'Pipeline', name: b.pipeline.name, note: 'checked; the API can\'t create pipelines' }] : []),
    ...(b.workflows || []).map((w) => ({ area: 'Automations', name: w.name, note: 'the API can\'t create workflows' })),
    { area: 'Funnel pages', name: `${funnel.steps.length} pages`, note: 'paste each page\'s code' },
  ];
  return { auto, manual };
}

class GhlError extends Error {
  constructor(status, body) {
    const msg = (body && (body.message || body.error)) || `HTTP ${status}`;
    super(Array.isArray(msg) ? msg.join('; ') : String(msg));
    this.status = status;
  }
}

function client({ token, fetch }) {
  return async function call(method, path, { version = '2021-07-28', query, body } = {}) {
    const url = new URL(GHL_API + path);
    Object.entries(query || {}).forEach(([k, v]) => url.searchParams.set(k, v));
    let res;
    try {
      res = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Version: version,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      // Network, CORS or page security policy: nothing will get through.
      const err = new GhlError(0, { message: 'Could not connect to GoHighLevel' });
      err.network = true;
      throw err;
    }
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      /* empty body */
    }
    if (!res.ok) throw new GhlError(res.status, data);
    return data || {};
  };
}

// Explains common failures in plain words.
const fatal = (err) => err.status === 401 || err.network;

export function explainError(err) {
  if (err.network) return 'This browser could not connect to GoHighLevel. Use the command version instead.';
  if (err.status === 401) return 'GoHighLevel rejected the token. Check you copied the whole Private Integration token.';
  if (err.status === 403) return 'The token is missing a permission (scope) for this. Edit the Private Integration and tick the scopes listed.';
  if (err.status === 422 || err.status === 400) return `GoHighLevel didn't accept it: ${err.message}`;
  if (err.status === 429) return 'Too many requests. Wait a minute and push again; finished items are skipped.';
  return err.message || 'Unknown error';
}

/**
 * Runs the push. Safe to repeat: anything that already exists (same name) is
 * skipped. Returns one result per item: status is created | exists | failed | manual | found.
 */
export async function runPush({ funnel, token, locationId, fetch, onProgress = () => {} }) {
  if (!token || !locationId) throw new Error('A token and a Location ID are both needed.');
  const call = client({ token, fetch });
  const b = funnel.blueprint || {};
  const results = [];
  const report = (r) => {
    results.push(r);
    onProgress(r, results);
  };

  // A failing read (missing scope) should not stop the rest of the push.
  async function existing(label, fn) {
    try {
      return await fn();
    } catch (err) {
      if (fatal(err)) throw err;
      report({ area: label, name: 'Reading existing items', status: 'failed', detail: explainError(err) });
      return null;
    }
  }

  async function create(area, name, exists, fn, detail = '') {
    if (exists) return report({ area, name, status: 'exists', detail: 'Already in GoHighLevel, skipped' });
    try {
      await fn();
      report({ area, name, status: 'created', detail });
    } catch (err) {
      if (fatal(err)) throw err;
      report({ area, name, status: 'failed', detail: explainError(err) });
    }
  }

  try {
    if (b.tags?.length) {
      const have = await existing('Tags', async () => (await call('GET', `/locations/${locationId}/tags`)).tags || []);
      const names = new Set((have || []).map((t) => norm(t.name)));
      for (const t of b.tags) await create('Tags', t, names.has(norm(t)), () => call('POST', `/locations/${locationId}/tags`, { body: { name: t } }));
    }

    if (b.customFields?.length) {
      const have = await existing('Contact fields', async () => (await call('GET', `/locations/${locationId}/customFields`, { query: { model: 'contact' } })).customFields || []);
      const names = new Set((have || []).map((f) => norm(f.name)));
      for (const f of b.customFields) {
        const dataType = ghlDataType(f.type);
        await create(
          'Contact fields',
          f.name,
          names.has(norm(f.name)),
          () => call('POST', `/locations/${locationId}/customFields`, { body: { name: f.name, dataType, model: 'contact' } }),
          /dropdown/i.test(f.type) ? 'Created as a text field' : ''
        );
      }
    }

    if (b.customValues?.length) {
      const have = await existing('Saved values', async () => (await call('GET', `/locations/${locationId}/customValues`)).customValues || []);
      const names = new Set((have || []).map((v) => norm(v.name)));
      for (const v of b.customValues)
        await create('Saved values', v.name, names.has(norm(v.name)), () => call('POST', `/locations/${locationId}/customValues`, { body: { name: v.name, value: v.value } }));
    }

    if (b.products?.length) {
      for (const p of b.products) {
        const have = await existing('Products', async () => (await call('GET', '/products/', { query: { locationId, search: p.name } })).products || []);
        const found = (have || []).some((x) => norm(x.name) === norm(p.name));
        await create(
          'Products',
          p.name,
          found,
          async () => {
            const prod = await call('POST', '/products/', {
              body: { name: p.name, locationId, productType: /course|portal|membership|digital/i.test(p.delivers || '') ? 'DIGITAL' : 'SERVICE', description: p.delivers || '' },
            });
            const productId = prod._id || prod.product?._id;
            const amount = money(p.price);
            if (productId && amount) {
              await call('POST', `/products/${productId}/price`, { body: { name: 'One-time payment', type: 'one_time', currency: 'USD', amount, locationId } });
            }
          },
          `With a one-time price of ${p.price}. Check the price and currency in Payments → Products.`
        );
      }
    }

    if (b.calendars?.length) {
      const have = await existing('Calendars', async () => (await call('GET', '/calendars/', { version: '2021-04-15', query: { locationId } })).calendars || []);
      const names = new Set((have || []).map((c) => norm(c.name)));
      for (const c of b.calendars)
        await create(
          'Calendars',
          c.name,
          names.has(norm(c.name)),
          () =>
            call('POST', '/calendars/', {
              version: '2021-04-15',
              body: { locationId, name: c.name, description: c.notes || '', calendarType: 'event', slotDuration: minutes(c.duration), slotDurationUnit: 'mins' },
            }),
          'Open it in Calendars to set your hours and team, then copy its booking link into your page.'
        );
    }

    if (b.pipeline) {
      const have = await existing('Pipeline', async () => (await call('GET', '/opportunities/pipelines', { query: { locationId } })).pipelines || []);
      if (have) {
        const found = have.some((p) => norm(p.name) === norm(b.pipeline.name));
        report(
          found
            ? { area: 'Pipeline', name: b.pipeline.name, status: 'found', detail: 'Already set up' }
            : { area: 'Pipeline', name: b.pipeline.name, status: 'manual', detail: 'Create it by hand (step "Build the pipeline" in the setup guide). The API can\'t create pipelines.' }
        );
      }
    }
  } catch (err) {
    // Bad token or no connection: stop, nothing else will work.
    report({ area: 'Connection', name: 'GoHighLevel', status: 'failed', detail: explainError(err), network: Boolean(err.network) });
    return results;
  }

  (b.workflows || []).forEach((w) => report({ area: 'Automations', name: w.name, status: 'manual', detail: 'Build by hand from the setup guide. The API can\'t create workflows.' }));
  return results;
}
