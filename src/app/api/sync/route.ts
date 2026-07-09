import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { aggregateEventsIntoWeeklies } from '@/lib/sync/aggregate';
import { syncGymSales } from '@/lib/sync/gymsales';
import { syncClubFit } from '@/lib/sync/clubfit';
import { syncGoogleReviews } from '@/lib/sync/google';

/**
 * Master sync endpoint. Called by Railway cron (e.g. hourly):
 *   curl -H "authorization: Bearer $CRON_SECRET" {app_url}/api/sync
 * Runs each source adapter (skipping any without credentials), then aggregates.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const results: Record<string, string> = {};

  for (const [name, fn] of [
    ['gymsales', syncGymSales],
    ['clubfit', syncClubFit],
    ['google', syncGoogleReviews],
  ] as const) {
    try {
      results[name] = await fn(supabase);
      await supabase.from('sync_logs').insert({ source: name, status: 'success', message: results[name] });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results[name] = `error: ${message}`;
      await supabase.from('sync_logs').insert({ source: name, status: 'error', message });
    }
  }

  const agg = await aggregateEventsIntoWeeklies(supabase);
  results.aggregate = agg.message ?? 'done';
  await supabase.from('sync_logs').insert({ source: 'aggregate', status: 'success', message: results.aggregate });

  return NextResponse.json({ ok: true, results });
}
