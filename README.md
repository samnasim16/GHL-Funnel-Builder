# FunnelForge for GoHighLevel

A funnel builder that ships the **whole funnel**: the pages plus the GoHighLevel back end (pipeline, tags, custom fields, custom values, calendars, workflows and KPIs) and a launch audit that scores every step before it takes traffic.

It was built as a working demo for **BAD Marketing**. The templates are the funnels BAD would run for its own service lines (Email & SMS, Paid Ads, Amazon) and the funnels it builds for clients (info-product webinars, local lead gen).

## Live site

GitHub Pages serves the repo root of `main` (builder, pitch page and examples), so every merge to `main` goes live:
**https://samnasim16.github.io/GHL-Funnel-Builder/** (setup: repo **Settings → Pages → Deploy from a branch → main / root**).

## Quick start

```bash
npm start          # serves the app at http://localhost:5173
npm test           # 10 unit tests (renderer, templates, audit, build sheet, XSS escaping)
node scripts/build-examples.mjs   # regenerate examples/
node scripts/stamp-version.mjs    # after changing js/ or css/: cache-busting version (a test checks this)
```

There are no dependencies and no build step: it's plain ES modules. Open `http://localhost:5173/` for the builder and `http://localhost:5173/examples/` to browse finished funnels.

## Built for first-timers

- **Pick a goal, not a template.** Start by answering "What should your funnel do?" in plain words.
- **Type on the page.** Click any headline or button and type. Hover between sections and click **+** to add one.
- **No jargon.** Every section and page says what it's for, list fields are simple rows, and the **?** button explains every term.
- **A 3-step guide** (Pick a goal → Edit your pages → Put it in GoHighLevel) is always visible, and the last step walks through GoHighLevel click by click with a copy button per page.
- **Your system tab** shows the all-in-one picture: which GoHighLevel tools the funnel uses (pages, CRM, calendar, pipeline, texts and emails, automations, payments, courses, reviews), what each replaces, and every automation in one plain sentence.

## Design tools

- **Looks**: 10 one-click designs (Bold agency, Modern gradient, Glass, Neon night, Minimal luxe, Brutalist, Soft & friendly, Editorial, Clean SaaS, Poster). Each sets colors, fonts, button shape and style, cards, spacing, headline case and background effect.
- **✨ Pick a look for my business**: AI picks a look, brand color and fonts from the business description. Without AI it matches by business type.
- **Colors**: 24 palettes, "Build from my color" (a full palette from one brand color) and "Match my logo" (pulls brand colors out of an uploaded logo).
- **Fonts**: 35 Google Fonts in a searchable browser grouped by Modern, Bold, Elegant, Friendly and Tech, plus 12 pairings.
- **Shape and effects**: button shape (rounded, pill, square), button style (solid, gradient, outline, glow), cards (shadow, outline, flat, glass), spacing, headline case, and dark-section backgrounds (glow, grid, dots, grain).
- **Pictures**: upload with a cropper (drag, zoom, rotate, wide / 4:3 / square / portrait / circle, brightness, contrast and color). Pictures are compressed automatically (max 1600px, WebP). New sections: Picture, Picture + text and Picture gallery. The top section takes a background picture with adjustable darkness.

## What it does

| Area | What you get |
|---|---|
| **Visual editor** | 21 conversion sections (including a GoHighLevel checkout) (hero, VSL, opt-in/application form, GHL calendar, offer stack, case studies, stats, FAQ, urgency countdown…). Click any section on the page to edit it, drag to reorder, undo/redo, desktop/tablet/mobile preview. Your work saves automatically in the browser. |
| **Multi-step funnels** | Steps with paths. Each form redirects to the next step and carries `first_name/email/phone` forward so the GHL calendar is prefilled. |
| **GHL wiring** | Forms POST to a **GHL Inbound Webhook** workflow trigger (or paste a native GHL form embed). They capture UTMs plus `fbclid/gclid/ttclid` and fire Meta Pixel `Lead`. Booking uses the GHL calendar widget. SMS consent text is A2P 10DLC-ready. |
| **GHL Blueprint** | For each funnel: pipeline stages, tags, custom fields (`{{contact.x}}`), custom values, calendars and full workflows (trigger → timed actions, with copy for the SMS/email messages), plus KPI targets. You can edit it as JSON. |
| **Setup guide** | An interactive checklist for building the back end in GoHighLevel: a tick box on every task (progress is saved), a copy button on every name, key, tag and message, and the exact menu path for each step. It ends by saving everything as a GHL **Snapshot**, so the next client is one click. It can also be copied as text for Notion or Google Docs. |
| **Launch Audit** | Scores every step on: CTA above the fold, single goal, social proof, unfilled placeholders, form wired to GHL, phone captured, SMS consent, form length, calendar/video set, SEO title, privacy footer, pixel. Each failed check comes with the fix. |
| **Push to GoHighLevel** | Creates the tags, contact fields, saved values, products (with price) and calendars in a sub-account using a Private Integration token. It checks whether the pipeline exists, skips anything already there, and lists what stays manual (pipeline, workflows, pages), since GoHighLevel's API can't create those. If the browser can't reach GoHighLevel, it shows the command version: `GHL_TOKEN=... node scripts/push-to-ghl.mjs funnel.json --location <id>` (add `--dry-run` to preview). |
| **Export** | *Copy GHL Custom Code* (paste into a full-width Custom Code element), standalone HTML per step or for all steps, live preview, and funnel JSON import/export. |

## Templates

| Template | Steps | Workflows |
|---|---|---|
| Free Email & SMS Audit | Opt-in → Book → Confirmed | Speed-to-lead, qualification router, abandoned application, show-up reminders, no-show recovery |
| Paid Ads Application (VSL) | VSL + application → Book → Confirmed | All of the above + proposal follow-up |
| Amazon Growth Call | Landing → Book → Confirmed | Speed-to-lead, reminders, no-show |
| Info-Product Webinar *(client funnel)* | Register → Confirmed → Replay + checkout → Course access | Indoctrination, replay/cart-close, purchase → course access (GHL Payments + Memberships) |
| Local Business Quote *(client funnel)* | Offer → Thank you | Speed-to-lead, missed-call text-back, review request |

## Using an export in GoHighLevel

1. **Sites → Funnels → New Funnel**. Create one step per builder step and use the **same paths**.
2. In each step add a full-width section → **Custom Code** element → paste *Export → Copy GHL Custom Code*.
3. **Automation → Workflows → New** → trigger **Inbound Webhook**. Copy the URL into the form section's *GHL Inbound Webhook URL* field, then map the fields to the contact in a *Create/Update Contact* action.
4. **Calendars → Share → Embed**. Paste the widget URL into the calendar section.
5. Open the **Setup guide** tab and work through it. It covers the pipeline, tags, fields, values, workflows and testing.
6. Save the finished sub-account as a **Snapshot** (Agency view → Account Snapshots). That's how GoHighLevel reuses a funnel: the next client's account is set up in one click. Snapshots can only be created inside GoHighLevel, and its API can't create workflows, so the first build is always done by hand.

## Project layout

```
index.html            builder UI
css/app.css           builder styles
js/sections.js        section library (schema + pure render functions)
js/renderer.js        page/snippet renderer, theme CSS, runtime (forms, UTMs, countdown, pixel)
js/templates.js       funnel templates + GHL blueprints
js/audit.js           launch audit rules
js/blueprint.js       system map + Markdown build sheet
js/setup-guide.js     interactive setup guide (tick boxes, copy buttons)
js/ghl-push.js        Push to GoHighLevel (API v2 calls, shared by builder and CLI)
scripts/push-to-ghl.mjs  command-line push
js/app.js             editor state, history, UI
scripts/build-examples.mjs
examples/             pre-rendered example funnels + setup guides
test/                 node:test suite
pitch.html            one-page pitch for BAD Marketing
js/recommend.js       page suggestions with one-click fixes
js/ai-fill.js         AI auto-fill (prompt, apply, no-AI quick fill)
js/tour.js            guided tour
js/styles.js          looks, palettes, palette-from-color / from-logo, look suggestion
js/images.js          photo upload, cropper and compression
scripts/build-deploy.mjs  builds deploy/main.html for the shared link
docs/PITCH.md         pitch notes for BAD Marketing
```

## Notes on content

- Stats in the templates ($1B+ in client revenue, 150+ team members, $250M+ ad spend managed, +58.9% / +47.78% / +20% email & SMS lifts, the free-content and free-compliance offers) come from public sources about BAD Marketing. **Check them with BAD before using any page live.**
- Testimonials and client logos are deliberately left as `[placeholders]`, and the Launch Audit flags them until real ones are added.
- Brand colors are an editable placeholder palette (Theme tab), not BAD's official brand kit.
