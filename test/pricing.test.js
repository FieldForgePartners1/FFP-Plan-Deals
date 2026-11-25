const assert = require('assert');
const { quote, bestDeal } = require('../lib/pricing');
const before = new Date('2026-11-30T20:00:00-08:00');
const after = new Date('2026-12-01T00:00:01-08:00');
const pick = (q) => [q.commitMonths, q.freeMonths, q.totalMonths, q.totalSavings, q.firstInvoice, q.commitTotal];

// Beacon: pay 3, get 4 (setup fee still applies)
assert.deepStrictEqual(pick(quote('beacon', { now: before })), [3, 1, 4, 1500, 4000, 7000]);
assert.strictEqual(quote('beacon', { now: before, paidMonths: 6 }).commitMonths, 3); // no 6-month option

// Pipeline Engine: pay 4 get 5 (default), or pay 6 get 8
assert.deepStrictEqual(pick(quote('pipeline', { now: before })), [4, 1, 5, 9500, 9500, 38000]);
assert.deepStrictEqual(pick(quote('pipeline', { now: before, paidMonths: '6' })), [6, 2, 8, 19000, 9500, 57000]);
assert.deepStrictEqual(pick(quote('pipeline', { now: before, paidMonths: 5 })), [4, 1, 5, 9500, 9500, 38000]); // retired term -> default
assert.deepStrictEqual(bestDeal('pipeline', before), { headline: 'Up to 2 months free', detail: 'Pay 4, get 5 · Pay 6, get 8', value: 19000 });

// Full Bore: pay 6 get 8 only; the 9-month option is gone
assert.deepStrictEqual(pick(quote('fullbore', { now: before })), [6, 2, 8, 33000, 16500, 99000]);
assert.deepStrictEqual(pick(quote('fullbore', { now: before, paidMonths: 9 })), [6, 2, 8, 33000, 16500, 99000]);
assert.strictEqual(quote('fullbore', { now: before }).promoLabel, 'Pay for 6 months, months 7 and 8 free');
assert.strictEqual(bestDeal('fullbore', before).value, 33000);
assert.match(quote('fullbore', { now: before }).promoFinePrint, /Ad spend is still paid/);

assert.strictEqual(quote('controlroom', { now: before }).promoApplied, false);
assert.strictEqual(quote('crew'), null);

// After the deadline: list pricing and standard minimum terms; a requested term is ignored.
assert.deepStrictEqual(pick(quote('pipeline', { now: after, paidMonths: 6 })), [4, 0, 4, 0, 9500, 38000]);
assert.strictEqual(bestDeal('pipeline', after), null);
console.log('pricing tests passed');
