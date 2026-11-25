const assert = require('assert');
const { quote } = require('../lib/pricing');
const before = new Date('2026-11-30T20:00:00-08:00');
const after = new Date('2026-12-01T00:00:01-08:00');

let q = quote('pipeline', { now: before });
assert.deepStrictEqual([q.commitMonths, q.freeMonths, q.totalMonths, q.totalSavings, q.firstInvoice, q.commitTotal], [6, 1, 7, 9500, 9500, 57000]);
q = quote('fullbore', { now: before });
assert.deepStrictEqual([q.commitMonths, q.freeMonths, q.totalSavings], [6, 1, 16500]);
q = quote('beacon', { now: before });
assert.deepStrictEqual([q.setup, q.totalSavings, q.firstInvoice, q.commitMonths], [1500, 1000, 3000, 3]);
q = quote('controlroom', { now: before });
assert.deepStrictEqual([q.promoApplied, q.totalSavings, q.commitMonths], [false, 0, 3]);

// After the deadline: list pricing, standard minimum terms.
q = quote('pipeline', { now: after });
assert.deepStrictEqual([q.promoApplied, q.freeMonths, q.commitMonths, q.totalSavings], [false, 0, 4, 0]);
q = quote('beacon', { now: after });
assert.deepStrictEqual([q.setup, q.firstInvoice], [2500, 4000]);
assert.strictEqual(quote('mach'), null);
assert.strictEqual(quote('crew'), null);
assert.match(quote('fullbore', { now: before }).promoFinePrint, /Ad spend is still paid/);
assert.match(quote('pipeline', { now: before }).promoFinePrint, /doesn't count toward/);
assert.strictEqual(quote('pipeline', { now: after }).promoFinePrint, null);
console.log('pricing tests passed');
