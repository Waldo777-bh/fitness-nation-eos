import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Google Places sync: star rating + total review count.
 * Weekly reviews = delta vs the previous stored total.
 */
export async function syncGoogleReviews(supabase: SupabaseClient): Promise<string> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!key || !placeId) return 'skipped (no GOOGLE_PLACES_API_KEY/GOOGLE_PLACE_ID)';

  const res = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}?fields=rating,userRatingCount`,
    { headers: { 'X-Goog-Api-Key': key } }
  );
  if (!res.ok) throw new Error(`Places API ${res.status}: ${await res.text()}`);
  const data: { rating?: number; userRatingCount?: number } = await res.json();

  // Previous total from the most recent google event
  const { data: prev } = await supabase
    .from('source_events')
    .select('payload')
    .eq('source', 'google')
    .eq('event_type', 'review_snapshot')
    .order('occurred_at', { ascending: false })
    .limit(1);

  const prevTotal = (prev?.[0]?.payload as { total?: number } | undefined)?.total;
  const weeklyNew = prevTotal !== undefined && data.userRatingCount !== undefined
    ? Math.max(data.userRatingCount - prevTotal, 0)
    : undefined;

  await supabase.from('source_events').insert({
    source: 'google',
    event_type: 'review_snapshot',
    payload: { rating: data.rating, total: data.userRatingCount },
    occurred_at: new Date().toISOString(),
  });

  if (data.rating !== undefined) {
    await supabase.from('source_events').insert({
      source: 'google',
      event_type: 'metric_value',
      payload: { metric_key: 'google_star_rating', value: data.rating },
      occurred_at: new Date().toISOString(),
    });
  }
  if (weeklyNew !== undefined) {
    await supabase.from('source_events').insert({
      source: 'google',
      event_type: 'metric_value',
      payload: { metric_key: 'google_reviews_week', value: weeklyNew },
      occurred_at: new Date().toISOString(),
    });
  }
  return `rating ${data.rating}, total reviews ${data.userRatingCount}, new this run ${weeklyNew ?? 'n/a'}`;
}
