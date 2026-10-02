import test from 'node:test';
import assert from 'node:assert/strict';
import { LOOKS, PALETTES, paletteFromColor, paletteFromPixels, suggestLook, hexToHsl } from '../js/styles.js';
import { FONTS, FONT_PAIRS, renderStepPage, styleCSS, DEFAULT_THEME } from '../js/renderer.js';
import { SECTIONS, makeSection, safeImg } from '../js/sections.js';
import { buildTemplate } from '../js/templates.js';

const HEX = /^#[0-9a-f]{6}$/i;

test('every look and pairing uses real fonts and valid colors', () => {
  for (const l of LOOKS) {
    for (const k of ['primary', 'accent', 'dark', 'bg', 'alt', 'text']) assert.match(l.theme[k], HEX, `${l.id}.${k}`);
    assert.ok(FONTS[l.theme.headingFont] && FONTS[l.theme.bodyFont], l.id);
  }
  for (const p of FONT_PAIRS) assert.ok(FONTS[p.heading] && FONTS[p.body], p.name);
  assert.ok(PALETTES.length >= 20 && Object.keys(FONTS).length >= 30);
});

test('palette from one color keeps the hue and returns valid colors', () => {
  const p = paletteFromColor('#2563eb');
  for (const v of Object.values(p)) assert.match(v, HEX);
  assert.ok(Math.abs(hexToHsl(p.primary)[0] - hexToHsl('#2563eb')[0]) < 6);
  assert.ok(hexToHsl(p.dark)[2] < 15 && hexToHsl(p.alt)[2] > 90);
});

test('palette from pixels finds the brand color and skips white and transparent', () => {
  const px = [];
  for (let i = 0; i < 400; i++) px.push(255, 255, 255, 255); // white background
  for (let i = 0; i < 300; i++) px.push(225, 29, 46, 255); // red logo
  for (let i = 0; i < 120; i++) px.push(255, 212, 0, 255); // yellow accent
  for (let i = 0; i < 200; i++) px.push(0, 0, 0, 0); // transparent
  const p = paletteFromPixels(new Uint8ClampedArray(px));
  assert.ok(Math.abs(hexToHsl(p.primary)[0] - hexToHsl('#e11d2e')[0]) < 10, p.primary);
  assert.ok(Math.abs(hexToHsl(p.accent)[0] - hexToHsl('#ffd400')[0]) < 15, p.accent);
  assert.equal(paletteFromPixels(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255])), null);
});

test('look suggestion matches the type of business', () => {
  assert.equal(suggestLook({ sells: 'luxury med spa treatments' }).id, 'minimal-luxe');
  assert.equal(suggestLook({ sells: 'CrossFit gym memberships' }).id, 'brutalist');
  assert.equal(suggestLook({ sells: 'B2B SaaS analytics app' }).id, 'neon-night');
  assert.ok(suggestLook({}).id);
});

test('images: only web links and uploaded pictures are allowed', () => {
  assert.equal(safeImg('https://x.com/a.png'), 'https://x.com/a.png');
  assert.ok(safeImg('data:image/webp;base64,UklGRg=='));
  assert.equal(safeImg('javascript:alert(1)'), '');
  assert.equal(safeImg('data:text/html;base64,PHNjcmlwdD4='), '');
  assert.equal(safeImg('data:image/svg+xml;base64,PHN2Zz4='), '', 'SVG can carry scripts');
});

test('picture sections render with and without images', () => {
  const img = 'data:image/png;base64,iVBORw0KGgo=';
  for (const type of ['image', 'imageText', 'gallery']) {
    assert.ok(SECTIONS[type].render(makeSection(type).props).includes('fb-placeholder'), type);
  }
  assert.ok(SECTIONS.image.render(makeSection('image', { image: img }).props).includes(img));
  assert.equal((SECTIONS.gallery.render(makeSection('gallery', { images: `${img}\n${img}\njavascript:x` }).props).match(/<img/g) || []).length, 2);
  const hero = SECTIONS.hero.render(makeSection('hero', { bgImage: img }).props);
  assert.match(hero, /fb-has-bgimg/);
});

test('style options change the page CSS', () => {
  const f = buildTemplate('email-sms-audit');
  Object.assign(f.theme, { buttonStyle: 'outline', cardStyle: 'glass', effect: 'grid', headingCase: 'upper', spacing: 'compact', buttonShape: 'pill' });
  const css = renderStepPage(f, 0);
  assert.match(css, /inset 0 0 0 2px var\(--p\)/);
  assert.match(css, /backdrop-filter/);
  assert.match(css, /background-size:44px 44px/);
  assert.match(css, /text-transform:uppercase/);
  assert.match(css, /border-radius:999px/);
  assert.doesNotMatch(styleCSS(DEFAULT_THEME), /backdrop-filter|uppercase/);
});
