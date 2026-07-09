# GymSales → EOS via Zapier - setup guide

The EOS ingest endpoint is LIVE now (runs on Supabase, no deploy needed):

    URL:    https://nexyzlfaizcdnmstgiqv.supabase.co/functions/v1/zapier-ingest
    Header: x-webhook-secret: <see docs/SECRETS.local.md - not committed to git>

## Zaps to create (or add as actions to your existing GymSales Zaps)

For each one, the action step is **Webhooks by Zapier → POST**, Payload Type = JSON,
with the header above added under "Headers".

### 1. New lead
- Trigger: ABC GymSales → New Person / New Lead
- Data (JSON):
  - event_type: `lead_created`
  - external_id: map the GymSales Person ID field
  - occurred_at: map the Created At field
  - (optional) name, source - anything else you want stored

### 2. New DD sale
- Trigger: ABC GymSales → whichever trigger fires when a person becomes a member /
  sale is made (e.g. status changed to Member)
- Data:
  - event_type: `sale_made`
  - external_id: GymSales Person ID
  - occurred_at: status change date

### 3. PIF sale (if distinguishable in GymSales - e.g. by membership type field)
- Same as above with event_type: `pif_sale_made`
- If PIF vs DD isn't distinguishable in the Zap trigger, send everything as
  `sale_made` and PIF sales can stay a manual weekly entry.

## What happens automatically
Every event is stored, deduplicated by external_id, counted into the current week's
actuals (New Leads, New DD Sales, New PIF Sales), and all derived metrics recompute
instantly: Close Ratio, Lead Conversion, Net DD Growth, Total Revenue, Avg Weekly Fee,
Churn %, ARPM, LTV.

You can also push any metric directly from any system that can send a webhook:

    { "event_type": "metric_value", "metric_key": "dd_members", "value": 2556 }

Valid metric_key values: dd_members, new_dd_sales, dd_cancellations, member_suspensions,
pif_members, new_pif_sales, pif_cancellations, fitness_passport_members, dd_revenue,
retail_revenue, fitness_passport_revenue, pif_revenue, pt_revenue, shake_sales,
google_star_rating, google_reviews_week, club_visits, premium_class_util,
group_class_util, spin_class_util, reception_costs, leads
