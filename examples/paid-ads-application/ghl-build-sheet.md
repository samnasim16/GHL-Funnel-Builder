# BAD | Paid Ads + Free Content Application: GoHighLevel Build Sheet

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
| 1 | VSL | `/scale` | announcement → hero → video → stats → features → testimonials → form → faq → footer |
| 2 | Book Strategy Call | `/scale-book` | hero → calendar → guarantee → footer |
| 3 | Confirmed | `/scale-confirmed` | thankyou → caseStudies → footer |

For each step: add a full-width section → Custom Code element → paste the step's "GHL snippet" export. Set SEO title + favicon under step settings.

## 2. Pipeline (Opportunities → Pipelines): **Paid Ads | Inbound Applications**

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
| Monthly Ad Spend | `contact.monthly_ad_spend` | Dropdown (single) |
| Biggest Bottleneck | `contact.bottleneck` | Large text |

## 4. Custom values (Settings → Custom Values)

| Name | Key | Value |
|---|---|---|
| Booking Link | `{{custom_values.booking_link}}` | https://go.badmarketing.com/scale-book |

## 5. Tags

`lead-paid-ads` · `offer-free-content` · `qualified` · `paid-ads-unqualified` · `high-spend`

## 6. Calendars

| Name | Type | Duration | Notes |
|---|---|---|---|
| Paid Ads Strategy Call | Round Robin (senior strategists) | 45 min | Form questions shown on calendar so the strategist preps |

## 7. Workflows (Automation → Workflows)

### 01 | Paid Ads Application → Speed To Lead

**Trigger:** Inbound Webhook (funnel form) OR Form Submitted: "Paid Ads Application"  
**Goal:** First touch in under 60 seconds; a booked call before the lead goes cold.

| When | Action | Details |
|---|---|---|
| 0m | Create/Update Contact | Map first_name, email, phone, website, monthly_revenue + all utm_* fields to contact & custom fields. |
| 0m | Add Tag | lead-paid-ads |
| 0m | Create/Update Opportunity | Paid Ads \| Inbound Applications → "New Lead" (source = utm_source) |
| 0m | Assign To User | Round robin: Senior strategists (weighted by close rate) |
| 0m | Send SMS | Hey {{contact.first_name}}, it's {{user.first_name}} from BAD Marketing. Got your request! Grab a time on my calendar here so we can dig into your numbers: {{custom_values.booking_link}} |
| 0m | Internal Notification | SMS + Slack to assigned rep: "🔥 New {{contact.monthly_revenue}} lead: {{contact.name}} {{contact.phone}}" |
| 2m | If/Else | If appointment booked → end. Else → Call contact (rep whisper: "New funnel lead, press 1 to connect"). |

### 05 | Qualification Router

**Trigger:** Contact Changed: monthly_revenue  
**Goal:** Protect strategist time. Senior team only talks to qualified brands.

| When | Action | Details |
|---|---|---|
| 0m | If/Else | monthly_revenue in ["$1M–$3M","$3M+"] → Qualified (add tag high-spend if ad spend $150k+). Else → Unqualified: redirect to free resources, no calendar. |
| 0m | Qualified branch | Add tag qualified, assign to senior strategist, keep in booking flow. |
| 0m | Unqualified branch | Add tag paid-ads-unqualified, send "growth resources" email, enroll in 30-day nurture, skip sales calls. |

### 04 | Abandoned Application

**Trigger:** Tag Added: "lead-paid-ads" (with wait-for-appointment condition)  
**Goal:** Recover leads who opted in but never booked.

| When | Action | Details |
|---|---|---|
| Wait 15m | Condition | If appointment booked → exit. |
| 15m | Send SMS | Saw you started your application but didn't pick a time. Here's the link again: {{custom_values.booking_link}} |
| 1h | Send Email | Subject: "Your audit is half done". Social proof + calendar link. |
| 1d | Send SMS | Quick q: is there anything stopping you from booking? Happy to answer here. |
| 3d | Update Opportunity | Paid Ads \| Inbound Applications → "Nurture"; add to long-term newsletter. |

### 02 | Paid Ads Strategy Call → Show-Up Machine

**Trigger:** Customer Booked Appointment (Calendar: "Paid Ads Strategy Call")  
**Goal:** Show rate 75%+. Every reminder gives them a reason to show, not just a time.

| When | Action | Details |
|---|---|---|
| 0m | Update Opportunity | Paid Ads \| Inbound Applications → "Call Booked" |
| 0m | Remove From Workflow | Abandoned Application + Speed To Lead |
| 0m | Send Email | Subject: "You're confirmed, {{contact.first_name}} (read before our call)". Include 3-min prep video + what to have ready. |
| 0m | Send SMS | You're locked in for {{appointment.start_time}}. Reply YES to confirm so we keep your spot 👊 |
| 24h before | Send SMS + Email | Tomorrow at {{appointment.only_start_time}}: here's the agenda + one quick question so we can prep your audit. |
| 2h before | Send SMS | Heads up, we're on in 2 hours. Meeting link: {{appointment.meeting_location}} |
| 10m before | Send SMS | Hopping on in 10 minutes! {{appointment.meeting_location}} |

### 03 | Paid Ads Strategy Call → No-Show Recovery

**Trigger:** Appointment Status changed to "No Show"  
**Goal:** Rebook 30-40% of no-shows within 72 hours.

| When | Action | Details |
|---|---|---|
| 0m | Update Opportunity | Paid Ads \| Inbound Applications → "No Show" |
| 5m | Send SMS | Hey {{contact.first_name}}, looks like we missed each other. All good, life happens. Want to grab another time? {{custom_values.booking_link}} |
| 1d | Send Email | Subject: "Still want that audit?" with a case study + reschedule button. |
| 3d | Send SMS | Last nudge from me. Should I close out your file or keep your audit open? |
| 3d | If/Else | No reply → Opportunity "Lost: No Show", add tag nurture-long-term. |

### 06 | Post-Call Proposal Follow-Up

**Trigger:** Opportunity stage changed to "Proposal Sent"  
**Goal:** Close or get a clear no within 14 days.

| When | Action | Details |
|---|---|---|
| 0m | Send Email | Proposal recap + Loom walkthrough from the strategist. |
| 2d | Send SMS | Any questions on the proposal? Happy to jump on a quick call with your team. |
| 5d | Create Task | Strategist: personal video follow-up. |
| 10d | Send Email | "Should I close your file?" breakup email. |

## 8. KPIs to report weekly

| Metric | Target |
|---|---|
| VSL play rate | 60%+ |
| Application rate (visitor → app) | 4–8% |
| Qualified rate | 40%+ of applications |
| Show rate | 70%+ |
| Close rate on qualified calls | 20–30% |

## 9. Launch QA

- [ ] Submit a test lead on mobile: contact, tags, opportunity and UTMs all land in GHL
- [ ] Speed-to-lead SMS arrives in < 60s; internal notification fires
- [ ] Book a test call: confirmation + reminder workflow enrolls, abandoned flow exits
- [ ] Mark test appointment No-Show → recovery SMS fires
- [ ] Pixel Helper shows PageView + Lead; Meta CAPI / GHL conversion sync on
- [ ] A2P 10DLC brand + campaign approved for the sending number
- [ ] Page speed: LCP < 2.5s on 4G (PageSpeed Insights)
