'use client';

import { useEffect, useState } from 'react';
import { useEosCore, usePersistedQuarter } from '@/lib/hooks';
import { PageHeader, QuarterPicker, Avatar } from '@/components/ui';
import type { Rock } from '@/lib/types';

type RockStatus = Rock['status'];

const STATUSES: { key: RockStatus; label: string }[] = [
  { key: 'on_track', label: 'On Track' },
  { key: 'off_track', label: 'Off Track' },
  { key: 'done', label: 'Done' },
  { key: 'dropped', label: 'Dropped' },
];

const STATUS_BADGE: Record<RockStatus, { label: string; cls: string }> = {
  on_track: { label: 'On Track', cls: 'bg-good/20 text-good' },
  off_track: { label: 'Off Track', cls: 'bg-bad/20 text-bad' },
  done: { label: 'Done', cls: 'bg-violet-400/20 text-violet-300' },
  dropped: { label: 'Dropped', cls: 'bg-zinc-600/40 text-zinc-400' },
};

const clamp = (n: number) => Math.max(0, Math.min(100, isNaN(n) ? 0 : n));

export default function RocksPage() {
  const { supabase, quarters, team, activeTeam, activeQuarter, loading } = useEosCore();
  const { quarter, setQuarterId } = usePersistedQuarter(quarters, activeQuarter);
  const [rocks, setRocks] = useState<Rock[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  async function load() {
    if (!quarter) return;
    const { data } = await supabase.from('rocks').select('*').eq('quarter_id', quarter.id).order('sort_order');
    setRocks((data as Rock[]) ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supabase, quarter?.id]);

  function resetForm() { setTitle(''); setDescription(''); setOwnerId(''); }

  function startAdd() {
    setEditingId(null);
    resetForm();
    setShowForm((s) => !s);
  }

  function startEdit(r: Rock) {
    setEditingId(r.id);
    setTitle(r.title);
    setDescription(r.description ?? '');
    setOwnerId(r.owner_id ?? '');
    setShowForm(false);
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
    resetForm();
    load();
  }

  async function updateRock(id: string, patch: Partial<Rock>) {
    setRocks((rs) => rs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    await supabase.from('rocks').update(patch).eq('id', id);
  }

  async function removeRock(id: string) {
    if (!confirm('Delete this rock?')) return;
    await supabase.from('rocks').delete().eq('id', id);
    setEditingId(null);
    load();
  }

  const setProgressLocal = (id: string, val: number) =>
    setRocks((rs) => rs.map((x) => (x.id === id ? { ...x, progress: val } : x)));

  // Drag to reorder (matches the old EOS platform): moving a card rewrites sort_order.
  function handleDrop(targetId: string) {
    const from = dragId;
    setDragId(null);
    setOverId(null);
    if (!from || from === targetId) return;
    const list = [...rocks];
    const fromIdx = list.findIndex((r) => r.id === from);
    const toIdx = list.findIndex((r) => r.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    const reordered = list.map((r, i) => ({ ...r, sort_order: i }));
    setRocks(reordered);
    Promise.all(reordered.map((r, i) => supabase.from('rocks').update({ sort_order: i }).eq('id', r.id)));
  }

  if (loading) return <p className="text-zinc-500">Loading...</p>;

  // Inline function (NOT a nested <Component/>) so typing never remounts the inputs.
  const rockForm = (onCancel: () => void) => (
    <div className="flex flex-col gap-3">
      <input className="input" placeholder="Rock title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="input min-h-20" placeholder="Description / definition of done" value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="flex gap-3 flex-wrap">
        <select className="input !w-auto" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
          <option value="">Owner</option>
          {activeTeam.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button className="btn" onClick={saveRock}><span>Save</span></button>
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );

  const card = (r: Rock) => {
    if (editingId === r.id) {
      return (
        <div key={r.id} className="panel p-4 border-accent">
          {rockForm(() => setEditingId(null))}
          <button className="btn-ghost text-xs text-bad mt-3" onClick={() => removeRock(r.id)}>Delete Rock</button>
        </div>
      );
    }
    const owner = team.find((t) => t.id === r.owner_id);
    const badge = STATUS_BADGE[r.status];
    return (
      <div
        key={r.id}
        onDragOver={(e) => { e.preventDefault(); setOverId(r.id); }}
        onDragLeave={() => setOverId((s) => (s === r.id ? null : s))}
        onDrop={() => handleDrop(r.id)}
        className={`panel p-4 transition-colors ${dragId === r.id ? 'opacity-50' : ''} ${overId === r.id && dragId && dragId !== r.id ? 'border-accent' : ''}`}
      >
        <div className="flex items-start gap-2">
          <div
            draggable
            onDragStart={() => setDragId(r.id)}
            onDragEnd={() => { setDragId(null); setOverId(null); }}
            className="flex items-start gap-2 flex-1 min-w-0 cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
          >
            <span className="text-zinc-600 select-none leading-none mt-1">⠿</span>
            <div className="min-w-0">
              <h3 className="font-semibold text-white leading-snug">{r.title}</h3>
              <p className="text-xs text-zinc-500">{quarter?.label}</p>
            </div>
          </div>
          <button className="btn-ghost text-xs" onClick={() => startEdit(r)}>Edit</button>
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase shrink-0 ${badge.cls}`}>{badge.label}</span>
        </div>

        {r.description && <p className="text-sm text-zinc-400 mt-2 whitespace-pre-wrap">{r.description}</p>}

        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Progress</span>
            <div className="flex items-center gap-1">
              <input
                type="number" min={0} max={100} value={r.progress}
                onChange={(e) => setProgressLocal(r.id, clamp(Number(e.target.value)))}
                onBlur={(e) => updateRock(r.id, { progress: clamp(Number(e.target.value)) })}
                className="input !w-16 !py-1 text-right text-xs"
              />
              <span className="text-xs text-zinc-400">%</span>
            </div>
          </div>
          <input
            type="range" min={0} max={100} value={r.progress} className="w-full accent-green-500 cursor-pointer"
            onChange={(e) => setProgressLocal(r.id, Number(e.target.value))}
            onMouseUp={(e) => updateRock(r.id, { progress: Number((e.target as HTMLInputElement).value) })}
            onTouchEnd={(e) => updateRock(r.id, { progress: Number((e.target as HTMLInputElement).value) })}
          />
        </div>

        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-panelBorder/60">
          <span className="flex items-center gap-2 text-xs text-zinc-300 min-w-0">
            <Avatar member={owner} /> <span className="truncate">{owner?.name ?? 'Unassigned'}</span>
          </span>
          <select
            className="input !w-auto !py-1 text-xs"
            value={r.status}
            onChange={(e) => updateRock(r.id, { status: e.target.value as RockStatus })}
          >
            {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader title="Rocks" subtitle={`${quarter?.label ?? ''} Quarterly Priorities - Drag to reorder`}>
        <button className="btn" onClick={startAdd}><span>+ Add Rock</span></button>
        <QuarterPicker quarters={quarters} value={quarter?.id} onChange={setQuarterId} />
      </PageHeader>

      {showForm && (
        <div className="panel p-5 mb-5">
          {rockForm(() => setShowForm(false))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 items-start">
        {rocks.map((r) => card(r))}
      </div>

      {!rocks.length && <p className="text-zinc-500 text-center py-10">No rocks for {quarter?.label ?? 'this quarter'}. Add quarterly priorities above.</p>}
    </>
  );
}
