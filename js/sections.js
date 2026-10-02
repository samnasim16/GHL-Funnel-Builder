// Section library: every block a funnel step can be built from.
// Each section has a schema (drives the inspector UI), defaults, and a pure
// render(props, ctx) that returns HTML. No DOM access here so the same code
// renders in the editor, in exports, and in Node tests.

export const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Lines -> array, dropping blanks. Used for list-style textarea fields.
export const lines = (s = '') =>
  String(s)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

// "a | b | c" -> ['a','b','c']
const cells = (line) => line.split('|').map((c) => c.trim());

const safeUrl = (u = '') => {
  const v = String(u).trim();
  if (!v) return '';
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(v)) return v;
  return '';
};

// Images: web links, or pictures uploaded in the builder (stored as data URLs).
export const safeImg = (u = '') => {
  const v = String(u).trim();
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(v)) return v;
  return /^https?:\/\//i.test(v) ? v : '';
};

// Marks an element as editable in place. Emits nothing outside the editor.
const F = (ctx, key) => (ctx && ctx.editor ? ` data-f="${key}"` : '');

const btn = (label, href, cls = '', attr = '') =>
  `<a class="fb-btn ${cls}" href="${esc(safeUrl(href) || '#')}"${attr}>${esc(label)}</a>`;

const sectionWrap = (type, inner, { bg = '', id = '', style = '', cls = '' } = {}) =>
  `<section class="fb-s fb-${type}${bg ? ' fb-bg-' + bg : ''}${cls ? ' ' + cls : ''}"${id ? ` id="${esc(id)}"` : ''}${style ? ` style="${esc(style)}"` : ''}><div class="fb-wrap">${inner}</div></section>`;

const BG = { type: 'select', label: 'Background', options: ['default', 'alt', 'dark', 'primary'], optionLabels: ['White', 'Light grey', 'Dark', 'Brand color'] };

// Turns a YouTube / Vimeo / Loom / Wistia share link into an embeddable URL.
export function videoEmbedUrl(url = '') {
  const u = String(url).trim();
  let m;
  if ((m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/)))
    return `https://www.youtube.com/embed/${m[1]}?rel=0&modestbranding=1`;
  if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/))) return `https://player.vimeo.com/video/${m[1]}`;
  if ((m = u.match(/loom\.com\/(?:share|embed)\/([\w]+)/))) return `https://www.loom.com/embed/${m[1]}`;
  if ((m = u.match(/wistia\.(?:com|net)\/(?:medias|embed\/iframe)\/([\w]+)/)))
    return `https://fast.wistia.net/embed/iframe/${m[1]}`;
  return safeUrl(u);
}

export const SECTIONS = {
  announcement: {
    name: 'Urgency bar',
    icon: '⚡',
    desc: 'A thin bar at the very top. Good for urgency, like "Only 4 spots left".',
    fields: {
      text: { type: 'text', label: 'Text' },
      deadline: { type: 'text', label: 'Countdown ends at (optional)', help: 'Format: 2026-10-31 23:59' },
    },
    defaults: { text: 'Only 4 onboarding spots left this month', deadline: '' },
    render: (p, ctx = {}) =>
      `<div class="fb-s fb-announcement"><div class="fb-wrap"><span${F(ctx, 'text')}>${esc(p.text)}</span>${
        p.deadline ? ` <span class="fb-countdown" data-deadline="${esc(p.deadline)}">--:--:--</span>` : ''
      }</div></div>`,
  },

  header: {
    name: 'Logo and button',
    icon: '▭',
    desc: 'Your logo and one button at the top of the page.',
    fields: {
      logo: { type: 'text', label: 'Logo text' },
      logoUrl: { type: 'image', label: 'Logo image (optional)', aspect: 'original' },
      cta: { type: 'text', label: 'Button label' },
      ctaLink: { type: 'text', label: 'Button goes to' },
    },
    defaults: { logo: 'YOUR BRAND', logoUrl: '', cta: 'Book a Call', ctaLink: '#form' },
    render: (p, ctx = {}) =>
      `<header class="fb-s fb-header"><div class="fb-wrap fb-row">${
        safeImg(p.logoUrl)
          ? `<img class="fb-logo-img" src="${esc(safeImg(p.logoUrl))}" alt="${esc(p.logo)}">`
          : `<div class="fb-logo"${F(ctx, 'logo')}>${esc(p.logo)}</div>`
      }${p.cta ? btn(p.cta, p.ctaLink, 'fb-btn-sm', F(ctx, 'cta')) : ''}</div></header>`,
  },

  hero: {
    name: 'Top of page',
    icon: '★',
    desc: 'The first thing visitors see: your big promise and a button.',
    fields: {
      eyebrow: { type: 'text', label: 'Small text above the headline' },
      headline: { type: 'textarea', label: 'Headline' },
      highlight: { type: 'text', label: 'Words to color in the headline' },
      sub: { type: 'textarea', label: 'Sub-headline' },
      bullets: { type: 'list', label: 'Bullet points', cols: ['Bullet'] },
      cta: { type: 'text', label: 'Button label' },
      ctaLink: { type: 'text', label: 'Button goes to' },
      note: { type: 'text', label: 'Small text under the button' },
      image: { type: 'image', label: 'Picture beside the text (optional)', aspect: '4:3' },
      bgImage: { type: 'image', label: 'Background picture (optional)', aspect: '16:9' },
      overlay: { type: 'select', label: 'Background darkness', options: ['light', 'medium', 'strong'], optionLabels: ['Light', 'Medium', 'Strong'] },
      bg: BG,
    },
    defaults: {
      eyebrow: 'For brands doing $1M+/year',
      headline: 'Scale Profitably Without Burning Cash On Ads',
      highlight: 'Profitably',
      sub: 'We build the ads, funnels and retention engine. You keep the margin.',
      bullets: '',
      cta: 'Get My Free Growth Plan',
      ctaLink: '#form',
      note: 'Free 30-minute strategy session. No obligation.',
      image: '',
      bgImage: '',
      overlay: 'medium',
      bg: 'dark',
    },
    render: (p, ctx = {}) => {
      let h = esc(p.headline);
      if (p.highlight && p.headline.includes(p.highlight)) {
        h = h.replace(esc(p.highlight), `<span class="fb-hl">${esc(p.highlight)}</span>`);
      }
      const bl = lines(p.bullets);
      const img = safeImg(p.image);
      const bgImg = safeImg(p.bgImage);
      const shade = { light: 0.35, medium: 0.55, strong: 0.75 }[p.overlay] ?? 0.55;
      const copy = `${p.eyebrow ? `<div class="fb-eyebrow"${F(ctx, 'eyebrow')}>${esc(p.eyebrow)}</div>` : ''}
        <h1${F(ctx, 'headline')}>${h.replace(/\n/g, '<br>')}</h1>
        ${p.sub ? `<p class="fb-lead"${F(ctx, 'sub')}>${esc(p.sub)}</p>` : ''}
        ${bl.length ? `<ul class="fb-checks">${bl.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
        ${p.cta ? `<div class="fb-cta-row">${btn(p.cta, p.ctaLink, 'fb-btn-lg', F(ctx, 'cta'))}</div>` : ''}
        ${p.note ? `<div class="fb-note"${F(ctx, 'note')}>${esc(p.note)}</div>` : ''}`;
      return sectionWrap(
        'hero',
        img
          ? `<div class="fb-split"><div>${copy}</div><div><img class="fb-hero-img" src="${esc(img)}" alt=""></div></div>`
          : `<div class="fb-center">${copy}</div>`,
        bgImg
          ? { bg: p.bg, cls: 'fb-has-bgimg', style: `background-image:linear-gradient(rgba(8,8,12,${shade}),rgba(8,8,12,${shade + 0.1})),url('${bgImg}')` }
          : { bg: p.bg }
      );
    },
  },

  video: {
    name: 'Video',
    icon: '▶',
    desc: 'Show a video (for example a sales video) with a button under it.',
    fields: {
      headline: { type: 'textarea', label: 'Headline above video' },
      url: { type: 'text', label: 'Video link', help: 'Paste a YouTube, Vimeo, Loom or Wistia link.' },
      caption: { type: 'text', label: 'Caption under video' },
      cta: { type: 'text', label: 'Button label (optional)' },
      ctaLink: { type: 'text', label: 'Button goes to' },
      bg: BG,
    },
    defaults: {
      headline: 'Watch: How We Took A DTC Brand From $80k To $410k/Month',
      url: '',
      caption: 'Turn your sound on. 7 minutes.',
      cta: 'Book Your Strategy Call',
      ctaLink: '#form',
      bg: 'default',
    },
    render: (p, ctx = {}) => {
      const src = videoEmbedUrl(p.url);
      return sectionWrap(
        'video',
        `<div class="fb-center">
          ${p.headline ? `<h2${F(ctx, 'headline')}>${esc(p.headline)}</h2>` : ''}
          <div class="fb-video">${
            src
              ? `<iframe src="${esc(src)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy" title="Video"></iframe>`
              : `<div class="fb-placeholder">▶ Paste a YouTube / Vimeo / Loom / Wistia link</div>`
          }</div>
          ${p.caption ? `<div class="fb-note"${F(ctx, 'caption')}>${esc(p.caption)}</div>` : ''}
          ${p.cta ? `<div class="fb-cta-row">${btn(p.cta, p.ctaLink, 'fb-btn-lg', F(ctx, 'cta'))}</div>` : ''}
        </div>`,
        { bg: p.bg }
      );
    },
  },

  logos: {
    name: 'Trusted-by logos',
    icon: '◎',
    desc: 'A row of brand names or logos to show who trusts you.',
    fields: {
      title: { type: 'text', label: 'Title' },
      items: { type: 'list', label: 'Brands (name or image link)', cols: ['Brand'] },
      bg: BG,
    },
    defaults: { title: 'Trusted by fast-growing brands', items: 'Brand One\nBrand Two\nBrand Three\nBrand Four\nBrand Five', bg: 'alt' },
    render: (p, ctx = {}) =>
      sectionWrap(
        'logos',
        `${p.title ? `<div class="fb-eyebrow fb-center"${F(ctx, 'title')}>${esc(p.title)}</div>` : ''}<div class="fb-logo-row">${lines(p.items)
          .map((i) =>
            safeUrl(i) && /^https?:/.test(i)
              ? `<img src="${esc(i)}" alt="" loading="lazy">`
              : `<span>${esc(i)}</span>`
          )
          .join('')}</div>`,
        { bg: p.bg }
      ),
  },

  image: {
    name: 'Picture',
    icon: '🖼',
    desc: 'One big picture, like a product shot or a team photo, with an optional caption.',
    fields: {
      image: { type: 'image', label: 'Picture', aspect: 'original' },
      alt: { type: 'text', label: 'Describe the picture (for screen readers and Google)' },
      caption: { type: 'text', label: 'Caption (optional)' },
      width: { type: 'select', label: 'Width', options: ['normal', 'wide', 'full'], optionLabels: ['Normal', 'Wide', 'Edge to edge'] },
      bg: BG,
    },
    defaults: { image: '', alt: '', caption: '', width: 'wide', bg: 'default' },
    render: (p, ctx = {}) => {
      const src = safeImg(p.image);
      return sectionWrap(
        'image',
        `<figure class="fb-figure fb-w-${esc(p.width || 'wide')}">${
          src ? `<img src="${esc(src)}" alt="${esc(p.alt || '')}" loading="lazy">` : `<div class="fb-placeholder">🖼 Upload a picture in the settings on the right</div>`
        }${p.caption ? `<figcaption${F(ctx, 'caption')}>${esc(p.caption)}</figcaption>` : ''}</figure>`,
        { bg: p.bg }
      );
    },
  },

  imageText: {
    name: 'Picture + text',
    icon: '◧',
    desc: 'A picture next to a headline, a few points and a button. Great for showing what you do.',
    fields: {
      image: { type: 'image', label: 'Picture', aspect: '4:3' },
      side: { type: 'select', label: 'Picture on the', options: ['left', 'right'], optionLabels: ['Left', 'Right'] },
      eyebrow: { type: 'text', label: 'Small text above the headline' },
      headline: { type: 'textarea', label: 'Headline' },
      body: { type: 'textarea', label: 'Text' },
      bullets: { type: 'list', label: 'Bullet points', cols: ['Bullet'] },
      cta: { type: 'text', label: 'Button label (optional)' },
      ctaLink: { type: 'text', label: 'Button goes to' },
      bg: BG,
    },
    defaults: {
      image: '',
      side: 'left',
      eyebrow: 'Why it works',
      headline: 'Built By People Who Actually Run The Ads',
      body: 'Every account gets a senior strategist, a creative team and a weekly plan you can read in two minutes.',
      bullets: 'One point of contact\nWeekly creative testing\nReporting on real profit, not vanity numbers',
      cta: '',
      ctaLink: '#form',
      bg: 'default',
    },
    render: (p, ctx = {}) => {
      const src = safeImg(p.image);
      const pic = src ? `<img class="fb-it-img" src="${esc(src)}" alt="" loading="lazy">` : `<div class="fb-placeholder fb-it-img">🖼 Upload a picture</div>`;
      const bl = lines(p.bullets);
      const copy = `<div>${p.eyebrow ? `<div class="fb-eyebrow"${F(ctx, 'eyebrow')}>${esc(p.eyebrow)}</div>` : ''}<h2${F(ctx, 'headline')}>${esc(p.headline)}</h2>${
        p.body ? `<p class="fb-lead fb-left"${F(ctx, 'body')}>${esc(p.body)}</p>` : ''
      }${bl.length ? `<ul class="fb-checks fb-left">${bl.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}${
        p.cta ? `<div class="fb-cta-row">${btn(p.cta, p.ctaLink, '', F(ctx, 'cta'))}</div>` : ''
      }</div>`;
      return sectionWrap('imageText', `<div class="fb-split fb-it ${p.side === 'right' ? 'fb-it-right' : ''}">${p.side === 'right' ? copy + `<div>${pic}</div>` : `<div>${pic}</div>` + copy}</div>`, { bg: p.bg });
    },
  },

  gallery: {
    name: 'Picture gallery',
    icon: '▦',
    desc: 'A grid of pictures: results, products, events or happy clients.',
    fields: {
      headline: { type: 'text', label: 'Headline (optional)' },
      images: { type: 'gallery', label: 'Pictures' },
      columns: { type: 'select', label: 'Pictures per row', options: ['2', '3', '4'], optionLabels: ['2', '3', '4'] },
      bg: BG,
    },
    defaults: { headline: 'See It For Yourself', images: '', columns: '3', bg: 'alt' },
    render: (p, ctx = {}) => {
      const pics = lines(p.images).map(safeImg).filter(Boolean);
      return sectionWrap(
        'gallery',
        `${p.headline ? `<h2 class="fb-center"${F(ctx, 'headline')}>${esc(p.headline)}</h2>` : ''}${
          pics.length
            ? `<div class="fb-gallery fb-cols-${esc(p.columns || '3')}">${pics.map((src) => `<img src="${esc(src)}" alt="" loading="lazy">`).join('')}</div>`
            : `<div class="fb-placeholder">🖼 Add pictures in the settings on the right</div>`
        }`,
        { bg: p.bg }
      );
    },
  },

  stats: {
    name: 'Big numbers',
    icon: '#',
    desc: 'Big numbers that prove you get results.',
    fields: {
      title: { type: 'text', label: 'Title (optional)' },
      items: { type: 'list', label: 'Numbers', cols: ['Number', 'What it means'] },
      bg: BG,
    },
    defaults: {
      title: '',
      items: '$1B+ | Client revenue managed\n150+ | In-house specialists\n4.2x | Average blended ROAS\n90 days | To measurable lift',
      bg: 'primary',
    },
    render: (p, ctx = {}) =>
      sectionWrap(
        'stats',
        `${p.title ? `<h2 class="fb-center"${F(ctx, 'title')}>${esc(p.title)}</h2>` : ''}<div class="fb-grid fb-grid-4">${lines(p.items)
          .map((l) => {
            const [n, label] = cells(l);
            return `<div class="fb-stat"><div class="fb-stat-n">${esc(n)}</div><div class="fb-stat-l">${esc(label || '')}</div></div>`;
          })
          .join('')}</div>`,
        { bg: p.bg }
      ),
  },

  problem: {
    name: 'Their problems',
    icon: '!',
    desc: 'Describe the problems your visitor has, so they feel understood.',
    fields: {
      headline: { type: 'textarea', label: 'Headline' },
      body: { type: 'textarea', label: 'Intro paragraph' },
      items: { type: 'list', label: 'Problems', cols: ['Problem'] },
      bg: BG,
    },
    defaults: {
      headline: 'Sound Familiar?',
      body: 'Most brands hit a ceiling for the same handful of reasons:',
      items: 'CPMs keep climbing and ROAS keeps sliding\nYour email list is huge but revenue per subscriber is flat\nCreative fatigues in days and nobody has a testing system\nYour last agency sent reports, not results',
      bg: 'default',
    },
    render: (p, ctx = {}) =>
      sectionWrap(
        'problem',
        `<div class="fb-narrow"><h2${F(ctx, 'headline')}>${esc(p.headline)}</h2>${p.body ? `<p${F(ctx, 'body')}>${esc(p.body)}</p>` : ''}<ul class="fb-x">${lines(p.items)
          .map((i) => `<li>${esc(i)}</li>`)
          .join('')}</ul></div>`,
        { bg: p.bg }
      ),
  },

  features: {
    name: 'What you offer',
    icon: '▦',
    desc: 'Cards that explain what you offer.',
    fields: {
      headline: { type: 'textarea', label: 'Headline' },
      sub: { type: 'textarea', label: 'Sub-headline' },
      items: { type: 'list', label: 'Cards', cols: ['Emoji', 'Title', 'Description'] },
      bg: BG,
    },
    defaults: {
      headline: 'Everything You Need To Scale, Under One Roof',
      sub: '',
      items:
        '📈 | Paid Social & Search | Meta, TikTok, Google and YouTube run by media buyers who own the number.\n✉️ | Email & SMS | Flows and campaigns that turn your list into a predictable revenue line.\n🎬 | Creative & UGC | A constant pipeline of new hooks, angles and UGC tested every week.\n🛒 | CRO & Funnels | Landing pages and offers built to convert cold traffic, not win design awards.',
      bg: 'alt',
    },
    render: (p, ctx = {}) =>
      sectionWrap(
        'features',
        `<div class="fb-center"><h2${F(ctx, 'headline')}>${esc(p.headline)}</h2>${p.sub ? `<p class="fb-lead"${F(ctx, 'sub')}>${esc(p.sub)}</p>` : ''}</div><div class="fb-grid fb-grid-auto">${lines(p.items)
          .map((l) => {
            const [icon, title, desc] = cells(l);
            return `<div class="fb-card"><div class="fb-card-icon">${esc(icon)}</div><h3>${esc(title || '')}</h3><p>${esc(desc || '')}</p></div>`;
          })
          .join('')}</div>`,
        { bg: p.bg }
      ),
  },

  steps: {
    name: 'How it works',
    icon: '→',
    desc: 'Explain how it works in 3 simple steps.',
    fields: {
      headline: { type: 'textarea', label: 'Headline' },
      items: { type: 'list', label: 'Steps', cols: ['Step', 'Description'] },
      bg: BG,
    },
    defaults: {
      headline: 'How It Works',
      items:
        'Book your call | Pick a time that works. Takes 30 seconds.\nGet your audit | We tear down your ads, funnel and retention live on the call.\nGet your plan | Leave with a 90-day roadmap, whether you hire us or not.',
      bg: 'default',
    },
    render: (p, ctx = {}) =>
      sectionWrap(
        'steps',
        `<h2 class="fb-center"${F(ctx, 'headline')}>${esc(p.headline)}</h2><div class="fb-grid fb-grid-auto">${lines(p.items)
          .map((l, i) => {
            const [t, d] = cells(l);
            return `<div class="fb-step"><div class="fb-step-n">${i + 1}</div><h3>${esc(t)}</h3><p>${esc(d || '')}</p></div>`;
          })
          .join('')}</div>`,
        { bg: p.bg }
      ),
  },

  caseStudies: {
    name: 'Client results',
    icon: '◆',
    desc: 'Show results you got for clients.',
    fields: {
      headline: { type: 'textarea', label: 'Headline' },
      items: { type: 'list', label: 'Results', cols: ['Result', 'Client', 'What you did'] },
      bg: BG,
    },
    defaults: {
      headline: 'Results We\'ve Driven',
      items:
        '+58.9% | Email revenue, DTC supplement brand | Rebuilt flows and segmentation in 60 days\n+47.8% | SMS revenue, apparel brand | New SMS welcome + winback program\n3.1x | ROAS, home goods brand | Creative testing system + offer restructure',
      bg: 'alt',
    },
    render: (p, ctx = {}) =>
      sectionWrap(
        'cases',
        `<h2 class="fb-center"${F(ctx, 'headline')}>${esc(p.headline)}</h2><div class="fb-grid fb-grid-auto">${lines(p.items)
          .map((l) => {
            const [r, c, d] = cells(l);
            return `<div class="fb-card fb-case"><div class="fb-case-r">${esc(r)}</div><div class="fb-case-c">${esc(c || '')}</div><p>${esc(d || '')}</p></div>`;
          })
          .join('')}</div>`,
        { bg: p.bg }
      ),
  },

  testimonials: {
    name: 'Testimonials',
    icon: '❝',
    desc: 'Quotes from happy clients.',
    fields: {
      headline: { type: 'textarea', label: 'Headline' },
      items: { type: 'list', label: 'Quotes', cols: ['Quote', 'Name', 'Role'] },
      bg: BG,
    },
    defaults: {
      headline: 'What Founders Say',
      items:
        '[Paste a real client quote here.] | [Client Name] | Founder, [Brand]\n[Paste a real client quote here.] | [Client Name] | CMO, [Brand]',
      bg: 'default',
    },
    render: (p, ctx = {}) =>
      sectionWrap(
        'testimonials',
        `<h2 class="fb-center"${F(ctx, 'headline')}>${esc(p.headline)}</h2><div class="fb-grid fb-grid-auto">${lines(p.items)
          .map((l) => {
            const [q, n, r] = cells(l);
            return `<figure class="fb-card fb-quote"><div class="fb-stars">★★★★★</div><blockquote>“${esc(q)}”</blockquote><figcaption><strong>${esc(n || '')}</strong>${r ? `<span>${esc(r)}</span>` : ''}</figcaption></figure>`;
          })
          .join('')}</div>`,
        { bg: p.bg }
      ),
  },

  offer: {
    name: 'What they get',
    icon: '$',
    desc: 'List everything they get and what it is worth.',
    fields: {
      headline: { type: 'textarea', label: 'Headline' },
      items: { type: 'list', label: 'What they get', cols: ['Item', 'Value'] },
      totalLabel: { type: 'text', label: 'Total value label' },
      price: { type: 'text', label: 'Your price (e.g. FREE, $997)' },
      cta: { type: 'text', label: 'Button label' },
      ctaLink: { type: 'text', label: 'Button goes to' },
      bg: BG,
    },
    defaults: {
      headline: 'Here\'s Everything You Get On The Call',
      items: 'Full paid ads account audit | $2,500\nEmail & SMS flow teardown | $1,500\nCreative angle & hook bank | $1,000\n90-day growth roadmap | $2,000',
      totalLabel: 'Total value',
      price: 'FREE',
      cta: 'Claim My Free Audit',
      ctaLink: '#form',
      bg: 'alt',
    },
    render: (p, ctx = {}) => {
      const rows = lines(p.items).map(cells);
      const total = rows.reduce((s, [, v]) => s + (parseFloat(String(v || '').replace(/[^0-9.]/g, '')) || 0), 0);
      return sectionWrap(
        'offer',
        `<div class="fb-offer-box"><h2 class="fb-center"${F(ctx, 'headline')}>${esc(p.headline)}</h2><ul class="fb-stack">${rows
          .map(([i, v]) => `<li><span>✔ ${esc(i)}</span><span class="fb-val">${esc(v || '')}</span></li>`)
          .join('')}</ul>${
          total
            ? `<div class="fb-total"><span>${esc(p.totalLabel || 'Total value')}</span><s>$${total.toLocaleString('en-US')}</s></div>`
            : ''
        }<div class="fb-price"${F(ctx, 'price')}>${esc(p.price)}</div>${p.cta ? `<div class="fb-cta-row">${btn(p.cta, p.ctaLink, 'fb-btn-lg', F(ctx, 'cta'))}</div>` : ''}</div>`,
        { bg: p.bg }
      );
    },
  },

  form: {
    name: 'Sign-up form',
    icon: '✎',
    desc: 'Where visitors type their name, email and phone. This is how you get leads.',
    fields: {
      headline: { type: 'textarea', label: 'Headline' },
      sub: { type: 'textarea', label: 'Sub-headline' },
      fields: {
        type: 'list',
        label: 'Questions on the form',
        cols: ['Question', { label: 'Answer type', options: ['text', 'email', 'phone', 'select', 'textarea'] }, 'GoHighLevel field', 'Choices (comma separated)'],
      },
      button: { type: 'text', label: 'Submit label' },
      webhook: { type: 'text', label: 'Where answers go: GoHighLevel webhook link', help: 'In GoHighLevel: Automation → Workflows → new workflow → trigger "Inbound Webhook" → copy the link here.' },
      redirect: { type: 'text', label: 'Page to show after submit (optional)', help: 'Leave empty to go to the next page of this funnel.' },
      ghlEmbed: { type: 'textarea', label: 'Advanced: paste a GoHighLevel form embed instead', help: 'Only if you built the form inside GoHighLevel. This replaces the questions above.' },
      consent: { type: 'textarea', label: 'Text-message permission wording', help: 'Phone carriers require this before you can text leads.' },
      bg: BG,
    },
    defaults: {
      headline: 'Claim Your Free Strategy Session',
      sub: 'Takes 60 seconds. We review every application personally.',
      fields:
        'First name | text | first_name\nEmail | email | email\nPhone | phone | phone\nWebsite | text | website\nMonthly revenue | select | monthly_revenue | Under $50k, $50k–$250k, $250k–$1M, $1M+',
      button: 'Continue →',
      webhook: '',
      redirect: '',
      ghlEmbed: '',
      consent:
        'By submitting, you agree to receive calls and texts (including automated) from us at the number provided. Msg & data rates may apply. Reply STOP to opt out.',
      bg: 'default',
    },
    render: (p, ctx = {}) => {
      const inner = p.ghlEmbed && p.ghlEmbed.trim()
        ? // A native GHL form embed is the user's own code; it is inserted as-is.
          `<div class="fb-ghl-embed">${p.ghlEmbed}</div>`
        : `<form class="fb-form" data-webhook="${esc(safeUrl(p.webhook))}" data-redirect="${esc(safeUrl(p.redirect) || ctx.nextUrl || '')}" data-step="${esc(ctx.stepName || '')}" novalidate>
            ${lines(p.fields)
              .map((l) => {
                const [label, type = 'text', key, opts] = cells(l);
                const name = esc(key || label.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
                const req = 'required';
                if (type === 'select') {
                  return `<label><span>${esc(label)}</span><select name="${name}" ${req}><option value="">Select…</option>${(opts || '')
                    .split(',')
                    .map((o) => o.trim())
                    .filter(Boolean)
                    .map((o) => `<option>${esc(o)}</option>`)
                    .join('')}</select></label>`;
                }
                if (type === 'textarea') return `<label><span>${esc(label)}</span><textarea name="${name}" rows="3" ${req}></textarea></label>`;
                const t = type === 'phone' ? 'tel' : type === 'email' ? 'email' : 'text';
                return `<label><span>${esc(label)}</span><input type="${t}" name="${name}" ${req}${t === 'tel' ? ' autocomplete="tel"' : t === 'email' ? ' autocomplete="email"' : ''}></label>`;
              })
              .join('')}
            <button class="fb-btn fb-btn-lg fb-btn-block" type="submit"><span${F(ctx, 'button')}>${esc(p.button || 'Submit')}</span></button>
            <div class="fb-form-msg" role="status"></div>
            ${p.consent ? `<p class="fb-consent">${esc(p.consent)}</p>` : ''}
          </form>`;
      return sectionWrap(
        'form',
        `<div class="fb-form-box"><h2 class="fb-center"${F(ctx, 'headline')}>${esc(p.headline)}</h2>${p.sub ? `<p class="fb-center fb-muted"${F(ctx, 'sub')}>${esc(p.sub)}</p>` : ''}${inner}</div>`,
        { bg: p.bg, id: 'form' }
      );
    },
  },

  calendar: {
    name: 'Booking calendar',
    icon: '📅',
    desc: 'Lets visitors pick a time for a call (your GoHighLevel calendar).',
    fields: {
      headline: { type: 'textarea', label: 'Headline' },
      sub: { type: 'textarea', label: 'Sub-headline' },
      url: { type: 'text', label: 'GoHighLevel calendar link', help: 'In GoHighLevel: Calendars → your calendar → Share → copy the booking link.' },
      bg: BG,
    },
    defaults: {
      headline: 'Step 2: Pick A Time For Your Call',
      sub: 'Your application isn\'t complete until you book. Choose the slot that works best.',
      url: '',
      bg: 'default',
    },
    render: (p, ctx = {}) => {
      const src = safeUrl(p.url);
      return sectionWrap(
        'calendar',
        `<div class="fb-center"><h2${F(ctx, 'headline')}>${esc(p.headline)}</h2>${p.sub ? `<p class="fb-lead"${F(ctx, 'sub')}>${esc(p.sub)}</p>` : ''}</div><div class="fb-cal">${
          src
            ? `<iframe src="${esc(src)}" scrolling="no" title="Book a call" loading="lazy"></iframe><script src="https://link.msgsndr.com/js/form_embed.js"></script>`
            : `<div class="fb-placeholder">📅 Paste your GHL calendar widget URL<br><small>Calendars → Calendar Settings → Share → Embed code → copy the iframe src</small></div>`
        }</div>`,
        { bg: p.bg, id: 'calendar' }
      );
    },
  },

  checkout: {
    name: 'Checkout',
    icon: '💳',
    desc: 'Take payment with GoHighLevel. Paste your payment link or order form.',
    fields: {
      headline: { type: 'textarea', label: 'Headline' },
      product: { type: 'text', label: 'What they are buying' },
      price: { type: 'text', label: 'Price' },
      includes: { type: 'list', label: 'Included', cols: ['Item'] },
      button: { type: 'text', label: 'Button label' },
      payLink: { type: 'text', label: 'GoHighLevel payment link', help: 'In GoHighLevel: Payments → Payment Links → copy the link.' },
      ghlEmbed: { type: 'textarea', label: 'Advanced: paste a GoHighLevel order form instead', help: 'From an Order Form step in GoHighLevel. Replaces the button.' },
      note: { type: 'text', label: 'Small text under the button' },
      bg: BG,
    },
    defaults: {
      headline: 'Join Today',
      product: '90-Day Accelerator',
      price: '$997',
      includes: 'Instant access to the course portal\nWeekly live coaching calls\nDone-for-you templates',
      button: 'Get Instant Access →',
      payLink: '',
      ghlEmbed: '',
      note: '🔒 Secure checkout. You get your login by email right after you pay.',
      bg: 'alt',
    },
    render: (p, ctx = {}) => {
      const link = safeUrl(p.payLink);
      const pay = p.ghlEmbed && p.ghlEmbed.trim()
        ? // A native GHL order form embed is the user's own code; inserted as-is.
          `<div class="fb-ghl-embed">${p.ghlEmbed}</div>`
        : `${btn(p.button || 'Buy now', link || '#', 'fb-btn-lg fb-btn-block', F(ctx, 'button'))}${link ? '' : ctx.editor ? '<div class="fb-note">Add your GoHighLevel payment link in the settings on the right.</div>' : ''}`;
      return sectionWrap(
        'checkout',
        `<div class="fb-form-box fb-checkout"><h2 class="fb-center"${F(ctx, 'headline')}>${esc(p.headline)}</h2>
          <div class="fb-co-row"><span${F(ctx, 'product')}>${esc(p.product)}</span><strong${F(ctx, 'price')}>${esc(p.price)}</strong></div>
          <ul class="fb-checks">${lines(p.includes).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
          ${pay}
          ${p.note ? `<div class="fb-note fb-center"${F(ctx, 'note')}>${esc(p.note)}</div>` : ''}</div>`,
        { bg: p.bg, id: 'checkout' }
      );
    },
  },

  guarantee: {
    name: 'Guarantee',
    icon: '🛡',
    desc: 'A promise that lowers their risk.',
    fields: {
      headline: { type: 'text', label: 'Headline' },
      body: { type: 'textarea', label: 'Body' },
      bg: BG,
    },
    defaults: {
      headline: 'The "Worth Your Time" Guarantee',
      body: 'If you don\'t walk away from the call with at least 3 things you can implement this week, tell us and we\'ll send you a $100 gift card. No hard feelings.',
      bg: 'default',
    },
    render: (p, ctx = {}) =>
      sectionWrap('guarantee', `<div class="fb-guarantee"><div class="fb-seal">🛡</div><div><h3${F(ctx, 'headline')}>${esc(p.headline)}</h3><p${F(ctx, 'body')}>${esc(p.body)}</p></div></div>`, { bg: p.bg }),
  },

  faq: {
    name: 'FAQ',
    icon: '?',
    desc: 'Answer common questions before they ask.',
    fields: {
      headline: { type: 'text', label: 'Headline' },
      items: { type: 'list', label: 'Questions', cols: ['Question', 'Answer'] },
      bg: BG,
    },
    defaults: {
      headline: 'Frequently Asked Questions',
      items:
        'Is the call really free? | Yes. It\'s a working session, not a pitch deck.\nWho is this for? | Brands with product-market fit that want to scale profitably.\nWhat do I need to prepare? | Ad account and store access help, but aren\'t required.',
      bg: 'alt',
    },
    render: (p, ctx = {}) =>
      sectionWrap(
        'faq',
        `<div class="fb-narrow"><h2 class="fb-center"${F(ctx, 'headline')}>${esc(p.headline)}</h2>${lines(p.items)
          .map((l) => {
            const [q, a] = cells(l);
            return `<details class="fb-faq"><summary>${esc(q)}</summary><p>${esc(a || '')}</p></details>`;
          })
          .join('')}</div>`,
        { bg: p.bg }
      ),
  },

  cta: {
    name: 'Final button',
    icon: '➜',
    desc: 'A last push with a big button at the bottom.',
    fields: {
      headline: { type: 'textarea', label: 'Headline' },
      sub: { type: 'textarea', label: 'Sub-headline' },
      cta: { type: 'text', label: 'Button label' },
      ctaLink: { type: 'text', label: 'Button goes to' },
      bg: BG,
    },
    defaults: {
      headline: 'Ready To Stop Guessing And Start Scaling?',
      sub: 'Spots are limited because every account gets a senior strategist.',
      cta: 'Book My Free Call',
      ctaLink: '#form',
      bg: 'dark',
    },
    render: (p, ctx = {}) =>
      sectionWrap(
        'cta',
        `<div class="fb-center"><h2${F(ctx, 'headline')}>${esc(p.headline)}</h2>${p.sub ? `<p class="fb-lead"${F(ctx, 'sub')}>${esc(p.sub)}</p>` : ''}${
          p.cta ? `<div class="fb-cta-row">${btn(p.cta, p.ctaLink, 'fb-btn-lg', F(ctx, 'cta'))}</div>` : ''
        }</div>`,
        { bg: p.bg }
      ),
  },

  thankyou: {
    name: 'Thank you',
    icon: '✓',
    desc: 'Tells people they are signed up and what happens next.',
    fields: {
      headline: { type: 'textarea', label: 'Headline' },
      sub: { type: 'textarea', label: 'Sub-headline' },
      items: { type: 'list', label: 'Next steps', cols: ['Step'] },
      bg: BG,
    },
    defaults: {
      headline: 'You\'re Booked! Here\'s What Happens Next',
      sub: 'Check your inbox and phone. We just sent your confirmation.',
      items: 'Add the call to your calendar\nReply "YES" to the text so we know you got it\nWatch the 3-minute prep video below\nHave your ad account and Shopify login handy',
      bg: 'default',
    },
    render: (p, ctx = {}) =>
      sectionWrap(
        'thankyou',
        `<div class="fb-narrow fb-center"><div class="fb-check-big">✓</div><h1${F(ctx, 'headline')}>${esc(p.headline)}</h1>${p.sub ? `<p class="fb-lead"${F(ctx, 'sub')}>${esc(p.sub)}</p>` : ''}<ol class="fb-todo">${lines(p.items)
          .map((i) => `<li>${esc(i)}</li>`)
          .join('')}</ol></div>`,
        { bg: p.bg }
      ),
  },

  text: {
    name: 'Text',
    icon: '¶',
    desc: 'A plain block of text, like a story from the founder.',
    fields: {
      headline: { type: 'text', label: 'Headline' },
      body: { type: 'textarea', label: 'Body (blank line = new paragraph)' },
      bg: BG,
    },
    defaults: { headline: 'A Note From Our Founder', body: 'Write a short, personal story here.', bg: 'default' },
    render: (p, ctx = {}) =>
      sectionWrap(
        'text',
        `<div class="fb-narrow">${p.headline ? `<h2${F(ctx, 'headline')}>${esc(p.headline)}</h2>` : ''}${String(p.body || '')
          .split(/\n\s*\n/)
          .map((para) => `<p>${esc(para.trim()).replace(/\n/g, '<br>')}</p>`)
          .join('')}</div>`,
        { bg: p.bg }
      ),
  },

  footer: {
    name: 'Footer',
    icon: '▁',
    desc: 'Copyright and privacy links at the bottom. Ad platforms require these.',
    fields: {
      text: { type: 'text', label: 'Copyright text' },
      links: { type: 'list', label: 'Links', cols: ['Text', 'Link'] },
      disclaimer: { type: 'textarea', label: 'Disclaimer' },
    },
    defaults: {
      text: '© 2026 Your Company. All rights reserved.',
      links: 'Privacy Policy | /privacy\nTerms | /terms',
      disclaimer: 'Results vary. Case studies reflect specific clients and are not a guarantee of future performance. This site is not part of or endorsed by Meta, Google or TikTok.',
    },
    render: (p, ctx = {}) =>
      `<footer class="fb-s fb-footer"><div class="fb-wrap fb-center"><div class="fb-footer-links">${lines(p.links)
        .map((l) => {
          const [t, u] = cells(l);
          return `<a href="${esc(safeUrl(u) || '#')}">${esc(t)}</a>`;
        })
        .join('')}</div><div${F(ctx, 'text')}>${esc(p.text)}</div>${p.disclaimer ? `<p class="fb-disclaimer">${esc(p.disclaimer)}</p>` : ''}</div></footer>`,
  },
};

export function makeSection(type, overrides = {}) {
  const def = SECTIONS[type];
  if (!def) throw new Error(`Unknown section type: ${type}`);
  return { id: uid(), type, props: { ...def.defaults, ...overrides } };
}

let counter = 0;
export function uid() {
  counter += 1;
  return `s${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
