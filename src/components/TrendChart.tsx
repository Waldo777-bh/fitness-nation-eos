'use client';

export type Series = {
  label: string;
  color: string;
  dashed?: boolean;          // targets are dashed, actuals solid
  axis?: 'left' | 'right';
  points: Array<number | null>; // index = week - 1
  start?: number | null;     // quarter starting value - anchors the line at the 'S' slot
};

function niceMax(v: number) {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / pow) * pow;
}

export default function TrendChart({
  title, series, weeks, leftLabel, rightLabel, money,
}: {
  title: string;
  series: Series[];
  weeks: number;
  leftLabel?: string;
  rightLabel?: string;
  money?: boolean;
}) {
  const W = 900;
  const H = 260;
  const pad = { l: 56, r: 56, t: 12, b: 34 };

  const hasStart = series.some((s) => s.start !== undefined && s.start !== null);
  const slots = weeks + (hasStart ? 1 : 0);
  const seriesPoints = (s: Series): Array<number | null> =>
    hasStart ? [s.start ?? null, ...s.points.slice(0, weeks)] : s.points.slice(0, weeks);

  const axisMax = (axis: 'left' | 'right') => {
    const vals = series.filter((s) => (s.axis ?? 'left') === axis).flatMap(seriesPoints).filter((p): p is number => p !== null);
    return niceMax(Math.max(...(vals.length ? vals : [1])) * 1.1);
  };
  const maxL = axisMax('left');
  const maxR = axisMax('right');
  const hasRight = series.some((s) => s.axis === 'right');

  const x = (i: number) => pad.l + (i / Math.max(slots - 1, 1)) * (W - pad.l - pad.r);
  const y = (v: number, axis: 'left' | 'right') =>
    H - pad.b - (v / (axis === 'left' ? maxL : maxR)) * (H - pad.t - pad.b);

  const fmt = (v: number) => (money ? (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`) : String(Math.round(v)));

  return (
    <div className="panel p-5">
      <h2 className="section-title mb-3 border-l-4 border-accent pl-3">{title}</h2>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={W - pad.r} y1={y(maxL * f, 'left')} y2={y(maxL * f, 'left')} stroke="#27272a" strokeWidth="1" />
            <text x={pad.l - 8} y={y(maxL * f, 'left') + 4} fill="#71717a" fontSize="11" textAnchor="end">{fmt(maxL * f)}</text>
            {hasRight && (
              <text x={W - pad.r + 8} y={y(maxR * f, 'right') + 4} fill="#71717a" fontSize="11">{Math.round(maxR * f)}</text>
            )}
          </g>
        ))}
        {Array.from({ length: slots }, (_, i) => (
          <text key={i} x={x(i)} y={H - pad.b + 18} fill="#71717a" fontSize="11" textAnchor="middle">
            {hasStart ? (i === 0 ? 'S' : `W${i}`) : `W${i + 1}`}
          </text>
        ))}
        {series.map((s) => {
          let d = '';
          const dots: Array<{ px: number; py: number }> = [];
          seriesPoints(s).forEach((p, i) => {
            if (p === null || p === undefined) return;
            const px = x(i);
            const py = y(p, s.axis ?? 'left');
            d += d ? ` L ${px} ${py}` : `M ${px} ${py}`;
            dots.push({ px, py });
          });
          if (!dots.length) return null;
          return (
            <g key={s.label} opacity={s.dashed ? 0.7 : 1}>
              <path d={d} fill="none" stroke={s.color} strokeWidth="2"
                strokeDasharray={s.dashed ? '5 4' : undefined} />
              {!s.dashed && dots.map((pt, i) => (
                <circle key={i} cx={pt.px} cy={pt.py} r="3" fill={s.color} />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <svg width="18" height="6"><line x1="0" x2="18" y1="3" y2="3" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? '4 3' : undefined} /></svg>
            {s.label}
          </span>
        ))}
      </div>
      {leftLabel && <p className="text-[10px] text-zinc-600 mt-1">{leftLabel}{hasRight && rightLabel ? ` (left) · ${rightLabel} (right)` : ''}</p>}
    </div>
  );
}
