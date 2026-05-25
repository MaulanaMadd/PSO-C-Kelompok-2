-- =========================================================
-- SCHEMAS
-- =========================================================
create schema if not exists stg;
create schema if not exists raw;
create schema if not exists mart;
create schema if not exists ml;

-- =========================================================
-- PUBLIC TABLES (optional)
-- =========================================================
create table if not exists public.users (
  id serial primary key,
  email text unique not null,
  hashed_password text not null,
  full_name text,
  phone text,
  role text default 'user',
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id serial primary key,
  type text not null, 
  title text not null,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- =========================================================
-- STAGING (DAILY ONLY) - ALL EXCEL COLUMNS
-- =========================================================
-- drop table if exists stg.pot_daily_ingest;

create table if not exists stg.pot_daily_ingest (
  tgl text, potnum text, potday text, gen text, ctype text,
  pot_status text, transition text, age_day text, age_month text,
  class text, pot_design text, tshift text, ac_schedule text,
  mt_schedule text, mt_shift text, mt_day text, metal_kg text,
  dross text, ov text, ce text, dc text, metal_leak text,
  group_current text, avv text, psp text, osp text, noise text,
  cb text, fd text, oa text, aef text, aev text, ae_dur text,
  ae_kwh text, m text, mc text, s text, cd text, bt text,
  alf3_kg text, mt_bb text, feed_pct text, pl_current text,
  bt_in_target text, bath_tap text, bath_charge text, anode_reset text,
  nipple_kg text, c_tapping text, meji text, frozen_bath text,
  bath_powder text, return_crust text, dross_trp text, bbar_miring text,
  belly_helly text, temp_ac text, metal_scrap text, metal_ball text,
  soda_ash text, break_sp text, break_local text, nipple_freq text,
  broke_anode_kg text, broke_anode_freq text, rwb_kg text, rwb_freq text,
  fe text, si text, sa text, caf2 text, s1a text, s1b text,
  sa_in_target text, tacb text, kerak_kg text, kerak_freq text,
  beto text, tebl text, jf text, mix_welding text, ba_clad text,
  n_bulat text, rod_rj text, fe_charge text,

  source text,
  ingested_at timestamptz not null default now()
);

create index if not exists idx_stg_pot_daily_ingest_tgl_pot
  on stg.pot_daily_ingest(tgl, potnum);

-- =========================================================
-- RAW (TYPED / CLEAN) - ALL EXCEL COLUMNS
-- =========================================================
-- drop table if exists raw.pot_daily;

create table if not exists raw.pot_daily (
  date date not null,
  pot_id int not null,
  potline_id int,
  
  potday numeric, gen int, ctype text, pot_status_code int, transition int,
  age_day int, age_month int, class int, pot_design int, tshift int,
  ac_schedule int, mt_schedule int, mt_shift int, mt_day int,
  metal_kg numeric, dross numeric, ov numeric, ce numeric, dc numeric,
  metal_leak numeric, group_current numeric, avv numeric, psp numeric,
  osp numeric, noise numeric, cb numeric, fd numeric, oa numeric,
  aef numeric, aev numeric, ae_dur numeric, ae_kwh numeric, m numeric,
  mc numeric, s numeric, cd numeric, bt numeric, alf3_kg numeric,
  mt_bb numeric, feed_pct numeric, pl_current numeric, bt_in_target int,
  bath_tap numeric, bath_charge numeric, anode_reset numeric, nipple_kg numeric,
  c_tapping numeric, meji numeric, frozen_bath numeric, bath_powder numeric,
  return_crust numeric, dross_trp numeric, bbar_miring numeric, belly_helly numeric,
  temp_ac numeric, metal_scrap numeric, metal_ball numeric, soda_ash numeric,
  break_sp numeric, break_local numeric, nipple_freq numeric,
  broke_anode_kg numeric, broke_anode_freq numeric, rwb_kg numeric, rwb_freq numeric,
  fe numeric, si numeric, sa numeric, caf2 numeric, s1a numeric, s1b numeric,
  sa_in_target int, tacb int, kerak_kg int, kerak_freq int, beto int,
  tebl int, jf int, mix_welding int, ba_clad int, n_bulat int,
  rod_rj int, fe_charge int,

  source text,
  ingested_at timestamptz not null default now(),

  primary key (date, pot_id)
);

create table if not exists raw.dim_pot (
  pot_id int primary key,
  potnum text not null,
  potline_id int,
  updated_at timestamptz not null default now()
);

create index if not exists idx_raw_pot_daily_pot_date
  on raw.pot_daily(pot_id, date desc);

create index if not exists idx_raw_pot_daily_potline_date
  on raw.pot_daily(potline_id, date desc);

-- =========================================================
-- ETL: STG -> RAW (cleaning + dedup)
-- =========================================================
insert into raw.pot_daily (
  date, pot_id, potline_id,
  potday, gen, ctype, pot_status_code, transition, age_day, age_month,
  class, pot_design, tshift, ac_schedule, mt_schedule, mt_shift, mt_day,
  metal_kg, dross, ov, ce, dc, metal_leak, group_current, avv, psp,
  osp, noise, cb, fd, oa, aef, aev, ae_dur, ae_kwh, m, mc, s, cd, bt,
  alf3_kg, mt_bb, feed_pct, pl_current, bt_in_target, bath_tap,
  bath_charge, anode_reset, nipple_kg, c_tapping, meji, frozen_bath,
  bath_powder, return_crust, dross_trp, bbar_miring, belly_helly,
  temp_ac, metal_scrap, metal_ball, soda_ash, break_sp, break_local,
  nipple_freq, broke_anode_kg, broke_anode_freq, rwb_kg, rwb_freq,
  fe, si, sa, caf2, s1a, s1b, sa_in_target, tacb, kerak_kg, kerak_freq,
  beto, tebl, jf, mix_welding, ba_clad, n_bulat, rod_rj, fe_charge,
  source, ingested_at
)
with cleaned as (
  select *,
    nullif(nullif(trim(tgl), ''), '\\N') as tgl_txt,
    nullif(nullif(trim(potnum), ''), '\\N') as pot_txt
  from stg.pot_daily_ingest
  where nullif(nullif(trim(tgl), ''), '\\N') is not null
    and nullif(nullif(trim(potnum), ''), '\\N') is not null
),
parsed as (
  select
    tgl_txt::date as date,
    case when pot_txt ~ '^\\d+$' then pot_txt::int end as pot_id,
    case
      when pot_txt ~ '^\\d+$' and pot_txt::int between 101 and 285 then 1
      when pot_txt ~ '^\\d+$' and pot_txt::int between 501 and 685 then 3
      else null
    end as potline_id,

    -- Numeric Cast Helpers (replace comma with dot, handle 9999/nulls)
    -- Using a macro-like approach isn't possible in pure sql script easily without functions, 
    -- so we repeat the pattern:
    -- CASE WHEN replace(trim(COL), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' AND replace(trim(COL), ',', '.') <> '9999' THEN replace(trim(COL), ',', '.')::numeric END
    
    -- NOTE: For brevity in this large update, assuming widely standard cleaning needs.
    
    (select case when replace(trim(potday), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(potday), ',', '.')::numeric end) as potday,
    (select case when trim(gen) ~ '^-?\\d+$' then trim(gen)::int end) as gen,
    ctype,
    (select case when trim(pot_status) ~ '^-?\\d+$' then trim(pot_status)::int end) as pot_status_code,
    (select case when trim(transition) ~ '^-?\\d+$' then trim(transition)::int end) as transition,
    (select case when trim(age_day) ~ '^-?\\d+$' then trim(age_day)::int end) as age_day,
    (select case when trim(age_month) ~ '^-?\\d+$' then trim(age_month)::int end) as age_month,
    (select case when trim(class) ~ '^-?\\d+$' then trim(class)::int end) as class,
    (select case when trim(pot_design) ~ '^-?\\d+$' then trim(pot_design)::int end) as pot_design,
    (select case when trim(tshift) ~ '^-?\\d+$' then trim(tshift)::int end) as tshift,
    (select case when trim(ac_schedule) ~ '^-?\\d+$' then trim(ac_schedule)::int end) as ac_schedule,
    (select case when trim(mt_schedule) ~ '^-?\\d+$' then trim(mt_schedule)::int end) as mt_schedule,
    (select case when trim(mt_shift) ~ '^-?\\d+$' then trim(mt_shift)::int end) as mt_shift,
    (select case when trim(mt_day) ~ '^-?\\d+$' then trim(mt_day)::int end) as mt_day,

    -- Key Metrics
    case when replace(trim(ce), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' and replace(trim(ce), ',', '.') <> '9999' then replace(trim(ce), ',', '.')::numeric end as ce,
    case when replace(trim(bt), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' and replace(trim(bt), ',', '.') <> '9999' then replace(trim(bt), ',', '.')::numeric end as bt,
    case when replace(trim(m), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' and replace(trim(m), ',', '.') <> '9999' then replace(trim(m), ',', '.')::numeric end as m,
    case when replace(trim(ov), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' and replace(trim(ov), ',', '.') <> '9999' then replace(trim(ov), ',', '.')::numeric end as ov,
    case when replace(trim(aef), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' and replace(trim(aef), ',', '.') <> '9999' then replace(trim(aef), ',', '.')::numeric end as aef,
    case when replace(trim(noise), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' and replace(trim(noise), ',', '.') <> '9999' then replace(trim(noise), ',', '.')::numeric end as noise,
    
    -- Other Numerics (Generic Cleaning)
    case when replace(trim(metal_kg), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(metal_kg), ',', '.')::numeric end as metal_kg,
    case when replace(trim(dross), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(dross), ',', '.')::numeric end as dross,
    case when replace(trim(dc), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(dc), ',', '.')::numeric end as dc,
    case when replace(trim(metal_leak), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(metal_leak), ',', '.')::numeric end as metal_leak,
    case when replace(trim(group_current), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(group_current), ',', '.')::numeric end as group_current,
    case when replace(trim(avv), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(avv), ',', '.')::numeric end as avv,
    case when replace(trim(psp), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(psp), ',', '.')::numeric end as psp,
    case when replace(trim(osp), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(osp), ',', '.')::numeric end as osp,
    case when replace(trim(cb), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(cb), ',', '.')::numeric end as cb,
    case when replace(trim(fd), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(fd), ',', '.')::numeric end as fd,
    case when replace(trim(oa), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(oa), ',', '.')::numeric end as oa,
    case when replace(trim(aev), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(aev), ',', '.')::numeric end as aev,
    case when replace(trim(ae_dur), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(ae_dur), ',', '.')::numeric end as ae_dur,
    case when replace(trim(ae_kwh), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(ae_kwh), ',', '.')::numeric end as ae_kwh,
    case when replace(trim(mc), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(mc), ',', '.')::numeric end as mc,
    case when replace(trim(s), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(s), ',', '.')::numeric end as s,
    case when replace(trim(cd), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(cd), ',', '.')::numeric end as cd,
    case when replace(trim(alf3_kg), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(alf3_kg), ',', '.')::numeric end as alf3_kg,
    case when replace(trim(mt_bb), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(mt_bb), ',', '.')::numeric end as mt_bb,
    case when replace(trim(feed_pct), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(feed_pct), ',', '.')::numeric end as feed_pct,
    case when replace(trim(pl_current), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(pl_current), ',', '.')::numeric end as pl_current,
    
    (select case when trim(bt_in_target) ~ '^-?\\d+$' then trim(bt_in_target)::int end) as bt_in_target,
    
    case when replace(trim(bath_tap), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(bath_tap), ',', '.')::numeric end as bath_tap,
    case when replace(trim(bath_charge), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(bath_charge), ',', '.')::numeric end as bath_charge,
    case when replace(trim(anode_reset), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(anode_reset), ',', '.')::numeric end as anode_reset,
    case when replace(trim(nipple_kg), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(nipple_kg), ',', '.')::numeric end as nipple_kg,
    case when replace(trim(c_tapping), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(c_tapping), ',', '.')::numeric end as c_tapping,
    case when replace(trim(meji), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(meji), ',', '.')::numeric end as meji,
    case when replace(trim(frozen_bath), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(frozen_bath), ',', '.')::numeric end as frozen_bath,
    case when replace(trim(bath_powder), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(bath_powder), ',', '.')::numeric end as bath_powder,
    case when replace(trim(return_crust), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(return_crust), ',', '.')::numeric end as return_crust,
    case when replace(trim(dross_trp), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(dross_trp), ',', '.')::numeric end as dross_trp,
    case when replace(trim(bbar_miring), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(bbar_miring), ',', '.')::numeric end as bbar_miring,
    case when replace(trim(belly_helly), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(belly_helly), ',', '.')::numeric end as belly_helly,
    case when replace(trim(temp_ac), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(temp_ac), ',', '.')::numeric end as temp_ac,
    case when replace(trim(metal_scrap), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(metal_scrap), ',', '.')::numeric end as metal_scrap,
    case when replace(trim(metal_ball), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(metal_ball), ',', '.')::numeric end as metal_ball,
    case when replace(trim(soda_ash), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(soda_ash), ',', '.')::numeric end as soda_ash,
    case when replace(trim(break_sp), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(break_sp), ',', '.')::numeric end as break_sp,
    case when replace(trim(break_local), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(break_local), ',', '.')::numeric end as break_local,
    case when replace(trim(nipple_freq), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(nipple_freq), ',', '.')::numeric end as nipple_freq,
    case when replace(trim(broke_anode_kg), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(broke_anode_kg), ',', '.')::numeric end as broke_anode_kg,
    case when replace(trim(broke_anode_freq), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(broke_anode_freq), ',', '.')::numeric end as broke_anode_freq,
    case when replace(trim(rwb_kg), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(rwb_kg), ',', '.')::numeric end as rwb_kg,
    case when replace(trim(rwb_freq), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(rwb_freq), ',', '.')::numeric end as rwb_freq,
    case when replace(trim(fe), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(fe), ',', '.')::numeric end as fe,
    case when replace(trim(si), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(si), ',', '.')::numeric end as si,
    case when replace(trim(sa), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(sa), ',', '.')::numeric end as sa,
    case when replace(trim(caf2), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(caf2), ',', '.')::numeric end as caf2,
    case when replace(trim(s1a), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(s1a), ',', '.')::numeric end as s1a,
    case when replace(trim(s1b), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' then replace(trim(s1b), ',', '.')::numeric end as s1b,
    
    (select case when trim(sa_in_target) ~ '^-?\\d+$' then trim(sa_in_target)::int end) as sa_in_target,
    (select case when trim(tacb) ~ '^-?\\d+$' then trim(tacb)::int end) as tacb,
    (select case when trim(kerak_kg) ~ '^-?\\d+$' then trim(kerak_kg)::int end) as kerak_kg,
    (select case when trim(kerak_freq) ~ '^-?\\d+$' then trim(kerak_freq)::int end) as kerak_freq,
    (select case when trim(beto) ~ '^-?\\d+$' then trim(beto)::int end) as beto,
    (select case when trim(tebl) ~ '^-?\\d+$' then trim(tebl)::int end) as tebl,
    (select case when trim(jf) ~ '^-?\\d+$' then trim(jf)::int end) as jf,
    (select case when trim(mix_welding) ~ '^-?\\d+$' then trim(mix_welding)::int end) as mix_welding,
    (select case when trim(ba_clad) ~ '^-?\\d+$' then trim(ba_clad)::int end) as ba_clad,
    (select case when trim(n_bulat) ~ '^-?\\d+$' then trim(n_bulat)::int end) as n_bulat,
    (select case when trim(rod_rj) ~ '^-?\\d+$' then trim(rod_rj)::int end) as rod_rj,
    (select case when trim(fe_charge) ~ '^-?\\d+$' then trim(fe_charge)::int end) as fe_charge,
    
    source,
    ingested_at
  from cleaned
),
dedup as (
  select distinct on (date, pot_id) *
  from parsed
  where pot_id is not null
  order by date, pot_id, ingested_at desc
)
select * from dedup
on conflict (date, pot_id) do update
set
  potline_id = excluded.potline_id,
  potday = excluded.potday,
  gen = excluded.gen,
  ctype = excluded.ctype,
  pot_status_code = excluded.pot_status_code,
  transition = excluded.transition,
  age_day = excluded.age_day,
  age_month = excluded.age_month,
  class = excluded.class,
  pot_design = excluded.pot_design,
  tshift = excluded.tshift,
  ac_schedule = excluded.ac_schedule,
  mt_schedule = excluded.mt_schedule,
  mt_shift = excluded.mt_shift,
  mt_day = excluded.mt_day,
  metal_kg = excluded.metal_kg,
  dross = excluded.dross,
  ov = excluded.ov,
  ce = excluded.ce,
  dc = excluded.dc,
  metal_leak = excluded.metal_leak,
  group_current = excluded.group_current,
  avv = excluded.avv,
  psp = excluded.psp,
  osp = excluded.osp,
  noise = excluded.noise,
  cb = excluded.cb,
  fd = excluded.fd,
  oa = excluded.oa,
  aef = excluded.aef,
  aev = excluded.aev,
  ae_dur = excluded.ae_dur,
  ae_kwh = excluded.ae_kwh,
  m = excluded.m,
  mc = excluded.mc,
  s = excluded.s,
  cd = excluded.cd,
  bt = excluded.bt,
  alf3_kg = excluded.alf3_kg,
  mt_bb = excluded.mt_bb,
  feed_pct = excluded.feed_pct,
  pl_current = excluded.pl_current,
  bt_in_target = excluded.bt_in_target,
  bath_tap = excluded.bath_tap,
  bath_charge = excluded.bath_charge,
  anode_reset = excluded.anode_reset,
  nipple_kg = excluded.nipple_kg,
  c_tapping = excluded.c_tapping,
  meji = excluded.meji,
  frozen_bath = excluded.frozen_bath,
  bath_powder = excluded.bath_powder,
  return_crust = excluded.return_crust,
  dross_trp = excluded.dross_trp,
  bbar_miring = excluded.bbar_miring,
  belly_helly = excluded.belly_helly,
  temp_ac = excluded.temp_ac,
  metal_scrap = excluded.metal_scrap,
  metal_ball = excluded.metal_ball,
  soda_ash = excluded.soda_ash,
  break_sp = excluded.break_sp,
  break_local = excluded.break_local,
  nipple_freq = excluded.nipple_freq,
  broke_anode_kg = excluded.broke_anode_kg,
  broke_anode_freq = excluded.broke_anode_freq,
  rwb_kg = excluded.rwb_kg,
  rwb_freq = excluded.rwb_freq,
  fe = excluded.fe,
  si = excluded.si,
  sa = excluded.sa,
  caf2 = excluded.caf2,
  s1a = excluded.s1a,
  s1b = excluded.s1b,
  sa_in_target = excluded.sa_in_target,
  tacb = excluded.tacb,
  kerak_kg = excluded.kerak_kg,
  kerak_freq = excluded.kerak_freq,
  beto = excluded.beto,
  tebl = excluded.tebl,
  jf = excluded.jf,
  mix_welding = excluded.mix_welding,
  ba_clad = excluded.ba_clad,
  n_bulat = excluded.n_bulat,
  rod_rj = excluded.rod_rj,
  fe_charge = excluded.fe_charge,
  source = excluded.source,
  ingested_at = now();


-- =========================================================
-- MART TABLES (Kept Minimal as Requested)
-- =========================================================
drop table if exists mart.fact_pot_daily cascade;

create table mart.fact_pot_daily (
  pot_id      int primary key,
  potline_id  int,
  date        date not null,
  ce          numeric,
  status      int not null default 1,
  updated_at  timestamptz not null default now()
);

create index if not exists idx_fact_pot_daily_potline
  on mart.fact_pot_daily(potline_id);


-- Latest snapshot table used by API for quick lookups (latest row per pot)
drop table if exists mart.pot_latest_snapshot;

create table if not exists mart.pot_latest_snapshot (
  pot_id int primary key,
  potline_id int,
  date date,
  ce numeric,
  status int not null default 1,
  updated_at timestamptz not null default now()
);

-- Create mart.pot_params_daily to mirror raw.pot_daily structure for easier ETL
drop table if exists mart.pot_params_daily;

create table if not exists mart.pot_params_daily (like raw.pot_daily including all);

create index if not exists idx_pot_params_daily_pot_date
  on mart.pot_params_daily(pot_id, date desc);

create table if not exists mart.ce_predicted_daily (
  pred_date date not null,
  pot_id int not null,
  potline_id int,
  as_of_date date,
  model_name text,
  model_version text,
  feature_version text,
  yhat_ce numeric,
  yhat_lo numeric,
  yhat_hi numeric,
  is_offline_input boolean,
  created_at timestamptz default now(),
  primary key (pot_id, pred_date, model_version)
);

create table if not exists ml.prediction_logs (
  run_id uuid primary key,
  run_timestamp timestamptz not null default now(),
  model_name text,
  model_version text,
  pots_predicted int,
  execution_time_sec numeric,
  avg_prediction numeric,
  min_prediction numeric,
  max_prediction numeric,
  std_prediction numeric,
  status text,
  warnings jsonb,
  error_message text
);

create table if not exists ml.model_registry (
  model_name text not null,
  model_version text not null,
  model_type text,
  file_path text,
  trained_at timestamptz,
  trained_by text,
  training_metrics jsonb,
  training_data_period jsonb,
  feature_count int,
  feature_list text[],
  status text,
  notes text,
  created_at timestamptz not null default now(),
  primary key (model_name, model_version)
);

-- =========================================================
-- REFRESH MART (BEGIN..COMMIT)
-- =========================================================
begin;

-- A) pot_params_daily (Dashboard Details)
truncate table mart.pot_params_daily;

insert into mart.pot_params_daily
select *
from raw.pot_daily d
where d.pot_id is not null
  and d.date is not null;


-- B) fact_pot_daily (Dashboard Grid)
truncate table mart.fact_pot_daily;

with latest_global as (
  select max(date) as max_date
  from raw.pot_daily
  where pot_id is not null
),
latest_per_pot as (
  select distinct on (pot_id)
    pot_id,
    potline_id,
    date,
    ce
  from raw.pot_daily
  where pot_id is not null
  order by pot_id, date desc
)
insert into mart.fact_pot_daily (pot_id, potline_id, date, ce, status, updated_at)
select
  p.pot_id,
  p.potline_id,
  p.date,
  p.ce,
  case when p.date = g.max_date then 1 else 0 end as status,
  now()
from latest_per_pot p
cross join latest_global g;

commit;