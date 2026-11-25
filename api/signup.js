const { quote } = require('../lib/pricing');
const { saveSignup } = require('../lib/airtable');
const { notifyTeam, confirmCustomer } = require('../lib/email');

const LIMITS = {
  companyName: 200, street: 200, street2: 200, city: 100, region: 100, postalCode: 20,
  country: 80, contactName: 120, email: 200, phone: 40, notes: 2000,
};
const REQUIRED = ['companyName', 'street', 'city', 'region', 'postalCode', 'country', 'contactName', 'email'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function clean(body) {
  const out = {};
  for (const [k, max] of Object.entries(LIMITS)) {
    out[k] = typeof body[k] === 'string' ? body[k].trim().slice(0, max) : '';
  }
  return out;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {};

  // Honeypot: real people never fill the hidden "website" field. Pretend success.
  if (body.website) return res.status(200).json({ ok: true });

  const data = clean(body);
  const errors = {};
  for (const f of REQUIRED) if (!data[f]) errors[f] = 'Required';
  if (data.email && !EMAIL_RE.test(data.email)) errors.email = 'Enter a valid email address';
  if (body.agree !== true) errors.agree = 'Please confirm to continue';

  // Price is decided here, at submission time, never by the browser.
  const q = quote(String(body.plan || ''));
  if (!q) errors.plan = 'Choose a plan';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields', fields: errors });

  const record = { ...data, quote: q, submittedAt: new Date().toISOString() };

  // 1. Store it. 2. Tell the team either way, so a lead is never silently lost.
  let airtableId = null;
  let airtableError = null;
  try {
    airtableId = await saveSignup(record);
  } catch (e) {
    airtableError = e.message;
    console.error('[signup] Airtable failed', e);
  }

  let teamNotified = false;
  try {
    await notifyTeam(record, { airtableId, airtableError });
    teamNotified = true;
  } catch (e) {
    console.error('[signup] team email failed', e);
  }

  if (!airtableId && !teamNotified) {
    // Nothing captured anywhere: make the visitor retry rather than lose the lead.
    return res.status(502).json({ error: 'We could not save your sign-up. Please try again in a minute.' });
  }

  try {
    await confirmCustomer(record);
  } catch (e) {
    console.error('[signup] confirmation email failed', e);
  }

  return res.status(200).json({ ok: true, quote: q });
};

function safeJson(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
