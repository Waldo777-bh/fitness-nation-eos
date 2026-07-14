'use client';

import { useEffect, useState } from 'react';
import { useEosCore, usePersistedQuarter } from '@/lib/hooks';
import { PageHeader, QuarterPicker, Avatar } from '@/components/ui';
import type { Rock } from '@/lib/types';

type RockStatus = Rock['status'];

const COLUMNS: { key: RockStatus; label: string; dot: string; ring: string }[] = [
  { key: 'on_track', label: 'On Track', dot: 'bg-good', ring: 'border-good/50' },
  { key: 'off_track', label: 'Off Track', dot: 'bg-bad', ring: 'border-bad/50' },
  { key: 'done', label: 'Done', dot: 'bg-violet-400', ring: 'border-violet-400/50' },
  { key: 'dropped', label: 'Dropped', dot: 'bg-zinc-500', ring: 'border-zinc-500/50' },
];

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
  const [dragOver, setDragOver] = useState<RockStatus | null>(null);

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
    load();
  }

  async function dropTo(status: RockStatus) {
    const id = dragId;
    setDragId(null);
    setDragOver(null);
    if (!id) return;
    const r = rocks.find((x) => x.id === id);
    if (r && r.status !== status) await updateRock(id, { status });
  }

  if (loading) return <p className="text-zinc-500">Loading...</p>;

  // Inline function (NOT a nested <Component/>) so typing never remounts the
  // inputs - this is what keeps the text field focused while you type.
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
        </div>
      );
    }
    const owner = team.find((t) => t.id === r.owner_id);
    return (
      <div
        key={r.id}
        className={`panel p-0 overflow-hidden ${dragId === r.id ? 'opacity-50' : ''}`}
      >
        <div
          draggable
          onDragStart={() => setDragId(r.id)}
          onDragEnd={() => { setDragId(null); setDragOver(null); }}
          className="flex items-start gap-2 px-4 pt-4 cursor-grab active:cursor-grabbing"
          title="Drag to another column to change status"
        >
          <span className="text-zinc-600 leading-none select-none mt-0.5">::</span>
          <h3 className="font-semibold text-white flex-1 leading-snug">{r.title}</h3>
        </div>
        {r.description && <p className="text-sm text-zinc-400 px-4 mt-2 whitespace-pre-wrap">{r.description}</p>}
        <div className="flex items-center gap-3 px-4 mt-3">
          <input
            type="range" min={0} max={100} value={r.progress} className="flex-1 accent-green-500"
            onChange={(e) => setRocks((rs) => rs.map((x) => (x.id === r.id ? { ...x, progress: Number(e.target.value) } : x)))}
            onMouseUp={(e) => updateRock(r.id, { progress: Number((e.target as HTMLInputElement).value) })}
            onTouchEnd={(e) => updateRock(r.id, { progress: Number((e.target as HTMLInputElement).value) })}
          />
          <span className="text-sm w-10 text-right">{r.progress}%</span>
        </div>
        <div className="flex items-center justify-between gap-2 px-4 py-3 mt-2 border-t border-panelBorder/60">
          <span className="flex items-center gap-2 text-xs text-zinc-300 min-w-0">
            <Avatar member={owner} /> <span className="truncate">{owner?.name ?? 'Unassigned'}</span>
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <select
              className="input !w-auto !py-1 text-xs"
              value={r.status}
              onChange={(e) => updateRock(r.id, { status: e.target.value as RockStatus })}
              title="Move to column"
            >
              {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <button className="btn-ghost text-xs" onClick={() => startEdit(r)}>Edit</button>
            <button className="btn-ghost text-xs" onClick={() => removeRock(r.id)}>Delete</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader title="Rocks" subtitle={`${quarter?.label ?? ''} quarterly priorities`}>
        <button className="btn" onClick={startAdd}><span>+ Add Rock</span></button>
        <QuarterPicker quarters={quarters} value={quarter?.id} onChange={setQuarterId} />
      </PageHeader>

      {showForm && (
        <div className="panel p-5 mb-5">
          {rockForm(() => setShowForm(false))}
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4 items-start">
        {COLUMNS.map((col) => {
          const colRocks = rocks.filter((r) => r.status === col.key);
          return (
            <div
              key={col.key}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col.key); }}
              onDragLeave={() => setDragOver((s) => (s === col.key ? null : s))}
              onDrop={() => dropTo(col.key)}
              className={`flex-1 min-w-[260px] rounded-lg border transition-colors ${dragOver === col.key ? `${col.ring} bg-accent/5` : 'border-panelBorder bg-black/20'}`}
            >
              <div className="flex items-center gap-2 px-3 py-3 border-b border-panelBorder">
                <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                <h2 className="section-title">{col.label}</h2>
                <span className="text-xs bg-panelBorder text-zinc-300 px-2 py-0.5 rounded-full font-bold ml-auto">{colRocks.length}</span>
              </div>
              <div className="flex flex-col gap-3 p-3 min-h-24">
                {colRocks.map((r) => card(r))}
                {!colRocks.length && (
                  <p className="text-zinc-600 text-xs text-center py-6">
                    {dragOver === col.key ? 'Drop here' : 'Drag rocks here'}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!rocks.length && <p className="text-zinc-500 text-center py-10">No rocks for {quarter?.label ?? 'this quarter'}. Add quarterly priorities above.</p>}
    </>
  );
}
