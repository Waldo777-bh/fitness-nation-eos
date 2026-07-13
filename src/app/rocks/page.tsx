'use client';

import { useEffect, useState } from 'react';
import { useEosCore, usePersistedQuarter } from '@/lib/hooks';
import { PageHeader, QuarterPicker, Avatar } from '@/components/ui';
import type { Rock } from '@/lib/types';

export default function RocksPage() {
  const { supabase, quarters, team, activeTeam, activeQuarter, loading } = useEosCore();
  const { quarter, setQuarterId } = usePersistedQuarter(quarters, activeQuarter);
  const [rocks, setRocks] = useState<Rock[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState('');

  async function load() {
    if (!quarter) return;
    const { data } = await supabase.from('rocks').select('*').eq('quarter_id', quarter.id).order('sort_order');
    setRocks((data as Rock[]) ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supabase, quarter?.id]);

  function startEdit(r: Rock) {
    setEditingId(r.id);
    setTitle(r.title);
    setDescription(r.description ?? '');
    setOwnerId(r.owner_id ?? '');
    setShowForm(false);
  }

  function startAdd() {
    setEditingId(null);
    setTitle(''); setDescription(''); setOwnerId('');
    setShowForm((s) => !s);
  }

  async function saveRock() {
    if (!title.trim() || !quarter) return;
    if (editingId) {
      await supabase.from('rocks').update({
        title, description: description || null, owner_id: ownerId || null,
      }).eq('id', editingId);
      setEditingId(null);
    } else {
      await supabase.from('rocks').insert({
        quarter_id: quarter.id, title, description: description || null,
        owner_id: ownerId || null, sort_order: rocks.length,
      });
      setShowForm(false);
    }
    setTitle(''); setDescription(''); setOwnerId('');
    load();
  }

  async function updateRock(id: string, patch: Partial<Rock>) {
    await supabase.from('rocks').update(patch).eq('id', id);
    load();
  }

  async function removeRock(id: string) {
    if (!confirm('Delete this rock?')) return;
    await supabase.from('rocks').delete().eq('id', id);
    load();
  }

  if (loading) return <p className="text-zinc-500">Loading…</p>;

  const EditForm = ({ onCancel }: { onCancel: () => void }) => (
    <div className="flex flex-col gap-3">
      <input className="input" placeholder="Rock title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="input min-h-20" placeholder="Description / definition of done" value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="flex gap-3">
        <select className="input !w-auto" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
          <option value="">Owner…</option>
          {activeTeam.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button className="btn" onClick={saveRock}><span>Save</span></button>
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader title="Rocks" subtitle={`${quarter?.label ?? ''} quarterly priorities`}>
        <button className="btn" onClick={startAdd}><span>+ Add Rock</span></button>
        <QuarterPicker quarters={quarters} value={quarter?.id} onChange={setQuarterId} />
      </PageHeader>

      {showForm && (
        <div className="panel p-5 mb-5">
          <EditForm onCancel={() => setShowForm(false)} />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {rocks.map((r) => {
          const owner = team.find((t) => t.id === r.owner_id);
          if (editingId === r.id) {
            return (
              <div key={r.id} className="panel p-5 border-accent">
                <EditForm onCancel={() => setEditingId(null)} />
              </div>
            );
          }
          return (
            <div key={r.id} className="panel p-5">
              <div className="flex justify-between items-start gap-3 mb-2">
                <h3 className="font-semibold text-white">{r.title}</h3>
                <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase shrink-0 ${
                  r.status === 'off_track' ? 'bg-bad/20 text-bad' : r.status === 'done' ? 'bg-violet-500/20 text-violet-300' : 'bg-good/20 text-good'
                }`}>{r.status.replace('_', ' ')}</span>
              </div>
              {r.description && <p className="text-sm text-zinc-400 mb-3 whitespace-pre-wrap">{r.description}</p>}
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="range" min={0} max={100} value={r.progress} className="flex-1 accent-green-500"
                  onChange={(e) => setRocks((rs) => rs.map((x) => x.id === r.id ? { ...x, progress: Number(e.target.value) } : x))}
                  onMouseUp={() => updateRock(r.id, { progress: r.progress })}
                  onTouchEnd={() => updateRock(r.id, { progress: r.progress })}
                />
                <span className="text-sm w-10 text-right">{r.progress}%</span>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-2 text-sm"><Avatar member={owner} /> {owner?.name ?? 'Unassigned'}</span>
                <div className="flex gap-2">
                  <select
                    className="input !w-auto !py-1 text-xs"
                    value={r.status}
                    onChange={(e) => updateRock(r.id, { status: e.target.value as Rock['status'] })}
                  >
                    <option value="on_track">On Track</option>
                    <option value="off_track">Off Track</option>
                    <option value="done">Done</option>
                    <option value="dropped">Dropped</option>
                  </select>
                  <button className="btn-ghost text-xs" onClick={() => startEdit(r)}>Edit</button>
                  <button className="btn-ghost text-xs" onClick={() => removeRock(r.id)}>Delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!rocks.length && <p className="text-zinc-500 text-center py-12">No rocks for {quarter?.label}. Add quarterly priorities above.</p>}
    </>
  );
}
