'use client';

import { useMemo, useState } from 'react';
import { useEosCore, useWeeklyEntries, defaultWeek, usePersistedQuarter } from '@/lib/hooks';
import { formatValue, isOnTrack, CATEGORY_LABELS, entriesToWeekMap, lastDataWeek } from '@/lib/metrics';
import { PageHeader, QuarterPicker, WeekPicker, StatusDot, Avatar, Sparkline } from '@/components/ui';

export default function ScorecardPage() {
  const { quarters, metrics, team, activeQuarter, loading } = useEosCore();
  const { quarter, setQuarterId } = usePersistedQuarter(quarters, activeQuarter);
  const [week, setWeek] = useState<number | null>(null);
  const { entries } = useWeeklyEntries(quarter?.id);
  const weekNum = week ?? Math.min(lastDataWeek(entries) ?? defaultWeek(quarter), defaultWeek(quarter));

  const weekMap = useMemo(() => entriesToWeekMap(entries), [entries]);
  const teamById = useMemo(() => new Map(team.map((t) => [t.id, t])), [team]);

  const categories = ['membership', 'revenue', 'operations', 'growth'] as const;

  function exportCsv() {
    const rows = [['Category', 'Metric', 'Owner', 'Week', 'Target', 'Actual', 'On Track']];
    for (const m of metrics) {
      const e = (weekMap.get(m.id) ?? []).find((x) => x.week_number === weekNum);
      const ok = e ? isOnTrack(m, e.target === null ? null : Number(e.target), e.actual === null ? null : Number(e.actual)) : null;
      rows.push([
        m.category, m.name, teamById.get(m.owner_id ?? '')?.name ?? '',
        String(weekNum), String(e?.target ?? ''), String(e?.actual ?? ''),
        ok === null ? '' : ok ? 'yes' : 'no',
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replaceAll('"', '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `scorecard-${quarter?.label}-w${weekNum}.csv`;
    a.click();
  }

  if (loading) return <p className="text-zinc-500">Loading…</p>;

  return (
    <>
      <PageHeader title="Scorecard" subtitle="Weekly metrics tracking">
        <button className="btn-ghost" onClick={exportCsv}>Export CSV</button>
        <WeekPicker weeks={quarter?.weeks ?? 13} value={weekNum} onChange={setWeek} />
        <QuarterPicker quarters={quarters} value={quarter?.id} onChange={(id) => { setQuarterId(id); setWeek(null); }} />
      </PageHeader>

      {categories.map((cat) => {
        const catMetrics = metrics.filter((m) => m.category === cat);
        if (!catMetrics.length) return null;
        return (
          <div key={cat} className="panel p-5 mb-5">
            <h2 className="section-title mb-4 border-l-4 border-accent pl-3">{CATEGORY_LABELS[cat]}</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-left">
                  <th className="pb-2 font-normal">Metric</th>
                  <th className="pb-2 font-normal">Owner</th>
                  <th className="pb-2 font-normal text-right">Target</th>
                  <th className="pb-2 font-normal text-right">Actual</th>
                  <th className="pb-2 font-normal text-center">Status</th>
                  <th className="pb-2 font-normal text-right">Trend (13w)</th>
                </tr>
              </thead>
              <tbody>
                {catMetrics.map((m) => {
                  const series = weekMap.get(m.id) ?? [];
                  const e = series.find((x) => x.week_number === weekNum);
                  const target = e?.target === null || e?.target === undefined ? null : Number(e.target);
                  const actual = e?.actual === null || e?.actual === undefined ? null : Number(e.actual);
                  const ok = isOnTrack(m, target, actual);
                  return (
                    <tr key={m.id} className="border-t border-panelBorder/60">
                      <td className="py-2.5">
                        {m.name}
                        {m.is_auto && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-panelBorder text-zinc-400">AUTO</span>}
                      </td>
                      <td className="py-2.5"><Avatar member={teamById.get(m.owner_id ?? '')} /></td>
                      <td className="py-2.5 text-right text-zinc-400">{formatValue(target, m.unit)}</td>
                      <td className="py-2.5 text-right font-semibold text-white">{formatValue(actual, m.unit)}</td>
                      <td className="py-2.5 text-center"><StatusDot ok={ok} /></td>
                      <td className="py-2.5 text-right">
                        <Sparkline points={series.map((x) => (x.actual === null ? null : Number(x.actual)))} good={ok ?? undefined} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}
