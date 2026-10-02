# Client | Local Free Quote: GoHighLevel Build Sheet

Domain: `quote.clientbrand.com`

## 1. Funnel steps (Sites → Funnels → New Funnel)

| # | Step | Path | Sections |
|---|---|---|---|
| 1 | Offer | `/free-quote` | header → hero → form → testimonials → footer |
| 2 | Thank You | `/free-quote-thanks` | thankyou → footer |

For each step: add a full-width section → Custom Code element → paste the step's "GHL snippet" export. Set SEO title + favicon under step settings.

## 2. Pipeline (Opportunities → Pipelines): **Local | Quote Requests**

1. New Lead
2. Contacted
3. Estimate Booked
4. Estimate Given
5. Won
6. Lost

## 3. Custom fields (Settings → Custom Fields)

| Name | Key | Type |
|---|---|---|
| Service | `contact.service` | Dropdown (single) |
| UTM Source | `contact.utm_source` | Text |

## 5. Tags

`lead-quote` · `missed-call`

## 6. Calendars

| Name | Type | Duration | Notes |
|---|---|---|---|
| In-Home Estimate | Service calendar | 60 min | Location = contact address |

## 7. Workflows (Automation → Workflows)

### 01 | Free Quote → Speed To Lead

**Trigger:** Inbound Webhook (funnel form) OR Form Submitted: "Free Quote"  
**Goal:** First touch in under 60 seconds; a booked call before the lead goes cold.

| When | Action | Details |
|---|---|---|
| 0m | Create/Update Contact | Map first_name, email, phone, website, monthly_revenue + all utm_* fields to contact & custom fields. |
| 0m | Add Tag | lead-quote |
| 0m | Create/Update Opportunity | Local \| Quote Requests → "New Lead" (source = utm_source) |
| 0m | Assign To User | Office manager |
| 0m | Send SMS | Hey {{contact.first_name}}, it's {{user.first_name}} from BAD Marketing. Got your request! Grab a time on my calendar here so we can dig into your numbers: {{custom_values.booking_link}} |
| 0m | Internal Notification | SMS + Slack to assigned rep: "🔥 New {{contact.monthly_revenue}} lead: {{contact.name}} {{contact.phone}}" |
| 2m | If/Else | If appointment booked → end. Else → Call contact (rep whisper: "New funnel lead, press 1 to connect"). |

### 02 | Missed Call Text-Back

**Trigger:** Call Status: Missed / No answer  
**Goal:** Never lose a call-in lead.

| When | Action | Details |
|---|---|---|
| 0m | Send SMS | Sorry we missed you! This is [Client Brand]. How can we help? Reply here and we'll get right back to you. |
| 0m | Add Tag | missed-call |
| 0m | Create Opportunity | Local \| Quote Requests → New Lead |

### 03 | Review Request

**Trigger:** Opportunity stage changed to "Won"  
**Goal:** Grow Google reviews every week.

| When | Action | Details |
|---|---|---|
| 1d | Send Review Request | GHL Reputation → Google review link via SMS. |
| 3d | Send Email | Reminder if no review left. |

## 8. KPIs to report weekly

| Metric | Target |
|---|---|
| Form conversion | 15%+ |
| Contact rate in 5 min | 90%+ |
| Lead → estimate | 40%+ |

## 9. Launch QA

- [ ] Submit a test lead on mobile: contact, tags, opportunity and UTMs all land in GHL
- [ ] Speed-to-lead SMS arrives in < 60s; internal notification fires
- [ ] Book a test call: confirmation + reminder workflow enrolls, abandoned flow exits
- [ ] Mark test appointment No-Show → recovery SMS fires
- [ ] Pixel Helper shows PageView + Lead; Meta CAPI / GHL conversion sync on
- [ ] A2P 10DLC brand + campaign approved for the sending number
- [ ] Page speed: LCP < 2.5s on 4G (PageSpeed Insights)
