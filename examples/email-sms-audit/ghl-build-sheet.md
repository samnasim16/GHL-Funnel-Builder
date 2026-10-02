# BAD | Free Email & SMS Audit: GoHighLevel Build Sheet

Domain: `go.badmarketing.com`

## 0. GoHighLevel tools this funnel uses

| Tool | Where in GHL | Used | Replaces |
|---|---|---|---|
| Funnel pages | Sites → Funnels | Yes | ClickFunnels, Leadpages |
| Contacts (CRM) | Contacts | Yes | HubSpot, spreadsheets |
| Booking calendar | Calendars | Yes | Calendly, Acuity |
| Pipeline | Opportunities | Yes | Pipedrive, Trello |
| Texts and emails | Conversations | Yes | Mailchimp, Twilio |
| Automations | Automation → Workflows | Yes | Zapier, ActiveCampaign |
| Payments | Payments | Not yet | ThriveCart, SamCart |
| Courses and memberships | Memberships | Not yet | Kajabi, Teachable |
| Reviews | Reputation | Not yet | Birdeye, Podium |

## 1. Funnel steps (Sites → Funnels → New Funnel)

| # | Step | Path | Sections |
|---|---|---|---|
| 1 | Opt-in | `/email-sms-audit` | announcement → header → hero → logos → caseStudies → problem → offer → form → faq → footer |
| 2 | Book Call | `/email-sms-audit-book` | announcement → calendar → steps → footer |
| 3 | Confirmed | `/email-sms-audit-confirmed` | thankyou → video → footer |

For each step: add a full-width section → Custom Code element → paste the step's "GHL snippet" export. Set SEO title + favicon under step settings.

## 2. Pipeline (Opportunities → Pipelines): **Retention | Email & SMS Audit**

1. New Lead
2. Application Submitted
3. Call Booked
4. Showed
5. No Show
6. Proposal Sent
7. Closed Won
8. Closed Lost
9. Nurture

## 3. Custom fields (Settings → Custom Fields)

| Name | Key | Type |
|---|---|---|
| Website | `contact.website` | Text |
| Monthly Revenue | `contact.monthly_revenue` | Dropdown (single) |
| UTM Source | `contact.utm_source` | Text |
| UTM Campaign | `contact.utm_campaign` | Text |
| UTM Content (ad) | `contact.utm_content` | Text |
| Funnel Step | `contact.funnel_step` | Text |
| ESP Platform | `contact.esp` | Dropdown (single) |

## 4. Custom values (Settings → Custom Values)

| Name | Key | Value |
|---|---|---|
| Booking Link | `{{custom_values.booking_link}}` | https://go.badmarketing.com/email-sms-audit-book |

## 5. Tags

`lead-email-sms-audit` · `source-funnel` · `qualified` · `email-sms-audit-unqualified` · `nurture-long-term`

## 6. Calendars

| Name | Type | Duration | Notes |
|---|---|---|---|
| Email & SMS Audit Walkthrough | Round Robin | 30 min | Buffer 15m, 24h min notice, max 6/day per strategist |

## 7. Workflows (Automation → Workflows)

### 01 | Email & SMS Audit Opt-in → Speed To Lead

**Trigger:** Inbound Webhook (funnel form) OR Form Submitted: "Email & SMS Audit Opt-in"  
**Goal:** First touch in under 60 seconds; a booked call before the lead goes cold.

| When | Action | Details |
|---|---|---|
| 0m | Create/Update Contact | Map first_name, email, phone, website, monthly_revenue + all utm_* fields to contact & custom fields. |
| 0m | Add Tag | lead-email-sms-audit |
| 0m | Create/Update Opportunity | Retention \| Email & SMS Audit → "New Lead" (source = utm_source) |
| 0m | Assign To User | Round robin: Sales team |
| 0m | Send SMS | Hey {{contact.first_name}}, it's {{user.first_name}} from BAD Marketing. Got your request! Grab a time on my calendar here so we can dig into your numbers: {{custom_values.booking_link}} |
| 0m | Internal Notification | SMS + Slack to assigned rep: "🔥 New {{contact.monthly_revenue}} lead: {{contact.name}} {{contact.phone}}" |
| 2m | If/Else | If appointment booked → end. Else → Call contact (rep whisper: "New funnel lead, press 1 to connect"). |

### 05 | Qualification Router

**Trigger:** Contact Changed: monthly_revenue  
**Goal:** Protect strategist time. Senior team only talks to qualified brands.

| When | Action | Details |
|---|---|---|
| 0m | If/Else | monthly_revenue is "Under $50k" → Unqualified branch, else → Qualified branch |
| 0m | Qualified branch | Add tag qualified, assign to senior strategist, keep in booking flow. |
| 0m | Unqualified branch | Add tag email-sms-audit-unqualified, send "growth resources" email, enroll in 30-day nurture, skip sales calls. |

### 04 | Abandoned Application

**Trigger:** Tag Added: "lead-email-sms-audit" (with wait-for-appointment condition)  
**Goal:** Recover leads who opted in but never booked.

| When | Action | Details |
|---|---|---|
| Wait 15m | Condition | If appointment booked → exit. |
| 15m | Send SMS | Saw you started your application but didn't pick a time. Here's the link again: {{custom_values.booking_link}} |
| 1h | Send Email | Subject: "Your audit is half done". Social proof + calendar link. |
| 1d | Send SMS | Quick q: is there anything stopping you from booking? Happy to answer here. |
| 3d | Update Opportunity | Retention \| Email & SMS Audit → "Nurture"; add to long-term newsletter. |

### 02 | Email & SMS Audit Walkthrough → Show-Up Machine

**Trigger:** Customer Booked Appointment (Calendar: "Email & SMS Audit Walkthrough")  
**Goal:** Show rate 75%+. Every reminder gives them a reason to show, not just a time.

| When | Action | Details |
|---|---|---|
| 0m | Update Opportunity | Retention \| Email & SMS Audit → "Call Booked" |
| 0m | Remove From Workflow | Abandoned Application + Speed To Lead |
| 0m | Send Email | Subject: "You're confirmed, {{contact.first_name}} (read before our call)". Include 3-min prep video + what to have ready. |
| 0m | Send SMS | You're locked in for {{appointment.start_time}}. Reply YES to confirm so we keep your spot 👊 |
| 24h before | Send SMS + Email | Tomorrow at {{appointment.only_start_time}}: here's the agenda + one quick question so we can prep your audit. |
| 2h before | Send SMS | Heads up, we're on in 2 hours. Meeting link: {{appointment.meeting_location}} |
| 10m before | Send SMS | Hopping on in 10 minutes! {{appointment.meeting_location}} |

### 03 | Email & SMS Audit Walkthrough → No-Show Recovery

**Trigger:** Appointment Status changed to "No Show"  
**Goal:** Rebook 30-40% of no-shows within 72 hours.

| When | Action | Details |
|---|---|---|
| 0m | Update Opportunity | Retention \| Email & SMS Audit → "No Show" |
| 5m | Send SMS | Hey {{contact.first_name}}, looks like we missed each other. All good, life happens. Want to grab another time? {{custom_values.booking_link}} |
| 1d | Send Email | Subject: "Still want that audit?" with a case study + reschedule button. |
| 3d | Send SMS | Last nudge from me. Should I close out your file or keep your audit open? |
| 3d | If/Else | No reply → Opportunity "Lost: No Show", add tag nurture-long-term. |

## 8. KPIs to report weekly

| Metric | Target |
|---|---|
| Opt-in rate (page → step 1 submit) | 25–40% |
| Book rate (opt-in → booked) | 45%+ |
| Show rate | 75%+ |
| Speed to lead | < 60 seconds |
| Cost per booked call | Track by utm_content (ad level) |

## 9. Launch QA

- [ ] Submit a test lead on mobile: contact, tags, opportunity and UTMs all land in GHL
- [ ] Speed-to-lead SMS arrives in < 60s; internal notification fires
- [ ] Book a test call: confirmation + reminder workflow enrolls, abandoned flow exits
- [ ] Mark test appointment No-Show → recovery SMS fires
- [ ] Pixel Helper shows PageView + Lead; Meta CAPI / GHL conversion sync on
- [ ] A2P 10DLC brand + campaign approved for the sending number
- [ ] Page speed: LCP < 2.5s on 4G (PageSpeed Insights)
