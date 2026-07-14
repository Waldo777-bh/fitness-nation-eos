'use client';

import { useEffect, useState } from 'react';
import { useEosCore } from '@/lib/hooks';
import { PageHeader } from '@/components/ui';

type Meeting = {
  id: string;
  quarter_id: string | null;
  week_number: number | null;
  meeting_date: string;
  status: string;
  notes: string | null;
  cascading_messages: string | null;
  duration_minutes: number | null;
  ratings: Record<string, number>;
};

type SyncLog = {
  id: string;
  source: string;
  status: string;
  message: string | null;
  created_at: string;
};

const STATUS_STYLE: Record<string, string> = {
  completed: 'bg-good/20 text-good',
  in_progress: 'bg-warn/20 text-warn',
  scheduled: 'bg-zinc-700/40 text-zinc-400',
};

export default function HistoryPage() {
  const { supabase, quarters, loading } = useEosCore();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [form, setForm] = useState<{ rating: number; cascading: string; notes: string }>({ rating: 8, cascading: '', notes: '' });

  async function loadMeetings() {
    const { data } = await supabase.from('meetings').select('*').order('meeting_date', { ascending: false }).limit(60);
    setMeetings((data as Meeting[]) ?? []);
  }
  useEffect(() => {
    loadMeetings();
    supabase.from('sync_logs').select('*').order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setLogs((data as SyncLog[]) ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  function startEdit(m: Meeting) {
    setEditing(m);
    setForm({ rating: Number(m.ratings?.overall) || 8, cascading: m.cascading_messages ?? '', notes: m.notes ?? '' });
  }

  async function saveEdit() {
    if (!editing) return;
    await supabase.from('meetings').update({
      ratings: { overall: form.rating },
      cascading_messages: form.cascading || null,
      notes: form.notes || null,
    }).eq('id', editing.id);
    setEditing(null);
    loadMeetings();
  }

  async function deleteMeeting(id: string) {
    if (!confirm('Delete this meeting? This cannot be undone.')) return;
    await supabase.from('meetings').delete().eq('id', id);
    loadMeetings();
  }

  if (loading) return <p className="text-zinc-500">Loading…</p>;

  const completed = meetings.filter((m) => m.status === 'completed');
  const avgOf = (m: Meeting) => {
    const vals = Object.values(m.ratings ?? {}).filter((v) => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const allRatings = completed.map(avgOf).filter((v): v is number => v !== null);
  const avgRating = allRatings.length ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1) : '–';
  const durations = completed.map((m) => m.duration_minutes).filter((v): v is number => !!v);
  const avgMins = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 90;

  return (
    <>
      <PageHeader title="Meeting History" subtitle="L10 meetings and data sync activity" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="panel p-5 text-center">
          <div className="text-4xl font-bold text-white">{completed.length}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-wide mt-1">Meetings Completed</div>
        </div>
        <div className="panel p-5 text-center">
          <div className="text-4xl font-bold text-white">{avgRating}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-wide mt-1">Average Rating</div>
        </div>
        <div className="panel p-5 text-center">
          <div className="text-4xl font-bold text-white">{avgMins}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-wide mt-1">Minutes per Meeting</div>
        </div>
      </div>

      <div className="panel mb-6">
        <div className="px-5 py-3 border-b border-panelBorder">
          <h2 className="section-title">All Meetings</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-left border-b border-panelBorder/60">
              <th className="px-5 py-2 font-normal">Week</th>
              <th className="py-2 font-normal">Date</th>
              <th className="py-2 font-normal">Status</th>
              <th className="py-2 font-normal text-center">Rating</th>
              <th className="py-2 font-normal">Cascading Messages</th>
              <th className="py-2 font-normal">Notes</th>
              <th className="py-2 font-normal text-right px-5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((m) => {
              const q = quarters.find((x) => x.id === m.quarter_id);
              const avg = avgOf(m);
              return (
                <tr key={m.id} className="border-b border-panelBorder/40">
                  <td className="px-5 py-2.5 whitespace-nowrap">Week {m.week_number ?? '–'}{q ? ` (${q.label})` : ''}</td>
                  <td className="py-2.5 whitespace-nowrap">{new Date(m.meeting_date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</td>
                  <td className="py-2.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${STATUS_STYLE[m.status] ?? STATUS_STYLE.scheduled}`}>
                      {m.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 text-center">{avg ? avg.toFixed(0) : '–'}</td>
                  <td className="py-2.5 text-zinc-400 max-w-56 truncate">{m.cascading_messages ?? '–'}</td>
                  <td className="py-2.5 text-zinc-400 max-w-56 truncate">{m.notes ?? '–'}</td>
                  <td className="py-2.5 px-5 text-right whitespace-nowrap">
                    <button className="btn-ghost text-xs" onClick={() => startEdit(m)}>Edit</button>
                    <button className="btn-ghost text-xs text-bad" onClick={() => deleteMeeting(m.id)}>Delete</button>
                  </td>
                </tr>
              );
            })}
            {!meetings.length && (
              <tr><td colSpan={7} className="px-5 py-6 text-zinc-600">No meetings recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="px-5 py-3 border-b border-panelBorder">
          <h2 className="section-title">Data Sync Log</h2>
        </div>
        <div className="divide-y divide-panelBorder/60">
          {logs.map((l) => (
            <div key={l.id} className="px-5 py-2.5 flex items-center gap-3 text-sm">
              <span className={`w-2 h-2 rounded-full ${l.status === 'success' ? 'bg-good' : 'bg-bad'}`} />
              <span className="font-medium w-24">{l.source}</span>
              <span className="flex-1 text-zinc-400 truncate">{l.message}</span>
              <span className="text-xs text-zinc-600">{new Date(l.created_at).toLocaleString('en-AU')}</span>
            </div>
          ))}
          {!logs.length && <p className="text-zinc-600 text-sm px-5 py-4">No syncs have run yet - they start once the app is deployed with API keys.</p>}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={() => setEditing(null)}>
          <div className="panel w-full max-w-md p-6" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Edit Meeting — Week {editing.week_number ?? '–'}</h2>
              <button className="text-zinc-500 hover:text-white text-xl leading-none" onClick={() => setEditing(null)} aria-label="Close">×</button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-zinc-400 uppercase tracking-wide">Rating</label>
                  <span className="text-xl font-mono text-white">{form.rating}</span>
                </div>
                <input type="range" min={1} max={10} step={1} value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))} className="w-full h-2 accent-accent mt-1 cursor-pointer" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wide">Cascading Messages</label>
                <textarea className="input min-h-20 mt-1" value={form.cascading} onChange={(e) => setForm((f) => ({ ...f, cascading: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wide">Notes</label>
                <textarea className="input min-h-24 mt-1" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <button className="btn w-full justify-center" onClick={saveEdit}><span>Save Changes</span></button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
