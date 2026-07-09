-- Seed team, metrics, quarters
insert into team_members (name, initials, color, role) values
  ('Brent', 'B', '#6d5ef2', 'owner'),
  ('Krystle', 'K', '#22c55e', 'member'),
  ('David', 'D', '#f59e0b', 'member'),
  ('Filomena', 'F', '#ec4899', 'member'),
  ('Bao', 'Ba', '#a855f7', 'member');

-- Metrics (owner initials resolved below)
with owners as (select id, initials from team_members)
insert into metrics (key, name, category, unit, direction, is_auto, formula, source, owner_id, sort_order) values
  -- Membership
  ('dd_members',            'DD Members',                      'membership', 'count',    'up',   false, null, 'clubfit',  (select id from owners where initials='K'), 10),
  ('new_dd_sales',          'New DD Sales',                    'membership', 'count',    'up',   false, null, 'gymsales', (select id from owners where initials='K'), 20),
  ('dd_cancellations',      'DD Cancellations',                'membership', 'count',    'down', false, null, 'clubfit',  (select id from owners where initials='Ba'), 30),
  ('member_suspensions',    'Member Suspensions',              'membership', 'count',    'down', false, null, 'clubfit',  (select id from owners where initials='Ba'), 40),
  ('net_dd_growth',         'Net DD Growth',                   'membership', 'count',    'up',   true,  'new_dd_sales - dd_cancellations', 'derived', (select id from owners where initials='K'), 50),
  ('pif_members',           'PIF Members',                     'membership', 'count',    'up',   false, null, 'clubfit',  (select id from owners where initials='K'), 60),
  ('new_pif_sales',         'New PIF Sales',                   'membership', 'count',    'up',   false, null, 'gymsales', (select id from owners where initials='K'), 70),
  ('pif_cancellations',     'PIF Cancellations',               'membership', 'count',    'down', false, null, 'clubfit',  (select id from owners where initials='K'), 80),
  ('net_pif_growth',        'Net PIF Growth',                  'membership', 'count',    'up',   true,  'new_pif_sales - pif_cancellations', 'derived', (select id from owners where initials='K'), 90),
  ('close_ratio',           'Close Ratio',                     'membership', 'percent',  'up',   true,  '(new_dd_sales + new_pif_sales) / leads', 'derived', (select id from owners where initials='K'), 100),
  ('fitness_passport_members','Fitness Passport Memberships',  'membership', 'count',    'up',   false, null, 'clubfit',  (select id from owners where initials='Ba'), 110),
  -- Revenue
  ('total_revenue',         'Total Revenue',                   'revenue',    'currency', 'up',   true,  'sum of revenue metrics', 'derived', (select id from owners where initials='B'), 200),
  ('dd_revenue',            'Weekly Membership DD Revenue',    'revenue',    'currency', 'up',   false, null, 'clubfit',  (select id from owners where initials='K'), 210),
  ('retail_revenue',        'Retail Revenue',                  'revenue',    'currency', 'up',   false, null, 'clubfit',  (select id from owners where initials='Ba'), 220),
  ('fitness_passport_revenue','Fitness Passport Revenues',     'revenue',    'currency', 'up',   false, null, 'clubfit',  (select id from owners where initials='K'), 230),
  ('pif_revenue',           'PIF Revenue',                     'revenue',    'currency', 'up',   false, null, 'clubfit',  (select id from owners where initials='K'), 240),
  ('pt_revenue',            'PT Revenue',                      'revenue',    'currency', 'up',   false, null, 'clubfit',  (select id from owners where initials='K'), 250),
  ('avg_weekly_fee',        'Avg Weekly Fee',                  'revenue',    'currency', 'up',   true,  'dd_revenue / dd_members', 'derived', (select id from owners where initials='B'), 260),
  ('shake_sales',           'Shake Sales',                     'revenue',    'count',    'up',   false, null, 'clubfit',  (select id from owners where initials='Ba'), 270),
  -- Operations
  ('google_star_rating',    'Google Star Review',              'operations', 'rating',   'up',   false, null, 'google',   (select id from owners where initials='Ba'), 300),
  ('google_reviews_week',   'Google Reviews Per Week',         'operations', 'count',    'up',   false, null, 'google',   (select id from owners where initials='Ba'), 310),
  ('club_visits',           'Club Visits',                     'operations', 'count',    'up',   false, null, 'clubfit',  (select id from owners where initials='K'), 320),
  ('premium_class_util',    'Premium Class Utilisation',       'operations', 'percent',  'up',   false, null, 'manual',   (select id from owners where initials='Ba'), 330),
  ('group_class_util',      'Group Fitness Class Utilisation', 'operations', 'percent',  'up',   false, null, 'manual',   (select id from owners where initials='Ba'), 340),
  ('spin_class_util',       'Spin Class Utilisation',          'operations', 'percent',  'up',   false, null, 'manual',   (select id from owners where initials='Ba'), 350),
  ('reception_costs',       'Reception Weekly Costs',          'operations', 'currency', 'down', false, null, 'manual',   (select id from owners where initials='Ba'), 360),
  -- Growth (best-practice extras)
  ('leads',                 'New Leads',                       'growth',     'count',    'up',   false, null, 'gymsales', (select id from owners where initials='K'), 400),
  ('lead_conversion',       'Lead to Join Conversion',         'growth',     'percent',  'up',   true,  '(new_dd_sales + new_pif_sales) / leads', 'derived', (select id from owners where initials='K'), 410),
  ('monthly_churn',         'Monthly Churn %',                 'growth',     'percent',  'down', true,  '(dd_cancellations * 4.33) / dd_members', 'derived', (select id from owners where initials='B'), 420),
  ('arpm',                  'Avg Revenue Per Member',          'growth',     'currency', 'up',   true,  'total_revenue / (dd_members + pif_members)', 'derived', (select id from owners where initials='B'), 430),
  ('ltv',                   'Member LTV',                      'growth',     'currency', 'up',   true,  '(arpm * 4.33) / monthly_churn', 'derived', (select id from owners where initials='B'), 440);

-- Quarters for 2026-2027 (calendar quarters, Monday-aligned weeks)
insert into quarters (label, year, quarter, start_date, end_date, weeks) values
  ('Q1 2026', 2026, 1, '2026-01-05', '2026-04-05', 13),
  ('Q2 2026', 2026, 2, '2026-04-06', '2026-07-05', 13),
  ('Q3 2026', 2026, 3, '2026-07-06', '2026-10-04', 13),
  ('Q4 2026', 2026, 4, '2026-10-05', '2027-01-03', 13),
  ('Q1 2027', 2027, 1, '2027-01-04', '2027-04-04', 13),
  ('Q2 2027', 2027, 2, '2027-04-05', '2027-07-04', 13);
