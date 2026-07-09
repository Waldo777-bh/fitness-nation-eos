export type TeamMember = {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
};

export type Metric = {
  id: string;
  key: string;
  name: string;
  category: 'membership' | 'revenue' | 'operations' | 'growth';
  unit: 'count' | 'currency' | 'percent' | 'rating';
  direction: 'up' | 'down';
  is_auto: boolean;
  formula: string | null;
  source: string;
  owner_id: string | null;
  sort_order: number;
  active: boolean;
};

export type Quarter = {
  id: string;
  label: string;
  year: number;
  quarter: number;
  start_date: string;
  end_date: string;
  weeks: number;
};

export type QuarterTarget = {
  id: string;
  quarter_id: string;
  metric_id: string;
  start_value: number | null;
  target_value: number | null;
};

export type WeeklyEntry = {
  id: string;
  quarter_id: string;
  metric_id: string;
  week_number: number;
  week_start: string;
  target: number | null;
  actual: number | null;
  source: string;
};

export type Rock = {
  id: string;
  quarter_id: string;
  title: string;
  description: string | null;
  owner_id: string | null;
  status: 'on_track' | 'off_track' | 'done' | 'dropped';
  progress: number;
  sort_order: number;
};

export type Issue = {
  id: string;
  title: string;
  description: string | null;
  owner_id: string | null;
  status: 'to_discuss' | 'in_progress' | 'resolved' | 'dropped';
  category: string;
  priority: number;
  created_at: string;
  resolved_at: string | null;
};

export type Todo = {
  id: string;
  title: string;
  owner_id: string | null;
  due_date: string | null;
  done: boolean;
  created_at: string;
};
