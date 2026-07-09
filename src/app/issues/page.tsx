'use client';

import { useEffect, useState } from 'react';
import { useEosCore } from '@/lib/hooks';
import { PageHeader, Avatar } from '@/components/ui';
import type { Issue } from '@/lib/types';

const CATEGORIES = ['membership', 'revenue', 'operations', 'team', 'other'];
const PRIORITY_LABEL: Record<number, string> = { 1: 'High', 2: 'Medium', 3: 'Low' };
const PRIORITY_STYLE: Record<number, string> = {
  1: 'bg-bad/20 text-bad',
  2: 'bg-warn/20 text-warn',
  3: 'bg-zinc-700/40 text-zinc-400',
};

type FullIssue = Issue & { category: string; description: string | null; resolved_at: string | null };

export default function IssuesPage() {
  const { supabase, team, loading } = useEosCore();
  const [issues, setIssues] = useState<FullIssue[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showResolved, setShowResolved] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [category, setCategory] = useState('other');
  const [priority, setPriority] = useState(2);

  async function load() {
    const { data } = await supabase.from('issues').select('*').order('priority').order('created_at', { ascending: false });
    setIssues((data as FullIssue[]) ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supabase]);

  async function addIssue() {
    if (!title.trim()) return;
    await supabase.from('issues').insert({
      title, description: description || null, owner_id: ownerId || null,
      category, priority, status: 'to_discuss',
    });
    setTitle(''); setDescription(''); setOwnerId(''); setCategory('other'); setPriority(2); setShowForm(false);
    load();
  }

  async function setStatus(id: string, status: string) {
    await supabase.from('issues').update({
      status, resolved_at: status === 'resolved' ? new Date().toISOString() : null,
    }).eq('id', id);
    load();
  }

  if (loading) return <p className="text-zinc-500">Loading…</p>;

  const toDiscuss = issues.filter((i) => i.status === 'to_discuss');
  const inProgress = issues.filter((i) => i.status === 'in_progress');
  const resolved = issues.filter((i) => i.status === 'resolved');

  const IssueRow = ({ i, actions }: { i: FullIssue; actions: React.ReactNode }) => (
    <div className="flex items-center gap-3 px-5 py-3">
      <Avatar member={team.find((t) => t.id === i.owner_id)} />
      <div className="flex-1 min-w-0">
        <div className="truncate">{i.title}</div>
        {i.description && <div className="text-xs text-zinc-500 truncate">{i.description}</div>}
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${PRIORITY_STYLE[i.priority] ?? PRIORITY_STYLE[3]}`}>
        {PRIORITY_LABEL[i.priority] ?? 'Low'}
      </span>
      <span className="text-[10px] px-2 py-0.5 rounded bg-panelBorder text-zinc-400 uppercase">{i.category}</span>
      <span className="text-xs text-zinc-600 w-24 text-right">
        {new Date(i.resolved_at ?? i.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>
      {actions}
    </div>
  );

  return (
    <>
      <PageHeader title="Issues" subtitle="Identify, Discuss, Solve (IDS)">
        <button className="btn" onClick={() => setShowForm((s) => !s)}><span>+ Add Issue</span></button>
      </PageHeader>

      {showForm && (
        <div className="panel p-5 mb-5 flex flex-col gap-3">
          <input className="input" placeholder="Issue title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="input" placeholder="Details (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex gap-3 flex-wrap">
            <select className="input !w-auto" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              <option value="">Owner…</option>
              {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select className="input !w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
            </select>
            <select className="input !w-auto" value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
              <option value={1}>High</option>
              <option value={2}>Medium</option>
              <option value={3}>Low</option>
            </select>
            <button className="btn" onClick={addIssue}><span>Save</span></button>
          </div>
        </div>
      )}

      <div className="panel mb-5">
        <div className="px-5 py-3 border-b border-panelBorder flex items-center gap-2">
          <h2 className="section-title">To Discuss</h2>
          <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-bold">{toDiscuss.length}</span>
        </div>
        <div className="divide-y divide-panelBorder/60">
          {toDiscuss.map((i) => (
            <IssueRow key={i.id} i={i} actions={
              <div className="flex gap-2">
                <button className="btn-ghost text-xs" onClick={() => setStatus(i.id, 'in_progress')}>Start</button>
                <button className="btn-ghost text-xs" onClick={() => setStatus(i.id, 'resolved')}>Resolve</button>
              </div>
            } />
          ))}
          {!toDiscuss.length && <p className="text-zinc-600 text-sm px-5 py-4">Nothing waiting for discussion.</p>}
        </div>
      </div>

      <div className="panel mb-5">
        <div className="px-5 py-3 border-b border-panelBorder flex items-center gap-2">
          <h2 className="section-title">In Progress</h2>
          <span className="text-xs bg-warn/20 text-warn px-2 py-0.5 rounded-full font-bold">{inProgress.length}</span>
        </div>
        <div className="divide-y divide-panelBorder/60">
          {inProgress.map((i) => (
            <IssueRow key={i.id} i={i} actions={
              <div className="flex gap-2">
                <button className="btn-ghost text-xs" onClick={() => setStatus(i.id, 'resolved')}>Resolve</button>
                <button className="btn-ghost text-xs" onClick={() => setStatus(i.id, 'dropped')}>Drop</button>
              </div>
            } />
          ))}
          {!inProgress.length && <p className="text-zinc-600 text-sm px-5 py-4">Nothing in progress.</p>}
        </div>
      </div>

      <div className="panel">
        <div className="px-5 py-3 border-b border-panelBorder flex items-center gap-2">
          <h2 className="section-title">Resolved</h2>
          <span className="text-xs bg-good/20 text-good px-2 py-0.5 rounded-full font-bold">{resolved.length}</span>
          <button className="btn-ghost text-xs ml-auto" onClick={() => setShowResolved((s) => !s)}>
            {showResolved ? 'Hide' : 'Show'}
          </button>
        </div>
        {showResolved && (
          <div className="divide-y divide-panelBorder/60">
            {resolved.map((i) => (
              <IssueRow key={i.id} i={i} actions={
                <button className="btn-ghost text-xs" onClick={() => setStatus(i.id, 'to_discuss')}>Reopen</button>
              } />
            ))}
            {!resolved.length && <p className="text-zinc-600 text-sm px-5 py-4">No resolved issues yet.</p>}
          </div>
        )}
      </div>
    </>
  );
}
