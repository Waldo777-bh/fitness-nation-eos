'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useEosCore, defaultWeek, usePersistedQuarter } from '@/lib/hooks';
import { PageHeader, QuarterPicker, WeekPicker, Avatar } from '@/components/ui';
import type { Rock, Issue, Todo } from '@/lib/types';

const AGENDA = [
  { id: 'segue', name: 'Segue', mins: 5, desc: 'Personal & business wins', link: null },
  { id: 'scorecard', name: 'Scorecard Review', mins: 15, desc: 'Review weekly numbers - on/off track', link: '/scorecard' },
  { id: 'rocks', name: 'Rock Review', mins: 5, desc: 'Quarterly priorities - on/off track per rock', link: '/rocks' },
  { id: 'pulse', name: 'Customer & Team Pulse', mins: 5, desc: 'Customer & employee headlines', link: null },
  { id: 'issues-list', name: 'Issues List', mins: 5, desc: 'Prioritize top 3-5 issues', link: '/issues' },
  { id: 'ids', name: 'IDS - Identify, Discuss, Solve', mins: 40, desc: 'Work through the top issues', link: '/issues' },
  { id: 'quarterly-focus', name: 'Quarterly Focus Check', mins: 10, desc: 'Are we on track for the quarter?', link: '/rocks' },
  { id: 'todos', name: 'To-Do Review', mins: 5, desc: 'Done / not done from last week', link: '/todos' },
  { id: 'cascading', name: 'Cascading Messages', mins: 5, desc: 'What gets communicated to the team', link: null },
  { id: 'rating', name: 'Rating the Meeting', mins: 5, desc: '1-10 rating', link: null },
] as const;

const TOTAL_MINS = AGENDA.reduce((s, a) => s + a.mins, 0);

// Matches the original app exactly: single 1-10 meeting rating with banded caption.
const ratingCaption = (v: number) =>
  v >= 8
    ? 'Great meeting! This is Level 10 quality.'
    : v >= 6
    ? "Good meeting, but there's room for improvement."
    : 'Below target. Discuss what needs to change.';

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
  section_notes: Record<string, string>;
  elapsed_seconds: number;
  current_section: number;
};

const fmtClock = (secs: number) => {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(Math.floor(secs % 60)).padStart(2, '0');
  return `${m}:${s}`;
};

const STATUS_STYLE: Record<string, string> = {
  on_track: 'bg-good/20 text-good', done: 'bg-good/20 text-good',
  off_track: 'bg-bad/20 text-bad', not_started: 'bg-panelBorder text-zinc-400',
};
const STATUS_LABEL: Record<string, string> = {
  on_track: 'On Track', done: 'Done', off_track: 'Off Track', not_started: 'Not Started',
};

export default function MeetingPage() {
  const { supabase, quarters, team, activeTeam, activeQuarter, loading } = useEosCore();
  const { quarter, setQuarterId } = usePersistedQuarter(quarters, activeQuarter);
  const [week, setWeek] = useState<number | null>(null);
  const weekNum = week ?? defaultWeek(quarter);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [notes, setNotes] = useState('');
  const [cascading, setCascading] = useState('');
  const [rating, setRating] = useState<number>(8);
  const [sectionNotes, setSectionNotes] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [sectionAnchor, setSectionAnchor] = useState(0); // elapsed value when current section was entered
  const [msg, setMsg] = useState<string | null>(null);

  const [rocks, setRocks] = useState<Rock[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);

  const meetingRef = useRef<Meeting | null>(null);
  meetingRef.current = meeting;

  async function load() {
    if (!quarter) return;
    const { data } = await supabase.from('meetings').select('*')
      .eq('quarter_id', quarter.id).eq('week_number', weekNum).maybeSingle();
    const m = data as Meeting | null;
    setMeeting(m);
    setNotes(m?.notes ?? '');
    setCascading(m?.cascading_messages ?? '');
    setRating(Number(m?.ratings?.overall) || 8);
    setSectionNotes(m?.section_notes ?? {});
    setCurrentStep(m?.current_section ?? 0);
    setElapsed(m?.elapsed_seconds ?? 0);
    setSectionAnchor(m?.elapsed_seconds ?? 0);
    setRunning(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supabase, quarter?.id, weekNum]);

  useEffect(() => {
    if (!quarter) return;
    supabase.from('rocks').select('*').eq('quarter_id', quarter.id).order('created_at').then(({ data }) => setRocks((data as Rock[]) ?? []));
    supabase.from('issues').select('*').neq('status', 'resolved').neq('status', 'dropped').order('created_at').then(({ data }) => setIssues((data as Issue[]) ?? []));
    supabase.from('todos').select('*').order('done').order('due_date', { ascending: true, nullsFirst: false }).then(({ data }) => setTodos((data as Todo[]) ?? []));
  }, [supabase, quarter]);

  // Ticking clock
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  // Auto-save per-section notes (debounced)
  useEffect(() => {
    if (!meeting) return;
    const t = setTimeout(() => {
      supabase.from('meetings').update({ section_notes: sectionNotes }).eq('id', meeting.id).then(() => {});
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionNotes]);

  // Auto-save the meeting rating (debounced)
  useEffect(() => {
    if (!meeting) return;
    const t = setTimeout(() => {
      supabase.from('meetings').update({ ratings: { overall: rating } }).eq('id', meeting.id).then(() => {});
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rating]);

  async function persistTimer(extra?: Partial<Meeting>) {
    if (!meetingRef.current) return;
    await supabase.from('meetings').update({
      elapsed_seconds: elapsed, current_section: currentStep, ...extra,
    }).eq('id', meetingRef.current.id);
  }

  async function startMeeting() {
    if (!quarter) return;
    const { data, error } = await supabase.from('meetings').upsert(
      {
        quarter_id: quarter.id, week_number: weekNum,
        meeting_date: new Date().toISOString().slice(0, 10),
        status: 'in_progress', attendees: activeTeam.map((t) => t.id),
      },
      { onConflict: 'quarter_id,week_number' }
    ).select().single();
    if (!error && data) {
      const m = data as Meeting;
      setMeeting(m);
      setRating(Number(m.ratings?.overall) || 8);
      setCurrentStep(m.current_section ?? 0);
      setElapsed(m.elapsed_seconds ?? 0);
      setSectionAnchor(m.elapsed_seconds ?? 0);
      setRunning(true);
    }
  }

  function toggleTimer() {
    setRunning((r) => {
      if (r) persistTimer(); // pausing - save elapsed
      return !r;
    });
  }

  function resetTimer() {
    if (!confirm('Reset the meeting timer to 00:00?')) return;
    setElapsed(0);
    setSectionAnchor(0);
    if (meeting) supabase.from('meetings').update({ elapsed_seconds: 0 }).eq('id', meeting.id).then(() => {});
  }

  function goToStep(i: number) {
    if (i < 0 || i >= AGENDA.length) return;
    setCurrentStep(i);
    setSectionAnchor(elapsed);
    if (meeting) supabase.from('meetings').update({ current_section: i, elapsed_seconds: elapsed }).eq('id', meeting.id).then(() => {});
  }

  async function toggleTodo(t: Todo) {
    await supabase.from('todos').update({
      done: !t.done, completed_at: !t.done ? new Date().toISOString() : null,
    }).eq('id', t.id);
    const { data } = await supabase.from('todos').select('*').order('done').order('due_date', { ascending: true, nullsFirst: false });
    setTodos((data as Todo[]) ?? []);
  }

  async function saveProgress(status?: 'in_progress' | 'completed') {
    if (!meeting) return;
    const patch: Record<string, unknown> = {
      notes: notes || null,
      cascading_messages: cascading || null,
      ratings: { overall: rating },
      section_notes: sectionNotes,
      elapsed_seconds: elapsed,
      current_section: currentStep,
    };
    if (status) patch.status = status;
    if (status === 'completed') patch.duration_minutes = Math.max(Math.round(elapsed / 60), meeting.duration_minutes ?? 0) || TOTAL_MINS;
    await supabase.from('meetings').update(patch).eq('id', meeting.id);
    if (status === 'completed') {
      setRunning(false);
      setMsg('Meeting completed and saved to history');
    } else {
      setMsg('Progress saved');
    }
    load();
    setTimeout(() => setMsg(null), 4000);
  }

  const step = AGENDA[currentStep];
  const sectionSecs = Math.max(elapsed - sectionAnchor, 0);
  const sectionOver = sectionSecs > step.mins * 60;
  const completed = meeting?.status === 'completed';
  const openTodos = useMemo(() => todos.filter((t) => !t.done), [todos]);

  if (loading) return <p className="text-zinc-500">Loading…</p>;

  const sectionBody = () => {
    if (step.id === 'rocks' || step.id === 'quarterly-focus') {
      return (
        <div className="flex flex-col gap-2 mt-3">
          {rocks.map((r) => (
            <div key={r.id} className="flex items-center gap-3 text-sm bg-bg/60 rounded px-3 py-2">
              <Avatar member={team.find((m) => m.id === r.owner_id)} />
              <span className="flex-1 truncate">{r.title}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${STATUS_STYLE[r.status] ?? 'bg-panelBorder text-zinc-400'}`}>
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </div>
          ))}
          {!rocks.length && <p className="text-sm text-zinc-600">No rocks for this quarter.</p>}
        </div>
      );
    }
    if (step.id === 'issues-list' || step.id === 'ids') {
      return (
        <div className="flex flex-col gap-2 mt-3">
          {issues.map((i) => (
            <div key={i.id} className="flex items-center gap-3 text-sm bg-bg/60 rounded px-3 py-2">
              <Avatar member={team.find((m) => m.id === i.owner_id)} />
              <span className="flex-1 truncate">{i.title}</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-warn/20 text-warn">
                {i.status === 'in_progress' ? 'In Progress' : 'To Discuss'}
              </span>
            </div>
          ))}
          {!issues.length && <p className="text-sm text-zinc-600">No open issues. Nice.</p>}
        </div>
      );
    }
    if (step.id === 'rating') {
      return (
        <div className="mt-4">
          <label className="text-xs text-zinc-500 uppercase tracking-wide">Rate This Meeting</label>
          <div className="flex items-center gap-4 mt-3">
            <input
              type="range" min={1} max={10} step={1} value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="flex-1 h-2 accent-accent cursor-pointer"
            />
            <span className="text-4xl font-mono text-white w-12 text-right">{rating}</span>
          </div>
          <p className="text-sm text-zinc-500 mt-2">{ratingCaption(rating)}</p>
        </div>
      );
    }
    if (step.id === 'todos') {
      return (
        <div className="flex flex-col gap-2 mt-3">
          {openTodos.map((t) => (
            <label key={t.id} className="flex items-center gap-3 text-sm bg-bg/60 rounded px-3 py-2 cursor-pointer">
              <input type="checkbox" checked={t.done} onChange={() => toggleTodo(t)} className="accent-green-500 w-4 h-4" />
              <Avatar member={team.find((m) => m.id === t.owner_id)} />
              <span className="flex-1 truncate">{t.title}</span>
              {t.due_date && <span className="text-xs text-zinc-500">{new Date(t.due_date).toLocaleDateString('en-AU')}</span>}
            </label>
          ))}
          {!openTodos.length && <p className="text-sm text-zinc-600">All to-dos complete.</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <PageHeader title="Level 10 Meeting" subtitle={`Week ${weekNum} of ${quarter?.label ?? ''} · ${TOTAL_MINS} min agenda`}>
        {meeting && !completed && (
          <div className="flex items-center gap-2 mr-2">
            <span className="text-2xl font-mono text-white">{fmtClock(elapsed)}</span>
            <button className="btn-ghost text-xs" onClick={toggleTimer}>{running ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start Timer'}</button>
            <button className="btn-ghost text-xs" onClick={resetTimer}>Reset</button>
          </div>
        )}
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
        <div className="grid lg:grid-cols-[300px_1fr_320px] gap-5 items-start">
          {/* Agenda rail */}
          <div className="flex flex-col gap-2">
            <div className="panel p-3">
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>Meeting progress</span>
                <span>{currentStep + 1} / {AGENDA.length}</span>
              </div>
              <div className="h-1.5 bg-panelBorder rounded overflow-hidden">
                <div className="h-full bg-accent transition-all" style={{ width: `${((currentStep + 1) / AGENDA.length) * 100}%` }} />
              </div>
            </div>
            {AGENDA.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goToStep(i)}
                className={`panel px-4 py-2.5 text-left transition-colors ${i === currentStep ? 'border-accent' : ''} ${i < currentStep ? 'opacity-50' : ''}`}
              >
                <div className="flex justify-between items-center gap-2">
                  <span className={`text-sm font-semibold ${i === currentStep ? 'text-white' : 'text-zinc-300'}`}>{i + 1}. {s.name}</span>
                  <span className="text-xs text-zinc-500 shrink-0">{s.mins} min</span>
                </div>
              </button>
            ))}
          </div>

          {/* Current section detail */}
          <div className="panel p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-display italic text-2xl text-white uppercase">{currentStep + 1}. {step.name}</h2>
                <p className="text-sm text-zinc-400 mt-1">{step.desc}</p>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-mono ${sectionOver ? 'text-bad' : 'text-white'}`}>{fmtClock(sectionSecs)}</div>
                <div className={`text-[11px] uppercase ${sectionOver ? 'text-bad font-bold' : 'text-zinc-500'}`}>
                  {sectionOver ? `Over ${step.mins} min allocation` : `of ${step.mins} min allocated`}
                </div>
              </div>
            </div>

            <div className="h-1.5 bg-panelBorder rounded overflow-hidden mt-3">
              <div
                className={`h-full transition-all ${sectionOver ? 'bg-bad' : 'bg-good'}`}
                style={{ width: `${Math.min((sectionSecs / (step.mins * 60)) * 100, 100)}%` }}
              />
            </div>

            {sectionBody()}

            <div className="mt-4">
              <label className="text-xs text-zinc-500 uppercase tracking-wide">Notes for {step.name} <span className="normal-case">(auto-saves)</span></label>
              <textarea
                className="input min-h-24 mt-1"
                value={sectionNotes[step.id] ?? ''}
                onChange={(e) => setSectionNotes((n) => ({ ...n, [step.id]: e.target.value }))}
                placeholder={`Notes captured during ${step.name}…`}
              />
            </div>

            <div className="flex items-center gap-3 mt-4">
              <button className="btn-ghost" onClick={() => goToStep(currentStep - 1)} disabled={currentStep === 0}>← Previous</button>
              {currentStep < AGENDA.length - 1
                ? <button className="btn" onClick={() => goToStep(currentStep + 1)}><span>Next Section →</span></button>
                : <button className="btn" onClick={() => saveProgress('completed')}><span>Complete Meeting</span></button>}
              {step.link && <Link href={step.link} className="btn-ghost text-xs ml-auto">Go to {step.name.split(' ')[0]} →</Link>}
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            <div className="panel p-4">
              <h3 className="font-semibold text-white mb-2 uppercase text-sm tracking-wide">Meeting Notes</h3>
              <textarea className="input min-h-28" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Decisions, discussion points…" />
            </div>
            <div className="panel p-4">
              <h3 className="font-semibold text-white mb-2 uppercase text-sm tracking-wide">Cascading Messages</h3>
              <textarea className="input min-h-20" value={cascading} onChange={(e) => setCascading(e.target.value)} placeholder="What gets communicated to the wider team?" />
            </div>
            <div className="panel p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white uppercase text-sm tracking-wide">Rate the Meeting</h3>
                <span className="text-2xl font-mono text-white">{rating}</span>
              </div>
              <input
                type="range" min={1} max={10} step={1} value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full h-2 accent-accent cursor-pointer"
              />
              <p className="text-xs text-zinc-500 mt-2">{ratingCaption(rating)}</p>
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
