// Turns a funnel + its GHL blueprint into a build SOP (Markdown) that an
// ops person can follow click-by-click inside a GHL sub-account.

// The GoHighLevel tools a funnel relies on, in the order a lead meets them,
// and the separate apps each one replaces.
export function systemMap(funnel) {
  const b = funnel.blueprint || {};
  const secs = funnel.steps.flatMap((s) => s.sections.map((x) => x.type));
  const wf = (re) => (b.workflows || []).some((w) => re.test(`${w.name} ${w.trigger} ${w.actions.map((a) => a.type + ' ' + a.detail).join(' ')}`));
  return [
    { id: 'pages', em: '🖥', name: 'Funnel pages', ghl: 'Sites → Funnels', does: 'Hosts your pages on your own domain.', replaces: 'ClickFunnels, Leadpages', used: true },
    { id: 'crm', em: '👤', name: 'Contacts (CRM)', ghl: 'Contacts', does: 'Every sign-up becomes a contact with their answers and where they came from.', replaces: 'HubSpot, spreadsheets', used: secs.includes('form') || secs.includes('calendar') },
    { id: 'calendar', em: '📅', name: 'Booking calendar', ghl: 'Calendars', does: 'Leads book a call; it syncs with Google or Outlook and Zoom.', replaces: 'Calendly, Acuity', used: secs.includes('calendar') },
    { id: 'pipeline', em: '📊', name: 'Pipeline', ghl: 'Opportunities', does: 'A board showing where every lead is, from new to won.', replaces: 'Pipedrive, Trello', used: Boolean(b.pipeline?.stages?.length) },
    { id: 'messages', em: '💬', name: 'Texts and emails', ghl: 'Conversations', does: 'Sends texts and emails from one inbox, and you reply in the same place.', replaces: 'Mailchimp, Twilio', used: wf(/sms|email/i) },
    { id: 'automations', em: '⚡', name: 'Automations', ghl: 'Automation → Workflows', does: 'Follows up, reminds and sorts leads on its own.', replaces: 'Zapier, ActiveCampaign', used: (b.workflows || []).length > 0 },
    { id: 'payments', em: '💳', name: 'Payments', ghl: 'Payments', does: 'Takes card payments with payment links or order forms.', replaces: 'ThriveCart, SamCart', used: secs.includes('checkout') || wf(/payment|order submitted/i) },
    { id: 'courses', em: '🎓', name: 'Courses and memberships', ghl: 'Memberships', does: 'Gives buyers a login to your course portal automatically.', replaces: 'Kajabi, Teachable', used: wf(/membership|offer access|course portal/i) },
    { id: 'reviews', em: '⭐', name: 'Reviews', ghl: 'Reputation', does: 'Asks happy customers for Google reviews.', replaces: 'Birdeye, Podium', used: wf(/review/i) },
  ];
}

export function blueprintMarkdown(funnel) {
  const b = funnel.blueprint || {};
  const out = [];
  out.push(`# ${funnel.name}: GoHighLevel Build Sheet`, '');
  out.push(`Domain: \`${funnel.tracking?.domain || '(set in Sites → Domains)'}\``, '');

  const sys = systemMap(funnel);
  out.push('## 0. GoHighLevel tools this funnel uses', '', '| Tool | Where in GHL | Used | Replaces |', '|---|---|---|---|');
  sys.forEach((t) => out.push(`| ${t.name} | ${t.ghl} | ${t.used ? 'Yes' : 'Not yet'} | ${t.replaces} |`));
  out.push('');
  if (b.products?.length) {
    out.push('### Products (Payments → Products)', '', '| Product | Price | Delivers |', '|---|---|---|');
    b.products.forEach((p) => out.push(`| ${p.name} | ${p.price} | ${p.delivers || ''} |`));
    out.push('');
  }

  out.push('## 1. Funnel steps (Sites → Funnels → New Funnel)', '');
  out.push('| # | Step | Path | Sections |', '|---|---|---|---|');
  funnel.steps.forEach((s, i) => out.push(`| ${i + 1} | ${s.name} | \`${s.path}\` | ${s.sections.map((x) => x.type).join(' → ')} |`));
  out.push('', 'For each step: add a full-width section → Custom Code element → paste the step\'s "GHL snippet" export. Set SEO title + favicon under step settings.', '');

  if (b.pipeline) {
    out.push(`## 2. Pipeline (Opportunities → Pipelines): **${b.pipeline.name}**`, '');
    b.pipeline.stages.forEach((st, i) => out.push(`${i + 1}. ${st}`));
    out.push('');
  }

  if (b.customFields?.length) {
    out.push('## 3. Custom fields (Settings → Custom Fields)', '', '| Name | Key | Type |', '|---|---|---|');
    b.customFields.forEach((f) => out.push(`| ${f.name} | \`contact.${f.key}\` | ${f.type} |`));
    out.push('');
  }

  if (b.customValues?.length) {
    out.push('## 4. Custom values (Settings → Custom Values)', '', '| Name | Key | Value |', '|---|---|---|');
    b.customValues.forEach((v) => out.push(`| ${v.name} | \`{{custom_values.${v.key}}}\` | ${v.value} |`));
    out.push('');
  }

  if (b.tags?.length) out.push('## 5. Tags', '', b.tags.map((t) => `\`${t}\``).join(' · '), '');

  if (b.calendars?.length) {
    out.push('## 6. Calendars', '', '| Name | Type | Duration | Notes |', '|---|---|---|---|');
    b.calendars.forEach((c) => out.push(`| ${c.name} | ${c.type} | ${c.duration} | ${c.notes || ''} |`));
    out.push('');
  }

  if (b.workflows?.length) {
    out.push('## 7. Workflows (Automation → Workflows)', '');
    b.workflows.forEach((w) => {
      out.push(`### ${w.name}`, '', `**Trigger:** ${w.trigger}  `, `**Goal:** ${w.goal || ''}`, '', '| When | Action | Details |', '|---|---|---|');
      w.actions.forEach((a) => out.push(`| ${a.delay} | ${a.type} | ${String(a.detail).replace(/\|/g, '\\|')} |`));
      out.push('');
    });
  }

  if (b.kpis?.length) {
    out.push('## 8. KPIs to report weekly', '', '| Metric | Target |', '|---|---|');
    b.kpis.forEach((k) => out.push(`| ${k.metric} | ${k.target} |`));
    out.push('');
  }

  out.push(
    '## 9. Launch QA',
    '',
    '- [ ] Submit a test lead on mobile: contact, tags, opportunity and UTMs all land in GHL',
    '- [ ] Speed-to-lead SMS arrives in < 60s; internal notification fires',
    '- [ ] Book a test call: confirmation + reminder workflow enrolls, abandoned flow exits',
    '- [ ] Mark test appointment No-Show → recovery SMS fires',
    '- [ ] Pixel Helper shows PageView + Lead; Meta CAPI / GHL conversion sync on',
    '- [ ] A2P 10DLC brand + campaign approved for the sending number',
    '- [ ] Page speed: LCP < 2.5s on 4G (PageSpeed Insights)',
    ''
  );
  return out.join('\n');
}
