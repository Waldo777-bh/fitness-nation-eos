'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useEosCore, useWeeklyEntries, useQuarterTargets, defaultWeek, usePersistedQuarter } from '@/lib/hooks';
import { formatValue, isOnTrack, entriesToWeekMap, lastDataWeek } from '@/lib/metrics';
import { PageHeader, QuarterPicker, WeekPicker, StatusDot, Avatar } from '@/components/ui';
import TrendChart, { type Series } from '@/components/TrendChart';
import type { Rock, Issue, Todo } from '@/lib/types';

const HEADLINE_KEYS = [
  'dd_members', 'pif_members', 'net_dd_growth', 'new_dd_sales', 'dd_cancellations', 'shake_sales',
  'total_revenue', 'dd_revenue', 'fitness_passport_revenue', 'retail_revenue', 'google_reviews_week', 'google_star_rating',
];

const REV_SERIES: Array<{ key: string; label: string; color: string; axis: 'left' | 'right' }> = [
  { key: 'total_revenue', label: 'Total', color: '#818cf8', axis: 'left' },
  { key: 'dd_revenue', label: 'DD Rev', color: '#34d399', axis: 'left' },
  { key: 'retail_revenue', label: 'Retail', color: '#f472b6', axis: 'right' },
  { key: 'pif_revenue', label: 'PIF', color: '#e879f9', axis: 'right' },
  { key: 'fitness_passport_revenue', label: 'FP', color: '#f43f5e', axis: 'right' },
  { key: 'pt_revenue', label: 'PT', color: '#fbbf24', axis: 'right' },
];

const MEM_SERIES: Array<{ key: string; label: string; color: string; axis: 'left' | 'right' }> = [
  { key: 'dd_members', label: 'DD Members', color: '#f43f5e', axis: 'left' },
  { key: 'pif_members', label: 'PIF', color: '#a78bfa', axis: 'right' },
  { key: 'member_suspensions', label: 'Suspensions', color: '#f472b6', axis: 'right' },
  { key: 'fitness_passport_members', label: 'FP Members', color: '#34d399', axis: 'right' },
];

export default function DashboardPage() {
  const { supabase, quarters, metrics, team, activeQuarter, loading } = useEosCore();
  const { quarter, setQuarterId } = usePersistedQuarter(quarters, activeQuarter);
  const [week, setWeek] = useState<number | null>(null);
  const { entries } = useWeeklyEntries(quarter?.id);
  const { targets } = useQuarterTargets(quarter?.id);
  const weekNum = week ?? Math.min(lastDataWeek(entries) ?? defaultWeek(quarter), defaultWeek(quarter));

  const [rocks, setRocks] = useState<Rock[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    if (!quarter) return;
    supabase.from('rocks').select('*').eq('quarter_id', quarter.id).then(({ data }) => setRocks((data as Rock[]) ?? []));
    supabase.from('issues').select('*').neq('status', 'resolved').neq('status', 'dropped').then(({ data }) => setIssues((data as Issue[]) ?? []));
    supabase.from('todos').select('*').then(({ data }) => setTodos((data as Todo[]) ?? []));
  }, [supabase, quarter]);

  const weekMap = useMemo(() => entriesToWeekMap(entries), [entries]);
  const keyToMetric = useMemo(() => new Map(metrics.map((m) => [m.key, m])), [metrics]);
  const startByMetric = useMemo(() => new Map(targets.map((t) => [t.metric_id, t.start_value])), [targets]);

  const weekEntries = useMemo(() => {
    const m = new Map<string, { target: number | null; actual: number | null }>();
    entries.filter((e) => e.week_number === weekNum).forEach((e) => {
      m.set(e.metric_id, { target: e.target === null ? null : Number(e.target), actual: e.actual === null ? null : Number(e.actual) });
    });
    return m;
  }, [entries, weekNum]);

  const scored = metrics
    .map((metric) => {
      const e = weekEntries.get(metric.id);
      return { metric, ok: e ? isOnTrack(metric, e.target, e.actual) : null };
    })
    .filter((s) => s.ok !== null);
  const onTrack = scored.filter((s) => s.ok).length;
  const offTrack = scored.length - onTrack;

  const chartSeries = (defs: Array<{ key: string; label: string; color: string; axis: 'left' | 'right' }>): Series[] =>
    defs.flatMap((d) => {
      const metric = keyToMetric.get(d.key);
      if (!metric) return [];
      const rows = weekMap.get(metric.id) ?? [];
      const byWeek = (field: 'target' | 'actual') =>
        Array.from({ length: quarter?.weeks ?? 13 }, (_, i) => {
          const r = rows.find((x) => x.week_number === i + 1);
          const v = r?.[field];
          return v === null || v === undefined ? null : Number(v);
        });
      return [
        { label: `${d.label} Target`, color: d.color, dashed: true, axis: d.axis, points: byWeek('target') },
        { label: `${d.label} Actual`, color: d.color, axis: d.axis, points: byWeek('actual') },
      ];
    });

  const headline = HEADLINE_KEYS.map((k) => keyToMetric.get(k)).filter(Boolean);

  const openTodos = todos.filter((t) => !t.done);
  if (loading) return <p className="text-zinc-500">Loading…</p>;

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`${quarter?.label ?? ''} Week ${weekNum} overview`}>
        <WeekPicker weeks={quarter?.weeks ?? 13} value={weekNum} onChange={setWeek} />
        <QuarterPicker quarters={quarters} value={quarter?.id} onChange={(id) => { setQuarterId(id); setWeek(null); }} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="panel p-6 border-good/40 bg-good/5 text-center">
          <div className="text-4xl font-bold text-good">{onTrack}</div>
          <div className="text-sm text-zinc-400 mt-1 uppercase tracking-wide">On Track</div>
        </div>
        <div className="panel p-6 border-bad/40 bg-bad/5 text-center">
          <div className="text-4xl font-bold text-bad">{offTrack}</div>
          <div className="text-sm text-zinc-400 mt-1 uppercase tracking-wide">Off Track</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {headline.map((metric) => {
          if (!metric) return null;
          const e = weekEntries.get(metric.id);
          const ok = e ? isOnTrack(metric, e.target, e.actual) : null;
          const start = startByMetric.get(metric.id);
          const vsStart =
            e?.actual !== null && e?.actual !== undefined && start !== null && start !== undefined && Number(start) !== 0
              ? ((Number(e.actual) - Number(start)) / Math.abs(Number(start))) * 100
              : null;
          const vsGood = vsStart === null ? null : metric.direction === 'down' ? vsStart <= 0 : vsStart >= 0;
          return (
            <div key={metric.id} className="panel p-3">
              <div className="text-[10px] uppercase tracking-wide text-zinc-500 h-7">{metric.name}</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-lg font-bold text-white">{formatValue(e?.actual ?? null, metric.unit)}</span>
                <StatusDot ok={ok} />
              </div>
              <div className={`text-[11px] mt-1 ${vsGood === null ? 'text-zinc-600' : vsGood ? 'text-good' : 'text-bad'}`}>
                {vsStart === null ? '– vs start' : `${vsStart >= 0 ? '+' : ''}${vsStart.toFixed(1)}% vs start`}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="panel p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-white uppercase text-sm tracking-wide">Rocks Progress</h2>
            <Link href="/rocks" className="text-xs text-accent">View →</Link>
          </div>
          <div className="text-2xl font-bold text-white mb-2">
            {rocks.filter((r) => r.status === 'on_track' || r.status === 'done').length}
            <span className="text-zinc-500 text-base font-normal"> / {rocks.length} on track</span>
          </div>
          {team.map((t) => {
            const mine = rocks.filter((r) => r.owner_id === t.id);
            if (!mine.length) return null;
            const good = mine.filter((r) => r.status !== 'off_track').length;
            return (
              <div key={t.id} className="py-1.5">
                <div className="flex items-center gap-2 text-sm mb-1">
                  <Avatar member={t} /> <span className="flex-1">{t.name}</span>
                  <span className="text-zinc-500">{good}/{mine.length}</span>
                </div>
                <div className="h-1.5 bg-panelBorder rounded overflow-hidden">
                  <div className="h-full bg-good" style={{ width: `${(good / mine.length) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="panel p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-white uppercase text-sm tracking-wide">Open Issues</h2>
            <Link href="/issues" className="text-xs text-accent">View →</Link>
          </div>
          <div className="text-2xl font-bold text-white mb-2">{issues.length} <span className="text-zinc-500 text-base font-normal">open</span></div>
          {team.map((t) => {
            const mine = issues.filter((i) => i.owner_id === t.id).length;
            return (
              <div key={t.id} className="flex items-center gap-2 py-1 text-sm">
                <Avatar member={t} /> <span className="flex-1">{t.name}</span>
                <span className="text-zinc-500">{mine} issue{mine === 1 ? '' : 's'}</span>
              </div>
            );
          })}
        </div>
        <div className="panel p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-white uppercase text-sm tracking-wide">To-Dos Outstanding</h2>
            <Link href="/todos" className="text-xs text-accent">View →</Link>
          </div>
          <div className="text-2xl font-bold text-white mb-2">{openTodos.length} <span className="text-zinc-500 text-base font-normal">outstanding</span></div>
          {team.map((t) => {
            const mine = todos.filter((x) => x.owner_id === t.id);
            if (!mine.length) return null;
            const done = mine.filter((x) => x.done).length;
            return (
              <div key={t.id} className="py-1.5">
                <div className="flex items-center gap-2 text-sm mb-1">
                  <Avatar member={t} /> <span className="flex-1">{t.name}</span>
                  <span className="text-zinc-500">{done}/{mine.length}</span>
                </div>
                <div className="h-1.5 bg-panelBorder rounded overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${(done / mine.length) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <TrendChart title="Revenue Trend" series={chartSeries(REV_SERIES)} weeks={quarter?.weeks ?? 13} money leftLabel="Total / DD revenue" rightLabel="Retail / PIF / FP / PT" />
        <div className="grid lg:grid-cols-2 gap-5">
          <TrendChart title="Membership Trend" series={chartSeries(MEM_SERIES)} weeks={quarter?.weeks ?? 13} leftLabel="DD members" rightLabel="PIF / Susp / FP" />
          <TrendChart
            title="Google Reviews & Shake Sales"
            series={chartSeries([
              { key: 'shake_sales', label: 'Shakes', color: '#fbbf24', axis: 'left' },
              { key: 'google_reviews_week', label: 'Reviews', color: '#34d399', axis: 'right' },
            ])}
            weeks={quarter?.weeks ?? 13}
            leftLabel="Shake sales"
            rightLabel="Google reviews"
          />
        </div>
      </div>
    </>
  );
}
