// Builds deploy/main.html: the builder (index.html) without its own
// doctype/head/body, because the Artifact host wraps the main page in its own
// skeleton. Everything else (pitch.html, css/, js/, examples/) is published as-is.
// Usage: node scripts/build-deploy.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
const assets = (head.match(/<link[^>]*>/g) || []).join('\n');
mkdirSync(join(root, 'deploy'), { recursive: true });
writeFileSync(join(root, 'deploy', 'main.html'), `${title}\n${assets}\n${body.trim()}\n`);
console.log('Wrote deploy/main.html');
