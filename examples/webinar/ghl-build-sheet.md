# Client | Free Masterclass Funnel: GoHighLevel Build Sheet

Domain: `join.clientbrand.com`

## 1. Funnel steps (Sites → Funnels → New Funnel)

| # | Step | Path | Sections |
|---|---|---|---|
| 1 | Registration | `/masterclass` | announcement → hero → form → text → footer |
| 2 | Confirmation | `/masterclass-confirmed` | thankyou → video → footer |
| 3 | Replay + Offer | `/masterclass-replay` | announcement → video → offer → guarantee → faq → footer |

For each step: add a full-width section → Custom Code element → paste the step's "GHL snippet" export. Set SEO title + favicon under step settings.

## 2. Pipeline (Opportunities → Pipelines): **Masterclass | Launch**

1. Registered
2. Attended Live
3. Watched Replay
4. Clicked Offer
5. Purchased
6. Booked Call
7. Not Interested

## 3. Custom fields (Settings → Custom Fields)

| Name | Key | Type |
|---|---|---|
| UTM Source | `contact.utm_source` | Text |
| UTM Campaign | `contact.utm_campaign` | Text |
| UTM Content (ad) | `contact.utm_content` | Text |
| Funnel Step | `contact.funnel_step` | Text |
| Webinar Date | `contact.webinar_date` | Date |

## 4. Custom values (Settings → Custom Values)

| Name | Key | Value |
|---|---|---|
| Webinar Link | `{{custom_values.webinar_link}}` | https://zoom.us/j/... |
| Replay Link | `{{custom_values.replay_link}}` | https://join.clientbrand.com/masterclass-replay |

## 5. Tags

`webinar-registered` · `webinar-attended` · `webinar-noshow` · `offer-clicked` · `customer-accelerator`

## 7. Workflows (Automation → Workflows)

### 01 | Registration → Indoctrination

**Trigger:** Form Submitted: Masterclass Registration  
**Goal:** 60%+ live attendance from registrants.

| When | Action | Details |
|---|---|---|
| 0m | Add Tag | webinar-registered |
| 0m | Send Email | Confirmation + calendar file + "what you'll learn" |
| 0m | Send SMS | You're in, {{contact.first_name}}! Text IN so I know you'll be there. |
| Daily until event | Send Email | Value emails: story, case study, framework teaser. |
| 1h before | Send SMS + Email | Starting in 1 hour: {{custom_values.webinar_link}} |
| 5m after start | Send SMS | We're LIVE! Jump in: {{custom_values.webinar_link}} |

### 02 | Replay + Cart Close Sequence

**Trigger:** Event end (date-based) → branch on attended / no-show tag  
**Goal:** Convert 3–8% of registrants to buyers.

| When | Action | Details |
|---|---|---|
| +1h | Send Email | Attended: "Here's the offer link + bonuses". No-show: "You missed it, replay is up for 72h". |
| +24h | Send SMS | Replay link: {{custom_values.replay_link}} |
| +48h | Send Email | Case study + FAQ objection handling. |
| +70h | Send SMS + Email | 2 hours left before the replay and bonuses disappear. |
| On purchase | Remove From Workflow | Tag customer-accelerator, start onboarding workflow. |

## 8. KPIs to report weekly

| Metric | Target |
|---|---|
| Registration rate | 30–50% |
| Live show-up rate | 25–40% |
| Registrant → buyer | 3–8% |
| Cost per registrant | < $10 (vertical dependent) |

## 9. Launch QA

- [ ] Submit a test lead on mobile: contact, tags, opportunity and UTMs all land in GHL
- [ ] Speed-to-lead SMS arrives in < 60s; internal notification fires
- [ ] Book a test call: confirmation + reminder workflow enrolls, abandoned flow exits
- [ ] Mark test appointment No-Show → recovery SMS fires
- [ ] Pixel Helper shows PageView + Lead; Meta CAPI / GHL conversion sync on
- [ ] A2P 10DLC brand + campaign approved for the sending number
- [ ] Page speed: LCP < 2.5s on 4G (PageSpeed Insights)
