'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Metric, Quarter, TeamMember, WeeklyEntry, QuarterTarget } from '@/lib/types';
import { currentWeekNumber } from '@/lib/metrics';

export function useEosCore() {
  const supabase = useMemo(() => createClient(), []);
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [q, m, t] = await Promise.all([
        supabase.from('quarters').select('*').order('start_date'),
        supabase.from('metrics').select('*').eq('active', true).order('sort_order'),
        supabase.from('team_members').select('*').order('created_at'),
      ]);
      setQuarters((q.data as Quarter[]) ?? []);
      setMetrics((m.data as Metric[]) ?? []);
      setTeam((t.data as (TeamMember & { active: boolean })[]) ?? []);
      setLoading(false);
    })();
  }, [supabase]);

  const activeQuarter = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return quarters.find((q) => q.start_date <= today && q.end_date >= today) ?? quarters[0];
  }, [quarters]);

  /** Team members still with the business - use for owner pickers and new assignments. */
  const activeTeam = useMemo(
    () => team.filter((t) => (t as TeamMember & { active?: boolean }).active !== false),
    [team]
  );

  return { supabase, quarters, metrics, team, activeTeam, activeQuarter, loading };
}

export function useWeeklyEntries(quarterId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [entries, setEntries] = useState<WeeklyEntry[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!quarterId) return;
    supabase
      .from('weekly_entries')
      .select('*')
      .eq('quarter_id', quarterId)
      .then(({ data }) => setEntries((data as WeeklyEntry[]) ?? []));
  }, [supabase, quarterId, version]);

  return { entries, refresh: () => setVersion((v) => v + 1) };
}

export function useQuarterTargets(quarterId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [targets, setTargets] = useState<QuarterTarget[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!quarterId) return;
    supabase
      .from('quarter_targets')
      .select('*')
      .eq('quarter_id', quarterId)
      .then(({ data }) => setTargets((data as QuarterTarget[]) ?? []));
  }, [supabase, quarterId, version]);

  return { targets, refresh: () => setVersion((v) => v + 1) };
}

/** Quarter selection shared across all pages via localStorage. */
export function usePersistedQuarter(quarters: Quarter[], activeQuarter: Quarter | undefined) {
  const [quarterId, setQuarterIdState] = useState<string | undefined>(undefined);
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('fn-eos-quarter') : null;
    if (saved) setQuarterIdState(saved);
  }, []);
  const setQuarterId = (id: string) => {
    localStorage.setItem('fn-eos-quarter', id);
    setQuarterIdState(id);
  };
  const quarter = quarters.find((q) => q.id === (quarterId ?? activeQuarter?.id)) ?? activeQuarter;
  return { quarter, setQuarterId };
}

export function defaultWeek(quarter: Quarter | undefined): number {
  if (!quarter) return 1;
  return currentWeekNumber(quarter.start_date, quarter.weeks);
}
