# FieldForge BFCM sign-up

A one-page sign-up for FieldForge Partners plans at Black Friday / Cyber Monday pricing.
It's a static page plus two Vercel serverless functions, with no dependencies and no build step.

- `GET /api/plans`: plans, scope, prices and deal copy (the page renders from this)
- `POST /api/signup`: validates the form, **re-prices on the server**, writes to Airtable, emails the team and the customer

## The deal (edit in `lib/pricing.js`)

| Plan | Deal | Value |
|---|---|---|
| Beacon | Pay 3 months, month 4 free ($2,500 setup still applies) | $1,500 |
| Pipeline Engine | Pay 4 get 5 ($9,500) or pay 6 get 8 ($19,000), buyer chooses | up to $19,000 |
| Full Bore | Pay 6 months, months 7 and 8 free | $33,000 |
| Control Room | Standard pricing | — |

The free month comes at the **end** of the paid term, doesn't count toward the meeting guarantee or its free extension, and Full Bore ad spend is still paid by the client in that month. The deal ends **Mon Nov 30 2026, 11:59:59 PM Pacific**
(`PROMO_ENDS_AT`). After that the page switches to standard pricing and minimum terms, and the server enforces it too.

## Deploy

1. Push this folder to a GitHub repo and import it in Vercel (Framework preset: **Other**). Or run `vercel` from this folder.
2. Add the env vars from `.env.example` in Vercel → Settings → Environment Variables.
3. Redeploy.

## Airtable

Live setup: base **Revenue Systems Submissions - Website** (`appsmbcbhmqEJfMjO`), table **BFCM Plan Signups** (`tblKJobPkoXIaBSyl`).
Set `AIRTABLE_BASE_ID=appsmbcbhmqEJfMjO` and `AIRTABLE_TABLE=tblKJobPkoXIaBSyl` in Vercel.

Create a Personal Access Token with `data.records:write` scoped to your base(s).
Every plan goes to `AIRTABLE_BASE_ID` / `AIRTABLE_TABLE` unless it has its own
`AIRTABLE_BASE_ID_<PLAN>` / `AIRTABLE_TABLE_<PLAN>` (`BEACON`, `PIPELINE`, `FULLBORE`, `CONTROLROOM`).

Each target table needs these fields, **named exactly as shown**. Airtable rejects the whole record if one is missing:

| Field | Type |
|---|---|
| Company Name | Single line text |
| Street Address, Address Line 2, City, State / Region, Postal Code, Country | Single line text |
| Contact Name | Single line text |
| Email | Email |
| Phone | Phone |
| Plan | Single select (options auto-created) |
| Monthly Fee, Setup Fee, First Invoice, Promo Savings, Committed Value | Currency |
| Paid Months, Free Months, Total Term (months) | Number |
| Promo Applied | Checkbox |
| Promo Terms, Notes | Long text |
| Submitted At | Date (with time) or text |
| Status | Single select (`New` auto-created) |

## SendGrid

`SENDGRID_FROM_EMAIL` must be a verified single sender or on an authenticated domain, or every send fails.
Each sign-up sends two emails: one to `NOTIFY_TO_EMAIL` with full details, and a confirmation to the customer.

## Failure behaviour

- Airtable down → the team email still goes out, with `[ACTION NEEDED: not in Airtable]` in the subject.
- Airtable **and** team email down → the visitor gets an error and is asked to retry, so the lead isn't silently lost.
- Customer confirmation fails → logged only; the sign-up still succeeds.

## Test

```bash
npm test
```
