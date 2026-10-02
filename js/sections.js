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

const btn = (label, href, cls = '') =>
  `<a class="fb-btn ${cls}" href="${esc(safeUrl(href) || '#')}">${esc(label)}</a>`;

const sectionWrap = (type, inner, { bg = '', id = '' } = {}) =>
  `<section class="fb-s fb-${type}${bg ? ' fb-bg-' + bg : ''}"${id ? ` id="${esc(id)}"` : ''}><div class="fb-wrap">${inner}</div></section>`;

const BG = { type: 'select', label: 'Background', options: ['default', 'alt', 'dark', 'primary'] };

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
    name: 'Urgency Bar',
    icon: '⚡',
    fields: {
      text: { type: 'text', label: 'Text' },
      deadline: { type: 'text', label: 'Countdown deadline (YYYY-MM-DD HH:MM, optional)' },
    },
    defaults: { text: 'Only 4 onboarding spots left this month', deadline: '' },
    render: (p) =>
      `<div class="fb-s fb-announcement"><div class="fb-wrap">${esc(p.text)}${
        p.deadline ? ` <span class="fb-countdown" data-deadline="${esc(p.deadline)}">--:--:--</span>` : ''
      }</div></div>`,
  },

  header: {
    name: 'Header / Logo',
    icon: '▭',
    fields: {
      logo: { type: 'text', label: 'Logo text' },
      logoUrl: { type: 'text', label: 'Logo image URL (optional)' },
      cta: { type: 'text', label: 'Button label' },
      ctaLink: { type: 'text', label: 'Button link' },
    },
    defaults: { logo: 'YOUR BRAND', logoUrl: '', cta: 'Book a Call', ctaLink: '#form' },
    render: (p) =>
      `<header class="fb-s fb-header"><div class="fb-wrap fb-row">${
        safeUrl(p.logoUrl)
          ? `<img class="fb-logo-img" src="${esc(safeUrl(p.logoUrl))}" alt="${esc(p.logo)}">`
          : `<div class="fb-logo">${esc(p.logo)}</div>`
      }${p.cta ? btn(p.cta, p.ctaLink, 'fb-btn-sm') : ''}</div></header>`,
  },

  hero: {
    name: 'Hero',
    icon: '★',
    fields: {
      eyebrow: { type: 'text', label: 'Eyebrow (small text above headline)' },
      headline: { type: 'textarea', label: 'Headline' },
      highlight: { type: 'text', label: 'Words to highlight in headline' },
      sub: { type: 'textarea', label: 'Sub-headline' },
      bullets: { type: 'textarea', label: 'Bullets (one per line)' },
      cta: { type: 'text', label: 'Button label' },
      ctaLink: { type: 'text', label: 'Button link' },
      note: { type: 'text', label: 'Under-button note' },
      image: { type: 'text', label: 'Side image URL (optional)' },
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
      bg: 'dark',
    },
    render: (p) => {
      let h = esc(p.headline);
      if (p.highlight && p.headline.includes(p.highlight)) {
        h = h.replace(esc(p.highlight), `<span class="fb-hl">${esc(p.highlight)}</span>`);
      }
      const bl = lines(p.bullets);
      const img = safeUrl(p.image);
      const copy = `${p.eyebrow ? `<div class="fb-eyebrow">${esc(p.eyebrow)}</div>` : ''}
        <h1>${h.replace(/\n/g, '<br>')}</h1>
        ${p.sub ? `<p class="fb-lead">${esc(p.sub)}</p>` : ''}
        ${bl.length ? `<ul class="fb-checks">${bl.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
        ${p.cta ? `<div class="fb-cta-row">${btn(p.cta, p.ctaLink, 'fb-btn-lg')}</div>` : ''}
        ${p.note ? `<div class="fb-note">${esc(p.note)}</div>` : ''}`;
      return sectionWrap(
        'hero',
        img
          ? `<div class="fb-split"><div>${copy}</div><div><img class="fb-hero-img" src="${esc(img)}" alt=""></div></div>`
          : `<div class="fb-center">${copy}</div>`,
        { bg: p.bg }
      );
    },
  },

  video: {
    name: 'Video (VSL)',
    icon: '▶',
    fields: {
      headline: { type: 'textarea', label: 'Headline above video' },
      url: { type: 'text', label: 'Video URL (YouTube, Vimeo, Loom, Wistia)' },
      caption: { type: 'text', label: 'Caption under video' },
      cta: { type: 'text', label: 'Button label (optional)' },
      ctaLink: { type: 'text', label: 'Button link' },
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
    render: (p) => {
      const src = videoEmbedUrl(p.url);
      return sectionWrap(
        'video',
        `<div class="fb-center">
          ${p.headline ? `<h2>${esc(p.headline)}</h2>` : ''}
          <div class="fb-video">${
            src
              ? `<iframe src="${esc(src)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy" title="Video"></iframe>`
              : `<div class="fb-placeholder">▶ Paste a YouTube / Vimeo / Loom / Wistia link</div>`
          }</div>
          ${p.caption ? `<div class="fb-note">${esc(p.caption)}</div>` : ''}
          ${p.cta ? `<div class="fb-cta-row">${btn(p.cta, p.ctaLink, 'fb-btn-lg')}</div>` : ''}
        </div>`,
        { bg: p.bg }
      );
    },
  },

  logos: {
    name: 'Logo Bar / As Seen In',
    icon: '◎',
    fields: {
      title: { type: 'text', label: 'Title' },
      items: { type: 'textarea', label: 'Brand names or image URLs (one per line)' },
      bg: BG,
    },
    defaults: { title: 'Trusted by fast-growing brands', items: 'Brand One\nBrand Two\nBrand Three\nBrand Four\nBrand Five', bg: 'alt' },
    render: (p) =>
      sectionWrap(
        'logos',
        `${p.title ? `<div class="fb-eyebrow fb-center">${esc(p.title)}</div>` : ''}<div class="fb-logo-row">${lines(p.items)
          .map((i) =>
            safeUrl(i) && /^https?:/.test(i)
              ? `<img src="${esc(i)}" alt="" loading="lazy">`
              : `<span>${esc(i)}</span>`
          )
          .join('')}</div>`,
        { bg: p.bg }
      ),
  },

  stats: {
    name: 'Stats / Proof Numbers',
    icon: '#',
    fields: {
      title: { type: 'text', label: 'Title (optional)' },
      items: { type: 'textarea', label: 'Stats: "number | label" per line' },
      bg: BG,
    },
    defaults: {
      title: '',
      items: '$1B+ | Client revenue managed\n150+ | In-house specialists\n4.2x | Average blended ROAS\n90 days | To measurable lift',
      bg: 'primary',
    },
    render: (p) =>
      sectionWrap(
        'stats',
        `${p.title ? `<h2 class="fb-center">${esc(p.title)}</h2>` : ''}<div class="fb-grid fb-grid-4">${lines(p.items)
          .map((l) => {
            const [n, label] = cells(l);
            return `<div class="fb-stat"><div class="fb-stat-n">${esc(n)}</div><div class="fb-stat-l">${esc(label || '')}</div></div>`;
          })
          .join('')}</div>`,
        { bg: p.bg }
      ),
  },

  problem: {
    name: 'Problem / Agitate',
    icon: '!',
    fields: {
      headline: { type: 'textarea', label: 'Headline' },
      body: { type: 'textarea', label: 'Intro paragraph' },
      items: { type: 'textarea', label: 'Pain points (one per line)' },
      bg: BG,
    },
    defaults: {
      headline: 'Sound Familiar?',
      body: 'Most brands hit a ceiling for the same handful of reasons:',
      items: 'CPMs keep climbing and ROAS keeps sliding\nYour email list is huge but revenue per subscriber is flat\nCreative fatigues in days and nobody has a testing system\nYour last agency sent reports, not results',
      bg: 'default',
    },
    render: (p) =>
      sectionWrap(
        'problem',
        `<div class="fb-narrow"><h2>${esc(p.headline)}</h2>${p.body ? `<p>${esc(p.body)}</p>` : ''}<ul class="fb-x">${lines(p.items)
          .map((i) => `<li>${esc(i)}</li>`)
          .join('')}</ul></div>`,
        { bg: p.bg }
      ),
  },

  features: {
    name: 'Benefits / Services Grid',
    icon: '▦',
    fields: {
      headline: { type: 'textarea', label: 'Headline' },
      sub: { type: 'textarea', label: 'Sub-headline' },
      items: { type: 'textarea', label: 'Cards: "icon | title | description" per line' },
      bg: BG,
    },
    defaults: {
      headline: 'Everything You Need To Scale, Under One Roof',
      sub: '',
      items:
        '📈 | Paid Social & Search | Meta, TikTok, Google and YouTube run by media buyers who own the number.\n✉️ | Email & SMS | Flows and campaigns that turn your list into a predictable revenue line.\n🎬 | Creative & UGC | A constant pipeline of new hooks, angles and UGC tested every week.\n🛒 | CRO & Funnels | Landing pages and offers built to convert cold traffic, not win design awards.',
      bg: 'alt',
    },
    render: (p) =>
      sectionWrap(
        'features',
        `<div class="fb-center"><h2>${esc(p.headline)}</h2>${p.sub ? `<p class="fb-lead">${esc(p.sub)}</p>` : ''}</div><div class="fb-grid fb-grid-auto">${lines(p.items)
          .map((l) => {
            const [icon, title, desc] = cells(l);
            return `<div class="fb-card"><div class="fb-card-icon">${esc(icon)}</div><h3>${esc(title || '')}</h3><p>${esc(desc || '')}</p></div>`;
          })
          .join('')}</div>`,
        { bg: p.bg }
      ),
  },

  steps: {
    name: 'Process Steps',
    icon: '→',
    fields: {
      headline: { type: 'textarea', label: 'Headline' },
      items: { type: 'textarea', label: 'Steps: "title | description" per line' },
      bg: BG,
    },
    defaults: {
      headline: 'How It Works',
      items:
        'Book your call | Pick a time that works. Takes 30 seconds.\nGet your audit | We tear down your ads, funnel and retention live on the call.\nGet your plan | Leave with a 90-day roadmap, whether you hire us or not.',
      bg: 'default',
    },
    render: (p) =>
      sectionWrap(
        'steps',
        `<h2 class="fb-center">${esc(p.headline)}</h2><div class="fb-grid fb-grid-auto">${lines(p.items)
          .map((l, i) => {
            const [t, d] = cells(l);
            return `<div class="fb-step"><div class="fb-step-n">${i + 1}</div><h3>${esc(t)}</h3><p>${esc(d || '')}</p></div>`;
          })
          .join('')}</div>`,
        { bg: p.bg }
      ),
  },

  caseStudies: {
    name: 'Case Studies',
    icon: '◆',
    fields: {
      headline: { type: 'textarea', label: 'Headline' },
      items: { type: 'textarea', label: 'Cases: "big result | client/niche | what we did" per line' },
      bg: BG,
    },
    defaults: {
      headline: 'Results We\'ve Driven',
      items:
        '+58.9% | Email revenue, DTC supplement brand | Rebuilt flows and segmentation in 60 days\n+47.8% | SMS revenue, apparel brand | New SMS welcome + winback program\n3.1x | ROAS, home goods brand | Creative testing system + offer restructure',
      bg: 'alt',
    },
    render: (p) =>
      sectionWrap(
        'cases',
        `<h2 class="fb-center">${esc(p.headline)}</h2><div class="fb-grid fb-grid-auto">${lines(p.items)
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
    fields: {
      headline: { type: 'textarea', label: 'Headline' },
      items: { type: 'textarea', label: 'Testimonials: "quote | name | role" per line' },
      bg: BG,
    },
    defaults: {
      headline: 'What Founders Say',
      items:
        '[Paste a real client quote here.] | [Client Name] | Founder, [Brand]\n[Paste a real client quote here.] | [Client Name] | CMO, [Brand]',
      bg: 'default',
    },
    render: (p) =>
      sectionWrap(
        'testimonials',
        `<h2 class="fb-center">${esc(p.headline)}</h2><div class="fb-grid fb-grid-auto">${lines(p.items)
          .map((l) => {
            const [q, n, r] = cells(l);
            return `<figure class="fb-card fb-quote"><div class="fb-stars">★★★★★</div><blockquote>“${esc(q)}”</blockquote><figcaption><strong>${esc(n || '')}</strong>${r ? `<span>${esc(r)}</span>` : ''}</figcaption></figure>`;
          })
          .join('')}</div>`,
        { bg: p.bg }
      ),
  },

  offer: {
    name: 'Offer Stack',
    icon: '$',
    fields: {
      headline: { type: 'textarea', label: 'Headline' },
      items: { type: 'textarea', label: 'Stack items: "item | value" per line' },
      totalLabel: { type: 'text', label: 'Total value label' },
      price: { type: 'text', label: 'Your price (e.g. FREE, $997)' },
      cta: { type: 'text', label: 'Button label' },
      ctaLink: { type: 'text', label: 'Button link' },
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
    render: (p) => {
      const rows = lines(p.items).map(cells);
      const total = rows.reduce((s, [, v]) => s + (parseFloat(String(v || '').replace(/[^0-9.]/g, '')) || 0), 0);
      return sectionWrap(
        'offer',
        `<div class="fb-offer-box"><h2 class="fb-center">${esc(p.headline)}</h2><ul class="fb-stack">${rows
          .map(([i, v]) => `<li><span>✔ ${esc(i)}</span><span class="fb-val">${esc(v || '')}</span></li>`)
          .join('')}</ul>${
          total
            ? `<div class="fb-total"><span>${esc(p.totalLabel || 'Total value')}</span><s>$${total.toLocaleString('en-US')}</s></div>`
            : ''
        }<div class="fb-price">${esc(p.price)}</div>${p.cta ? `<div class="fb-cta-row">${btn(p.cta, p.ctaLink, 'fb-btn-lg')}</div>` : ''}</div>`,
        { bg: p.bg }
      );
    },
  },

  form: {
    name: 'Opt-in / Application Form',
    icon: '✎',
    fields: {
      headline: { type: 'textarea', label: 'Headline' },
      sub: { type: 'textarea', label: 'Sub-headline' },
      fields: {
        type: 'textarea',
        label: 'Fields: "label | type | ghl_key | options" (types: text, email, phone, select, textarea)',
      },
      button: { type: 'text', label: 'Submit label' },
      webhook: { type: 'text', label: 'GHL Inbound Webhook URL (Workflow trigger)' },
      redirect: { type: 'text', label: 'Redirect after submit (next step URL)' },
      ghlEmbed: { type: 'textarea', label: 'OR paste a native GHL form embed code (overrides fields)' },
      consent: { type: 'textarea', label: 'SMS consent text (A2P 10DLC)' },
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
            <button class="fb-btn fb-btn-lg fb-btn-block" type="submit">${esc(p.button || 'Submit')}</button>
            <div class="fb-form-msg" role="status"></div>
            ${p.consent ? `<p class="fb-consent">${esc(p.consent)}</p>` : ''}
          </form>`;
      return sectionWrap(
        'form',
        `<div class="fb-form-box"><h2 class="fb-center">${esc(p.headline)}</h2>${p.sub ? `<p class="fb-center fb-muted">${esc(p.sub)}</p>` : ''}${inner}</div>`,
        { bg: p.bg, id: 'form' }
      );
    },
  },

  calendar: {
    name: 'GHL Calendar Booking',
    icon: '📅',
    fields: {
      headline: { type: 'textarea', label: 'Headline' },
      sub: { type: 'textarea', label: 'Sub-headline' },
      url: { type: 'text', label: 'GHL booking widget URL (…/widget/booking/ID)' },
      bg: BG,
    },
    defaults: {
      headline: 'Step 2: Pick A Time For Your Call',
      sub: 'Your application isn\'t complete until you book. Choose the slot that works best.',
      url: '',
      bg: 'default',
    },
    render: (p) => {
      const src = safeUrl(p.url);
      return sectionWrap(
        'calendar',
        `<div class="fb-center"><h2>${esc(p.headline)}</h2>${p.sub ? `<p class="fb-lead">${esc(p.sub)}</p>` : ''}</div><div class="fb-cal">${
          src
            ? `<iframe src="${esc(src)}" scrolling="no" title="Book a call" loading="lazy"></iframe><script src="https://link.msgsndr.com/js/form_embed.js"></script>`
            : `<div class="fb-placeholder">📅 Paste your GHL calendar widget URL<br><small>Calendars → Calendar Settings → Share → Embed code → copy the iframe src</small></div>`
        }</div>`,
        { bg: p.bg, id: 'calendar' }
      );
    },
  },

  guarantee: {
    name: 'Guarantee',
    icon: '🛡',
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
    render: (p) =>
      sectionWrap('guarantee', `<div class="fb-guarantee"><div class="fb-seal">🛡</div><div><h3>${esc(p.headline)}</h3><p>${esc(p.body)}</p></div></div>`, { bg: p.bg }),
  },

  faq: {
    name: 'FAQ',
    icon: '?',
    fields: {
      headline: { type: 'text', label: 'Headline' },
      items: { type: 'textarea', label: 'FAQs: "question | answer" per line' },
      bg: BG,
    },
    defaults: {
      headline: 'Frequently Asked Questions',
      items:
        'Is the call really free? | Yes. It\'s a working session, not a pitch deck.\nWho is this for? | Brands with product-market fit that want to scale profitably.\nWhat do I need to prepare? | Ad account and store access help, but aren\'t required.',
      bg: 'alt',
    },
    render: (p) =>
      sectionWrap(
        'faq',
        `<div class="fb-narrow"><h2 class="fb-center">${esc(p.headline)}</h2>${lines(p.items)
          .map((l) => {
            const [q, a] = cells(l);
            return `<details class="fb-faq"><summary>${esc(q)}</summary><p>${esc(a || '')}</p></details>`;
          })
          .join('')}</div>`,
        { bg: p.bg }
      ),
  },

  cta: {
    name: 'Final CTA',
    icon: '➜',
    fields: {
      headline: { type: 'textarea', label: 'Headline' },
      sub: { type: 'textarea', label: 'Sub-headline' },
      cta: { type: 'text', label: 'Button label' },
      ctaLink: { type: 'text', label: 'Button link' },
      bg: BG,
    },
    defaults: {
      headline: 'Ready To Stop Guessing And Start Scaling?',
      sub: 'Spots are limited because every account gets a senior strategist.',
      cta: 'Book My Free Call',
      ctaLink: '#form',
      bg: 'dark',
    },
    render: (p) =>
      sectionWrap(
        'cta',
        `<div class="fb-center"><h2>${esc(p.headline)}</h2>${p.sub ? `<p class="fb-lead">${esc(p.sub)}</p>` : ''}${
          p.cta ? `<div class="fb-cta-row">${btn(p.cta, p.ctaLink, 'fb-btn-lg')}</div>` : ''
        }</div>`,
        { bg: p.bg }
      ),
  },

  thankyou: {
    name: 'Confirmation / Next Steps',
    icon: '✓',
    fields: {
      headline: { type: 'textarea', label: 'Headline' },
      sub: { type: 'textarea', label: 'Sub-headline' },
      items: { type: 'textarea', label: 'Checklist (one per line)' },
      bg: BG,
    },
    defaults: {
      headline: 'You\'re Booked! Here\'s What Happens Next',
      sub: 'Check your inbox and phone. We just sent your confirmation.',
      items: 'Add the call to your calendar\nReply "YES" to the text so we know you got it\nWatch the 3-minute prep video below\nHave your ad account and Shopify login handy',
      bg: 'default',
    },
    render: (p) =>
      sectionWrap(
        'thankyou',
        `<div class="fb-narrow fb-center"><div class="fb-check-big">✓</div><h1>${esc(p.headline)}</h1>${p.sub ? `<p class="fb-lead">${esc(p.sub)}</p>` : ''}<ol class="fb-todo">${lines(p.items)
          .map((i) => `<li>${esc(i)}</li>`)
          .join('')}</ol></div>`,
        { bg: p.bg }
      ),
  },

  text: {
    name: 'Text Block',
    icon: '¶',
    fields: {
      headline: { type: 'text', label: 'Headline' },
      body: { type: 'textarea', label: 'Body (blank line = new paragraph)' },
      bg: BG,
    },
    defaults: { headline: 'A Note From Our Founder', body: 'Write a short, personal story here.', bg: 'default' },
    render: (p) =>
      sectionWrap(
        'text',
        `<div class="fb-narrow">${p.headline ? `<h2>${esc(p.headline)}</h2>` : ''}${String(p.body || '')
          .split(/\n\s*\n/)
          .map((para) => `<p>${esc(para.trim()).replace(/\n/g, '<br>')}</p>`)
          .join('')}</div>`,
        { bg: p.bg }
      ),
  },

  footer: {
    name: 'Footer',
    icon: '▁',
    fields: {
      text: { type: 'text', label: 'Copyright text' },
      links: { type: 'textarea', label: 'Links: "label | url" per line' },
      disclaimer: { type: 'textarea', label: 'Disclaimer' },
    },
    defaults: {
      text: '© 2026 Your Company. All rights reserved.',
      links: 'Privacy Policy | /privacy\nTerms | /terms',
      disclaimer: 'Results vary. Case studies reflect specific clients and are not a guarantee of future performance. This site is not part of or endorsed by Meta, Google or TikTok.',
    },
    render: (p) =>
      `<footer class="fb-s fb-footer"><div class="fb-wrap fb-center"><div class="fb-footer-links">${lines(p.links)
        .map((l) => {
          const [t, u] = cells(l);
          return `<a href="${esc(safeUrl(u) || '#')}">${esc(t)}</a>`;
        })
        .join('')}</div><div>${esc(p.text)}</div>${p.disclaimer ? `<p class="fb-disclaimer">${esc(p.disclaimer)}</p>` : ''}</div></footer>`,
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
