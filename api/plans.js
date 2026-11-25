const { PLANS, quote, incentive, promoActive, promoEndsAt, promoLabel } = require('../lib/pricing');

// GET /api/plans: what the page renders. Prices come from the server so the page and
// the stored record can never disagree.
module.exports = (req, res) => {
  const now = new Date();
  const plans = Object.values(PLANS).map((p) => ({
    id: p.id,
    name: p.name,
    tagline: p.tagline,
    summary: p.summary,
    guarantee: p.guarantee,
    includes: p.includes,
    note: p.note,
    promoLabel: promoLabel(p),
    quote: quote(p.id, { now }),
  })).map((p) => ({ ...p, incentive: incentive(p.quote) }));
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ promoActive: promoActive(now), promoEndsAt: promoEndsAt().toISOString(), plans });
};
