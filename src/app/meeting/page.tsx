'use client';

import { useEffect, useState } from 'react';
import { useEosCore, defaultWeek, usePersistedQuarter } from '@/lib/hooks';
import { PageHeader, QuarterPicker, WeekPicker } from '@/components/ui';

const AGENDA = [
  { name: 'Segue', mins: 5, desc: 'Good news - personal and business' },
  { name: 'Scorecard', mins: 5, desc: 'Review weekly numbers - on/off track only' },
  { name: 'Rock Review', mins: 5, desc: 'On track / off track per rock' },
  { name: 'Customer & Employee Headlines', mins: 5, desc: 'Quick headlines only' },
  { name: 'To-Do List', mins: 5, desc: 'Done / not done from last week' },
  { name: 'IDS', mins: 60, desc: 'Identify, Discuss, Solve top issues' },
  { name: 'Conclude', mins: 5, desc: 'Recap to-dos, cascading messages, rate the meeting 1-10' },
];

type Meeting = {
  id: string;
  quarter_id: string | null;
  week_number: number | null;
  meeting_date: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  notes: string | null;
  cascading_messages: string | null;
  duration_minutes: number | null;
  ratings: Record<string, number>;
};

export default function MeetingPage() {
  const { supabase, quarters, activeTeam: team, activeQuarter, loading } = useEosCore();
  const { quarter, setQuarterId } = usePersistedQuarter(quarters, activeQuarter);
  const [week, setWeek] = useState<number | null>(null);
  const weekNum = week ?? defaultWeek(quarter);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [notes, setNotes] = useState('');
  const [cascading, setCascading] = useState('');
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    if (!quarter) return;
    const { data } = await supabase.from('meetings').select('*')
      .eq('quarter_id', quarter.id).eq('week_number', weekNum).maybeSingle();
    const m = data as Meeting | null;
    setMeeting(m);
    setNotes(m?.notes ?? '');
    setCascading(m?.cascading_messages ?? '');
    setRatings(m?.ratings ?? {});
    if (m?.status === 'in_progress') setStartedAt(new Date());
    else setStartedAt(null);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supabase, quarter?.id, weekNum]);

  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  async function startMeeting() {
    if (!quarter) return;
    const { data, error } = await supabase.from('meetings').upsert(
      {
        quarter_id: quarter.id, week_number: weekNum,
        meeting_date: new Date().toISOString().slice(0, 10),
        status: 'in_progress', attendees: team.map((t) => t.id),
      },
      { onConflict: 'quarter_id,week_number' }
    ).select().single();
    if (!error) {
      setMeeting(data as Meeting);
      setStartedAt(new Date());
      setCurrentStep(0);
    }
  }

  async function saveProgress(status?: 'in_progress' | 'completed') {
    if (!meeting) return;
    const patch: Partial<Meeting> = {
      notes: notes || null,
      cascading_messages: cascading || null,
      ratings,
    };
    if (status) patch.status = status;
    if (status === 'completed') patch.duration_minutes = Math.max(Math.round(elapsed / 60), meeting.duration_minutes ?? 0) || 90;
    await supabase.from('meetings').update(patch).eq('id', meeting.id);
    if (status === 'completed') {
      setStartedAt(null);
      setMsg('Meeting completed and saved to history');
    } else {
      setMsg('Progress saved');
    }
    load();
    setTimeout(() => setMsg(null), 4000);
  }

  if (loading) return <p className="text-zinc-500">Loading…</p>;

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  const inProgress = meeting?.status === 'in_progress';
  const completed = meeting?.status === 'completed';

  return (
    <>
      <PageHeader title="Level 10 Meeting" subtitle={`Week ${weekNum} of ${quarter?.label ?? ''}`}>
        {inProgress && <span className="text-2xl font-mono text-white mr-3">{mm}:{ss}</span>}
        <WeekPicker weeks={quarter?.weeks ?? 13} value={weekNum} onChange={setWeek} />
        <QuarterPicker quarters={quarters} value={quarter?.id} onChange={(id) => { setQuarterId(id); setWeek(null); }} />
      </PageHeader>

      {!meeting && (
        <div className="panel p-10 text-center mb-5">
          <p className="text-zinc-400 mb-4">No meeting recorded for Week {weekNum}.</p>
          <button className="btn" onClick={startMeeting}><span>Start Week {weekNum} Meeting</span></button>
        </div>
      )}

      {completed && (
        <div className="panel p-4 mb-5 border-good/40 bg-good/5 flex items-center justify-between">
          <span className="text-good text-sm font-semibold uppercase">
            Week {weekNum} meeting completed - {new Date(meeting!.meeting_date).toLocaleDateString('en-AU')}
            {meeting!.duration_minutes ? ` · ${meeting!.duration_minutes} min` : ''}
          </span>
          <button className="btn-ghost text-xs" onClick={() => saveProgress('in_progress')}>Reopen</button>
        </div>
      )}

      {meeting && (
        <div className="grid md:grid-cols-[1fr_340px] gap-5">
          <div className="flex flex-col gap-3">
            {AGENDA.map((step, i) => (
              <button
                key={step.name}
                onClick={() => setCurrentStep(i)}
                className={`panel p-4 text-left transition-colors ${i === currentStep && inProgress ? 'border-accent' : ''} ${i < currentStep ? 'opacity-50' : ''}`}
              >
                <div className="flex justify-between">
                  <span className="font-semibold text-white">{i + 1}. {step.name}</span>
                  <span className="text-sm text-zinc-500">{step.mins} min</span>
                </div>
                <p className="text-sm text-zinc-400 mt-1">{step.desc}</p>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <div className="panel p-4">
              <h3 className="font-semibold text-white mb-2 uppercase text-sm tracking-wide">Meeting Notes</h3>
              <textarea className="input min-h-32" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Decisions, discussion points…" />
            </div>
            <div className="panel p-4">
              <h3 className="font-semibold text-white mb-2 uppercase text-sm tracking-wide">Cascading Messages</h3>
              <textarea className="input min-h-20" value={cascading} onChange={(e) => setCascading(e.target.value)} placeholder="What gets communicated to the wider team?" />
            </div>
            <div className="panel p-4">
              <h3 className="font-semibold text-white mb-2 uppercase text-sm tracking-wide">Rate the Meeting (1-10)</h3>
              {team.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-1">
                  <span className="flex-1 text-sm">{t.name}</span>
                  <input
                    className="input !w-20"
                    type="number" min={1} max={10}
                    value={ratings[t.id] ?? ''}
                    onChange={(e) => setRatings((r) => ({ ...r, [t.id]: Number(e.target.value) }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button className="btn-ghost flex-1" onClick={() => saveProgress()}>Save Progress</button>
              {!completed && <button className="btn flex-1" onClick={() => saveProgress('completed')}><span>Complete Meeting</span></button>}
            </div>
            {msg && <p className="text-sm text-good">{msg}</p>}
          </div>
        </div>
      )}
    </>
  );
}
