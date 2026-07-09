-- Issues: category + richer status workflow
alter table issues add column if not exists category text not null default 'other';
alter table issues alter column status set default 'to_discuss';
update issues set status = 'to_discuss' where status = 'open';

-- Meetings: per-week lifecycle
alter table meetings add column if not exists status text not null default 'completed'; -- scheduled | in_progress | completed
alter table meetings add column if not exists cascading_messages text;
alter table meetings add column if not exists duration_minutes int;
create unique index if not exists meetings_week_unique on meetings(quarter_id, week_number) where quarter_id is not null and week_number is not null;
