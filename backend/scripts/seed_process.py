import os
import sys
from pathlib import Path

os.environ["TZ"] = "UTC"
os.environ["PGTZ"] = "UTC"

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
load_dotenv(dotenv_path=PROJECT_ROOT / ".env")
sys.path.insert(0, str(PROJECT_ROOT))

from run_predictions import run_daily_predictions

SQL_STG_TO_RAW = """
-- 1) Upsert dim_pot dari STG
with cleaned as (
  select
    nullif(nullif(trim(tgl), ''), '\\N') as tgl_txt,
    nullif(nullif(trim(potnum), ''), '\\N') as pot_txt
  from stg.pot_daily_ingest
  where nullif(nullif(trim(tgl), ''), '\\N') is not null
    and nullif(nullif(trim(potnum), ''), '\\N') is not null
),
parsed as (
  select
    case when pot_txt ~ '^\\d+$' then pot_txt::int end as pot_id,
    pot_txt as potnum,
    case
      when pot_txt ~ '^\\d+$' and pot_txt::int between 101 and 285 then 1
      when pot_txt ~ '^\\d+$' and pot_txt::int between 501 and 685 then 3
      else null
    end as potline_id
  from cleaned
)
insert into raw.dim_pot (pot_id, potnum, potline_id)
select distinct pot_id, potnum, potline_id
from parsed
where pot_id is not null
on conflict (pot_id) do update
set
  potnum = excluded.potnum,
  potline_id = excluded.potline_id;

-- 2) Upsert raw.pot_daily
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
    case
      when tgl_txt like '%GMT%' then to_timestamp(substring(tgl_txt from 5 for 20), 'Mon DD YYYY HH24:MI:SS')::date
      else tgl_txt::date
    end as date,
    case when pot_txt ~ '^\\d+$' then pot_txt::int end as pot_id,
    case
      when pot_txt ~ '^\\d+$' and pot_txt::int between 101 and 285 then 1
      when pot_txt ~ '^\\d+$' and pot_txt::int between 501 and 685 then 3
      else null
    end as potline_id,

    (case when replace(trim(potday), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
          then replace(trim(potday), ',', '.')::numeric end) as potday,

    (case when trim(gen) ~ '^-?\\d+$' then trim(gen)::int end) as gen,
    ctype,
    (case when trim(pot_status) ~ '^-?\\d+$' then trim(pot_status)::int end) as pot_status_code,
    (case when trim(transition) ~ '^-?\\d+$' then trim(transition)::int end) as transition,
    (case when trim(age_day) ~ '^-?\\d+$' then trim(age_day)::int end) as age_day,
    (case when trim(age_month) ~ '^-?\\d+$' then trim(age_month)::int end) as age_month,
    (case when trim(class) ~ '^-?\\d+$' then trim(class)::int end) as class,
    (case when trim(pot_design) ~ '^-?\\d+$' then trim(pot_design)::int end) as pot_design,
    (case when trim(tshift) ~ '^-?\\d+$' then trim(tshift)::int end) as tshift,
    (case when trim(ac_schedule) ~ '^-?\\d+$' then trim(ac_schedule)::int end) as ac_schedule,
    (case when trim(mt_schedule) ~ '^-?\\d+$' then trim(mt_schedule)::int end) as mt_schedule,
    (case when trim(mt_shift) ~ '^-?\\d+$' then trim(mt_shift)::int end) as mt_shift,
    (case when trim(mt_day) ~ '^-?\\d+$' then trim(mt_day)::int end) as mt_day,

    case when replace(trim(metal_kg), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(metal_kg), ',', '.')::numeric end as metal_kg,
    case when replace(trim(dross), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(dross), ',', '.')::numeric end as dross,
    case when replace(trim(ov), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(ov), ',', '.')::numeric end as ov,
    case when replace(trim(ce), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' and replace(trim(ce), ',', '.') <> '9999'
      then replace(trim(ce), ',', '.')::numeric end as ce,
    case when replace(trim(dc), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(dc), ',', '.')::numeric end as dc,
    case when replace(trim(metal_leak), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(metal_leak), ',', '.')::numeric end as metal_leak,
    case when replace(trim(group_current), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(group_current), ',', '.')::numeric end as group_current,
    case when replace(trim(avv), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(avv), ',', '.')::numeric end as avv,
    case when replace(trim(psp), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(psp), ',', '.')::numeric end as psp,
    case when replace(trim(osp), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(osp), ',', '.')::numeric end as osp,
    case when replace(trim(noise), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' and replace(trim(noise), ',', '.') <> '9999'
      then replace(trim(noise), ',', '.')::numeric end as noise,
    case when replace(trim(cb), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(cb), ',', '.')::numeric end as cb,
    case when replace(trim(fd), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(fd), ',', '.')::numeric end as fd,
    case when replace(trim(oa), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(oa), ',', '.')::numeric end as oa,
    case when replace(trim(aef), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' and replace(trim(aef), ',', '.') <> '9999'
      then replace(trim(aef), ',', '.')::numeric end as aef,
    case when replace(trim(aev), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(aev), ',', '.')::numeric end as aev,
    case when replace(trim(ae_dur), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(ae_dur), ',', '.')::numeric end as ae_dur,
    case when replace(trim(ae_kwh), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(ae_kwh), ',', '.')::numeric end as ae_kwh,
    case when replace(trim(m), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' and replace(trim(m), ',', '.') <> '9999'
      then replace(trim(m), ',', '.')::numeric end as m,
    case when replace(trim(mc), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(mc), ',', '.')::numeric end as mc,
    case when replace(trim(s), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(s), ',', '.')::numeric end as s,
    case when replace(trim(cd), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(cd), ',', '.')::numeric end as cd,
    case when replace(trim(bt), ',', '.') ~ '^-?\\d+(\\.\\d+)?$' and replace(trim(bt), ',', '.') <> '9999'
      then replace(trim(bt), ',', '.')::numeric end as bt,
    case when replace(trim(alf3_kg), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(alf3_kg), ',', '.')::numeric end as alf3_kg,
    case when replace(trim(mt_bb), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(mt_bb), ',', '.')::numeric end as mt_bb,
    case when replace(trim(feed_pct), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(feed_pct), ',', '.')::numeric end as feed_pct,
    case when replace(trim(pl_current), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(pl_current), ',', '.')::numeric end as pl_current,

    (case when trim(bt_in_target) ~ '^-?\\d+$' then trim(bt_in_target)::int end) as bt_in_target,

    case when replace(trim(bath_tap), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(bath_tap), ',', '.')::numeric end as bath_tap,
    case when replace(trim(bath_charge), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(bath_charge), ',', '.')::numeric end as bath_charge,
    case when replace(trim(anode_reset), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(anode_reset), ',', '.')::numeric end as anode_reset,
    case when replace(trim(nipple_kg), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(nipple_kg), ',', '.')::numeric end as nipple_kg,
    case when replace(trim(c_tapping), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(c_tapping), ',', '.')::numeric end as c_tapping,
    case when replace(trim(meji), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(meji), ',', '.')::numeric end as meji,
    case when replace(trim(frozen_bath), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(frozen_bath), ',', '.')::numeric end as frozen_bath,
    case when replace(trim(bath_powder), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(bath_powder), ',', '.')::numeric end as bath_powder,
    case when replace(trim(return_crust), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(return_crust), ',', '.')::numeric end as return_crust,
    case when replace(trim(dross_trp), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(dross_trp), ',', '.')::numeric end as dross_trp,
    case when replace(trim(bbar_miring), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(bbar_miring), ',', '.')::numeric end as bbar_miring,
    case when replace(trim(belly_helly), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(belly_helly), ',', '.')::numeric end as belly_helly,
    case when replace(trim(temp_ac), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(temp_ac), ',', '.')::numeric end as temp_ac,
    case when replace(trim(metal_scrap), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(metal_scrap), ',', '.')::numeric end as metal_scrap,
    case when replace(trim(metal_ball), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(metal_ball), ',', '.')::numeric end as metal_ball,
    case when replace(trim(soda_ash), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(soda_ash), ',', '.')::numeric end as soda_ash,
    case when replace(trim(break_sp), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(break_sp), ',', '.')::numeric end as break_sp,
    case when replace(trim(break_local), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(break_local), ',', '.')::numeric end as break_local,

    case when replace(trim(nipple_freq), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(nipple_freq), ',', '.')::numeric end as nipple_freq,
    case when replace(trim(broke_anode_kg), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(broke_anode_kg), ',', '.')::numeric end as broke_anode_kg,
    case when replace(trim(broke_anode_freq), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(broke_anode_freq), ',', '.')::numeric end as broke_anode_freq,
    case when replace(trim(rwb_kg), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(rwb_kg), ',', '.')::numeric end as rwb_kg,
    case when replace(trim(rwb_freq), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(rwb_freq), ',', '.')::numeric end as rwb_freq,

    case when replace(trim(fe), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(fe), ',', '.')::numeric end as fe,
    case when replace(trim(si), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(si), ',', '.')::numeric end as si,
    case when replace(trim(sa), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(sa), ',', '.')::numeric end as sa,
    case when replace(trim(caf2), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(caf2), ',', '.')::numeric end as caf2,
    case when replace(trim(s1a), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(s1a), ',', '.')::numeric end as s1a,
    case when replace(trim(s1b), ',', '.') ~ '^-?\\d+(\\.\\d+)?$'
      then replace(trim(s1b), ',', '.')::numeric end as s1b,

    (case when trim(sa_in_target) ~ '^-?\\d+$' then trim(sa_in_target)::int end) as sa_in_target,
    (case when trim(tacb) ~ '^-?\\d+$' then trim(tacb)::int end) as tacb,
    (case when trim(kerak_kg) ~ '^-?\\d+$' then trim(kerak_kg)::int end) as kerak_kg,
    (case when trim(kerak_freq) ~ '^-?\\d+$' then trim(kerak_freq)::int end) as kerak_freq,
    (case when trim(beto) ~ '^-?\\d+$' then trim(beto)::int end) as beto,
    (case when trim(tebl) ~ '^-?\\d+$' then trim(tebl)::int end) as tebl,
    (case when trim(jf) ~ '^-?\\d+$' then trim(jf)::int end) as jf,
    (case when trim(mix_welding) ~ '^-?\\d+$' then trim(mix_welding)::int end) as mix_welding,
    (case when trim(ba_clad) ~ '^-?\\d+$' then trim(ba_clad)::int end) as ba_clad,
    (case when trim(n_bulat) ~ '^-?\\d+$' then trim(n_bulat)::int end) as n_bulat,
    (case when trim(rod_rj) ~ '^-?\\d+$' then trim(rod_rj)::int end) as rod_rj,
    (case when trim(fe_charge) ~ '^-?\\d+$' then trim(fe_charge)::int end) as fe_charge,
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
"""

SQL_RAW_TO_MART = """
begin;

-- A) pot_params_daily
truncate table mart.pot_params_daily;

insert into mart.pot_params_daily
select *
from raw.pot_daily d
where d.pot_id is not null
  and d.date is not null;

-- B) pot_latest_snapshot (latest per pot + flag global latest date)
truncate table mart.pot_latest_snapshot;

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
insert into mart.pot_latest_snapshot (pot_id, potline_id, date, ce, status, updated_at)
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
"""

def seed_process():
    print("Starting ETL Process...")

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found!")
        return

    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    engine = create_engine(db_url)

    # 1. STG -> RAW
    print("Running STG -> RAW Transformation...")
    with engine.begin() as conn:
        conn.execute(text(SQL_STG_TO_RAW))

    # 2. RAW -> MART
    print("Running RAW -> MART Tranformation...")
    with engine.begin() as conn:
        conn.execute(text(SQL_RAW_TO_MART))

    print("ETL Data Processing Complete.")

    # 3. Predictions
    try:
        run_daily_predictions()
    except Exception as e:
        print(f"Prediction Error: {e}")
        import traceback

        traceback.print_exc()

if __name__ == "__main__":
    seed_process()
