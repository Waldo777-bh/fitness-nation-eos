-- Persistent, wall-clock meeting timer (survives page navigation).
-- Additive only: nullable / defaulted columns, no existing data touched.
-- Applied to the live project (nexyzlfaizcdnmstgiqv) on 2026-07-21.

alter table public.meetings
  add column if not exists timer_started_at timestamptz;               -- set while running; null when paused/stopped

alter table public.meetings
  add column if not exists section_start_seconds integer not null default 0; -- elapsed-seconds mark when the current agenda section began

comment on column public.meetings.timer_started_at is 'When the meeting timer was last started/resumed. NULL = paused/stopped. Live elapsed = elapsed_seconds + (now - timer_started_at).';
comment on column public.meetings.section_start_seconds is 'Elapsed-seconds mark at which the current agenda section began; used to compute per-section time so it survives navigation.';
