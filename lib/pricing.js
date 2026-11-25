// Single source of truth for plans, prices and the Black Friday / Cyber Monday promo.
// The browser never sends prices; the server recomputes everything from this file.
// Source: "FieldForge Partners: offer comparison" and "FieldForge Partners: the full offer ladder".

// Default deadline: end of Cyber Monday (Mon Nov 30, 2026) at 11:59:59 PM Pacific,
// so the deal is still live everywhere in the continental US. Override with PROMO_ENDS_AT (ISO 8601).
const DEFAULT_PROMO_ENDS_AT = '2026-12-01T07:59:59Z';

// promo.options: the commitment terms a buyer can choose during the deal.
//   { paid, free } - pay for `paid` months; the next `free` months are free, delivered at the
//                    END of the paid term. The first option is the default.
const PLANS = {
  beacon: {
    id: 'beacon',
    name: 'Beacon',
    tagline: 'Visibility plan',
    summary:
      'A site written to rank and be cited by AI, technical SEO fixed, steady articles and links, and a Google profile that earns reviews.',
    monthly: 1500,
    setup: 2500,
    minTermMonths: 3,
    guarantee: 'Live in 14 days',
    includes: [
      "Homepage mockup and copy for a 4-page site, built for E-E-A-T, AI visibility and Google best practice",
      "Technical SEO, with FieldForge making the changes",
      "Google Business Profile, Search Console and Analytics setup",
      "One-time backlink cleanup",
      "2 articles and 2–4 quality links a month",
      "Quarterly AI shortlist check (is your company named by ChatGPT and Google AI?)",
      "Monthly competitor watch and PR suggestions",
      "Google review requests",
      "Monthly 1-page report and a 30-minute call",
    ],
    note: "Guarantee: when FieldForge builds the site, it goes live within 14 days of content approval, or $1,500 comes off the next month. Website builds are $400/page (4-page minimum).",
    promo: { options: [{ paid: 3, free: 1 }] },
    promoFinePrint: 'The one-time $2,500 setup fee still applies.',
  },
  pipeline: {
    id: 'pipeline',
    name: 'Pipeline Engine',
    tagline: 'Lead flow, done for you',
    summary:
      'Finds the accounts that fit, reaches the right people by email, LinkedIn and Reddit, and hands your sales team interested buyers. Includes everything in Beacon.',
    monthly: 9500,
    setup: 0,
    minTermMonths: 4,
    guarantee: '12 qualified meetings in 120 days',
    includes: [
      "Everything in Beacon",
      "Month 1: ideal customer profile, messaging, sending domains and deliverability",
      "Cold email, with list enrichment",
      "LinkedIn connections and messaging",
      "Reddit, posted from your account",
      "Re-engagement of dormant and closed-lost deals",
      "Reply handling and handover, with a one-page account brief per lead",
      "Monthly trigger list for your sales team",
      "Quarterly board-ready pipeline one-pager and a monthly report",
    ],
    note: "Guarantee: 12 qualified meetings within 120 days of campaign activation. If we miss, we keep working at no management fee until we hit it. Add cold calling ($3,000/mo per agent) or ads ($1,500/mo per platform) any time.",
    promo: { options: [{ paid: 5, free: 1 }] },
    promoFinePrint: "Free months are separate from the meeting guarantee. They don't count toward the guarantee period or any free extension.",
  },
  fullbore: {
    id: 'fullbore',
    name: 'Full Bore',
    tagline: 'Pipeline Engine + calling + ads',
    summary:
      'Everything in Pipeline Engine, plus cold calling and paid ads, run together so the meetings come faster. Ad spend is paid separately.',
    monthly: 16500,
    setup: 0,
    minTermMonths: 4,
    guarantee: '20 qualified meetings in 90 days',
    includes: [
      "Everything in Pipeline Engine",
      "Cold calling, 1 agent included",
      "LinkedIn ads management",
      "Meta ads management",
      "The whole buying committee covered across email, LinkedIn, Reddit, phone and ads",
    ],
    note: "Guarantee: 20 qualified meetings within 90 days of campaign activation, with no cap on the free extension. Ad spend is paid directly by you (from $2,000/mo per platform).",
    promo: { options: [{ paid: 6, free: 2 }, { paid: 9, free: 3 }] },
    promoFinePrint: "Free months are separate from the meeting guarantee. They don't count toward the guarantee period or any free extension. Ad spend is still paid by you, directly to the platforms, during free months.",
  },
  controlroom: {
    id: 'controlroom',
    name: 'Control Room',
    tagline: 'Fractional CMO',
    summary:
      'A fractional CMO for the team you already have: weekly direction, priorities, approvals and executive reporting. Advisory only; your team does the work.',
    monthly: 9500,
    setup: 0,
    minTermMonths: 3,
    guarantee: null,
    includes: [
      "Weekly senior direction for your marketing team",
      "Strategy, priorities and leadership cadence",
      "KPI and budget oversight",
      "Sales and marketing alignment",
      "Direction and approval of major assets",
      "Feedback on your primary web pages",
      "Executive reporting",
    ],
    note: "Advisory only: your team does the work. Running alongside Pipeline Engine or Full Bore? $2,500 a month comes off Control Room.",
    promo: null,
  },
};

function promoEndsAt() {
  const raw = process.env.PROMO_ENDS_AT || DEFAULT_PROMO_ENDS_AT;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new Error(`PROMO_ENDS_AT is not a valid date: ${raw}`);
  return d;
}

function promoActive(now = new Date()) {
  return now.getTime() <= promoEndsAt().getTime();
}

const usd = (n) => `$${Number(n).toLocaleString('en-US')}`;

// "11", "10 and 11", "10, 11 and 12"
function monthList(paid, free) {
  const m = [];
  for (let i = 1; i <= free; i++) m.push(paid + i);
  return m.length === 1 ? `${m[0]}` : `${m.slice(0, -1).join(', ')} and ${m[m.length - 1]}`;
}

function promoLabel(opt) {
  if (!opt) return null;
  return `Pay for ${opt.paid} months, month${opt.free > 1 ? 's' : ''} ${monthList(opt.paid, opt.free)} free`;
}

// Quote a plan at a given moment. Everything the customer is promised comes from here.
// `paidMonths` picks a term option; an unknown value falls back to the plan's default option.
function quote(planId, { now = new Date(), paidMonths } = {}) {
  const plan = PLANS[planId];
  if (!plan) return null;

  const options = (plan.promo && plan.promo.options) || [];
  const promoApplied = options.length > 0 && promoActive(now);
  const opt = promoApplied ? options.find((o) => o.paid === Number(paidMonths)) || options[0] : null;

  const commitMonths = opt ? opt.paid : plan.minTermMonths;
  const freeMonths = opt ? opt.free : 0;
  const totalMonths = commitMonths + freeMonths;
  return {
    planId: plan.id,
    planName: plan.name,
    monthly: plan.monthly,
    setupList: plan.setup,
    setup: plan.setup,
    commitMonths,
    freeMonths,
    totalMonths,
    commitTotal: plan.setup + commitMonths * plan.monthly,
    effectiveMonthly: Math.round((commitMonths * plan.monthly) / totalMonths),
    firstInvoice: plan.setup + plan.monthly,
    totalSavings: freeMonths * plan.monthly,
    promoApplied,
    promoLabel: promoLabel(opt),
    promoFinePrint: promoApplied ? plan.promoFinePrint || null : null,
  };
}

// Plain-English description of one quoted term, for the page and emails.
function incentive(q) {
  if (!q || !q.promoApplied) return null;
  const many = q.freeMonths > 1;
  return {
    headline: `Pay for ${q.commitMonths} months, get ${q.totalMonths}`,
    detail: `${many ? 'Months' : 'Month'} ${monthList(q.commitMonths, q.freeMonths)} ${many ? 'are' : 'is'} free, worth ${usd(q.totalSavings)}. Effective rate: ${usd(q.effectiveMonthly)}/mo.`,
    value: q.totalSavings,
    fine: q.promoFinePrint,
  };
}

// The plan-level headline for the card: the best deal on offer.
function bestDeal(planId, now = new Date()) {
  const plan = PLANS[planId];
  if (!plan || !plan.promo || !promoActive(now)) return null;
  const quotes = plan.promo.options.map((o) => quote(planId, { now, paidMonths: o.paid }));
  const best = quotes.reduce((a, b) => (b.totalSavings > a.totalSavings ? b : a));
  return {
    headline: quotes.length > 1 ? `Up to ${best.freeMonths} months free` : incentive(best).headline,
    detail: quotes.length > 1
      ? quotes.map((q) => `Pay ${q.commitMonths}, get ${q.totalMonths}`).join(' · ')
      : `Month${best.freeMonths > 1 ? 's' : ''} ${monthList(best.commitMonths, best.freeMonths)} free · worth ${usd(best.totalSavings)}`,
    value: best.totalSavings,
  };
}

module.exports = { PLANS, quote, incentive, bestDeal, promoActive, promoEndsAt, promoLabel, usd };
