import { SupabaseClient } from '@supabase/supabase-js';

/**
 * ABC GymSales direct API sync (docs: https://login.gymsales.net/api-docs).
 * Requires GYMSALES_API_TOKEN from help@gymsales.net.
 * Pulls people created/updated in the last 7 days and records lead/sale events.
 * Rate limits: 120 req/min on /people, 500 req/min elsewhere.
 */
export async function syncGymSales(supabase: SupabaseClient): Promise<string> {
  const token = process.env.GYMSALES_API_TOKEN;
  const base = process.env.GYMSALES_BASE_URL ?? 'https://login.gymsales.net/api/v1';
  if (!token) return 'skipped (no GYMSALES_API_TOKEN; using Zapier webhook events instead)';

  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  let page = 1;
  let imported = 0;

  // GymSales /people supports filtering & pagination; adjust params per api-docs once credentials granted.
  for (;;) {
    const res = await fetch(`${base}/people?updated_since=${since}&page=${page}`, {
      headers: { Authorization: `Token token=${token}`, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`GymSales API ${res.status}: ${await res.text()}`);
    const people: Array<Record<string, unknown>> = await res.json();
    if (!Array.isArray(people) || people.length === 0) break;

    for (const p of people) {
      const status = String(p.status ?? '');
      const isSale = ['member', 'joined', 'sale'].some((s) => status.toLowerCase().includes(s));
      await supabase.from('source_events').upsert(
        {
          source: 'gymsales_api',
          event_type: isSale ? 'sale_made' : 'lead_created',
          external_id: String(p.id),
          payload: p,
          occurred_at: p.created_at ? new Date(String(p.created_at)).toISOString() : new Date().toISOString(),
        },
        { onConflict: 'source,event_type,external_id', ignoreDuplicates: true }
      );
      imported++;
    }
    page++;
    if (page > 50) break; // safety
  }
  return `imported ${imported} people events`;
}
