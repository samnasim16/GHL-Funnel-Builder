#!/usr/bin/env node
// Push a funnel's back end (tags, contact fields, saved values, products,
// calendars) into a GoHighLevel sub-account.
//
// Usage:
//   GHL_TOKEN=pit-xxxx node scripts/push-to-ghl.mjs <funnel.json> --location <LOCATION_ID> [--dry-run]
//
// Get the token in GoHighLevel: Settings → Private Integrations → Create new
// integration, tick the scopes printed by --help. The Location ID is in
// Settings → Business Profile, or after /location/ in your GoHighLevel web address.
import { readFileSync } from 'node:fs';
import { planPush, runPush, REQUIRED_SCOPES } from '../js/ghl-push.js';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const file = args.find((a) => a.endsWith('.json'));

if (!file || args.includes('--help')) {
  console.log(`Usage: GHL_TOKEN=... node scripts/push-to-ghl.mjs <funnel.json> --location <LOCATION_ID> [--dry-run]

Scopes to tick on the Private Integration:
  ${REQUIRED_SCOPES.join('\n  ')}`);
  process.exit(file ? 0 : 1);
}

const funnel = JSON.parse(readFileSync(file, 'utf8'));
const { auto, manual } = planPush(funnel);
console.log(`\n${funnel.name}\n`);
console.log('Will create (skips anything that already exists):');
auto.forEach((i) => console.log(`  • ${i.area}: ${i.name}${i.note ? ` (${i.note})` : ''}`));
console.log('\nStays manual (use the setup guide):');
manual.forEach((i) => console.log(`  • ${i.area}: ${i.name}${i.note ? ` (${i.note})` : ''}`));

if (args.includes('--dry-run')) process.exit(0);

const token = process.env.GHL_TOKEN;
const locationId = flag('--location') || process.env.GHL_LOCATION_ID;
if (!token || !locationId) {
  console.error('\nSet GHL_TOKEN and pass --location <LOCATION_ID>.');
  process.exit(1);
}

const ICON = { created: '✓ created', exists: '• exists ', found: '✓ found  ', manual: '→ manual ', failed: '✗ failed ' };
console.log('\nPushing to GoHighLevel…\n');
const results = await runPush({
  funnel,
  token,
  locationId,
  fetch,
  onProgress: (r) => console.log(`  ${ICON[r.status] || r.status}  ${r.area}: ${r.name}${r.detail ? `  (${r.detail})` : ''}`),
});
const count = (s) => results.filter((r) => r.status === s).length;
console.log(`\nDone: ${count('created')} created, ${count('exists') + count('found')} already there, ${count('failed')} failed, ${count('manual')} to do by hand.`);
process.exit(count('failed') ? 2 : 0);
