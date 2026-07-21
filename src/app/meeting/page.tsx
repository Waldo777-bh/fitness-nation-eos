'use client';

import { useEffect, useMemo, useState } from 'react';
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
  timer_started_at: string | null;
  section_start_seconds: number;
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

  // Wall-clock timer model. baseElapsed = seconds banked while paused;
  // timerStartedAt = epoch ms of the current run (null when paused/stopped).
  // Live elapsed is DERIVED from these, so leaving the page and coming back
  // never pauses or loses time - the clock only stops on Pause or Complete.
  const [baseElapsed, setBaseElapsed] = useState(0);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [sectionStart, setSectionStart] = useState(0); // elapsed mark when the current section began
  const [nowTick, setNowTick] = useState<number>(() => Date.now()); // bumped each second to re-render the clock
  const [msg, setMsg] = useState<string | null>(null);

  const [rocks, setRocks] = useState<Rock[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);

  const running = timerStartedAt !== null;
  const elapsed = baseElapsed + (timerStartedAt !== null ? Math.max(0, Math.floor((nowTick - timerStartedAt) / 1000)) : 0);

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
    setBaseElapsed(m?.elapsed_seconds ?? 0);
    setSectionStart(m?.section_start_seconds ?? 0);
    // Resume the clock from its persisted start time so it survives navigation.
    // A completed meeting is never running.
    const startedAt = m?.timer_started_at && m.status !== 'completed'
      ? new Date(m.timer_started_at).getTime()
      : null;
    setTimerStartedAt(startedAt);
    setNowTick(Date.now());
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supabase, quarter?.id, weekNum]);

  useEffect(() => {
    if (!quarter) return;
    supabase.from('rocks').select('*').eq('quarter_id', quarter.id).order('created_at').then(({ data }) => setRocks((data as Rock[]) ?? []));
    supabase.from('issues').select('*').neq('status', 'resolved').neq('status', 'dropped').order('created_at').then(({ data }) => setIssues((data as Issue[]) ?? []));
    supabase.from('todos').select('*').order('done').order('due_date', { ascending: true, nullsFirst: false }).then(({ data }) => setTodos((data as Todo[]) ?? []));
  }, [supabase, quarter]);

  // Re-render the running clock once a second. Elapsed is computed from
  // wall-clock time, so a throttled/backgrounded tab still shows the right value.
  useEffect(() => {
    if (timerStartedAt === null) return;
    setNowTick(Date.now());
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [timerStartedAt]);

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

  async function startMeeting() {
    if (!quarter) return;
    const startedIso = new Date().toISOString();
    const { data, error } = await supabase.from('meetings').upsert(
      {
        quarter_id: quarter.id, week_number: weekNum,
        meeting_date: new Date().toISOString().slice(0, 10),
        status: 'in_progress', attendees: activeTeam.map((t) => t.id),
        timer_started_at: startedIso,
      },
      { onConflict: 'quarter_id,week_number' }
    ).select().single();
    if (!error && data) {
      const m = data as Meeting;
      setMeeting(m);
      setRating(Number(m.ratings?.overall) || 8);
      setCurrentStep(m.current_section ?? 0);
      setBaseElapsed(m.elapsed_seconds ?? 0);
      setSectionStart(m.section_start_seconds ?? 0);
      setTimerStartedAt(m.timer_started_at ? new Date(m.timer_started_at).getTime() : Date.parse(startedIso));
      setNowTick(Date.now());
    }
  }

  function toggleTimer() {
    if (!meeting) return;
    if (timerStartedAt !== null) {
      // Pause: bank the running seconds into baseElapsed, clear the start marker.
      const banked = baseElapsed + Math.max(0, Math.floor((Date.now() - timerStartedAt) / 1000));
      setBaseElapsed(banked);
      setTimerStartedAt(null);
      supabase.from('meetings').update({ elapsed_seconds: banked, timer_started_at: null }).eq('id', meeting.id).then(() => {});
    } else {
      // Resume from now.
      const startedIso = new Date().toISOString();
      setTimerStartedAt(Date.parse(startedIso));
      setNowTick(Date.now());
      supabase.from('meetings').update({ timer_started_at: startedIso }).eq('id', meeting.id).then(() => {});
    }
  }

  function resetTimer() {
    if (!confirm('Reset the meeting timer to 00:00?')) return;
    setBaseElapsed(0);
    setSectionStart(0);
    const startedIso = timerStartedAt !== null ? new Date().toISOString() : null;
    setTimerStartedAt(startedIso ? Date.parse(startedIso) : null);
    setNowTick(Date.now());
    if (meeting) supabase.from('meetings').update({
      elapsed_seconds: 0, section_start_seconds: 0, timer_started_at: startedIso,
    }).eq('id', meeting.id).then(() => {});
  }

  function goToStep(i: number) {
    if (i < 0 || i >= AGENDA.length) return;
    setCurrentStep(i);
    const mark = elapsed; // the new section's clock starts from the current elapsed
    setSectionStart(mark);
    // Record the section change only - the overall timer keeps running untouched.
    if (meeting) supabase.from('meetings').update({ current_section: i, section_start_seconds: mark }).eq('id', meeting.id).then(() => {});
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
    const completing = status === 'completed';
    const frozen = elapsed; // snapshot the live clock
    const patch: Record<string, unknown> = {
      notes: notes || null,
      cascading_messages: cascading || null,
      ratings: { overall: rating },
      section_notes: sectionNotes,
      current_section: currentStep,
      section_start_seconds: sectionStart,
    };
    if (status) patch.status = status;
    if (completing) {
      // Completing is the only action that stops the clock.
      patch.elapsed_seconds = frozen;
      patch.timer_started_at = null;
      patch.duration_minutes = Math.max(Math.round(frozen / 60), meeting.duration_minutes ?? 0) || TOTAL_MINS;
    }
    // For a plain "Save Progress" we deliberately do NOT rewrite elapsed_seconds
    // or timer_started_at, so a running clock stays consistent and keeps going.
    await supabase.from('meetings').update(patch).eq('id', meeting.id);
    if (completing) {
      setBaseElapsed(frozen);
      setTimerStartedAt(null);
      setMsg('Meeting completed and saved to history');
    } else {
      setMsg('Progress saved');
    }
    load();
    setTimeout(() => setMsg(null), 4000);
  }

  const step = AGENDA[currentStep];
  const sectionSecs = Math.max(elapsed - sectionStart, 0);
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
