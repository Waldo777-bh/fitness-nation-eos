'use client';

import { useEffect, useState } from 'react';
import { useEosCore } from '@/lib/hooks';
import { PageHeader, Avatar } from '@/components/ui';
import type { Todo } from '@/lib/types';

export default function TodosPage() {
  const { supabase, team, loading } = useEosCore();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [due, setDue] = useState('');
  const [showDone, setShowDone] = useState(true);

  async function load() {
    const { data } = await supabase.from('todos').select('*').order('done').order('due_date', { ascending: true, nullsFirst: false });
    setTodos((data as Todo[]) ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supabase]);

  async function addTodo() {
    if (!title.trim()) return;
    await supabase.from('todos').insert({ title, owner_id: ownerId || null, due_date: due || null });
    setTitle(''); setOwnerId(''); setDue('');
    load();
  }

  async function toggle(t: Todo) {
    await supabase.from('todos').update({
      done: !t.done, completed_at: !t.done ? new Date().toISOString() : null,
    }).eq('id', t.id);
    load();
  }

  if (loading) return <p className="text-zinc-500">Loading…</p>;
  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);
  const pct = todos.length ? Math.round((done.length / todos.length) * 100) : 0;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="To-Dos" subtitle="Weekly action items" />

      <div className="panel p-4 mb-5 flex gap-3 flex-wrap">
        <input className="input flex-1 min-w-48" placeholder="New to-do…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTodo()} />
        <select className="input !w-auto" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
          <option value="">Owner…</option>
          {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input className="input !w-auto" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <button className="btn" onClick={addTodo}><span>Add</span></button>
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-5">
        <div className="flex flex-col gap-5">
          <div className="panel">
            <div className="px-5 py-3 border-b border-panelBorder flex items-center gap-2">
              <h2 className="section-title">Pending To-Dos</h2>
              <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-bold">{open.length} remaining</span>
            </div>
            <div className="divide-y divide-panelBorder/60">
              {open.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <input type="checkbox" checked={false} onChange={() => toggle(t)} className="accent-green-500 w-4 h-4" />
                  <Avatar member={team.find((m) => m.id === t.owner_id)} />
                  <span className="flex-1">{t.title}</span>
                  {t.due_date && (
                    t.due_date < today
                      ? <span className="text-[10px] px-2 py-0.5 rounded bg-bad/20 text-bad font-bold uppercase">Overdue</span>
                      : <span className="text-xs text-zinc-500">{new Date(t.due_date).toLocaleDateString('en-AU')}</span>
                  )}
                </div>
              ))}
              {!open.length && <p className="text-zinc-600 text-sm px-5 py-4">All clear.</p>}
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
                {done.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                    <input type="checkbox" checked onChange={() => toggle(t)} className="accent-green-500 w-4 h-4" />
                    <Avatar member={team.find((m) => m.id === t.owner_id)} />
                    <span className="flex-1 line-through text-zinc-500">{t.title}</span>
                  </div>
                ))}
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
            {team.map((t) => {
              const mine = todos.filter((x) => x.owner_id === t.id);
              const mineDone = mine.filter((x) => x.done).length;
              return (
                <div key={t.id} className="py-1.5">
                  <div className="flex items-center gap-2 text-sm mb-1">
                    <Avatar member={t} /> <span className="flex-1">{t.name}</span>
                    <span className="text-zinc-500">{mineDone}/{mine.length}</span>
                  </div>
                  {mine.length > 0 && (
                    <div className="h-1.5 bg-panelBorder rounded overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: `${(mineDone / mine.length) * 100}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
