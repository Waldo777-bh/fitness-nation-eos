import { SupabaseClient } from '@supabase/supabase-js';

/**
 * ClubFit sync - PENDING API ACCESS.
 * ClubFit has no public API docs; request access via support@clubfitsoftware.com.au.
 * Once granted, map their endpoints to metric_value events below.
 *
 * Target metrics from ClubFit:
 *  dd_members, pif_members, dd_cancellations, pif_cancellations, member_suspensions,
 *  fitness_passport_members, dd_revenue, retail_revenue, fitness_passport_revenue,
 *  pif_revenue, pt_revenue, shake_sales, club_visits
 */
export async function syncClubFit(supabase: SupabaseClient): Promise<string> {
  const apiKey = process.env.CLUBFIT_API_KEY;
  const base = process.env.CLUBFIT_BASE_URL;
  if (!apiKey || !base) return 'skipped (no CLUBFIT_API_KEY; enter these metrics via Weekly Update for now)';

  // TEMPLATE - adjust endpoint paths/fields to ClubFit's actual API once docs arrive.
  const res = await fetch(`${base}/reports/weekly-summary`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`ClubFit API ${res.status}: ${await res.text()}`);
  const data: Record<string, number> = await res.json();

  const mapping: Record<string, string> = {
    active_dd_members: 'dd_members',
    active_pif_members: 'pif_members',
    dd_cancellations: 'dd_cancellations',
    pif_cancellations: 'pif_cancellations',
    suspensions: 'member_suspensions',
    fitness_passport_members: 'fitness_passport_members',
    dd_revenue: 'dd_revenue',
    retail_revenue: 'retail_revenue',
    fitness_passport_revenue: 'fitness_passport_revenue',
    pif_revenue: 'pif_revenue',
    pt_revenue: 'pt_revenue',
    shake_sales: 'shake_sales',
    visits: 'club_visits',
  };

  let count = 0;
  for (const [field, metricKey] of Object.entries(mapping)) {
    if (data[field] === undefined) continue;
    await supabase.from('source_events').insert({
      source: 'clubfit_api',
      event_type: 'metric_value',
      payload: { metric_key: metricKey, value: data[field] },
      occurred_at: new Date().toISOString(),
    });
    count++;
  }
  return `recorded ${count} metric values`;
}
