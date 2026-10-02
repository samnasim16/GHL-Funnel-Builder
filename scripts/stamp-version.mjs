// Cache-busting: stamps every local script/stylesheet reference with ?v=<hash>
// of the current code, so browsers fetch new files right after a deploy
// instead of reusing cached copies (GitHub Pages lets browsers cache ~10 min).
// Run after changing anything in js/ or css/:  node scripts/stamp-version.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const strip = (s) => s.replace(/\?v=[0-9a-f]+/g, '');
const jsFiles = readdirSync(join(root, 'js')).filter((f) => f.endsWith('.js')).map((f) => join(root, 'js', f));
const hash = createHash('sha1');
for (const f of [...jsFiles, join(root, 'css', 'app.css')].sort()) hash.update(strip(readFileSync(f, 'utf8')));
const v = hash.digest('hex').slice(0, 10);

for (const f of jsFiles) {
  const src = readFileSync(f, 'utf8');
  const out = src.replace(/(from\s+'\.\/[\w-]+\.js)(\?v=[0-9a-f]+)?'/g, `$1?v=${v}'`);
  if (out !== src) writeFileSync(f, out);
}
const idx = join(root, 'index.html');
const html = readFileSync(idx, 'utf8')
  .replace(/href="css\/app\.css(\?v=[0-9a-f]+)?"/, `href="css/app.css?v=${v}"`)
  .replace(/src="js\/app\.js(\?v=[0-9a-f]+)?"/, `src="js/app.js?v=${v}"`);
writeFileSync(idx, html);
console.log(`Stamped version ${v}`);
