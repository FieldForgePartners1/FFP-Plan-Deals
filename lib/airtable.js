// Writes a sign-up to Airtable. Each plan can go to its own base/table:
//   AIRTABLE_BASE_ID_<PLAN> / AIRTABLE_TABLE_<PLAN>   e.g. AIRTABLE_TABLE_PIPELINE
// falling back to AIRTABLE_BASE_ID / AIRTABLE_TABLE for any plan without its own.
// Plan keys: BEACON, PIPELINE, FULLBORE, CONTROLROOM.

function destination(planId) {
  const key = planId.toUpperCase();
  const baseId = process.env[`AIRTABLE_BASE_ID_${key}`] || process.env.AIRTABLE_BASE_ID;
  const table = process.env[`AIRTABLE_TABLE_${key}`] || process.env.AIRTABLE_TABLE;
  return { baseId, table };
}

async function saveSignup(record) {
  const token = process.env.AIRTABLE_TOKEN;
  const { baseId, table } = destination(record.quote.planId);
  if (!token || !baseId || !table) {
    throw new Error(`Airtable is not configured for plan "${record.quote.planId}"`);
  }

  const q = record.quote;
  const fields = {
    'Company Name': record.companyName,
    'Street Address': record.street,
    'Address Line 2': record.street2 || '',
    City: record.city,
    'State / Region': record.region,
    'Postal Code': record.postalCode,
    Country: record.country,
    'Contact Name': record.contactName,
    Email: record.email,
    Phone: record.phone || '',
    Plan: q.planName,
    'Monthly Fee': q.monthly,
    'Setup Fee': q.setup,
    'First Invoice': q.firstInvoice,
    'Paid Months': q.commitMonths,
    'Free Months': q.freeMonths,
    'Total Term (months)': q.totalMonths,
    'Committed Value': q.commitTotal,
    'Promo Savings': q.totalSavings,
    'Promo Applied': q.promoApplied,
    'Promo Terms': [q.promoLabel, q.promoFinePrint].filter(Boolean).join('\n'),
    Notes: record.notes || '',
    'Submitted At': record.submittedAt,
    Status: 'New',
  };

  const res = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    // typecast lets Airtable create missing single-select options (Plan, Status).
    body: JSON.stringify({ records: [{ fields }], typecast: true }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable ${res.status}: ${body.slice(0, 500)}`);
  }
  const data = await res.json();
  return data.records && data.records[0] ? data.records[0].id : null;
}

module.exports = { saveSignup, destination };
