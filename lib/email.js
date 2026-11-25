// SendGrid notifications through the v3 REST API (no SDK needed).
// Env: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL (a verified sender), SENDGRID_FROM_NAME,
//      NOTIFY_TO_EMAIL (comma-separated internal recipients).

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const usd = (n) => `$${Number(n).toLocaleString('en-US')}`;

async function send({ to, subject, html, text, replyTo }) {
  const key = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM_EMAIL;
  if (!key || !from) throw new Error('SendGrid is not configured (SENDGRID_API_KEY / SENDGRID_FROM_EMAIL)');
  const payload = {
    personalizations: [{ to: to.map((email) => ({ email })) }],
    from: { email: from, name: process.env.SENDGRID_FROM_NAME || 'FieldForge Partners' },
    subject,
    content: [
      { type: 'text/plain', value: text },
      { type: 'text/html', value: html },
    ],
  };
  if (replyTo) payload.reply_to = { email: replyTo };
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`SendGrid ${res.status}: ${(await res.text()).slice(0, 500)}`);
}

function pricingRows(q) {
  const rows = [
    ['Plan', q.planName],
    ['Monthly fee', `${usd(q.monthly)}/mo`],
  ];
  if (q.promoLabel) rows.push(['Black Friday / Cyber Monday deal', q.promoLabel]);
  if (q.freeMonths) {
    rows.push(['Term', `${q.commitMonths} paid months + ${q.freeMonths} free (${q.totalMonths} months of service)`]);
    rows.push(['Free months value', usd(q.totalSavings)]);
    rows.push(['Effective monthly rate', `${usd(q.effectiveMonthly)}/mo`]);
  } else {
    rows.push(['Minimum term', `${q.commitMonths} months, then month-to-month`]);
  }
  if (q.setupList) rows.push(['Setup fee', q.setup === q.setupList ? usd(q.setup) : `${usd(q.setup)} (was ${usd(q.setupList)})`]);
  rows.push(['First invoice', usd(q.firstInvoice)]);
  return rows;
}

const table = (rows) =>
  `<table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${rows
    .map(([k, v]) => `<tr><td style="color:#555;border-bottom:1px solid #eee">${esc(k)}</td><td style="border-bottom:1px solid #eee"><strong>${esc(v)}</strong></td></tr>`)
    .join('')}</table>`;
const plain = (rows) => rows.map(([k, v]) => `${k}: ${v}`).join('\n');

function address(r) {
  return [r.street, r.street2, `${r.city}, ${r.region} ${r.postalCode}`, r.country].filter(Boolean).join(', ');
}

async function notifyTeam(r, { airtableId, airtableError }) {
  const to = (process.env.NOTIFY_TO_EMAIL || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!to.length) throw new Error('NOTIFY_TO_EMAIL is not set');
  const rows = [
    ['Company', r.companyName],
    ['Address', address(r)],
    ['Contact', r.contactName],
    ['Email', r.email],
    ['Phone', r.phone || '-'],
    ...pricingRows(r.quote),
    ['Notes', r.notes || '-'],
    ['Submitted', r.submittedAt],
    ['Airtable', airtableId ? `Saved (${airtableId})` : `NOT SAVED: ${airtableError}`],
  ];
  const warn = airtableId ? '' : '[ACTION NEEDED: not in Airtable] ';
  await send({
    to,
    replyTo: r.email,
    subject: `${warn}New BFCM sign-up: ${r.companyName}, ${r.quote.planName}`,
    html: `<p>New sign-up from the BFCM page.</p>${table(rows)}`,
    text: `New sign-up from the BFCM page.\n\n${plain(rows)}`,
  });
}

async function confirmCustomer(r) {
  const rows = pricingRows(r.quote);
  const first = esc(r.contactName.split(' ')[0]);
  const lock = r.quote.promoApplied
    ? '<p>Your Black Friday / Cyber Monday pricing is locked in for this sign-up.</p>'
    : '';
  await send({
    to: [r.email],
    replyTo: (process.env.NOTIFY_TO_EMAIL || '').split(',')[0].trim() || undefined,
    subject: `You're in: ${r.quote.planName} for ${r.companyName}`,
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222">
<p>Hi ${first},</p>
<p>Thanks for signing ${esc(r.companyName)} up for <strong>${esc(r.quote.planName)}</strong>.</p>
${lock}
${table(rows)}
<p>Next step: we'll send your agreement and ACH billing details within one business day. Nothing is charged until you sign.</p>
<p>Reply to this email with any questions.</p>
<p>FieldForge Partners</p></div>`,
    text: `Hi ${r.contactName.split(' ')[0]},\n\nThanks for signing ${r.companyName} up for ${r.quote.planName}.\n${
      r.quote.promoApplied ? 'Your Black Friday / Cyber Monday pricing is locked in for this sign-up.\n' : ''
    }\n${plain(rows)}\n\nNext step: we'll send your agreement and ACH billing details within one business day. Nothing is charged until you sign.\n\nFieldForge Partners`,
  });
}

module.exports = { notifyTeam, confirmCustomer };
