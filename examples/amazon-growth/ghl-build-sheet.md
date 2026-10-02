# BAD | Amazon Growth System: GoHighLevel Build Sheet

Domain: `go.badmarketing.com`

## 1. Funnel steps (Sites → Funnels → New Funnel)

| # | Step | Path | Sections |
|---|---|---|---|
| 1 | Landing | `/amazon` | header → hero → steps → offer → form → footer |
| 2 | Book | `/amazon-book` | calendar → footer |
| 3 | Confirmed | `/amazon-confirmed` | thankyou → footer |

For each step: add a full-width section → Custom Code element → paste the step's "GHL snippet" export. Set SEO title + favicon under step settings.

## 2. Pipeline (Opportunities → Pipelines): **Amazon | Inbound**

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

## 4. Custom values (Settings → Custom Values)

| Name | Key | Value |
|---|---|---|
| Booking Link | `{{custom_values.booking_link}}` | https://go.badmarketing.com/amazon-book |

## 5. Tags

`lead-amazon` · `offer-free-compliance` · `qualified` · `amazon-unqualified`

## 6. Calendars

| Name | Type | Duration | Notes |
|---|---|---|---|
| Amazon Audit Call | Round Robin | 30 min |  |

## 7. Workflows (Automation → Workflows)

### 01 | Amazon Audit → Speed To Lead

**Trigger:** Inbound Webhook (funnel form) OR Form Submitted: "Amazon Audit"  
**Goal:** First touch in under 60 seconds; a booked call before the lead goes cold.

| When | Action | Details |
|---|---|---|
| 0m | Create/Update Contact | Map first_name, email, phone, website, monthly_revenue + all utm_* fields to contact & custom fields. |
| 0m | Add Tag | lead-amazon |
| 0m | Create/Update Opportunity | Amazon \| Inbound → "New Lead" (source = utm_source) |
| 0m | Assign To User | Round robin: Sales team |
| 0m | Send SMS | Hey {{contact.first_name}}, it's {{user.first_name}} from BAD Marketing. Got your request! Grab a time on my calendar here so we can dig into your numbers: {{custom_values.booking_link}} |
| 0m | Internal Notification | SMS + Slack to assigned rep: "🔥 New {{contact.monthly_revenue}} lead: {{contact.name}} {{contact.phone}}" |
| 2m | If/Else | If appointment booked → end. Else → Call contact (rep whisper: "New funnel lead, press 1 to connect"). |

### 02 | Amazon Audit Call → Show-Up Machine

**Trigger:** Customer Booked Appointment (Calendar: "Amazon Audit Call")  
**Goal:** Show rate 75%+. Every reminder gives them a reason to show, not just a time.

| When | Action | Details |
|---|---|---|
| 0m | Update Opportunity | Amazon \| Inbound → "Call Booked" |
| 0m | Remove From Workflow | Abandoned Application + Speed To Lead |
| 0m | Send Email | Subject: "You're confirmed, {{contact.first_name}} (read before our call)". Include 3-min prep video + what to have ready. |
| 0m | Send SMS | You're locked in for {{appointment.start_time}}. Reply YES to confirm so we keep your spot 👊 |
| 24h before | Send SMS + Email | Tomorrow at {{appointment.only_start_time}}: here's the agenda + one quick question so we can prep your audit. |
| 2h before | Send SMS | Heads up, we're on in 2 hours. Meeting link: {{appointment.meeting_location}} |
| 10m before | Send SMS | Hopping on in 10 minutes! {{appointment.meeting_location}} |

### 03 | Amazon Audit Call → No-Show Recovery

**Trigger:** Appointment Status changed to "No Show"  
**Goal:** Rebook 30-40% of no-shows within 72 hours.

| When | Action | Details |
|---|---|---|
| 0m | Update Opportunity | Amazon \| Inbound → "No Show" |
| 5m | Send SMS | Hey {{contact.first_name}}, looks like we missed each other. All good, life happens. Want to grab another time? {{custom_values.booking_link}} |
| 1d | Send Email | Subject: "Still want that audit?" with a case study + reschedule button. |
| 3d | Send SMS | Last nudge from me. Should I close out your file or keep your audit open? |
| 3d | If/Else | No reply → Opportunity "Lost: No Show", add tag nurture-long-term. |

## 8. KPIs to report weekly

| Metric | Target |
|---|---|
| Landing → booked | 8%+ |
| Show rate | 75%+ |

## 9. Launch QA

- [ ] Submit a test lead on mobile: contact, tags, opportunity and UTMs all land in GHL
- [ ] Speed-to-lead SMS arrives in < 60s; internal notification fires
- [ ] Book a test call: confirmation + reminder workflow enrolls, abandoned flow exits
- [ ] Mark test appointment No-Show → recovery SMS fires
- [ ] Pixel Helper shows PageView + Lead; Meta CAPI / GHL conversion sync on
- [ ] A2P 10DLC brand + campaign approved for the sending number
- [ ] Page speed: LCP < 2.5s on 4G (PageSpeed Insights)
