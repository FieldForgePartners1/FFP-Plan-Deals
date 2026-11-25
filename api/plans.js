const { PLANS, quote, incentive, bestDeal, promoActive, promoEndsAt } = require('../lib/pricing');

// GET /api/plans: what the page renders. Prices come from the server so the page and
// the stored record can never disagree.
module.exports = (req, res) => {
  const now = new Date();
  const live = promoActive(now);
  const plans = Object.values(PLANS).map((p) => {
    const terms = live && p.promo
      ? p.promo.options.map((o) => quote(p.id, { now, paidMonths: o.paid }))
      : [quote(p.id, { now })];
    return {
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      summary: p.summary,
      guarantee: p.guarantee,
      includes: p.includes,
      note: p.note,
      deal: bestDeal(p.id, now),
      terms: terms.map((q) => ({ ...q, incentive: incentive(q) })),
    };
  });
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ promoActive: live, promoEndsAt: promoEndsAt().toISOString(), plans });
};
