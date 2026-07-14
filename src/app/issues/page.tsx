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

type Draft = { title: string; description: string; ownerId: string; category: string; priority: number };
const emptyDraft: Draft = { title: '', description: '', ownerId: '', category: 'other', priority: 2 };

export default function IssuesPage() {
  const { supabase, team, activeTeam, loading } = useEosCore();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showResolved, setShowResolved] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  async function load() {
    const { data } = await supabase.from('issues').select('*').order('priority').order('created_at', { ascending: false });
    setIssues((data as Issue[]) ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supabase]);

  function startAdd() {
    setEditingId(null);
    setDraft(emptyDraft);
    setShowForm((s) => !s);
  }

  function startEdit(i: Issue) {
    setEditingId(i.id);
    setShowForm(false);
    setDraft({
      title: i.title, description: i.description ?? '', ownerId: i.owner_id ?? '',
      category: i.category ?? 'other', priority: i.priority ?? 2,
    });
  }

  async function saveDraft() {
    if (!draft.title.trim()) return;
    const row = {
      title: draft.title, description: draft.description || null, owner_id: draft.ownerId || null,
      category: draft.category, priority: draft.priority,
    };
    if (editingId) {
      await supabase.from('issues').update(row).eq('id', editingId);
      setEditingId(null);
    } else {
      await supabase.from('issues').insert({ ...row, status: 'to_discuss' });
      setShowForm(false);
    }
    setDraft(emptyDraft);
    load();
  }

  async function setStatus(id: string, status: string) {
    await supabase.from('issues').update({
      status, resolved_at: status === 'resolved' ? new Date().toISOString() : null,
    }).eq('id', id);
    load();
  }

  async function removeIssue(id: string) {
    if (!confirm('Delete this issue?')) return;
    await supabase.from('issues').delete().eq('id', id);
    load();
  }

  if (loading) return <p className="text-zinc-500">Loading...</p>;

  const toDiscuss = issues.filter((i) => i.status === 'to_discuss');
  const inProgress = issues.filter((i) => i.status === 'in_progress');
  const resolved = issues.filter((i) => i.status === 'resolved');

  // Rendered inline (a plain function, NOT a nested <Component/>) so typing
  // never remounts the inputs and the field keeps focus.
  const draftForm = (onCancel: () => void) => (
    <div className="flex flex-col gap-3">
      <input className="input" placeholder="Issue title" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
      <textarea className="input min-h-20" placeholder="Details (optional)" value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
      <div className="flex gap-3 flex-wrap">
        <select className="input !w-auto" value={draft.ownerId} onChange={(e) => setDraft((d) => ({ ...d, ownerId: e.target.value }))}>
          <option value="">Owner</option>
          {activeTeam.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="input !w-auto" value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select className="input !w-auto" value={draft.priority} onChange={(e) => setDraft((d) => ({ ...d, priority: Number(e.target.value) }))}>
          <option value={1}>High</option>
          <option value={2}>Medium</option>
          <option value={3}>Low</option>
        </select>
        <button className="btn" onClick={saveDraft}><span>Save</span></button>
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );

  const issueRow = (i: Issue, actions: React.ReactNode) => {
    if (editingId === i.id) {
      return (
        <div key={i.id} className="px-5 py-4 bg-accent/5">
          {draftForm(() => setEditingId(null))}
        </div>
      );
    }
    return (
      <div key={i.id} className="flex items-center gap-3 px-5 py-3 group">
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
        <button className="btn-ghost text-xs opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => startEdit(i)}>Edit</button>
        <button className="btn-ghost text-xs opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeIssue(i.id)}>Delete</button>
        {actions}
      </div>
    );
  };

  return (
    <>
      <PageHeader title="Issues" subtitle="Identify, Discuss, Solve (IDS)">
        <button className="btn" onClick={startAdd}><span>+ Add Issue</span></button>
      </PageHeader>

      {showForm && (
        <div className="panel p-5 mb-5">
          {draftForm(() => setShowForm(false))}
        </div>
      )}

      <div className="panel mb-5">
        <div className="px-5 py-3 border-b border-panelBorder flex items-center gap-2">
          <h2 className="section-title">To Discuss</h2>
          <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-bold">{toDiscuss.length}</span>
        </div>
        <div className="divide-y divide-panelBorder/60">
          {toDiscuss.map((i) => issueRow(i, (
            <div className="flex gap-2">
              <button className="btn-ghost text-xs" onClick={() => setStatus(i.id, 'in_progress')}>Start</button>
              <button className="btn-ghost text-xs" onClick={() => setStatus(i.id, 'resolved')}>Resolve</button>
            </div>
          )))}
          {!toDiscuss.length && <p className="text-zinc-600 text-sm px-5 py-4">Nothing waiting for discussion.</p>}
        </div>
      </div>

      <div className="panel mb-5">
        <div className="px-5 py-3 border-b border-panelBorder flex items-center gap-2">
          <h2 className="section-title">In Progress</h2>
          <span className="text-xs bg-warn/20 text-warn px-2 py-0.5 rounded-full font-bold">{inProgress.length}</span>
        </div>
        <div className="divide-y divide-panelBorder/60">
          {inProgress.map((i) => issueRow(i, (
            <div className="flex gap-2">
              <button className="btn-ghost text-xs" onClick={() => setStatus(i.id, 'resolved')}>Resolve</button>
              <button className="btn-ghost text-xs" onClick={() => setStatus(i.id, 'dropped')}>Drop</button>
            </div>
          )))}
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
            {resolved.map((i) => issueRow(i, (
              <button className="btn-ghost text-xs" onClick={() => setStatus(i.id, 'to_discuss')}>Reopen</button>
            )))}
            {!resolved.length && <p className="text-zinc-600 text-sm px-5 py-4">No resolved issues yet.</p>}
          </div>
        )}
      </div>
    </>
  );
}
