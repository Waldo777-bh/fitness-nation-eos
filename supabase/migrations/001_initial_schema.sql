-- Fitness Nation EOS - initial schema
-- Team members
create table team_members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id),
  name text not null,
  initials text not null,
  color text not null default '#7c3aed',
  email text unique,
  role text not null default 'member', -- owner | member
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Metric definitions
create table metrics (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,             -- e.g. 'dd_members'
  name text not null,
  category text not null,               -- membership | revenue | operations | growth
  unit text not null default 'count',   -- count | currency | percent | rating
  direction text not null default 'up', -- up = higher is better, down = lower is better
  is_auto boolean not null default false,
  formula text,                         -- human-readable formula for auto metrics
  source text not null default 'manual',-- manual | gymsales | clubfit | google | derived
  owner_id uuid references team_members(id),
  sort_order int not null default 0,
  active boolean not null default true
);

-- Quarters
create table quarters (
  id uuid primary key default gen_random_uuid(),
  label text unique not null,           -- 'Q3 2026'
  year int not null,
  quarter int not null,
  start_date date not null,
  end_date date not null,
  weeks int not null default 13
);

-- Quarterly start/target per metric
create table quarter_targets (
  id uuid primary key default gen_random_uuid(),
  quarter_id uuid not null references quarters(id) on delete cascade,
  metric_id uuid not null references metrics(id) on delete cascade,
  start_value numeric,
  target_value numeric,
  unique (quarter_id, metric_id)
);

-- Weekly targets + actuals
create table weekly_entries (
  id uuid primary key default gen_random_uuid(),
  quarter_id uuid not null references quarters(id) on delete cascade,
  metric_id uuid not null references metrics(id) on delete cascade,
  week_number int not null,             -- 1..13 within quarter
  week_start date not null,
  target numeric,
  actual numeric,
  source text not null default 'manual',
  updated_at timestamptz not null default now(),
  unique (metric_id, week_start)
);
create index weekly_entries_quarter on weekly_entries(quarter_id, week_number);

-- Rocks (quarterly priorities)
create table rocks (
  id uuid primary key default gen_random_uuid(),
  quarter_id uuid not null references quarters(id) on delete cascade,
  title text not null,
  description text,
  owner_id uuid references team_members(id),
  status text not null default 'on_track', -- on_track | off_track | done | dropped
  progress int not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Issues (IDS)
create table issues (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  owner_id uuid references team_members(id),
  status text not null default 'open',  -- open | resolved | dropped
  priority int not null default 3,      -- 1 high .. 5 low
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- To-dos (7-day actions)
create table todos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  owner_id uuid references team_members(id),
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- L10 meetings
create table meetings (
  id uuid primary key default gen_random_uuid(),
  quarter_id uuid references quarters(id),
  week_number int,
  meeting_date date not null default current_date,
  notes text,
  ratings jsonb not null default '{}'::jsonb, -- {member_id: 1-10}
  attendees uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Raw inbound events (Zapier webhooks / API syncs land here)
create table source_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,                 -- zapier_gymsales | gymsales_api | clubfit_api | google
  event_type text not null,             -- lead_created | sale_made | cancellation | metric_value ...
  external_id text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  processed boolean not null default false,
  created_at timestamptz not null default now()
);
create index source_events_unprocessed on source_events(processed, occurred_at);
create unique index source_events_dedupe on source_events(source, event_type, external_id) where external_id is not null;

-- Sync run log
create table sync_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null,                 -- success | error
  message text,
  rows_affected int default 0,
  created_at timestamptz not null default now()
);

-- RLS: authenticated users get full access; anon gets nothing.
alter table team_members enable row level security;
alter table metrics enable row level security;
alter table quarters enable row level security;
alter table quarter_targets enable row level security;
alter table weekly_entries enable row level security;
alter table rocks enable row level security;
alter table issues enable row level security;
alter table todos enable row level security;
alter table meetings enable row level security;
alter table source_events enable row level security;
alter table sync_logs enable row level security;

create policy "auth full access" on team_members for all to authenticated using (true) with check (true);
create policy "auth full access" on metrics for all to authenticated using (true) with check (true);
create policy "auth full access" on quarters for all to authenticated using (true) with check (true);
create policy "auth full access" on quarter_targets for all to authenticated using (true) with check (true);
create policy "auth full access" on weekly_entries for all to authenticated using (true) with check (true);
create policy "auth full access" on rocks for all to authenticated using (true) with check (true);
create policy "auth full access" on issues for all to authenticated using (true) with check (true);
create policy "auth full access" on todos for all to authenticated using (true) with check (true);
create policy "auth full access" on meetings for all to authenticated using (true) with check (true);
create policy "auth read events" on source_events for select to authenticated using (true);
create policy "auth read logs" on sync_logs for select to authenticated using (true);
