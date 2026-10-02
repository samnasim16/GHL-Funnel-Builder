# FunnelForge for GoHighLevel

A funnel builder that ships the **whole funnel**: the pages plus the GoHighLevel back end (pipeline, tags, custom fields, custom values, calendars, workflows and KPIs) and a launch audit that scores every step before it takes traffic.

It was built as a working demo for **BAD Marketing**. The templates are the funnels BAD would run for its own service lines (Email & SMS, Paid Ads, Amazon) and the funnels it builds for clients (info-product webinars, local lead gen).

## Quick start

```bash
npm start          # serves the app at http://localhost:5173
npm test           # 10 unit tests (renderer, templates, audit, build sheet, XSS escaping)
node scripts/build-examples.mjs   # regenerate examples/
```

There are no dependencies and no build step: it's plain ES modules. Open `http://localhost:5173/` for the builder and `http://localhost:5173/examples/` to browse finished funnels.

## What it does

| Area | What you get |
|---|---|
| **Visual editor** | 20 conversion sections (hero, VSL, opt-in/application form, GHL calendar, offer stack, case studies, stats, FAQ, urgency countdown…). Click any section on the page to edit it, drag to reorder, undo/redo, desktop/tablet/mobile preview. Your work saves automatically in the browser. |
| **Multi-step funnels** | Steps with paths. Each form redirects to the next step and carries `first_name/email/phone` forward so the GHL calendar is prefilled. |
| **GHL wiring** | Forms POST to a **GHL Inbound Webhook** workflow trigger (or paste a native GHL form embed). They capture UTMs plus `fbclid/gclid/ttclid` and fire Meta Pixel `Lead`. Booking uses the GHL calendar widget. SMS consent text is A2P 10DLC-ready. |
| **GHL Blueprint** | For each funnel: pipeline stages, tags, custom fields (`{{contact.x}}`), custom values, calendars and full workflows (trigger → timed actions, with copy for the SMS/email messages), plus KPI targets. You can edit it as JSON. |
| **Build sheet export** | One click exports a Markdown SOP an ops person can follow click by click inside a sub-account, ending with a launch QA checklist. |
| **Launch Audit** | Scores every step on: CTA above the fold, single goal, social proof, unfilled placeholders, form wired to GHL, phone captured, SMS consent, form length, calendar/video set, SEO title, privacy footer, pixel. Each failed check comes with the fix. |
| **Export** | *Copy GHL Custom Code* (paste into a full-width Custom Code element), standalone HTML per step or for all steps, live preview, and funnel JSON import/export. |

## Templates

| Template | Steps | Workflows |
|---|---|---|
| Free Email & SMS Audit | Opt-in → Book → Confirmed | Speed-to-lead, qualification router, abandoned application, show-up reminders, no-show recovery |
| Paid Ads Application (VSL) | VSL + application → Book → Confirmed | All of the above + proposal follow-up |
| Amazon Growth Call | Landing → Book → Confirmed | Speed-to-lead, reminders, no-show |
| Info-Product Webinar *(client funnel)* | Register → Confirmed → Replay + offer | Indoctrination + replay/cart-close |
| Local Business Quote *(client funnel)* | Offer → Thank you | Speed-to-lead, missed-call text-back, review request |

## Using an export in GoHighLevel

1. **Sites → Funnels → New Funnel**. Create one step per builder step and use the **same paths**.
2. In each step add a full-width section → **Custom Code** element → paste *Export → Copy GHL Custom Code*.
3. **Automation → Workflows → New** → trigger **Inbound Webhook**. Copy the URL into the form section's *GHL Inbound Webhook URL* field, then map the fields to the contact in a *Create/Update Contact* action.
4. **Calendars → Share → Embed**. Paste the widget URL into the calendar section.
5. Follow the downloaded **GHL Build Sheet** for the pipeline, tags, fields, values, workflows and launch QA.

## Project layout

```
index.html            builder UI
css/app.css           builder styles
js/sections.js        section library (schema + pure render functions)
js/renderer.js        page/snippet renderer, theme CSS, runtime (forms, UTMs, countdown, pixel)
js/templates.js       funnel templates + GHL blueprints
js/audit.js           launch audit rules
js/blueprint.js       Markdown build-sheet generator
js/app.js             editor state, history, UI
scripts/build-examples.mjs
examples/             pre-rendered example funnels + build sheets
test/                 node:test suite
docs/PITCH.md         pitch notes for BAD Marketing
```

## Notes on content

- Stats in the templates ($1B+ in client revenue, 150+ team members, $250M+ ad spend managed, +58.9% / +47.78% / +20% email & SMS lifts, the free-content and free-compliance offers) come from public sources about BAD Marketing. **Check them with BAD before using any page live.**
- Testimonials and client logos are deliberately left as `[placeholders]`, and the Launch Audit flags them until real ones are added.
- Brand colors are an editable placeholder palette (Theme tab), not BAD's official brand kit.
