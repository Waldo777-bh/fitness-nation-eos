'use client';

import { useEffect, useState } from 'react';
import { useEosCore, usePersistedQuarter } from '@/lib/hooks';
import { PageHeader, Avatar, QuarterPicker } from '@/components/ui';
import type { Todo } from '@/lib/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function TodosPage() {
  const { supabase, team, activeTeam, quarters, activeQuarter, loading } = useEosCore();
  const { quarter, setQuarterId } = usePersistedQuarter(quarters, activeQuarter);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [due, setDue] = useState('');
  const [showDone, setShowDone] = useState(true);
  const [monthFilter, setMonthFilter] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<'due' | 'person' | 'title' | 'status'>('due');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ title: string; ownerId: string; due: string }>({ title: '', ownerId: '', due: '' });
  const [formMsg, setFormMsg] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from('todos').select('*').order('done').order('due_date', { ascending: true, nullsFirst: false });
    setTodos((data as Todo[]) ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supabase]);

  async function addTodo() {
    const t = title.trim();
    if (!t) { setFormMsg('Enter a to-do title first.'); return; }
    const { error } = await supabase.from('todos').insert({ title: t, owner_id: ownerId || null, due_date: due || null });
    if (error) { setFormMsg(`Could not add to-do: ${error.message}`); return; }
    setTitle(''); setOwnerId(''); setDue('');
    setFormMsg(null);
    await load();
  }

  function startEdit(t: Todo) {
    setEditingId(t.id);
    setEdit({ title: t.title, ownerId: t.owner_id ?? '', due: t.due_date ?? '' });
  }

  async function saveEdit() {
    if (!editingId || !edit.title.trim()) return;
    await supabase.from('todos').update({
      title: edit.title, owner_id: edit.ownerId || null, due_date: edit.due || null,
    }).eq('id', editingId);
    setEditingId(null);
    load();
  }

  async function removeTodo(id: string) {
    if (!confirm('Delete this to-do?')) return;
    await supabase.from('todos').delete().eq('id', id);
    load();
  }

  async function toggle(t: Todo) {
    await supabase.from('todos').update({
      done: !t.done, completed_at: !t.done ? new Date().toISOString() : null,
    }).eq('id', t.id);
    load();
  }

  if (loading) return <p className="text-zinc-500">Loading...</p>;
  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);
  const pct = todos.length ? Math.round((done.length / todos.length) * 100) : 0;
  const today = new Date().toISOString().slice(0, 10);
  const teamName = (id: string | null) => team.find((m) => m.id === id)?.name ?? '';

  // Apply the month filter + sort (matches the old app's controls)
  const displayedOpen = open
    .filter((t) => (monthFilter === 'all' ? true : t.due_date ? new Date(t.due_date + 'T00:00:00').getMonth() === monthFilter : false))
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'person') return teamName(a.owner_id).localeCompare(teamName(b.owner_id));
      if (sortBy === 'status') {
        const rank = (t: Todo) => (!t.due_date ? 2 : t.due_date < today ? 0 : 1); // overdue first
        return rank(a) - rank(b);
      }
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });

  // Quarterly calendar — render each month the quarter spans, today highlighted
  const monthsInQuarter: Date[] = (() => {
    if (!quarter) return [];
    const s = new Date(quarter.start_date + 'T00:00:00');
    const e = new Date(quarter.end_date + 'T00:00:00');
    const out: Date[] = [];
    let d = new Date(s.getFullYear(), s.getMonth(), 1);
    while (d <= e) { out.push(new Date(d)); d = new Date(d.getFullYear(), d.getMonth() + 1, 1); }
    return out;
  })();

  const monthGrid = (m: Date) => {
    const year = m.getFullYear();
    const mon = m.getMonth();
    const first = new Date(year, mon, 1).getDay();
    const days = new Date(year, mon + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);
    const iso = (d: number) => `${year}-${String(mon + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return (
      <div key={`${year}-${mon}`} className="flex-1 min-w-52">
        <div className="text-center text-sm text-zinc-300 font-semibold mb-2">{m.toLocaleDateString('en-AU', { month: 'long' })}</div>
        <div className="grid grid-cols-7 text-[10px] text-zinc-600 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => <div key={i} className="text-center">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((d, i) => (
            <div key={i} className="text-center text-xs">
              {d && <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${iso(d) === today ? 'bg-accent text-white font-bold' : 'text-zinc-400'}`}>{d}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Inline function (not a nested <Component/>) so the edit input keeps focus while typing.
  const row = (t: Todo) => {
    if (editingId === t.id) {
      return (
        <div key={t.id} className="flex items-center gap-2 px-5 py-2.5 bg-accent/5 flex-wrap">
          <input className="input flex-1 min-w-40" value={edit.title} onChange={(e) => setEdit((x) => ({ ...x, title: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} />
          <select className="input !w-auto" value={edit.ownerId} onChange={(e) => setEdit((x) => ({ ...x, ownerId: e.target.value }))}>
            <option value="">Owner</option>
            {activeTeam.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input className="input !w-auto" type="date" value={edit.due} onChange={(e) => setEdit((x) => ({ ...x, due: e.target.value }))} />
          <button className="btn text-xs" onClick={saveEdit}><span>Save</span></button>
          <button className="btn-ghost text-xs" onClick={() => setEditingId(null)}>Cancel</button>
        </div>
      );
    }
    return (
      <div key={t.id} className="flex items-center gap-3 px-5 py-3 group">
        <input type="checkbox" checked={t.done} onChange={() => toggle(t)} className="accent-green-500 w-4 h-4" />
        <Avatar member={team.find((m) => m.id === t.owner_id)} />
        <span className={`flex-1 ${t.done ? 'line-through text-zinc-500' : ''}`}>{t.title}</span>
        {!t.done && t.due_date && (
          t.due_date < today
            ? <span className="text-[10px] px-2 py-0.5 rounded bg-bad/20 text-bad font-bold uppercase">Overdue</span>
            : <span className="text-xs text-zinc-500">{new Date(t.due_date).toLocaleDateString('en-AU')}</span>
        )}
        <button className="btn-ghost text-xs opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => startEdit(t)}>Edit</button>
        <button className="btn-ghost text-xs opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeTodo(t.id)}>Delete</button>
      </div>
    );
  };

  return (
    <>
      <PageHeader title="To-Dos" subtitle="Weekly action items">
        <QuarterPicker quarters={quarters} value={quarter?.id} onChange={(id) => setQuarterId(id)} />
      </PageHeader>

      {!!monthsInQuarter.length && (
        <div className="panel p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Quarterly Calendar</h2>
            <span className="text-xs text-zinc-500">{quarter?.label}</span>
          </div>
          <div className="flex gap-6 flex-wrap">{monthsInQuarter.map(monthGrid)}</div>
        </div>
      )}

      <div className="panel p-4 mb-5">
        <div className="flex gap-3 flex-wrap">
          <input className="input flex-1 min-w-48" placeholder="New to-do..." value={title} onChange={(e) => { setTitle(e.target.value); if (formMsg) setFormMsg(null); }} onKeyDown={(e) => e.key === 'Enter' && addTodo()} />
          <select className="input !w-auto" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            <option value="">Owner</option>
            {activeTeam.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input className="input !w-auto" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          <button className="btn" onClick={addTodo}><span>Add</span></button>
        </div>
        {formMsg && <p className="text-sm text-bad mt-2">{formMsg}</p>}
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-5">
        <div className="flex flex-col gap-5">
          <div className="panel">
            <div className="px-5 py-3 border-b border-panelBorder flex items-center gap-2 flex-wrap">
              <h2 className="section-title">Pending To-Dos</h2>
              <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-bold">{open.length} remaining</span>
              <div className="ml-auto flex gap-2">
                <select className="input !w-auto !py-1 text-xs" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
                  <option value="all">All Months</option>
                  {MONTHS.map((mn, i) => <option key={mn} value={i}>{mn}</option>)}
                </select>
                <select className="input !w-auto !py-1 text-xs" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'due' | 'person' | 'title' | 'status')}>
                  <option value="due">Due Date</option>
                  <option value="person">Person</option>
                  <option value="title">Title</option>
                  <option value="status">Status</option>
                </select>
              </div>
            </div>
            <div className="divide-y divide-panelBorder/60">
              {displayedOpen.map((t) => row(t))}
              {!displayedOpen.length && <p className="text-zinc-600 text-sm px-5 py-4">All clear.</p>}
            </div>
          </div>

          <div className="panel">
            <div className="px-5 py-3 border-b border-panelBorder flex items-center gap-2">
              <h2 className="section-title">Completed</h2>
              <span className="text-xs bg-good/20 text-good px-2 py-0.5 rounded-full font-bold">{done.length} done</span>
              <button className="btn-ghost text-xs ml-auto" onClick={() => setShowDone((s) => !s)}>{showDone ? 'Hide' : 'Show'}</button>
            </div>
            {showDone && (
              <div className="divide-y divide-panelBorder/60">
                {done.map((t) => row(t))}
                {!done.length && <p className="text-zinc-600 text-sm px-5 py-4">Nothing completed yet.</p>}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="panel p-5 text-center">
            <h2 className="font-semibold text-white uppercase text-sm tracking-wide mb-3">Completion Rate</h2>
            <div className={`text-5xl font-bold ${pct >= 90 ? 'text-good' : pct >= 70 ? 'text-warn' : 'text-bad'}`}>{pct}%</div>
            <div className={`text-xs mt-2 font-bold uppercase ${pct >= 90 ? 'text-good' : 'text-warn'}`}>
              {pct >= 90 ? 'On Track' : 'Below Target'}
            </div>
            <p className="text-xs text-zinc-500 mt-2">EOS target: 90%+ completion rate</p>
          </div>
          <div className="panel p-5">
            <h2 className="font-semibold text-white uppercase text-sm tracking-wide mb-3">By Team Member</h2>
            {activeTeam.map((t) => {
              const mine = todos.filter((x) => x.owner_id === t.id);
              if (!mine.length) return null;
              const mineDone = mine.filter((x) => x.done).length;
              return (
                <div key={t.id} className="py-1.5">
                  <div className="flex items-center gap-2 text-sm mb-1">
                    <Avatar member={t} /> <span className="flex-1">{t.name}</span>
                    <span className="text-zinc-500">{mineDone}/{mine.length}</span>
                  </div>
                  <div className="h-1.5 bg-panelBorder rounded overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${(mineDone / mine.length) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
