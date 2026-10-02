// Design library: whole "Looks" (colors + fonts + shape + effects), color
// palettes, palette generation from one color or from an uploaded image, and a
// no-AI look suggestion from the business brief. Pure functions only.

// ---- color helpers ----------------------------------------------------------
export function hexToHsl(hex) {
  const h = String(hex).replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0').slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  let hue = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hue *= 60;
  }
  return [Math.round(hue), Math.round(s * 100), Math.round(l * 100)];
}

export function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/** A full palette from one brand color: accent, dark, light background, text. */
export function paletteFromColor(hex) {
  const [h, s, l] = hexToHsl(hex);
  const sat = clamp(s, 45, 95);
  return {
    primary: hslToHex(h, sat, clamp(l, 38, 58)),
    accent: hslToHex((h + 155) % 360, clamp(sat + 5, 60, 100), 56),
    dark: hslToHex(h, clamp(sat * 0.5, 12, 40), 7),
    bg: '#ffffff',
    alt: hslToHex(h, clamp(sat * 0.35, 8, 30), 96),
    text: hslToHex(h, 25, 10),
  };
}

/**
 * Brand colors from an image's pixels (RGBA, e.g. a 64x64 canvas of a logo).
 * Buckets similar colors, prefers vivid frequent ones, ignores near white/black
 * and transparent pixels, then builds a palette around the strongest color.
 */
export function paletteFromPixels(data) {
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const e = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
    e.r += r;
    e.g += g;
    e.b += b;
    e.n++;
    buckets.set(key, e);
  }
  const colors = [...buckets.values()]
    .map((e) => {
      const hex = '#' + [e.r, e.g, e.b].map((v) => Math.round(v / e.n).toString(16).padStart(2, '0')).join('');
      const [h, s, l] = hexToHsl(hex);
      return { hex, h, s, l, n: e.n, score: e.n * (0.25 + s / 100) * (l > 12 && l < 92 ? 1 : 0.05) };
    })
    .sort((a, b) => b.score - a.score);
  const vivid = colors.filter((c) => c.s > 25 && c.l > 15 && c.l < 85);
  if (!vivid.length) return null;
  const main = vivid[0];
  const pal = paletteFromColor(main.hex);
  pal.primary = main.hex;
  const second = vivid.find((c) => Math.min(Math.abs(c.h - main.h), 360 - Math.abs(c.h - main.h)) > 40);
  if (second) pal.accent = second.hex;
  return pal;
}

// ---- palettes ---------------------------------------------------------------
const P = (name, primary, accent, dark, alt = '#f4f4f6', bg = '#ffffff', text = '#14141a') => ({ name, primary, accent, dark, alt, bg, text });
export const PALETTES = [
  P('Bold red', '#e11d2e', '#ffd400', '#0b0b0f'),
  P('Bold yellow', '#ffd400', '#e11d2e', '#0a0a0a'),
  P('Electric', '#5b4bff', '#00e5c7', '#0b0a1f', '#f3f2ff'),
  P('Sunset', '#ff5a36', '#ffb800', '#1c0f0a', '#fff4ee'),
  P('Ocean', '#2563eb', '#22d3ee', '#0b1220', '#eff5ff'),
  P('Forest', '#0e7c66', '#ffb703', '#0f2a24', '#eef7f3'),
  P('Royal', '#6d28d9', '#facc15', '#140b2e', '#f5f0ff'),
  P('Bubblegum', '#ff4fa3', '#7c3aed', '#1e0b19', '#fff0f7'),
  P('Mint', '#10b981', '#0f172a', '#06281e', '#ecfdf5'),
  P('Coral', '#ff6b6b', '#4ecdc4', '#1a1a2e', '#fff3f3'),
  P('Gold luxe', '#c8a24a', '#1f1f1f', '#0d0c0a', '#f8f4ea', '#fffdf8', '#1a1712'),
  P('Champagne', '#b88a5a', '#2b2b2b', '#1c1612', '#f6efe7', '#fffaf5', '#221a14'),
  P('Midnight', '#7c5cff', '#ff7ab6', '#07060f', '#f2f0ff'),
  P('Neon lime', '#b6ff3b', '#7c3aed', '#0a0a0a', '#f5ffe6'),
  P('Cyber', '#00f0ff', '#ff2bd6', '#05060b', '#eefcff'),
  P('Terracotta', '#c2552d', '#2f5d50', '#1d120d', '#faf1ea', '#fffaf6', '#24160f'),
  P('Sage', '#6b8f71', '#d9a441', '#1b241d', '#f2f6f1', '#fbfcfa', '#18201a'),
  P('Slate pro', '#334155', '#f97316', '#0f172a', '#f1f5f9'),
  P('Health', '#0ea5e9', '#22c55e', '#06202e', '#eff9ff'),
  P('Peach', '#ff8a5b', '#5b5bd6', '#231511', '#fff4ef'),
  P('Lavender', '#8b5cf6', '#f472b6', '#160f26', '#f6f3ff'),
  P('Mono', '#111111', '#e11d2e', '#000000', '#f2f2f2'),
  P('Orange', '#ff9900', '#0b0b0f', '#111827', '#fff7eb'),
  P('Berry', '#be185d', '#f59e0b', '#1f0a14', '#fdf2f7'),
];

// ---- whole looks ------------------------------------------------------------
const L = (id, name, desc, theme) => ({ id, name, desc, theme });
export const LOOKS = [
  L('bold-agency', 'Bold agency', 'Big type, punchy color, solid buttons.', { ...pal('Bold red'), headingFont: 'Bricolage Grotesque', bodyFont: 'Geist', radius: 10, buttonShape: 'rounded', buttonStyle: 'solid', cardStyle: 'shadow', spacing: 'normal', headingCase: 'normal', effect: 'none' }),
  L('modern-gradient', 'Modern gradient', 'Gradient buttons and soft color glow.', { ...pal('Electric'), headingFont: 'Sora', bodyFont: 'Geist', radius: 16, buttonShape: 'pill', buttonStyle: 'gradient', cardStyle: 'border', spacing: 'airy', headingCase: 'normal', effect: 'mesh' }),
  L('glass', 'Glass', 'Frosted cards on a glowing dark background.', { ...pal('Midnight'), headingFont: 'Manrope', bodyFont: 'Manrope', radius: 20, buttonShape: 'pill', buttonStyle: 'glow', cardStyle: 'glass', spacing: 'airy', headingCase: 'normal', effect: 'mesh' }),
  L('neon-night', 'Neon night', 'Dark, electric, techy. Great for software and creators.', { ...pal('Cyber'), headingFont: 'Space Grotesk', bodyFont: 'Onest', radius: 8, buttonShape: 'square', buttonStyle: 'glow', cardStyle: 'border', spacing: 'normal', headingCase: 'normal', effect: 'grid' }),
  L('minimal-luxe', 'Minimal luxe', 'Elegant serif, lots of space, gold accents.', { ...pal('Gold luxe'), headingFont: 'Playfair Display', bodyFont: 'Manrope', radius: 2, buttonShape: 'square', buttonStyle: 'outline', cardStyle: 'flat', spacing: 'airy', headingCase: 'normal', effect: 'none' }),
  L('brutalist', 'Brutalist', 'Loud, raw, uppercase. Impossible to ignore.', { ...pal('Neon lime'), headingFont: 'Anton', bodyFont: 'Work Sans', radius: 0, buttonShape: 'square', buttonStyle: 'solid', cardStyle: 'border', spacing: 'compact', headingCase: 'upper', effect: 'none' }),
  L('soft-friendly', 'Soft & friendly', 'Rounded and warm. Coaches, wellness, local.', { ...pal('Peach'), headingFont: 'Outfit', bodyFont: 'Plus Jakarta Sans', radius: 22, buttonShape: 'pill', buttonStyle: 'solid', cardStyle: 'shadow', spacing: 'airy', headingCase: 'normal', effect: 'dots' }),
  L('editorial', 'Editorial', 'Magazine serif with crisp lines.', { ...pal('Terracotta'), headingFont: 'Fraunces', bodyFont: 'Figtree', radius: 4, buttonShape: 'rounded', buttonStyle: 'solid', cardStyle: 'border', spacing: 'normal', headingCase: 'normal', effect: 'noise' }),
  L('clean-saas', 'Clean SaaS', 'Calm, trustworthy, product-led.', { ...pal('Ocean'), headingFont: 'Urbanist', bodyFont: 'Inter', radius: 12, buttonShape: 'rounded', buttonStyle: 'solid', cardStyle: 'border', spacing: 'normal', headingCase: 'normal', effect: 'dots' }),
  L('poster', 'Poster', 'Tall condensed headlines and high contrast.', { ...pal('Sunset'), headingFont: 'Bebas Neue', bodyFont: 'Rubik', radius: 6, buttonShape: 'rounded', buttonStyle: 'solid', cardStyle: 'shadow', spacing: 'normal', headingCase: 'upper', effect: 'noise' }),
];
function pal(name) {
  const { name: _n, ...colors } = PALETTES.find((p) => p.name === name);
  return colors;
}

// ---- suggestion without AI --------------------------------------------------
const RULES = [
  [/luxur|spa|salon|beauty|jewel|wedding|real estate|interior|boutique|high.?end/i, 'minimal-luxe'],
  [/saas|software|app\b|tech|ai\b|startup|platform|crypto|agency for|developer/i, 'neon-night'],
  [/coach|wellness|yoga|therap|mindset|health|nutrition|mom|family|life/i, 'soft-friendly'],
  [/fitness|gym|sport|athlet|muscle|martial|crossfit|bootcamp/i, 'brutalist'],
  [/course|creator|masterclass|webinar|community|newsletter|podcast/i, 'modern-gradient'],
  [/restaurant|cafe|food|bakery|brewery|local|roof|plumb|hvac|clean|landscap|dental|clinic/i, 'clean-saas'],
  [/magazine|author|book|writer|photograph|art|design studio/i, 'editorial'],
  [/event|music|festival|concert|club|nightlife/i, 'poster'],
  [/ecom|shopify|dtc|brand|ads|marketing|ecommerce/i, 'bold-agency'],
];
/** Picks a Look from the business brief by keywords. Returns a LOOKS entry. */
export function suggestLook(brief = {}) {
  const text = [brief.business, brief.sells, brief.audience, brief.offer].filter(Boolean).join(' ');
  const hit = RULES.find(([re]) => re.test(text));
  return LOOKS.find((l) => l.id === (hit ? hit[1] : 'bold-agency'));
}
