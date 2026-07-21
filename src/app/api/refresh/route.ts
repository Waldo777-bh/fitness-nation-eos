import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';
import { AUTH_COOKIE, AUTH_TOKEN } from '@/lib/auth';
import { aggregateEventsIntoWeeklies } from '@/lib/sync/aggregate';
import { syncGymSales } from '@/lib/sync/gymsales';
import { syncClubFit } from '@/lib/sync/clubfit';
import { syncGoogleReviews } from '@/lib/sync/google';

/**
 * On-demand "Sync now" for the Weekly Update page.
 *
 * Gated by the same app login cookie as the rest of the dashboard (a logged-in
 * browser sends it automatically), so no CRON_SECRET or service key is ever
 * exposed to the client. Runs each source adapter (each self-skips when its
 * credentials aren't configured), then re-aggregates the current week WITHOUT
 * overwriting anything entered manually.
 */
export async function POST() {
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (token !== AUTH_TOKEN) {
    return NextResponse.json({ ok: false, error: 'not signed in' }, { status: 401 });
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
    } catch (err) {
      results[name] = `error: ${err instanceof Error ? err.message : String(err)}`;
    }
    await supabase.from('sync_logs').insert({
      source: name,
      status: results[name].startsWith('error') ? 'error' : 'success',
      message: results[name],
    });
  }

  try {
    const agg = await aggregateEventsIntoWeeklies(supabase, { protectManual: true });
    results.aggregate = agg.message ?? 'done';
    await supabase.from('sync_logs').insert({ source: 'refresh', status: 'success', message: results.aggregate });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    results.aggregate = `error: ${message}`;
    await supabase.from('sync_logs').insert({ source: 'refresh', status: 'error', message });
    return NextResponse.json({ ok: false, error: message, results }, { status: 500 });
  }

  return NextResponse.json({ ok: true, results });
}
