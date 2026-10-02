// Turns a funnel + its GHL blueprint into a build SOP (Markdown) that an
// ops person can follow click-by-click inside a GHL sub-account.

export function blueprintMarkdown(funnel) {
  const b = funnel.blueprint || {};
  const out = [];
  out.push(`# ${funnel.name}: GoHighLevel Build Sheet`, '');
  out.push(`Domain: \`${funnel.tracking?.domain || '(set in Sites → Domains)'}\``, '');

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
