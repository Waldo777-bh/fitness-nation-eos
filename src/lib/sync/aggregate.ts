import { SupabaseClient } from '@supabase/supabase-js';
import { computeDerived, weekStartFor, currentWeekNumber } from '@/lib/metrics';

/** Map raw source_events into weekly actuals, then recompute derived metrics. */
export async function aggregateEventsIntoWeeklies(supabase: SupabaseClient) {
  // Find active quarter
  const today = new Date().toISOString().slice(0, 10);
  const { data: quarter } = await supabase
    .from('quarters')
    .select('*')
    .lte('start_date', today)
    .gte('end_date', today)
    .single();
  if (!quarter) return { message: 'no active quarter' };

  const week = currentWeekNumber(quarter.start_date, quarter.weeks);
  const weekStart = weekStartFor(quarter.start_date, week);
  const weekEnd = weekStartFor(quarter.start_date, week + 1);

  const { data: metrics } = await supabase.from('metrics').select('*');
  if (!metrics) return { message: 'no metrics' };
  const byKey = new Map(metrics.map((m) => [m.key, m]));

  // Count events in current week
  const countFor = async (types: string[]) => {
    const { count } = await supabase
      .from('source_events')
      .select('*', { count: 'exact', head: true })
      .in('event_type', types)
      .gte('occurred_at', weekStart)
      .lt('occurred_at', weekEnd);
    return count ?? 0;
  };

  const eventCounts: Record<string, number> = {
    leads: await countFor(['lead_created']),
    new_dd_sales: await countFor(['sale_made']),
    new_pif_sales: await countFor(['pif_sale_made']),
  };

  // Metric_value events override/set directly
  const { data: valueEvents } = await supabase
    .from('source_events')
    .select('payload, occurred_at')
    .eq('event_type', 'metric_value')
    .gte('occurred_at', weekStart)
    .lt('occurred_at', weekEnd)
    .order('occurred_at', { ascending: true });

  const directValues: Record<string, number> = {};
  for (const e of valueEvents ?? []) {
    const p = e.payload as { metric_key?: string; value?: number };
    if (p.metric_key && p.value !== undefined && byKey.has(p.metric_key)) {
      directValues[p.metric_key] = Number(p.value);
    }
  }

  const upserts: Record<string, number> = { ...eventCounts, ...directValues };

  let rows = 0;
  for (const [key, value] of Object.entries(upserts)) {
    const metric = byKey.get(key);
    if (!metric) continue;
    // Only write event-counted metrics if there is at least one event, so manual entry isn't clobbered by zeros.
    if (key in eventCounts && !(key in directValues) && value === 0) continue;
    await supabase.from('weekly_entries').upsert(
      {
        quarter_id: quarter.id,
        metric_id: metric.id,
        week_number: week,
        week_start: weekStart,
        actual: value,
        source: 'sync',
      },
      { onConflict: 'metric_id,week_start' }
    );
    rows++;
  }

  // Recompute derived metrics from all actuals this week
  const { data: weekEntries } = await supabase
    .from('weekly_entries')
    .select('metric_id, actual')
    .eq('week_start', weekStart);
  const idToKey = new Map(metrics.map((m) => [m.id, m.key]));
  const values: Record<string, number | null> = {};
  for (const e of weekEntries ?? []) {
    const k = idToKey.get(e.metric_id);
    if (k) values[k] = e.actual === null ? null : Number(e.actual);
  }
  const derived = computeDerived(values);
  for (const [key, value] of Object.entries(derived)) {
    const metric = byKey.get(key);
    if (!metric || value === null) continue;
    await supabase.from('weekly_entries').upsert(
      {
        quarter_id: quarter.id,
        metric_id: metric.id,
        week_number: week,
        week_start: weekStart,
        actual: value,
        source: 'derived',
      },
      { onConflict: 'metric_id,week_start' }
    );
    rows++;
  }

  return { message: `week ${week}: ${rows} entries updated`, rows };
}
