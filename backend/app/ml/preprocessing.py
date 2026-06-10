from dataclasses import dataclass
from typing import Tuple

import numpy as np
import pandas as pd


# =========================
# Utilities
# =========================
def safe_div(a, b, eps=1e-6):
    """Safe division to avoid divide by zero"""
    return a / (b + eps)


def rolling_slope(x: pd.Series) -> float:
    """Calculate slope using linear regression"""
    if x.isna().any():
        return np.nan
    return np.polyfit(range(len(x)), x, 1)[0]


# =========================
# Config
# =========================
@dataclass
class PipelineConfig:
    id_col: str = "potnum"
    missing_token: str = "__MISSING__"

    # window feature settings
    lags: Tuple[int, ...] = (1, 2, 3)
    roll_windows: Tuple[int, ...] = (3, 7)
    flag_count_window: int = 7
    slope_window: int = 7
    slope_cols: Tuple[str, ...] = ("ov", "noise", "ae_severity", "bt", "dc")


# =========================
# 1) DROP initial columns
# =========================
def drop_initial_cols(df: pd.DataFrame) -> pd.DataFrame:
    """Drop columns before casting and feature engineering"""
    df = df.copy()

    drop_extra = [
        "fe_charge",
        "n_bulat",
        "rod_rj",
        "mix_welding",
        "ba_clad",
        "jf",
        "kerak_kg",
        "kerak_freq",
        "tebl",
        "beto",
        "tacb",
    ]

    dup_val_col = ["fe", "si", "sa", "caf2", "sa_in_target", "s1a", "s1b"]

    df = df.drop(
        columns=[c for c in (drop_extra + dup_val_col) if c in df.columns],
        errors="ignore",
    )
    return df


# =========================
# 2) Cast categorical columns to string
# =========================
def cast_specific_cats_to_string(df: pd.DataFrame) -> pd.DataFrame:
    """Cast specific columns to string type"""
    df = df.copy()
    cat_cols = [
        "potnum",
        "class",
        "pot_design",
        "tshift",
        "mt_shift",
        "ctype",
        "pot_status",
        "transition",
        "potday",
    ]
    for c in cat_cols:
        if c in df.columns:
            df[c] = df[c].astype("string")
    return df


# =========================
# 3) Build flags, ce_event, and episode
# =========================
def build_flags_episode(df: pd.DataFrame, cfg: PipelineConfig) -> pd.DataFrame:
    """Create operational flags and episode segmentation"""
    df = df.copy()

    # Ensure tgl is datetime and sort
    df["tgl"] = pd.to_datetime(df["tgl"], errors="coerce")
    df = df.sort_values([cfg.id_col, "tgl"]).reset_index(drop=True)

    # Operational flags (handle "1.0", "1", 1.0, 1)
    # coerce to string first, then float, then check
    p_day_float = pd.to_numeric(df["potday"], errors="coerce")

    df["pot_active"] = (p_day_float == 1.0).astype(int)
    df["startup_flag"] = (p_day_float == 0.5).astype(int)
    df["shutdown_flag"] = (p_day_float == 0.4).astype(int)
    df["idle_flag"] = (p_day_float == 0.0).astype(int)

    # CE valid flag
    df["ce_valid_flag"] = (
        (df["pot_active"] == 1) & (df.get("metal_kg", 0) > 0) & (df.get("ce", 0) > 0)
    )

    if "metal_leak" in df.columns:
        df.loc[df["metal_leak"] == 1, "ce_valid_flag"] = False

    df["ce_event"] = np.where(df["ce_valid_flag"], df["ce"], np.nan)

    # Episode segmentation
    df["episode"] = (
        df.groupby(cfg.id_col)["pot_active"]
        .apply(lambda x: ((x == 1) & (x.shift(1) != 1)).cumsum())
        .reset_index(level=0, drop=True)
    )

    return df


# =========================
# 4) DROP redundant/no_variance after flags
# =========================
def drop_redundant_after_flags(df: pd.DataFrame) -> pd.DataFrame:
    """Drop columns that are no longer needed after flag creation"""
    df = df.copy()

    no_variance_col = ["pot_design", "tshift", "metal_leak"]
    redundant_col = ["ce", "potday"]  # Already encoded in flags

    cols_to_remove = no_variance_col + redundant_col
    df = df.drop(
        columns=[c for c in cols_to_remove if c in df.columns], errors="ignore"
    )
    return df


# =========================
# 5) Static feature engineering
# =========================
def apply_static_feature_engineering(df: pd.DataFrame) -> pd.DataFrame:
    """Create derived features from raw columns"""
    df = df.copy()

    # Voltage/current ratios
    if "dc" in df.columns and "avv" in df.columns:
        df["dc_avv_ratio"] = safe_div(df["dc"], df["avv"])

    # Voltage instability
    cols = [c for c in ["avv", "psp", "osp"] if c in df.columns]
    if len(cols) >= 2:
        df["voltage_instability"] = df[cols].std(axis=1)

    # Anode effect severity
    if all(c in df.columns for c in ["aef", "ae_dur", "ae_kwh"]):
        df["ae_severity"] = df["aef"] * df["ae_dur"] + df["ae_kwh"]

    # AE density
    if "aev" in df.columns and "age_day" in df.columns:
        df["ae_density"] = safe_div(df["aev"], (df["age_day"] + 1))

    # Bath temperature deviation per pot
    if "bt" in df.columns and "potnum" in df.columns:
        df["bt_deviation"] = df["bt"] - df.groupby("potnum")["bt"].transform("mean")

    # Chemical stress
    if "alf3_kg" in df.columns and "feed_pct" in df.columns:
        df["chem_stress"] = safe_div(df["alf3_kg"], (df["feed_pct"] + 0.01))

    # Metal production efficiency
    if "metal_kg" in df.columns and "age_day" in df.columns:
        df["metal_per_day"] = safe_div(df["metal_kg"], (df["age_day"] + 1))

    # Dross ratio
    if "dross" in df.columns and "metal_kg" in df.columns:
        df["dross_ratio"] = safe_div(df["dross"], (df["metal_kg"] + 1))

    # Structural damage score
    damage_cols = ["broke_anode_kg", "rwb_kg", "nipple_kg", "break_sp", "break_local"]
    exist_damage = [c for c in damage_cols if c in df.columns]
    if exist_damage:
        df["structural_damage_score"] = df[exist_damage].sum(axis=1)

    # Current mismatch
    if "pl_current" in df.columns and "group_current" in df.columns:
        df["current_mismatch"] = df["pl_current"] - df["group_current"]

    # DC per current
    if "dc" in df.columns and "group_current" in df.columns:
        df["dc_per_current"] = safe_div(df["dc"], (df["group_current"] + 1))

    # Voltage efficiency
    if "metal_kg" in df.columns and "dc" in df.columns:
        df["voltage_efficiency"] = safe_div(df["metal_kg"], (df["dc"] + 1))

    # Noise ratios
    if "noise" in df.columns and "avv" in df.columns:
        df["noise_ratio"] = safe_div(df["noise"], (df["avv"] + 1e-3))
    if "noise" in df.columns and "psp" in df.columns:
        df["noise_psp_ratio"] = safe_div(df["noise"], (df["psp"] + 1e-3))

    # AE energy ratio
    if "ae_kwh" in df.columns and "dc" in df.columns:
        df["ae_energy_ratio"] = safe_div(df["ae_kwh"], (df["dc"] + 1))

    # AE per age
    if "aef" in df.columns and "age_day" in df.columns:
        df["ae_per_age"] = safe_div(df["aef"], (df["age_day"] + 1))

    # BT absolute deviation
    if "bt_deviation" in df.columns:
        df["bt_abs_dev"] = df["bt_deviation"].abs()

    # BT out of target flag
    if "bt_in_target" in df.columns:
        df["bt_out_flag"] = (df["bt_in_target"] == 0).astype(int)

    # Thermal load
    if "bt" in df.columns and "group_current" in df.columns:
        df["thermal_load"] = df["bt"] * df["group_current"]

    # Feed intensity
    if "feed_pct" in df.columns and "group_current" in df.columns:
        df["feed_intensity"] = df["feed_pct"] * df["group_current"]

    # Charge balance
    if "bath_charge" in df.columns and "bath_tap" in df.columns:
        df["charge_balance"] = df["bath_charge"] - df["bath_tap"]

    # Scrap and ball ratios
    if "metal_scrap" in df.columns and "metal_kg" in df.columns:
        df["scrap_ratio"] = safe_div(df["metal_scrap"], (df["metal_kg"] + 1))

    if "metal_ball" in df.columns and "metal_kg" in df.columns:
        df["ball_ratio"] = safe_div(df["metal_ball"], (df["metal_kg"] + 1))

    # Break flags
    if ("break_sp" in df.columns) or ("break_local" in df.columns):
        b1 = df["break_sp"] if "break_sp" in df.columns else 0
        b2 = df["break_local"] if "break_local" in df.columns else 0
        df["any_break_flag"] = ((b1 > 0) | (b2 > 0)).astype(int)

    # Damage flag
    if "structural_damage_score" in df.columns:
        df["any_damage_flag"] = (df["structural_damage_score"] > 0).astype(int)

    return df


# =========================
# 6) Window features (lag/rolling/count/slope)
# =========================
def apply_window_features(df: pd.DataFrame, cfg: PipelineConfig) -> pd.DataFrame:
    """Create time-window based features with anti-leakage shift(1)"""
    df = df.copy()
    keys = [cfg.id_col, "episode"]

    # Columns to exclude from window features
    exclude_cols = [
        "ce_event",
        "ce_valid_flag",
        cfg.id_col,
        "episode",
        "tgl",
        "gen",
        "pot_active",
        "startup_flag",
        "shutdown_flag",
        "idle_flag",
        "age_day",
        "age_month",
        "mt_day",
    ]

    window_feature = [c for c in df.columns if c not in exclude_cols]
    window_feature = df[window_feature].select_dtypes(include="number").columns.tolist()

    # Lag features
    for col in window_feature:
        for l in cfg.lags:
            df[f"{col}_lag{l}"] = df.groupby(keys)[col].shift(l)

    # Rolling mean and std
    for col in window_feature:
        for w in cfg.roll_windows:
            df[f"{col}_roll{w}_mean"] = df.groupby(keys)[col].shift(1).rolling(w).mean()
            df[f"{col}_roll{w}_std"] = df.groupby(keys)[col].shift(1).rolling(w).std()

    # Flag count
    flag_cols = [c for c in window_feature if c.endswith("_flag")]
    for col in flag_cols:
        df[f"{col}_count{cfg.flag_count_window}"] = (
            df.groupby(keys)[col].shift(1).rolling(cfg.flag_count_window).sum()
        )

    # Slope/trend
    slope_cols = [c for c in cfg.slope_cols if c in df.columns]
    for col in slope_cols:
        df[f"{col}_trend{cfg.slope_window}"] = (
            df.groupby(keys)[col]
            .shift(1)
            .rolling(cfg.slope_window)
            .apply(rolling_slope, raw=False)
        )

    return df


# =========================
# 7) Main preprocessing function
# =========================
def preprocess_for_prediction(
    df: pd.DataFrame, cfg: PipelineConfig = None
) -> pd.DataFrame:
    """Apply full preprocessing pipeline to raw data"""
    if cfg is None:
        cfg = PipelineConfig()

    df = df.copy()

    # Step-by-step preprocessing
    df = drop_initial_cols(df)
    df = cast_specific_cats_to_string(df)
    df = build_flags_episode(df, cfg)
    df = drop_redundant_after_flags(df)
    df = apply_static_feature_engineering(df)
    df = apply_window_features(df, cfg)

    return df
