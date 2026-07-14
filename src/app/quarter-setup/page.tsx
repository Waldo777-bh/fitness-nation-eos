'use client';

import { useEffect, useMemo, useState } from 'react';
import { useEosCore, useQuarterTargets, usePersistedQuarter } from '@/lib/hooks';
import { CATEGORY_LABELS, generateWeeklyTargets, weekStartFor, formatValue, computeDerived } from '@/lib/metrics';
import { PageHeader, QuarterPicker } from '@/components/ui';

const PREVIEW_KEYS = ['dd_members', 'dd_revenue', 'avg_weekly_fee', 'new_dd_sales', 'shake_sales'];

export default function QuarterSetupPage() {
  const { supabase, quarters, metrics, team, activeTeam, activeQuarter, loading } = useEosCore();
  const { quarter, setQuarterId } = usePersistedQuarter(quarters, activeQuarter);
  const { targets, refresh } = useQuarterTargets(quarter?.id);

  const [form, setForm] = useState<Record<string, { start: string; target: string }>>({});
  const [owners, setOwners] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const f: Record<string, { start: string; target: string }> = {};
    for (const t of targets) {
      f[t.metric_id] = {
        start: t.start_value === null ? '' : String(t.start_value),
        target: t.target_value === null ? '' : String(t.target_value),
      };
    }
    setForm(f);
  }, [targets]);

  useEffect(() => {
    const o: Record<string, string> = {};
    for (const m of metrics) o[m.id] = m.owner_id ?? '';
    setOwners(o);
  }, [metrics]);

  async function changeOwner(metricId: string, ownerId: string) {
    setOwners((o) => ({ ...o, [metricId]: ownerId }));
    const { error } = await supabase.from('metrics').update({ owner_id: ownerId || null }).eq('id', metricId);
    if (error) setMsg(`Error saving owner: ${error.message}`);
  }

  const teamById = useMemo(() => new Map(team.map((t) => [t.id, t])), [team]);
  const planExists = targets.length > 0;

  // Live-computed start/target for auto metrics, derived from the manual inputs
  const { derivedStart, derivedTarget } = useMemo(() => {
    const s: Record<string, number | null> = {};
    const t: Record<string, number | null> = {};
    for (const m of metrics) {
      if (m.is_auto) continue;
      const f = form[m.id];
      s[m.key] = f && f.start !== '' ? Number(f.start) : null;
      t[m.key] = f && f.target !== '' ? Number(f.target) : null;
    }
    return { derivedStart: computeDerived(s), derivedTarget: computeDerived(t) };
  }, [form, metrics]);

  const growthLabel = (m: { id: string; key: string; unit: string; is_auto: boolean }) => {
    let s: number | null, t: number | null;
    if (m.is_auto) {
      s = derivedStart[m.key] ?? null;
      t = derivedTarget[m.key] ?? null;
    } else {
      const f = form[m.id];
      if (!f || f.start === '' || f.target === '') return null;
      s = Number(f.start); t = Number(f.target);
    }
    if (s === null || t === null) return null;
    const diff = t - s;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${m.unit === 'currency' ? '$' : ''}${Number(diff.toFixed(2)).toLocaleString('en-AU')}${m.unit === 'percent' ? '%' : ''} growth`;
  };

  async function save() {
    if (!quarter) return;
    setSaving(true);
    setMsg(null);

    // Weekly target matrix for manual metrics
    const weekMatrix: Record<string, number[]> = {};
    for (const m of metrics.filter((x) => !x.is_auto)) {
      const f = form[m.id];
      if (!f || f.start === '' || f.target === '') continue;
      weekMatrix[m.key] = generateWeeklyTargets(Number(f.start), Number(f.target), quarter.weeks);
    }

    // Derived weekly targets for auto metrics, computed per week from the manual matrix
    const autoMatrix: Record<string, Array<number | null>> = {};
    for (let w = 0; w < quarter.weeks; w++) {
      const keyed: Record<string, number | null> = {};
      for (const [key, arr] of Object.entries(weekMatrix)) keyed[key] = arr[w];
      const d = computeDerived(keyed);
      for (const m of metrics.filter((x) => x.is_auto)) {
        (autoMatrix[m.key] ??= [])[w] = d[m.key] !== undefined && d[m.key] !== null ? Number(d[m.key]!.toFixed(2)) : null;
      }
    }

    const qtRows: Array<Record<string, unknown>> = [];
    const weRows: Array<Record<string, unknown>> = [];
    for (const m of metrics) {
      const weekly = m.is_auto ? autoMatrix[m.key] : weekMatrix[m.key];
      if (!weekly || weekly.every((v) => v === null || v === undefined)) continue;
      const start = weekly[0];
      const target = weekly[quarter.weeks - 1];
      qtRows.push({ quarter_id: quarter.id, metric_id: m.id, start_value: start, target_value: target });
      for (let w = 1; w <= quarter.weeks; w++) {
        if (weekly[w - 1] === null || weekly[w - 1] === undefined) continue;
        weRows.push({
          quarter_id: quarter.id, metric_id: m.id, week_number: w,
          week_start: weekStartFor(quarter.start_date, w), target: weekly[w - 1],
        });
      }
    }

    const { error: e1 } = await supabase.from('quarter_targets').upsert(qtRows, { onConflict: 'quarter_id,metric_id' });
    if (e1) { setMsg(`Error: ${e1.message}`); setSaving(false); return; }
    for (let i = 0; i < weRows.length; i += 200) {
      const { error: e2 } = await supabase.from('weekly_entries').upsert(weRows.slice(i, i + 200), { onConflict: 'metric_id,week_start' });
      if (e2) { setMsg(`Error: ${e2.message}`); setSaving(false); return; }
    }

    setSaving(false);
    setMsg(`Saved ${qtRows.length} metrics (${weRows.length} weekly targets, auto metrics computed automatically)`);
    refresh();
    setTimeout(() => setMsg(null), 5000);
  }

  if (loading) return <p className="text-zinc-500">Loading…</p>;

  const categories = ['membership', 'revenue', 'operations', 'growth'] as const;
  const previewMetrics = PREVIEW_KEYS.map((k) => metrics.find((m) => m.key === k)).filter(Boolean);
  const midWeeks = quarter ? [1, 2, 3, 4, 5] : [];

  return (
    <>
      <PageHeader title="Quarter Setup" subtitle="Set quarterly targets - weekly goals and auto metrics calculate themselves">
        {planExists && <span className="text-[10px] px-2 py-1 rounded bg-good/20 text-good font-bold uppercase">Plan Exists</span>}
        <QuarterPicker quarters={quarters} value={quarter?.id} onChange={setQuarterId} />
      </PageHeader>

      {quarter && (
        <div className="panel p-4 mb-5 flex gap-8 text-sm">
          <div><span className="text-zinc-500">Quarter:</span> <span className="text-white font-semibold">{quarter.label}</span></div>
          <div><span className="text-zinc-500">Start:</span> <span className="text-white">{new Date(quarter.start_date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
          <div><span className="text-zinc-500">End:</span> <span className="text-white">{new Date(quarter.end_date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
          <div><span className="text-zinc-500">Weeks:</span> <span className="text-white">{quarter.weeks}</span></div>
        </div>
      )}

      {categories.map((cat) => {
        const catMetrics = metrics.filter((m) => m.category === cat);
        if (!catMetrics.length) return null;
        return (
          <div key={cat} className="panel p-5 mb-5">
            <h2 className="section-title mb-4 border-l-4 border-accent pl-3">{CATEGORY_LABELS[cat]}</h2>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
              {catMetrics.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{m.name}</span>
                      {m.is_auto && <span className="text-[10px] px-1.5 py-0.5 rounded bg-panelBorder text-zinc-400 shrink-0">AUTO</span>}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {growthLabel(m) ?? (m.is_auto && m.formula ? m.formula : '')}
                    </div>
                  </div>
                  <select
                    className="input !w-28 !py-1 text-xs"
                    value={owners[m.id] ?? ''}
                    onChange={(e) => changeOwner(m.id, e.target.value)}
                    title="Metric owner"
                  >
                    <option value="">Owner…</option>
                    {activeTeam.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    {!activeTeam.some((t) => t.id === owners[m.id]) && owners[m.id] &&
                      <option value={owners[m.id]}>{teamById.get(owners[m.id])?.name ?? 'Former member'}</option>}
                  </select>
                  {m.is_auto ? (
                    <>
                      <div className="input !w-28 !py-2 text-zinc-300 bg-panel cursor-not-allowed truncate" title="Calculated automatically">
                        {formatValue(derivedStart[m.key] ?? null, m.unit)}
                      </div>
                      <div className="input !w-28 !py-2 text-zinc-300 bg-panel cursor-not-allowed truncate" title="Calculated automatically">
                        {formatValue(derivedTarget[m.key] ?? null, m.unit)}
                      </div>
                    </>
                  ) : (
                    <>
                      <input
                        className="input !w-28"
                        placeholder="Start"
                        type="number" step="any"
                        value={form[m.id]?.start ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, [m.id]: { start: e.target.value, target: f[m.id]?.target ?? '' } }))}
                      />
                      <input
                        className="input !w-28"
                        placeholder="Target"
                        type="number" step="any"
                        value={form[m.id]?.target ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, [m.id]: { start: f[m.id]?.start ?? '', target: e.target.value } }))}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {quarter && (
        <div className="panel p-5 mb-5">
          <h2 className="section-title mb-1 border-l-4 border-accent pl-3">Weekly Target Preview</h2>
          <p className="text-xs text-zinc-500 mb-4 pl-4">Auto-generated weekly targets (linear progression)</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left">
                <th className="pb-2 font-normal">Metric</th>
                {midWeeks.map((w) => <th key={w} className="pb-2 font-normal text-right">W{w}</th>)}
                <th className="pb-2 font-normal text-center">…</th>
                <th className="pb-2 font-normal text-right">W{quarter.weeks}</th>
              </tr>
            </thead>
            <tbody>
              {previewMetrics.map((m) => {
                if (!m) return null;
                const f = form[m.id];
                if (!f || f.start === '' || f.target === '') return null;
                const weekly = generateWeeklyTargets(Number(f.start), Number(f.target), quarter.weeks);
                return (
                  <tr key={m.id} className="border-t border-panelBorder/60">
                    <td className="py-2">{m.name}</td>
                    {midWeeks.map((w) => (
                      <td key={w} className="py-2 text-right text-zinc-300">{formatValue(weekly[w - 1], m.unit)}</td>
                    ))}
                    <td className="py-2 text-center text-zinc-600">…</td>
                    <td className="py-2 text-right font-semibold text-white">{formatValue(weekly[quarter.weeks - 1], m.unit)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button className="btn" onClick={save} disabled={saving}>
          <span>{saving ? 'Saving…' : `Save ${quarter?.label} targets`}</span>
        </button>
        {msg && <span className="text-sm text-good">{msg}</span>}
      </div>
    </>
  );
}
