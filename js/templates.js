// Ready-to-launch funnel templates. Each one ships the pages AND the
// GoHighLevel back end it needs: pipeline, tags, custom fields, workflows,
// and the KPIs to judge it by.
import { makeSection } from './sections.js';

const S = (type, props) => makeSection(type, props);

const BAD_THEME = {
  primary: '#e11d2e',
  accent: '#ffd400',
  dark: '#0b0b0f',
  bg: '#ffffff',
  alt: '#f4f4f6',
  text: '#16161d',
  headingFont: 'Bricolage Grotesque',
  bodyFont: 'Geist',
  radius: 10,
  maxWidth: 1080,
};

const FOOTER = (brand = 'BAD Marketing') =>
  S('footer', {
    text: `© 2026 ${brand}. All rights reserved.`,
    links: 'Privacy Policy | /privacy\nTerms of Service | /terms',
  });

// ---- Shared GHL automation building blocks ---------------------------------

function speedToLead({ tag, pipeline, formName, owner = 'Round robin: Sales team' }) {
  return {
    name: `01 | ${formName} → Speed To Lead`,
    trigger: `Inbound Webhook (funnel form) OR Form Submitted: "${formName}"`,
    goal: 'First touch in under 60 seconds; a booked call before the lead goes cold.',
    actions: [
      { delay: '0m', type: 'Create/Update Contact', detail: 'Map first_name, email, phone, website, monthly_revenue + all utm_* fields to contact & custom fields.' },
      { delay: '0m', type: 'Add Tag', detail: tag },
      { delay: '0m', type: 'Create/Update Opportunity', detail: `${pipeline} → "New Lead" (source = utm_source)` },
      { delay: '0m', type: 'Assign To User', detail: owner },
      { delay: '0m', type: 'Send SMS', detail: 'Hey {{contact.first_name}}, it\'s {{user.first_name}} from BAD Marketing. Got your request! Grab a time on my calendar here so we can dig into your numbers: {{custom_values.booking_link}}' },
      { delay: '0m', type: 'Internal Notification', detail: 'SMS + Slack to assigned rep: "🔥 New {{contact.monthly_revenue}} lead: {{contact.name}} {{contact.phone}}"' },
      { delay: '2m', type: 'If/Else', detail: 'If appointment booked → end. Else → Call contact (rep whisper: "New funnel lead, press 1 to connect").' },
    ],
  };
}

function bookingReminders({ pipeline, calendar }) {
  return {
    name: `02 | ${calendar} → Show-Up Machine`,
    trigger: `Customer Booked Appointment (Calendar: "${calendar}")`,
    goal: 'Show rate 75%+. Every reminder gives them a reason to show, not just a time.',
    actions: [
      { delay: '0m', type: 'Update Opportunity', detail: `${pipeline} → "Call Booked"` },
      { delay: '0m', type: 'Remove From Workflow', detail: 'Abandoned Application + Speed To Lead' },
      { delay: '0m', type: 'Send Email', detail: 'Subject: "You\'re confirmed, {{contact.first_name}} (read before our call)". Include 3-min prep video + what to have ready.' },
      { delay: '0m', type: 'Send SMS', detail: 'You\'re locked in for {{appointment.start_time}}. Reply YES to confirm so we keep your spot 👊' },
      { delay: '24h before', type: 'Send SMS + Email', detail: 'Tomorrow at {{appointment.only_start_time}}: here\'s the agenda + one quick question so we can prep your audit.' },
      { delay: '2h before', type: 'Send SMS', detail: 'Heads up, we\'re on in 2 hours. Meeting link: {{appointment.meeting_location}}' },
      { delay: '10m before', type: 'Send SMS', detail: 'Hopping on in 10 minutes! {{appointment.meeting_location}}' },
    ],
  };
}

function noShow({ pipeline, calendar }) {
  return {
    name: `03 | ${calendar} → No-Show Recovery`,
    trigger: 'Appointment Status changed to "No Show"',
    goal: 'Rebook 30-40% of no-shows within 72 hours.',
    actions: [
      { delay: '0m', type: 'Update Opportunity', detail: `${pipeline} → "No Show"` },
      { delay: '5m', type: 'Send SMS', detail: 'Hey {{contact.first_name}}, looks like we missed each other. All good, life happens. Want to grab another time? {{custom_values.booking_link}}' },
      { delay: '1d', type: 'Send Email', detail: 'Subject: "Still want that audit?" with a case study + reschedule button.' },
      { delay: '3d', type: 'Send SMS', detail: 'Last nudge from me. Should I close out your file or keep your audit open?' },
      { delay: '3d', type: 'If/Else', detail: 'No reply → Opportunity "Lost: No Show", add tag nurture-long-term.' },
    ],
  };
}

function abandoned({ tag, pipeline }) {
  return {
    name: '04 | Abandoned Application',
    trigger: `Tag Added: "${tag}" (with wait-for-appointment condition)`,
    goal: 'Recover leads who opted in but never booked.',
    actions: [
      { delay: 'Wait 15m', type: 'Condition', detail: 'If appointment booked → exit.' },
      { delay: '15m', type: 'Send SMS', detail: 'Saw you started your application but didn\'t pick a time. Here\'s the link again: {{custom_values.booking_link}}' },
      { delay: '1h', type: 'Send Email', detail: 'Subject: "Your audit is half done". Social proof + calendar link.' },
      { delay: '1d', type: 'Send SMS', detail: 'Quick q: is there anything stopping you from booking? Happy to answer here.' },
      { delay: '3d', type: 'Update Opportunity', detail: `${pipeline} → "Nurture"; add to long-term newsletter.` },
    ],
  };
}

function disqualify({ tag, field = 'monthly_revenue', rule }) {
  return {
    name: '05 | Qualification Router',
    trigger: `Contact Changed: ${field}`,
    goal: 'Protect strategist time. Senior team only talks to qualified brands.',
    actions: [
      { delay: '0m', type: 'If/Else', detail: rule },
      { delay: '0m', type: 'Qualified branch', detail: 'Add tag qualified, assign to senior strategist, keep in booking flow.' },
      { delay: '0m', type: 'Unqualified branch', detail: `Add tag ${tag}-unqualified, send "growth resources" email, enroll in 30-day nurture, skip sales calls.` },
    ],
  };
}

const STANDARD_STAGES = ['New Lead', 'Application Submitted', 'Call Booked', 'Showed', 'No Show', 'Proposal Sent', 'Closed Won', 'Closed Lost', 'Nurture'];

const BASE_FIELDS = [
  { name: 'Website', key: 'website', type: 'Text' },
  { name: 'Monthly Revenue', key: 'monthly_revenue', type: 'Dropdown (single)' },
  { name: 'UTM Source', key: 'utm_source', type: 'Text' },
  { name: 'UTM Campaign', key: 'utm_campaign', type: 'Text' },
  { name: 'UTM Content (ad)', key: 'utm_content', type: 'Text' },
  { name: 'Funnel Step', key: 'funnel_step', type: 'Text' },
];

// ---- Templates --------------------------------------------------------------

export const TEMPLATES = [
  {
    id: 'email-sms-audit',
    name: 'Free Email & SMS Audit',
    category: 'Agency lead gen',
    description:
      'Lead magnet funnel for the Retention team. Ecom brands claim a free Email & SMS strategy audit → qualify → book → show.',
    build: () => ({
      name: 'BAD | Free Email & SMS Audit',
      theme: { ...BAD_THEME },
      tracking: { metaPixel: '', domain: 'go.badmarketing.com' },
      steps: [
        {
          name: 'Opt-in',
          path: '/email-sms-audit',
          seo: { title: 'Free Email & SMS Audit | BAD Marketing', description: 'Find the revenue your list is leaving on the table.' },
          sections: [
            S('announcement', { text: '🔥 We only run 10 free audits per week.', deadline: '' }),
            S('header', { logo: 'BAD MARKETING', cta: 'Claim My Audit', ctaLink: '#form' }),
            S('hero', {
              eyebrow: 'For Shopify brands doing $100k+/month',
              headline: 'Your Email List Is Sitting On Money. Let\'s Go Get It.',
              highlight: 'Sitting On Money',
              sub: 'Get a free, no-fluff Email & SMS teardown from the team behind brands doing $1B+ a year. We\'ll show you exactly which flows, segments and campaigns are leaking revenue.',
              bullets: 'Flow-by-flow revenue gap analysis\nSegmentation & deliverability check\nSMS opportunity estimate in dollars\nA 30-day action plan you keep either way',
              cta: 'Get My Free Audit →',
              ctaLink: '#form',
              note: '100% free. Takes 60 seconds to apply.',
              bg: 'dark',
            }),
            S('logos', { title: 'Trusted by 8 & 9-figure brands', items: '[Client Logo 1]\n[Client Logo 2]\n[Client Logo 3]\n[Client Logo 4]\n[Client Logo 5]', bg: 'alt' }),
            S('caseStudies', {
              headline: 'Real Retention Wins',
              items:
                '+58.9% | Email revenue | Flow rebuild + segmentation overhaul\n+47.78% | SMS revenue | New welcome, browse & winback SMS\n+20% | Email revenue | Campaign calendar + creative refresh',
              bg: 'default',
            }),
            S('problem', {
              headline: 'If Email Is Under 30% Of Your Revenue, Something\'s Broken',
              body: 'Here\'s what we find in almost every account we audit:',
              items: 'Welcome flow is 3 emails when it should be 9\nAbandoned cart hasn\'t been touched since launch\nEveryone gets the same campaign, every time\nSMS is either missing or blasting discounts',
              bg: 'alt',
            }),
            S('offer', {
              headline: 'What\'s Inside Your Free Audit',
              items: 'Full Klaviyo / Attentive / Postscript account teardown | $1,500\nFlow revenue gap model (in dollars) | $750\nDeliverability & list health report | $500\n30-day retention action plan | $750',
              price: 'FREE',
              cta: 'Claim My Free Audit',
              ctaLink: '#form',
              bg: 'default',
            }),
            S('form', {
              headline: 'Where Should We Send Your Audit?',
              sub: 'Step 1 of 2. Next you\'ll pick a time to walk through it live.',
              fields:
                'First name | text | first_name\nWork email | email | email\nMobile phone | phone | phone\nStore URL | text | website\nMonthly revenue | select | monthly_revenue | Under $50k, $50k–$100k, $100k–$500k, $500k–$1M, $1M+\nEmail/SMS platform | select | esp | Klaviyo, Attentive, Postscript, Omnisend, Other / None',
              button: 'Continue To Step 2 →',
              bg: 'dark',
            }),
            S('faq', {
              items:
                'Is it really free? | Yes. We do it because a good audit is the best sales pitch there is.\nWho does the audit? | A senior retention strategist, not a bot or an intern.\nDo you need access to my account? | View-only access gives a deeper audit, but we can start from your public flows.\nWhat if I already have an agency? | Great. Use the audit to hold them accountable.',
            }),
            FOOTER(),
          ],
        },
        {
          name: 'Book Call',
          path: '/email-sms-audit-book',
          seo: { title: 'Book Your Audit Walkthrough | BAD Marketing' },
          sections: [
            S('announcement', { text: '⚠️ Almost done: your audit isn\'t scheduled yet.' }),
            S('calendar', {
              headline: 'Step 2: Pick A Time To Walk Through Your Audit',
              sub: 'Calls are 30 minutes on Zoom. We\'ll have your audit ready.',
              url: '',
            }),
            S('steps', {
              headline: 'What Happens On The Call',
              items: 'We review your audit | Every gap, ranked by dollar impact.\nWe build your plan | Quick wins this week, bigger plays this quarter.\nYou decide | Run it in-house or have us run it. Zero pressure.',
              bg: 'alt',
            }),
            FOOTER(),
          ],
        },
        {
          name: 'Confirmed',
          path: '/email-sms-audit-confirmed',
          seo: { title: 'You\'re Booked! | BAD Marketing' },
          sections: [
            S('thankyou', {
              headline: 'You\'re Booked! Your Audit Is Underway.',
              sub: 'Confirmation is on its way to your inbox and phone.',
              items: 'Reply "YES" to our text to lock in your spot\nAdd the call to your calendar\nShare view-only Klaviyo access (link in email) for a deeper audit\nShow up with your top 3 retention questions',
            }),
            S('video', { headline: 'Watch This Before Our Call (3 min)', url: '', caption: '', cta: '' }),
            FOOTER(),
          ],
        },
      ],
      blueprint: {
        pipeline: { name: 'Retention | Email & SMS Audit', stages: STANDARD_STAGES },
        tags: ['lead-email-sms-audit', 'source-funnel', 'qualified', 'email-sms-audit-unqualified', 'nurture-long-term'],
        customFields: [...BASE_FIELDS, { name: 'ESP Platform', key: 'esp', type: 'Dropdown (single)' }],
        customValues: [{ name: 'Booking Link', key: 'booking_link', value: 'https://go.badmarketing.com/email-sms-audit-book' }],
        calendars: [{ name: 'Email & SMS Audit Walkthrough', type: 'Round Robin', duration: '30 min', notes: 'Buffer 15m, 24h min notice, max 6/day per strategist' }],
        workflows: [
          speedToLead({ tag: 'lead-email-sms-audit', pipeline: 'Retention | Email & SMS Audit', formName: 'Email & SMS Audit Opt-in' }),
          disqualify({ tag: 'email-sms-audit', rule: 'monthly_revenue is "Under $50k" → Unqualified branch, else → Qualified branch' }),
          abandoned({ tag: 'lead-email-sms-audit', pipeline: 'Retention | Email & SMS Audit' }),
          bookingReminders({ pipeline: 'Retention | Email & SMS Audit', calendar: 'Email & SMS Audit Walkthrough' }),
          noShow({ pipeline: 'Retention | Email & SMS Audit', calendar: 'Email & SMS Audit Walkthrough' }),
        ],
        kpis: [
          { metric: 'Opt-in rate (page → step 1 submit)', target: '25–40%' },
          { metric: 'Book rate (opt-in → booked)', target: '45%+' },
          { metric: 'Show rate', target: '75%+' },
          { metric: 'Speed to lead', target: '< 60 seconds' },
          { metric: 'Cost per booked call', target: 'Track by utm_content (ad level)' },
        ],
      },
    }),
  },

  {
    id: 'paid-ads-application',
    name: 'Paid Ads Application (VSL)',
    category: 'Agency lead gen',
    description:
      'High-ticket application funnel for $1M+/mo brands. VSL → application with qualifier → calendar → confirmation. Pushes the "free content when you partner" offer.',
    build: () => ({
      name: 'BAD | Paid Ads + Free Content Application',
      theme: { ...BAD_THEME, primary: '#ffd400', accent: '#e11d2e', dark: '#0a0a0a' },
      tracking: { metaPixel: '', domain: 'go.badmarketing.com' },
      steps: [
        {
          name: 'VSL',
          path: '/scale',
          seo: { title: 'Scale With BAD Marketing | Free Content Offer', description: 'For brands doing $1M+/month.' },
          sections: [
            S('announcement', { text: 'LIMITED: Partner with our paid ads team this month and get your content FREE', deadline: '2026-10-31 23:59' }),
            S('hero', {
              eyebrow: 'Only for brands doing $1M+ per month',
              headline: 'We Run Your Ads. We Make Your Content. You Pay For One.',
              highlight: 'You Pay For One',
              sub: 'Watch how our media buyers and in-house creative team scale 8 and 9-figure brands without torching margin.',
              cta: '',
              note: '',
              bg: 'dark',
            }),
            S('video', {
              headline: '',
              url: '',
              caption: '▶ Watch the 6-minute breakdown, then apply below',
              cta: 'Apply To Work With Us →',
              ctaLink: '#form',
              bg: 'dark',
            }),
            S('stats', { items: '$1B+ | Annual client revenue managed\n150+ | In-house team members\n$250M+ | Annual ad spend managed\n2015 | Scaling brands since', bg: 'primary' }),
            S('features', {
              headline: 'Ads + Creative, Finally In The Same Room',
              items:
                '🎯 | Senior media buyers | Meta, TikTok, Google & YouTube by buyers who\'ve spent 9 figures.\n🎬 | Free content engine | Statics, UGC and video hooks produced in-house every week.\n🧪 | Testing velocity | New angles shipped weekly, scored on CAC and contribution margin, not vanity ROAS.\n📊 | Real reporting | One dashboard: spend, new-customer CAC, MER and LTV.',
              bg: 'default',
            }),
            S('testimonials', {
              headline: 'From Founders We\'ve Scaled',
              items: '[Real founder quote about scale + profitability] | [Founder Name] | Founder, [9-figure DTC brand]\n[Real quote about creative volume] | [Name] | CMO, [Brand]\n[Real quote about communication] | [Name] | Head of Growth, [Brand]',
            }),
            S('form', {
              headline: 'Apply To Partner With BAD',
              sub: 'We take on a limited number of brands each month so every account gets senior attention.',
              fields:
                'First name | text | first_name\nLast name | text | last_name\nWork email | email | email\nPhone | phone | phone\nBrand website | text | website\nMonthly revenue | select | monthly_revenue | Under $250k, $250k–$500k, $500k–$1M, $1M–$3M, $3M+\nMonthly ad spend | select | monthly_ad_spend | Under $50k, $50k–$150k, $150k–$500k, $500k+\nBiggest growth bottleneck | textarea | bottleneck',
              button: 'Submit Application →',
              bg: 'alt',
            }),
            S('faq', {
              items:
                'Why only $1M+/month brands? | The free content offer only makes sense at scale. Below that, we\'ll point you to the right resources.\nWhat does "free content" include? | A monthly batch of statics, UGC-style video and hooks produced by our in-house team while you\'re on paid ads management.\nIs there a long-term contract? | We\'ll walk through terms on the call. We earn the renewal every month.\nHow fast can we launch? | Most accounts are live within 14 days of kickoff.',
            }),
            FOOTER(),
          ],
        },
        {
          name: 'Book Strategy Call',
          path: '/scale-book',
          seo: { title: 'Book Your Strategy Call | BAD Marketing' },
          sections: [
            S('hero', {
              eyebrow: 'Application received ✓',
              headline: 'Last Step: Book Your Strategy Call',
              highlight: 'Last Step',
              sub: 'Pick a time below. You\'ll meet with a senior strategist, not a sales rep.',
              cta: '',
              note: '',
              bg: 'dark',
            }),
            S('calendar', { headline: '', sub: '', url: '' }),
            S('guarantee', {
              headline: 'Our Promise For This Call',
              body: 'You\'ll leave with a clear read on your account: what\'s working, what\'s wasting money, and what we\'d test first. Even if we never work together.',
            }),
            FOOTER(),
          ],
        },
        {
          name: 'Confirmed',
          path: '/scale-confirmed',
          seo: { title: 'Confirmed | BAD Marketing' },
          sections: [
            S('thankyou', {
              headline: 'You\'re Confirmed. Let\'s Scale.',
              sub: 'Here\'s how to get the most out of our call:',
              items: 'Reply YES to the confirmation text\nShare view-only Ads Manager access (instructions in your email)\nHave your last 90 days of MER / CAC handy\nBring anyone who signs off on agency decisions',
            }),
            S('caseStudies', { headline: 'While You Wait: Recent Wins', bg: 'alt' }),
            FOOTER(),
          ],
        },
      ],
      blueprint: {
        pipeline: { name: 'Paid Ads | Inbound Applications', stages: STANDARD_STAGES },
        tags: ['lead-paid-ads', 'offer-free-content', 'qualified', 'paid-ads-unqualified', 'high-spend'],
        customFields: [
          ...BASE_FIELDS,
          { name: 'Monthly Ad Spend', key: 'monthly_ad_spend', type: 'Dropdown (single)' },
          { name: 'Biggest Bottleneck', key: 'bottleneck', type: 'Large text' },
        ],
        customValues: [{ name: 'Booking Link', key: 'booking_link', value: 'https://go.badmarketing.com/scale-book' }],
        calendars: [{ name: 'Paid Ads Strategy Call', type: 'Round Robin (senior strategists)', duration: '45 min', notes: 'Form questions shown on calendar so the strategist preps' }],
        workflows: [
          speedToLead({ tag: 'lead-paid-ads', pipeline: 'Paid Ads | Inbound Applications', formName: 'Paid Ads Application', owner: 'Round robin: Senior strategists (weighted by close rate)' }),
          disqualify({
            tag: 'paid-ads',
            rule: 'monthly_revenue in ["$1M–$3M","$3M+"] → Qualified (add tag high-spend if ad spend $150k+). Else → Unqualified: redirect to free resources, no calendar.',
          }),
          abandoned({ tag: 'lead-paid-ads', pipeline: 'Paid Ads | Inbound Applications' }),
          bookingReminders({ pipeline: 'Paid Ads | Inbound Applications', calendar: 'Paid Ads Strategy Call' }),
          noShow({ pipeline: 'Paid Ads | Inbound Applications', calendar: 'Paid Ads Strategy Call' }),
          {
            name: '06 | Post-Call Proposal Follow-Up',
            trigger: 'Opportunity stage changed to "Proposal Sent"',
            goal: 'Close or get a clear no within 14 days.',
            actions: [
              { delay: '0m', type: 'Send Email', detail: 'Proposal recap + Loom walkthrough from the strategist.' },
              { delay: '2d', type: 'Send SMS', detail: 'Any questions on the proposal? Happy to jump on a quick call with your team.' },
              { delay: '5d', type: 'Create Task', detail: 'Strategist: personal video follow-up.' },
              { delay: '10d', type: 'Send Email', detail: '"Should I close your file?" breakup email.' },
            ],
          },
        ],
        kpis: [
          { metric: 'VSL play rate', target: '60%+' },
          { metric: 'Application rate (visitor → app)', target: '4–8%' },
          { metric: 'Qualified rate', target: '40%+ of applications' },
          { metric: 'Show rate', target: '70%+' },
          { metric: 'Close rate on qualified calls', target: '20–30%' },
        ],
      },
    }),
  },

  {
    id: 'amazon-growth',
    name: 'Amazon Growth Call',
    category: 'Agency lead gen',
    description: 'Service landing page for the Amazon team with a value-stack bonus (free compliance management) → book a call.',
    build: () => ({
      name: 'BAD | Amazon Growth System',
      theme: { ...BAD_THEME, primary: '#ff9900', accent: '#0b0b0f', dark: '#111827', headingFont: 'Sora' },
      tracking: { metaPixel: '', domain: 'go.badmarketing.com' },
      steps: [
        {
          name: 'Landing',
          path: '/amazon',
          seo: { title: 'Amazon Growth System | BAD Marketing' },
          sections: [
            S('header', { logo: 'BAD MARKETING', cta: 'Book Free Call', ctaLink: '#form' }),
            S('hero', {
              eyebrow: 'Amazon Growth System',
              headline: 'Grow Your Amazon Revenue Without Giving Away Your Margin',
              highlight: 'Without Giving Away Your Margin',
              sub: 'PPC, listing optimization, creative and account health, run by one team that answers to your P&L.',
              bullets: 'PPC structure built for TACoS, not just ACoS\nListings & A+ content rewritten to convert\nAccount health & compliance handled for you',
              cta: 'Book My Free Amazon Audit',
              ctaLink: '#form',
              note: 'Bonus: FREE monthly compliance management ($1,500 value) when you partner with us.',
              bg: 'dark',
            }),
            S('steps', {
              headline: 'The Amazon Growth System',
              items: 'Audit | We find wasted spend, suppressed listings and keyword gaps.\nRebuild | Campaign architecture, listings and creative rebuilt in 30 days.\nScale | Weekly optimization against TACoS and contribution margin.',
            }),
            S('offer', {
              headline: 'Partner This Month And Get',
              items: 'Full PPC & listing audit | $2,000\nCampaign restructure | $3,000\nMonthly compliance management | $1,500/mo\nDedicated account manager | Included',
              price: 'Book A Call To See If You Qualify',
              cta: 'Book My Free Call',
              ctaLink: '#form',
              bg: 'alt',
            }),
            S('form', {
              headline: 'Get Your Free Amazon Audit',
              fields: 'First name | text | first_name\nEmail | email | email\nPhone | phone | phone\nAmazon store URL | text | website\nMonthly Amazon revenue | select | monthly_revenue | Under $50k, $50k–$250k, $250k–$1M, $1M+',
              button: 'Book My Call →',
              bg: 'dark',
            }),
            FOOTER(),
          ],
        },
        {
          name: 'Book',
          path: '/amazon-book',
          sections: [S('calendar', { headline: 'Choose A Time For Your Amazon Audit', url: '' }), FOOTER()],
        },
        {
          name: 'Confirmed',
          path: '/amazon-confirmed',
          sections: [
            S('thankyou', {
              headline: 'You\'re Booked! 📦',
              items: 'Reply YES to the confirmation text\nAdd a user to Seller Central for our audit (steps in your email)\nPull your last 60 days of Business Reports',
            }),
            FOOTER(),
          ],
        },
      ],
      blueprint: {
        pipeline: { name: 'Amazon | Inbound', stages: STANDARD_STAGES },
        tags: ['lead-amazon', 'offer-free-compliance', 'qualified', 'amazon-unqualified'],
        customFields: [...BASE_FIELDS],
        customValues: [{ name: 'Booking Link', key: 'booking_link', value: 'https://go.badmarketing.com/amazon-book' }],
        calendars: [{ name: 'Amazon Audit Call', type: 'Round Robin', duration: '30 min', notes: '' }],
        workflows: [
          speedToLead({ tag: 'lead-amazon', pipeline: 'Amazon | Inbound', formName: 'Amazon Audit' }),
          bookingReminders({ pipeline: 'Amazon | Inbound', calendar: 'Amazon Audit Call' }),
          noShow({ pipeline: 'Amazon | Inbound', calendar: 'Amazon Audit Call' }),
        ],
        kpis: [
          { metric: 'Landing → booked', target: '8%+' },
          { metric: 'Show rate', target: '75%+' },
        ],
      },
    }),
  },

  {
    id: 'webinar',
    name: 'Info-Product Webinar',
    category: 'Client funnel',
    description:
      'The funnel BAD would build FOR an info-product client (coaches, creators): registration → confirmation → replay with offer → checkout → course access. Uses GHL Payments and Memberships end to end.',
    build: () => ({
      name: 'Client | Free Masterclass Funnel',
      theme: { ...BAD_THEME, primary: '#6d28d9', accent: '#facc15', dark: '#140b2e', headingFont: 'Unbounded', bodyFont: 'Instrument Sans' },
      tracking: { metaPixel: '', domain: 'join.clientbrand.com' },
      steps: [
        {
          name: 'Registration',
          path: '/masterclass',
          seo: { title: 'Free Masterclass' },
          sections: [
            S('announcement', { text: 'LIVE training starts in', deadline: '2026-10-15 19:00' }),
            S('hero', {
              eyebrow: 'Free live masterclass',
              headline: 'How To Build A 6-Figure Coaching Offer In 90 Days (Without A Big Audience)',
              highlight: '6-Figure',
              sub: 'Join [Creator Name] live and steal the exact 3-step framework behind [X] client launches.',
              bullets: 'The offer framework that sells without discounts\nHow to get your first 10 clients from a small audience\nThe one-page funnel that books calls on autopilot',
              cta: 'Save My Free Seat',
              ctaLink: '#form',
              note: 'Seats are limited to 500 live attendees.',
              bg: 'dark',
            }),
            S('form', {
              headline: 'Reserve Your Seat',
              sub: '',
              fields: 'First name | text | first_name\nEmail | email | email\nPhone (for a text reminder) | phone | phone',
              button: 'Register Now →',
              bg: 'alt',
            }),
            S('text', {
              headline: 'Who Is [Creator Name]?',
              body: 'Write a 2–3 paragraph origin story here: the struggle, the breakthrough, and the results since.\n\nEnd with why they\'re teaching this for free.',
            }),
            FOOTER('Client Brand'),
          ],
        },
        {
          name: 'Confirmation',
          path: '/masterclass-confirmed',
          sections: [
            S('thankyou', {
              headline: 'You\'re Registered! 🎉',
              sub: 'Do these 3 things so you don\'t miss it:',
              items: 'Add the training to your calendar\nText "IN" to the number that just messaged you\nJoin the private community for bonus material',
            }),
            S('video', { headline: 'Watch This Quick Message From [Creator Name]', url: '', caption: '', cta: '' }),
            FOOTER('Client Brand'),
          ],
        },
        {
          name: 'Replay + Offer',
          path: '/masterclass-replay',
          sections: [
            S('announcement', { text: 'Replay comes down in', deadline: '2026-10-18 23:59' }),
            S('video', { headline: 'Masterclass Replay', url: '', caption: '', cta: 'Join The Program →', ctaLink: '#offer', bg: 'dark' }),
            S('offer', {
              headline: 'Join The 90-Day Accelerator',
              items: '12-week core program | $2,997\nWeekly live coaching calls | $1,997\nDone-for-you funnel templates | $997\nPrivate community | $497',
              price: '$997',
              cta: 'Enroll Now',
              ctaLink: '#checkout',
            }),
            S('checkout', { headline: 'Join The 90-Day Accelerator', product: '90-Day Accelerator', price: '$997' }),
            S('guarantee', { headline: '30-Day Action Guarantee', body: 'Do the work for 30 days. If you don\'t have a sellable offer, we\'ll refund every penny.' }),
            S('faq', {}),
            FOOTER('Client Brand'),
          ],
        },
        {
          name: 'Welcome',
          path: '/accelerator-welcome',
          seo: { title: 'Welcome To The Accelerator' },
          sections: [
            S('thankyou', {
              headline: 'You\'re In! Welcome To The Accelerator 🎉',
              sub: 'Your login to the course portal is on its way to your inbox.',
              items: 'Open the email titled "Your course login"\nLog in and watch Module 1 (20 minutes)\nBook your onboarding call from inside the portal\nJoin the private community',
            }),
            FOOTER('Client Brand'),
          ],
        },
      ],
      blueprint: {
        pipeline: { name: 'Masterclass | Launch', stages: ['Registered', 'Attended Live', 'Watched Replay', 'Clicked Offer', 'Purchased', 'Booked Call', 'Not Interested'] },
        tags: ['webinar-registered', 'webinar-attended', 'webinar-noshow', 'offer-clicked', 'customer-accelerator'],
        customFields: [...BASE_FIELDS.filter((f) => f.key !== 'monthly_revenue' && f.key !== 'website'), { name: 'Webinar Date', key: 'webinar_date', type: 'Date' }],
        products: [{ name: '90-Day Accelerator', price: '$997', delivers: 'Course portal (Memberships)' }],
        customValues: [
          { name: 'Webinar Link', key: 'webinar_link', value: 'https://zoom.us/j/...' },
          { name: 'Replay Link', key: 'replay_link', value: 'https://join.clientbrand.com/masterclass-replay' },
        ],
        calendars: [],
        workflows: [
          {
            name: '01 | Registration → Indoctrination',
            trigger: 'Form Submitted: Masterclass Registration',
            goal: '60%+ live attendance from registrants.',
            actions: [
              { delay: '0m', type: 'Add Tag', detail: 'webinar-registered' },
              { delay: '0m', type: 'Send Email', detail: 'Confirmation + calendar file + "what you\'ll learn"' },
              { delay: '0m', type: 'Send SMS', detail: 'You\'re in, {{contact.first_name}}! Text IN so I know you\'ll be there.' },
              { delay: 'Daily until event', type: 'Send Email', detail: 'Value emails: story, case study, framework teaser.' },
              { delay: '1h before', type: 'Send SMS + Email', detail: 'Starting in 1 hour: {{custom_values.webinar_link}}' },
              { delay: '5m after start', type: 'Send SMS', detail: 'We\'re LIVE! Jump in: {{custom_values.webinar_link}}' },
            ],
          },
          {
            name: '02 | Replay + Cart Close Sequence',
            trigger: 'Event end (date-based) → branch on attended / no-show tag',
            goal: 'Convert 3–8% of registrants to buyers.',
            actions: [
              { delay: '+1h', type: 'Send Email', detail: 'Attended: "Here\'s the offer link + bonuses". No-show: "You missed it, replay is up for 72h".' },
              { delay: '+24h', type: 'Send SMS', detail: 'Replay link: {{custom_values.replay_link}}' },
              { delay: '+48h', type: 'Send Email', detail: 'Case study + FAQ objection handling.' },
              { delay: '+70h', type: 'Send SMS + Email', detail: '2 hours left before the replay and bonuses disappear.' },
              { delay: 'On purchase', type: 'Remove From Workflow', detail: 'Tag customer-accelerator, start onboarding workflow.' },
            ],
          },
          {
            name: '03 | Purchase → Course Access',
            trigger: 'Order Submitted / Payment Received (GoHighLevel Payments): 90-Day Accelerator',
            goal: 'Buyers get their course login within a minute, no manual work.',
            actions: [
              { delay: '0m', type: 'Grant Offer Access', detail: 'Memberships → offer "90-Day Accelerator" (course portal).' },
              { delay: '0m', type: 'Add Tag', detail: 'customer-accelerator' },
              { delay: '0m', type: 'Update Opportunity', detail: 'Masterclass | Launch → "Purchased" (value = order total)' },
              { delay: '0m', type: 'Send Email', detail: 'Subject: "Your course login". Portal link + login details + first step.' },
              { delay: '1d', type: 'Send SMS', detail: 'Hey {{contact.first_name}}, did you get into Module 1? Reply here if you need help logging in.' },
              { delay: '7d', type: 'If/Else', detail: 'No course login yet → create task for coach to call.' },
            ],
          },
        ],
        kpis: [
          { metric: 'Registration rate', target: '30–50%' },
          { metric: 'Live show-up rate', target: '25–40%' },
          { metric: 'Registrant → buyer', target: '3–8%' },
          { metric: 'Cost per registrant', target: '< $10 (vertical dependent)' },
        ],
      },
    }),
  },

  {
    id: 'local-quote',
    name: 'Local Business Quote',
    category: 'Client funnel',
    description: 'Two-step quote funnel for local service clients (med spas, home services). Offer → quick quote → thank you, with a missed-call text-back.',
    build: () => ({
      name: 'Client | Local Free Quote',
      theme: { ...BAD_THEME, primary: '#0e7c66', accent: '#ffb703', dark: '#0f2a24', headingFont: 'Outfit', bodyFont: 'Plus Jakarta Sans', radius: 14 },
      tracking: { metaPixel: '', domain: 'quote.clientbrand.com' },
      steps: [
        {
          name: 'Offer',
          path: '/free-quote',
          sections: [
            S('header', { logo: '[CLIENT BRAND]', cta: 'Call (555) 555-5555', ctaLink: 'tel:5555555555' }),
            S('hero', {
              eyebrow: 'Serving [City] & surrounding areas',
              headline: 'Get Your Free [Service] Quote In 60 Seconds',
              highlight: 'Free',
              sub: 'Licensed, insured and rated 4.9★ by [X] local homeowners.',
              bullets: 'Same-week appointments\nUpfront pricing, no surprises\n[X]-year workmanship warranty',
              cta: 'Get My Free Quote',
              ctaLink: '#form',
              note: '',
              bg: 'dark',
            }),
            S('form', {
              headline: 'Tell Us About Your Project',
              fields: 'Name | text | first_name\nPhone | phone | phone\nEmail | email | email\nZip code | text | postal_code\nService needed | select | service | [Service A], [Service B], [Service C], Not sure',
              button: 'Get My Quote →',
            }),
            S('testimonials', { headline: 'Your Neighbors Love Us', bg: 'alt' }),
            FOOTER('[Client Brand]'),
          ],
        },
        {
          name: 'Thank You',
          path: '/free-quote-thanks',
          sections: [
            S('thankyou', {
              headline: 'Got It! We\'ll Text You In The Next 5 Minutes',
              sub: 'Want it even faster? Call us now at (555) 555-5555.',
              items: 'Watch for a text from our team\nHave a couple of photos of the project ready\nPick your appointment time',
            }),
            FOOTER('[Client Brand]'),
          ],
        },
      ],
      blueprint: {
        pipeline: { name: 'Local | Quote Requests', stages: ['New Lead', 'Contacted', 'Estimate Booked', 'Estimate Given', 'Won', 'Lost'] },
        tags: ['lead-quote', 'missed-call'],
        customFields: [
          { name: 'Service', key: 'service', type: 'Dropdown (single)' },
          { name: 'UTM Source', key: 'utm_source', type: 'Text' },
        ],
        customValues: [],
        calendars: [{ name: 'In-Home Estimate', type: 'Service calendar', duration: '60 min', notes: 'Location = contact address' }],
        workflows: [
          speedToLead({ tag: 'lead-quote', pipeline: 'Local | Quote Requests', formName: 'Free Quote', owner: 'Office manager' }),
          {
            name: '02 | Missed Call Text-Back',
            trigger: 'Call Status: Missed / No answer',
            goal: 'Never lose a call-in lead.',
            actions: [
              { delay: '0m', type: 'Send SMS', detail: 'Sorry we missed you! This is [Client Brand]. How can we help? Reply here and we\'ll get right back to you.' },
              { delay: '0m', type: 'Add Tag', detail: 'missed-call' },
              { delay: '0m', type: 'Create Opportunity', detail: 'Local | Quote Requests → New Lead' },
            ],
          },
          {
            name: '03 | Review Request',
            trigger: 'Opportunity stage changed to "Won"',
            goal: 'Grow Google reviews every week.',
            actions: [
              { delay: '1d', type: 'Send Review Request', detail: 'GHL Reputation → Google review link via SMS.' },
              { delay: '3d', type: 'Send Email', detail: 'Reminder if no review left.' },
            ],
          },
        ],
        kpis: [
          { metric: 'Form conversion', target: '15%+' },
          { metric: 'Contact rate in 5 min', target: '90%+' },
          { metric: 'Lead → estimate', target: '40%+' },
        ],
      },
    }),
  },

  {
    id: 'blank',
    name: 'Blank Funnel',
    category: 'Start from scratch',
    description: 'One empty step with a header and footer.',
    build: () => ({
      name: 'New Funnel',
      theme: { ...BAD_THEME },
      tracking: { metaPixel: '', domain: '' },
      steps: [{ name: 'Step 1', path: '/step-1', sections: [S('header', {}), S('hero', {}), S('form', {}), FOOTER('Your Company')] }],
      blueprint: { pipeline: { name: 'New Pipeline', stages: STANDARD_STAGES }, tags: [], customFields: [], customValues: [], calendars: [], workflows: [], kpis: [] },
    }),
  },
];

export function buildTemplate(id) {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown template: ${id}`);
  return { templateId: id, ...t.build() };
}
