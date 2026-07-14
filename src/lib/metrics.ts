import type { Metric, WeeklyEntry } from './types';

export function formatValue(value: number | null | undefined, unit: Metric['unit']): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  switch (unit) {
    case 'currency':
      return '$' + value.toLocaleString('en-AU', { maximumFractionDigits: 2 });
    case 'percent':
      return `${Number(value.toFixed(1))}%`;
    case 'rating':
      return value.toFixed(1);
    default:
      return value.toLocaleString('en-AU', { maximumFractionDigits: 0 });
  }
}

/** true = on track */
export function isOnTrack(metric: Metric, target: number | null, actual: number | null): boolean | null {
  if (target === null || actual === null) return null;
  return metric.direction === 'down' ? actual <= target : actual >= target;
}

/** Compute derived metric actuals from base metric actuals for one week. */
export function computeDerived(values: Record<string, number | null>): Record<string, number | null> {
  const v = (k: string) => values[k] ?? null;
  const out: Record<string, number | null> = {};

  const sales = v('new_dd_sales');
  const cans = v('dd_cancellations');
  out.net_dd_growth = sales !== null && cans !== null ? sales - cans : null;

  const pifSales = v('new_pif_sales');
  const pifCans = v('pif_cancellations');
  out.net_pif_growth = pifSales !== null && pifCans !== null ? pifSales - pifCans : null;

  const leads = v('leads');
  const totalSales = (sales ?? 0) + (pifSales ?? 0);
  out.close_ratio = leads && leads > 0 ? (totalSales / leads) * 100 : null;
  out.lead_conversion = out.close_ratio;

  const revKeys = ['dd_revenue', 'retail_revenue', 'fitness_passport_revenue', 'pif_revenue', 'pt_revenue'];
  const revVals = revKeys.map(v);
  out.total_revenue = revVals.every((x) => x === null)
    ? null
    : revVals.reduce((a: number, x) => a + (x ?? 0), 0);

  const ddRev = v('dd_revenue');
  const ddMembers = v('dd_members');
  out.avg_weekly_fee = ddRev !== null && ddMembers ? ddRev / ddMembers : null;

  // Weekly churn - these are weekly numbers
  out.monthly_churn = cans !== null && ddMembers ? (cans / ddMembers) * 100 : null;

  const totalMembers = (ddMembers ?? 0) + (v('pif_members') ?? 0);
  out.arpm = out.total_revenue !== null && totalMembers > 0 ? out.total_revenue / totalMembers : null;

  out.ltv =
    out.arpm !== null && out.monthly_churn && out.monthly_churn > 0
      ? out.arpm / (out.monthly_churn / 100)
      : null;

  return out;
}

/** Linear weekly targets from start to target across n weeks. */
export function generateWeeklyTargets(start: number, target: number, weeks: number): number[] {
  if (weeks <= 1) return [target];
  const step = (target - start) / (weeks - 1);
  return Array.from({ length: weeks }, (_, i) => Number((start + step * i).toFixed(2)));
}

export function weekStartFor(quarterStart: string, weekNumber: number): string {
  const d = new Date(quarterStart + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + (weekNumber - 1) * 7);
  return d.toISOString().slice(0, 10);
}

export function currentWeekNumber(quarterStart: string, weeks: number, today = new Date()): number {
  const start = new Date(quarterStart + 'T00:00:00Z').getTime();
  const diff = Math.floor((today.getTime() - start) / (7 * 24 * 3600 * 1000)) + 1;
  return Math.min(Math.max(diff, 1), weeks);
}

export const CATEGORY_LABELS: Record<string, string> = {
  membership: 'Membership',
  revenue: 'Revenue',
  operations: 'Operations',
  growth: 'Growth & Retention',
};

/** Latest week number that has at least one actual recorded, or null. */
export function lastDataWeek(entries: WeeklyEntry[]): number | null {
  const weeks = entries.filter((e) => e.actual !== null).map((e) => e.week_number);
  return weeks.length ? Math.max(...weeks) : null;
}

export function entriesToWeekMap(entries: WeeklyEntry[]): Map<string, WeeklyEntry[]> {
  const map = new Map<string, WeeklyEntry[]>();
  for (const e of entries) {
    const arr = map.get(e.metric_id) ?? [];
    arr.push(e);
    map.set(e.metric_id, arr);
  }
  map.forEach((arr) => arr.sort((a, b) => a.week_number - b.week_number));
  return map;
}
