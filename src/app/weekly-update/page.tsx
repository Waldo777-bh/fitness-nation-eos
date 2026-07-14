'use client';

import { useEffect, useMemo, useState } from 'react';
import { useEosCore, useWeeklyEntries, defaultWeek, usePersistedQuarter } from '@/lib/hooks';
import { formatValue, CATEGORY_LABELS, computeDerived, weekStartFor, lastDataWeek } from '@/lib/metrics';
import { PageHeader, QuarterPicker, WeekPicker } from '@/components/ui';

export default function WeeklyUpdatePage() {
  const { supabase, quarters, metrics, activeQuarter, loading } = useEosCore();
  const { quarter, setQuarterId } = usePersistedQuarter(quarters, activeQuarter);
  const [week, setWeek] = useState<number | null>(null);
  const { entries, refresh } = useWeeklyEntries(quarter?.id);
  const weekNum = week ?? Math.min(lastDataWeek(entries) ?? defaultWeek(quarter), defaultWeek(quarter));

  const [tab, setTab] = useState<'actuals' | 'targets'>('actuals');
  const [values, setValues] = useState<Record<string, string>>({});
  const [targetValues, setTargetValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const weekEntries = useMemo(() => entries.filter((e) => e.week_number === weekNum), [entries, weekNum]);

  useEffect(() => {
    const v: Record<string, string> = {};
    const t: Record<string, string> = {};
    for (const e of weekEntries) {
      if (e.actual !== null) v[e.metric_id] = String(e.actual);
      if (e.target !== null) t[e.metric_id] = String(e.target);
    }
    setValues(v);
    setTargetValues(t);
  }, [weekEntries]);

  const targetFor = (metricId: string) => {
    const raw = targetValues[metricId];
    return raw === undefined || raw === '' ? null : Number(raw);
  };

  // Live derived values from current inputs
  const derived = useMemo(() => {
    const keyed: Record<string, number | null> = {};
    for (const m of metrics) {
      const raw = values[m.id];
      keyed[m.key] = raw === undefined || raw === '' ? null : Number(raw);
    }
    return computeDerived(keyed);
  }, [values, metrics]);

  function pctChip(metric: { id: string; unit: string; direction: string }, actualRaw: string | undefined) {
    const target = targetFor(metric.id);
    const actual = actualRaw === undefined || actualRaw === '' ? null : Number(actualRaw);
    if (target === null || actual === null || target === 0) return null;
    const pct = Math.round((actual / target) * 100);
    const good = metric.direction === 'down' ? actual <= target : actual >= target;
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${good ? 'bg-good/20 text-good' : 'bg-bad/20 text-bad'}`}>
        {pct}%
      </span>
    );
  }

  async function save() {
    if (!quarter) return;
    setSaving(true);
    const weekStart = weekStartFor(quarter.start_date, weekNum);
    let count = 0;

    if (tab === 'actuals') {
      const keyed: Record<string, number | null> = {};
      for (const m of metrics) {
        const raw = values[m.id];
        keyed[m.key] = raw === undefined || raw === '' ? null : Number(raw);
      }
      for (const m of metrics.filter((x) => x.is_auto)) {
        if (derived[m.key] !== undefined && derived[m.key] !== null) keyed[m.key] = derived[m.key];
      }
      for (const m of metrics) {
        const val = keyed[m.key];
        if (val === null || val === undefined) continue;
        const { error } = await supabase.from('weekly_entries').upsert(
          {
            quarter_id: quarter.id, metric_id: m.id, week_number: weekNum, week_start: weekStart,
            actual: val, source: m.is_auto ? 'derived' : 'manual',
          },
          { onConflict: 'metric_id,week_start' }
        );
        if (error) { setSavedMsg(`Error: ${error.message}`); setSaving(false); return; }
        count++;
      }
    } else {
      for (const m of metrics) {
        const raw = targetValues[m.id];
        if (raw === undefined || raw === '') continue;
        const { error } = await supabase.from('weekly_entries').upsert(
          {
            quarter_id: quarter.id, metric_id: m.id, week_number: weekNum, week_start: weekStart,
            target: Number(raw),
          },
          { onConflict: 'metric_id,week_start' }
        );
        if (error) { setSavedMsg(`Error: ${error.message}`); setSaving(false); return; }
        count++;
      }
    }
    setSaving(false);
    setSavedMsg(`Week ${weekNum} ${tab} saved (${count} metrics)`);
    refresh();
    setTimeout(() => setSavedMsg(null), 4000);
  }

  if (loading) return <p className="text-zinc-500">Loading…</p>;

  const categories = ['membership', 'revenue', 'operations', 'growth'] as const;

  return (
    <>
      <PageHeader title="Weekly Update" subtitle="Update your targets and actuals week by week">
        <WeekPicker weeks={quarter?.weeks ?? 13} value={weekNum} onChange={setWeek} />
        <QuarterPicker quarters={quarters} value={quarter?.id} onChange={(id) => { setQuarterId(id); setWeek(null); }} />
      </PageHeader>

      <div className="flex gap-2 mb-5">
        <button className={tab === 'actuals' ? 'btn' : 'btn-ghost'} onClick={() => setTab('actuals')}>
          <span>Update Actuals</span>
        </button>
        <button className={tab === 'targets' ? 'btn' : 'btn-ghost'} onClick={() => setTab('targets')}>
          <span>Set Targets</span>
        </button>
      </div>

      {categories.map((cat) => {
        const catMetrics = metrics.filter((m) => m.category === cat && (tab === 'targets' || !m.is_auto));
        const autoMetrics = tab === 'actuals' ? metrics.filter((m) => m.category === cat && m.is_auto) : [];
        if (!catMetrics.length && !autoMetrics.length) return null;
        return (
          <div key={cat} className="panel p-5 mb-5">
            <h2 className="section-title mb-4 border-l-4 border-accent pl-3">{CATEGORY_LABELS[cat]}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catMetrics.map((m) => (
                <div key={m.id}>
                  <label className="text-xs text-zinc-400 flex items-center justify-between mb-1 gap-2">
                    <span className="truncate">
                      {m.name}
                      {m.source !== 'manual' && m.source !== 'derived' && (
                        <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-panelBorder text-zinc-500 uppercase">{m.source}</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {tab === 'actuals' && <>Target: {formatValue(targetFor(m.id), m.unit)} {pctChip(m, values[m.id])}</>}
                    </span>
                  </label>
                  <input
                    className="input"
                    type="number"
                    step="any"
                    value={(tab === 'actuals' ? values[m.id] : targetValues[m.id]) ?? ''}
                    placeholder={tab === 'actuals' ? (m.source !== 'manual' ? 'Auto via API (can override)' : 'Enter actual') : 'Weekly target'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (tab === 'actuals') setValues((v) => ({ ...v, [m.id]: val }));
                      else setTargetValues((v) => ({ ...v, [m.id]: val }));
                    }}
                  />
                </div>
              ))}
              {autoMetrics.map((m) => (
                <div key={m.id}>
                  <label className="text-xs text-zinc-400 flex items-center justify-between mb-1">
                    <span>{m.name} <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-panelBorder text-zinc-500">AUTO</span></span>
                    <span className="flex items-center gap-1.5">
                      Target: {formatValue(targetFor(m.id), m.unit)}
                      {derived[m.key] !== null && derived[m.key] !== undefined &&
                        pctChip(m, String(derived[m.key]))}
                    </span>
                  </label>
                  <div className="input bg-panel text-zinc-300 cursor-not-allowed">
                    {derived[m.key] === null || derived[m.key] === undefined ? '– calculated on save' : formatValue(derived[m.key], m.unit)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-4">
        <button className="btn" onClick={save} disabled={saving}>
          <span>{saving ? 'Saving…' : `Save Week ${weekNum} ${tab === 'actuals' ? 'Actuals' : 'Targets'}`}</span>
        </button>
        {savedMsg && <span className="text-sm text-good">{savedMsg}</span>}
      </div>
    </>
  );
}
