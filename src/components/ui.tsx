'use client';

import type { Quarter, TeamMember } from '@/lib/types';

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>}
      </div>
      <div className="flex gap-2 items-center">{children}</div>
    </div>
  );
}

export function QuarterPicker({ quarters, value, onChange }: { quarters: Quarter[]; value?: string; onChange: (id: string) => void }) {
  return (
    <select className="input !w-auto" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      {quarters.map((q) => (
        <option key={q.id} value={q.id}>{q.label}</option>
      ))}
    </select>
  );
}

export function WeekPicker({ weeks, value, onChange }: { weeks: number; value: number; onChange: (w: number) => void }) {
  return (
    <select className="input !w-auto" value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {Array.from({ length: weeks }, (_, i) => i + 1).map((w) => (
        <option key={w} value={w}>Week {w}</option>
      ))}
    </select>
  );
}

export function Avatar({ member }: { member?: TeamMember | null }) {
  if (!member) return <span className="text-zinc-600">–</span>;
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white"
      style={{ backgroundColor: member.color }}
      title={member.name}
    >
      {member.initials}
    </span>
  );
}

export function StatusDot({ ok }: { ok: boolean | null }) {
  if (ok === null) return <span className="inline-block w-2.5 h-2.5 rounded-full bg-zinc-600" />;
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${ok ? 'bg-good' : 'bg-bad'}`} />;
}

export function Sparkline({ points, good }: { points: Array<number | null>; good?: boolean }) {
  const vals = points.filter((p): p is number => p !== null);
  if (vals.length < 2) return <span className="text-xs text-zinc-600">No trend</span>;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const step = w / (points.length - 1);
  let d = '';
  points.forEach((p, i) => {
    if (p === null) return;
    const x = i * step;
    const y = h - ((p - min) / range) * (h - 4) - 2;
    d += d ? ` L ${x} ${y}` : `M ${x} ${y}`;
  });
  return (
    <svg width={w} height={h} className="opacity-80">
      <path d={d} fill="none" stroke={good === false ? '#ef4444' : '#22c55e'} strokeWidth="1.5" />
    </svg>
  );
}
