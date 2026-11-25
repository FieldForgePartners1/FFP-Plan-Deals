const assert = require('assert');
const { quote, bestDeal } = require('../lib/pricing');
const before = new Date('2026-11-30T20:00:00-08:00');
const after = new Date('2026-12-01T00:00:01-08:00');
const pick = (q) => [q.commitMonths, q.freeMonths, q.totalMonths, q.totalSavings, q.firstInvoice, q.commitTotal];

// Beacon: pay 3, get 4 (setup fee still applies)
assert.deepStrictEqual(pick(quote('beacon', { now: before })), [3, 1, 4, 1500, 4000, 7000]);
assert.strictEqual(quote('beacon', { now: before, paidMonths: 9 }).commitMonths, 3); // no 9-month option

// Pipeline Engine: pay 5, get 6
assert.deepStrictEqual(pick(quote('pipeline', { now: before })), [5, 1, 6, 9500, 9500, 47500]);
assert.strictEqual(quote('pipeline', { now: before }).promoLabel, 'Pay for 5 months, month 6 free');

// Full Bore: pay 6 get 8, or pay 9 get 12
assert.deepStrictEqual(pick(quote('fullbore', { now: before })), [6, 2, 8, 33000, 16500, 99000]);
assert.deepStrictEqual(pick(quote('fullbore', { now: before, paidMonths: '9' })), [9, 3, 12, 49500, 16500, 148500]);
assert.deepStrictEqual(pick(quote('fullbore', { now: before, paidMonths: 7 })), [6, 2, 8, 33000, 16500, 99000]); // unknown -> default
assert.strictEqual(quote('fullbore', { now: before, paidMonths: 9 }).promoLabel, 'Pay for 9 months, months 10, 11 and 12 free');
assert.deepStrictEqual(bestDeal('fullbore', before), { headline: 'Up to 3 months free', detail: 'Pay 6, get 8 · Pay 9, get 12', value: 49500 });
assert.match(quote('fullbore', { now: before }).promoFinePrint, /Ad spend is still paid/);

assert.strictEqual(quote('controlroom', { now: before }).promoApplied, false);
assert.strictEqual(quote('crew'), null);

// After the deadline: list pricing and standard minimum terms; a requested term is ignored.
assert.deepStrictEqual(pick(quote('fullbore', { now: after, paidMonths: 9 })), [4, 0, 4, 0, 16500, 66000]);
assert.strictEqual(bestDeal('pipeline', after), null);
console.log('pricing tests passed');
