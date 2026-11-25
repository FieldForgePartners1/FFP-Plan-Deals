// Single source of truth for plans, prices and the Black Friday / Cyber Monday promo.
// The browser never sends prices; the server recomputes everything from this file.
// Source: "FieldForge Partners: offer comparison" and "FieldForge Partners: the full offer ladder".

// Default deadline: end of Cyber Monday (Mon Nov 30, 2026) at 11:59:59 PM Pacific,
// so the deal is still live everywhere in the continental US. Override with PROMO_ENDS_AT (ISO 8601).
const DEFAULT_PROMO_ENDS_AT = '2026-12-01T07:59:59Z';

// Promo types:
//   { type: 'setup_discount', amount }            - one-time amount off the setup fee
//   { type: 'free_months', paidMonths, freeMonths } - commit to paidMonths, the next freeMonths
//                                                   are free (delivered at the END of the term)
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
    promo: { type: 'free_months', paidMonths: 3, freeMonths: 1 },
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
    promo: { type: 'free_months', paidMonths: 6, freeMonths: 1 },
    promoFinePrint: "Your free month is separate from the meeting guarantee. It doesn't count toward the guarantee period or any free extension.",
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
    promo: { type: 'free_months', paidMonths: 6, freeMonths: 1 },
    promoFinePrint: "Your free month is separate from the meeting guarantee. It doesn't count toward the guarantee period or any free extension. Ad spend is still paid by you, directly to the platforms, during the free month.",
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

function promoLabel(plan) {
  const p = plan.promo;
  if (!p) return null;
  if (p.type === 'setup_discount') return `${usd(p.amount)} off setup`;
  const free =
    p.freeMonths === 1
      ? `month ${p.paidMonths + 1} free`
      : `months ${p.paidMonths + 1} and ${p.paidMonths + p.freeMonths} free`;
  return `Commit to ${p.paidMonths} months, ${free}`;
}

// Quote a plan at a given moment. Everything the customer is promised comes from here.
function quote(planId, { now = new Date() } = {}) {
  const plan = PLANS[planId];
  if (!plan) return null;

  const promoApplied = Boolean(plan.promo && promoActive(now));
  let setup = plan.setup;
  let commitMonths = plan.minTermMonths; // months the client pays for
  let freeMonths = 0;
  let totalSavings = 0;

  if (promoApplied && plan.promo.type === 'setup_discount') {
    totalSavings = Math.min(plan.promo.amount, setup);
    setup -= totalSavings;
  }
  if (promoApplied && plan.promo.type === 'free_months') {
    commitMonths = plan.promo.paidMonths;
    freeMonths = plan.promo.freeMonths;
    totalSavings = freeMonths * plan.monthly;
  }

  const totalMonths = commitMonths + freeMonths;
  const commitTotal = setup + commitMonths * plan.monthly;
  return {
    planId: plan.id,
    planName: plan.name,
    monthly: plan.monthly,
    setupList: plan.setup,
    setup,
    commitMonths,
    freeMonths,
    totalMonths,
    commitTotal, // what the client is committing to pay over the term, setup included
    effectiveMonthly: Math.round((commitMonths * plan.monthly) / totalMonths),
    firstInvoice: setup + plan.monthly,
    totalSavings,
    promoApplied,
    promoLabel: promoApplied ? promoLabel(plan) : null,
    promoFinePrint: promoApplied ? plan.promoFinePrint || null : null,
  };
}

// Plain-English description of the deal, for the page and emails.
function incentive(q) {
  if (!q || !q.promoApplied) return null;
  if (q.freeMonths) {
    const which = q.freeMonths === 1 ? `Month ${q.commitMonths + 1} is free` : `Months ${q.commitMonths + 1} and ${q.totalMonths} are free`;
    return {
      headline: `Pay for ${q.commitMonths} months, get ${q.totalMonths}`,
      detail: `${which}, worth ${usd(q.totalSavings)}. That brings your effective rate to ${usd(q.effectiveMonthly)}/mo.`,
      value: q.totalSavings,
      fine: q.promoFinePrint,
    };
  }
  return {
    headline: `${usd(q.totalSavings)} off setup`,
    detail: `Setup drops from ${usd(q.setupList)} to ${usd(q.setup)}.`,
    value: q.totalSavings,
  };
}

module.exports = { PLANS, quote, incentive, promoActive, promoEndsAt, promoLabel, usd };
