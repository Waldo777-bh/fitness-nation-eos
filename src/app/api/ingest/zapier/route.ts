import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Zapier webhook ingest.
 * Point a Zap (e.g. ABC GymSales trigger) at POST {app_url}/api/ingest/zapier
 * with header:  x-webhook-secret: <WEBHOOK_SECRET>
 *
 * Accepted bodies:
 * 1. Event:        { "event_type": "lead_created" | "sale_made" | "pif_sale_made" | "cancellation",
 *                    "external_id": "gymsales person/sale id", "occurred_at": "ISO date", ...anything }
 * 2. Metric value: { "event_type": "metric_value", "metric_key": "dd_members", "value": 2556, "week_start": "2026-07-06" }
 */
export async function POST(req: NextRequest) {
  if (req.headers.get('x-webhook-secret') !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const eventType = String(body.event_type ?? 'unknown');
  const supabase = createServiceClient();

  const { error } = await supabase.from('source_events').upsert(
    {
      source: 'zapier_gymsales',
      event_type: eventType,
      external_id: body.external_id ? String(body.external_id) : null,
      payload: body,
      occurred_at: body.occurred_at ? new Date(String(body.occurred_at)).toISOString() : new Date().toISOString(),
    },
    { onConflict: 'source,event_type,external_id', ignoreDuplicates: true }
  );

  if (error) {
    await supabase.from('sync_logs').insert({ source: 'zapier_gymsales', status: 'error', message: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
