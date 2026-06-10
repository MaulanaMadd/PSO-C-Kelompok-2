from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    db: str


class PotlinesResponse(BaseModel):
    potlines: List[int]


class PotsResponse(BaseModel):
    potline_id: Optional[int]
    pots: List[int]


class LayerLatestRow(BaseModel):
    pot_id: int
    potline_id: Optional[int]
    ts_5m: datetime

    avv: Optional[float] = None
    osp: Optional[float] = None
    noise: Optional[float] = None
    current: Optional[float] = None

    beam_pos: Optional[float] = None
    feed_pct: Optional[float] = None
    feed_state: Optional[str] = None

    bt: Optional[float] = None
    ce: Optional[float] = None
    m: Optional[float] = None
    aef: Optional[float] = None

    # New fields for Range Charts
    oa: Optional[float] = None
    osp: Optional[float] = None
    ov: Optional[float] = None
    pl_current: Optional[float] = None
    alf3: Optional[float] = None
    caf2: Optional[float] = None
    psp: Optional[float] = None
    ae_dur: Optional[float] = None
    age_day: Optional[int] = None

    # --- Comprehensive History Fields ---
    potday: Optional[float] = None
    gen: Optional[int] = None
    ctype: Optional[str] = None
    pot_status_code: Optional[int] = None
    transition: Optional[int] = None
    age_month: Optional[int] = None
    class_: Optional[int] = None  # 'class' is a reserved keyword
    pot_design: Optional[int] = None
    tshift: Optional[int] = None
    ac_schedule: Optional[int] = None
    mt_schedule: Optional[int] = None
    mt_shift: Optional[int] = None
    mt_day: Optional[int] = None
    metal_kg: Optional[float] = None
    dross: Optional[float] = None
    dc: Optional[float] = None
    metal_leak: Optional[float] = None
    group_current: Optional[float] = None
    cb: Optional[float] = None
    fd: Optional[float] = None
    aev: Optional[float] = None
    ae_kwh: Optional[float] = None
    mc: Optional[float] = None
    s: Optional[float] = None
    cd: Optional[float] = None
    mt_bb: Optional[float] = None
    bt_in_target: Optional[int] = None
    bath_tap: Optional[float] = None
    bath_charge: Optional[float] = None
    anode_reset: Optional[float] = None
    nipple_kg: Optional[float] = None
    c_tapping: Optional[float] = None
    meji: Optional[float] = None
    frozen_bath: Optional[float] = None
    bath_powder: Optional[float] = None
    return_crust: Optional[float] = None
    dross_trp: Optional[float] = None
    bbar_miring: Optional[float] = None
    belly_helly: Optional[float] = None
    temp_ac: Optional[float] = None
    metal_scrap: Optional[float] = None
    metal_ball: Optional[float] = None
    soda_ash: Optional[float] = None
    break_sp: Optional[float] = None
    break_local: Optional[float] = None
    nipple_freq: Optional[float] = None
    broke_anode_kg: Optional[float] = None
    broke_anode_freq: Optional[float] = None
    rwb_kg: Optional[float] = None
    rwb_freq: Optional[float] = None
    fe: Optional[float] = None
    si: Optional[float] = None
    sa: Optional[float] = None
    s1a: Optional[float] = None
    s1b: Optional[float] = None
    sa_in_target: Optional[int] = None
    tacb: Optional[int] = None
    kerak_kg: Optional[int] = None
    kerak_freq: Optional[int] = None
    beto: Optional[int] = None
    tebl: Optional[int] = None
    jf: Optional[int] = None
    mix_welding: Optional[int] = None
    ba_clad: Optional[int] = None
    n_bulat: Optional[int] = None
    rod_rj: Optional[int] = None
    fe_charge: Optional[int] = None


class LayerLatestResponse(BaseModel):
    potline_id: Optional[int]
    rows: List[LayerLatestRow]


class LayerRangeResponse(BaseModel):
    pot_id: int
    start: datetime
    end: datetime
    rows: List[LayerLatestRow]


class Log1hRow(BaseModel):
    ts_1h: datetime
    pot_id: int
    potline_id: Optional[int]

    avv_avg: Optional[float] = None
    osp_avg: Optional[float] = None
    noise_avg: Optional[float] = None
    current_avg: Optional[float] = None
    beam_pos_avg: Optional[float] = None
    feed_pct_avg: Optional[float] = None


class Log1hResponse(BaseModel):
    pot_id: int
    days: int
    rows: List[Log1hRow]


class DailyLatestRow(BaseModel):
    pot_id: int
    potline_id: Optional[int]
    date: date
    ts_5m: Optional[datetime] = None
    bt: Optional[float] = None
    ce: Optional[float] = None
    prev_ce: Optional[float] = None  # Add this for Last CE delta calculation
    m: Optional[float] = None
    aef: Optional[float] = None
    avv: Optional[float] = None
    noise: Optional[float] = None
    age_day: Optional[int] = None
    predicted_ce: Optional[float] = None
    yhat_lo: Optional[float] = None  # Confidence interval lower bound
    yhat_hi: Optional[float] = None  # Confidence interval upper bound
    potday: Optional[str] = None

    # New fields for Pot Detail Page
    feed_pct: Optional[float] = None
    oa: Optional[float] = None
    osp: Optional[float] = None
    ov: Optional[float] = None
    pl_current: Optional[float] = None
    alf3: Optional[float] = None
    caf2: Optional[float] = None

    # Logic fields
    psp: Optional[float] = None
    ae_dur: Optional[float] = None


class DailyLatestResponse(BaseModel):
    potline_id: Optional[int]
    rows: List[DailyLatestRow]


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str | None = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str | None = None
    phone: str | None = None
    role: str


class Token(BaseModel):
    access_token: str
    token_type: str


class KPIStandard(BaseModel):
    key: str
    label: str
    unit: Optional[str] = None
    min_val: Optional[float] = None
    target_val: Optional[float] = None
    max_val: Optional[float] = None
    updated_at: Optional[datetime] = None


class KPIStandardUpdate(BaseModel):
    key: str
    min_val: Optional[float] = None
    target_val: Optional[float] = None
    max_val: Optional[float] = None


class SettingsResponse(BaseModel):
    standards: List[KPIStandard]
