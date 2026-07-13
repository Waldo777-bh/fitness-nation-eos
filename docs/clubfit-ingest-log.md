# ClubFit Financial Snapshot -> EOS Ingest Log

## 2026-07-13 (first run - exploratory)

**Source:** 4 PDF files found in `fitness-nation-eos/inbox/` (Preston-financial-snaphot1-4.pdf), all generated 09 Jul 2026 from ClubFit. Latest ClubFit email in Outlook: "Preston - Financial Snapshot", noreply@clubfit.net.au, received 2026-07-09.

**Report format note (for future parsing):** ClubFit "Financial Highlight" PDFs are per-period, plain-text, extractable with `pdftotext -layout`. Each PDF has three sections:
1. **Direct Debit Summary** - dollar table (Total Disbursed, Memberships, Joining Fees, POS Transactions, AddOns, Manual Online Payment, Refunds, etc. with GST column).
2. **Status Summary** - point-in-time counts (Active members, Suspended members, Payment Issues members, New members for period, Archived members for period).
3. **Members by category / New by category / Archived by category** - counts split by membership category (DD GYM ACCESS, DD PREMIUM ACCESS, DD GYM & CLASS ACCESS, DIRECT DEBIT = direct-debit; PIF GYM ACCESS, PIF GYM & CLASS ACCESS, PIF PREMIUM ACCESS, PAID IN FULL = paid-in-full; FITNESS PASSPORT; plus STAFF, PASSES, COMPLIMENTARY).

**Periods in the 4 PDFs:**
- PDF1: 22 Jun - 28 Jun 2026
- PDF2: 29 Jun - 05 Jul 2026  <- latest COMPLETE week (used for flow metrics)
- PDF3: 22 Jun - 28 Jun 2026  (identical duplicate of PDF1 - skipped)
- PDF4: 06 Jul - 09 Jul 2026  (partial 4-day period - skipped for weekly flow metrics)

Point-in-time membership counts (Status Summary + Members by category) are IDENTICAL across all 4 PDFs, so stock metrics are unambiguous. Flow metrics (new sales, cancellations, revenue) taken from PDF2, the most recent full week.

**Metrics sent (all HTTP 200, week=2):**
| metric_key | value | derivation |
|---|---|---|
| dd_members | 2713 | Members by category, sum of DD GYM ACCESS 2063 + DD PREMIUM ACCESS 244 + DD GYM & CLASS ACCESS 396 + DIRECT DEBIT 10 |
| pif_members | 263 | sum of PIF GYM ACCESS 233 + PIF GYM & CLASS ACCESS 23 + PIF PREMIUM ACCESS 6 + PAID IN FULL 1 |
| member_suspensions | 168 | Status Summary "Suspended members" |
| fitness_passport_members | 546 | Members by category "FITNESS PASSPORT" |
| new_dd_sales | 80 | New by category (PDF2), sum of DD GYM ACCESS 61 + DD PREMIUM ACCESS 8 + DD GYM & CLASS ACCESS 11 |
| new_pif_sales | 8 | New by category (PDF2), sum of PIF GYM ACCESS 7 + PAID IN FULL 1 |
| dd_cancellations | 30 | Archived by category (PDF2), sum of DD GYM ACCESS 27 + DD PREMIUM ACCESS 1 + DD GYM & CLASS ACCESS 2 |
| pif_cancellations | 11 | Archived by category (PDF2), sum of PIF GYM ACCESS 9 + PIF GYM & CLASS ACCESS 2 |
| dd_revenue | 49193.84 | Direct Debit Summary (PDF2) "Total Disbursed" |

**Skipped / ambiguous (NOT posted):**
- `pif_revenue` - no dedicated paid-in-full payment line in the report. "Manual Online Payment" ($2,031.85 in PDF2) may or may not represent PIF upfront payments. Ambiguous - needs Brent to confirm mapping.
- `pt_revenue` - no personal-training revenue line in the report (only "PT No Show Fees" $0.00).
- `fitness_passport_revenue` - no Fitness Passport settlement figure in the report.
- `retail_revenue` - "POS Transactions" was $0.00 in PDF2; unclear whether truly zero retail for the week or POS simply not settled via DD that period. Held back pending confirmation. (For reference POS Transactions was $299.00 in the 22-28 Jun period.)
- `shake_sales` - no POS product-level detail in this report.
- `club_visits` - no attendance / door-swipe data in this report.

**Action for Brent:**
1. Confirm the intended mapping for `pif_revenue`, `pt_revenue`, `fitness_passport_revenue`, `retail_revenue`, `shake_sales`, and `club_visits` - the Financial Snapshot report does not contain clean lines for most of these. If these live in a different ClubFit report (e.g. a POS detail or PT report), point the task at that.
2. Confirm `dd_revenue` should be "Total Disbursed" ($49,193.84) rather than the "Memberships" sub-line ($46,712.28).
3. The inbox PDFs were left in place (not deleted). Consider archiving processed files so future runs don't re-read them.
