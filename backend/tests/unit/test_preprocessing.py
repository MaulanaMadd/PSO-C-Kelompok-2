"""
tests/unit/test_preprocessing.py

Unit test untuk ML preprocessing di app/ml/preprocessing.py.
"""

import numpy as np
import pandas as pd

from app.ml.preprocessing import (
    PipelineConfig,
    apply_static_feature_engineering,
    build_flags_episode,
    cast_specific_cats_to_string,
    drop_initial_cols,
    drop_redundant_after_flags,
    rolling_slope,
    safe_div,
)

# ============================================================
# safe_div
# ============================================================


class TestSafeDiv:
    def test_normal_division(self):
        result = safe_div(10.0, 2.0)
        # eps=1e-6 → result ≈ 10 / 2.000001 ≈ 4.9999975
        assert abs(result - 5.0) < 0.01

    def test_zero_denominator_no_zero_division(self):
        result = safe_div(10.0, 0)
        assert not np.isnan(result)
        assert not np.isinf(result)
        assert result > 1_000_000  # 10 / 1e-6 = 10_000_000

    def test_custom_eps(self):
        result = safe_div(5.0, 0.1, eps=0.05)
        # 5 / (0.1 + 0.05) = 5 / 0.15 ≈ 33.33
        assert abs(result - 33.33) < 0.1

    def test_negative_numerator(self):
        result = safe_div(-10.0, 2.0)
        assert result < 0

    def test_both_zero(self):
        result = safe_div(0, 0)
        assert not np.isnan(result)
        # 0 / eps = 0
        assert abs(result) < 1

    def test_large_numbers(self):
        result = safe_div(1e10, 1e5)
        assert abs(result - 1e5) < 1

    def test_series_input(self):
        a = pd.Series([10.0, 20.0, 30.0])
        b = pd.Series([2.0, 4.0, 5.0])
        result = safe_div(a, b)
        assert isinstance(result, pd.Series)
        assert len(result) == 3


# ============================================================
# rolling_slope
# ============================================================


class TestRollingSlope:
    def test_ascending_linear_series(self):
        series = pd.Series([1.0, 2.0, 3.0, 4.0, 5.0])
        slope = rolling_slope(series)
        assert isinstance(slope, (float, np.floating))
        assert abs(slope - 1.0) < 0.01  # slope = 1

    def test_descending_linear_series(self):
        series = pd.Series([5.0, 4.0, 3.0, 2.0, 1.0])
        slope = rolling_slope(series)
        assert slope < 0

    def test_constant_series_zero_slope(self):
        series = pd.Series([5.0, 5.0, 5.0, 5.0, 5.0])
        slope = rolling_slope(series)
        assert abs(slope) < 0.001

    def test_series_with_nan_returns_nan(self):
        series = pd.Series([1.0, 2.0, np.nan, 4.0, 5.0])
        slope = rolling_slope(series)
        assert pd.isna(slope)

    def test_single_value(self):
        """Single-point series may raise LinAlgError or return nan — both acceptable."""
        import numpy as np

        series = pd.Series([5.0])
        try:
            slope = rolling_slope(series)
            # If it doesn't raise, should be float or nan
            assert isinstance(slope, (float, int, np.floating)) or pd.isna(slope)
        except (np.linalg.LinAlgError, ValueError):
            # Acceptable — polyfit can't fit a line to a single point
            pass

    def test_two_values(self):
        series = pd.Series([1.0, 3.0])
        slope = rolling_slope(series)
        assert abs(slope - 2.0) < 0.01

    def test_steep_positive_slope(self):
        series = pd.Series([0.0, 10.0, 20.0, 30.0, 40.0])
        slope = rolling_slope(series)
        assert abs(slope - 10.0) < 0.1


# ============================================================
# drop_initial_cols
# ============================================================


class TestDropInitialCols:
    def test_removes_fe_charge(self):
        df = pd.DataFrame({"fe_charge": [1, 2], "other": [3, 4]})
        result = drop_initial_cols(df)
        assert "fe_charge" not in result.columns

    def test_removes_n_bulat(self):
        df = pd.DataFrame({"n_bulat": [1, 2], "bt": [950, 960]})
        result = drop_initial_cols(df)
        assert "n_bulat" not in result.columns

    def test_preserves_other_columns(self):
        df = pd.DataFrame({"fe_charge": [1], "bt": [950], "ce": [95]})
        result = drop_initial_cols(df)
        assert "bt" in result.columns
        assert "ce" in result.columns

    def test_removes_dup_val_cols(self):
        dup_cols = ["fe", "si", "sa", "caf2", "sa_in_target", "s1a", "s1b"]
        df = pd.DataFrame({c: [1.0] for c in dup_cols + ["bt"]})
        result = drop_initial_cols(df)
        for col in dup_cols:
            assert col not in result.columns

    def test_no_error_if_col_absent(self):
        """Tidak crash jika kolom yang perlu di-drop tidak ada."""
        df = pd.DataFrame({"bt": [950, 960], "ce": [95, 96]})
        result = drop_initial_cols(df)
        assert "bt" in result.columns

    def test_does_not_modify_original(self):
        df = pd.DataFrame({"fe_charge": [1, 2], "bt": [950, 960]})
        original_cols = list(df.columns)
        _ = drop_initial_cols(df)
        assert list(df.columns) == original_cols

    def test_removes_multiple_extra_cols(self):
        df = pd.DataFrame(
            {
                "fe_charge": [1],
                "n_bulat": [2],
                "rod_rj": [3],
                "mix_welding": [0],
                "ba_clad": [0],
                "jf": [0],
                "kerak_kg": [10],
                "kerak_freq": [2],
                "tebl": [0],
                "beto": [0],
                "tacb": [0],
                "bt": [950],
            }
        )
        result = drop_initial_cols(df)
        assert "bt" in result.columns
        for col in ["fe_charge", "n_bulat", "rod_rj", "mix_welding"]:
            assert col not in result.columns


# ============================================================
# cast_specific_cats_to_string
# ============================================================


class TestCastSpecificCatsToString:
    def test_potnum_cast_to_string(self):
        df = pd.DataFrame({"potnum": [1, 2, 3]})
        result = cast_specific_cats_to_string(df)
        assert result["potnum"].dtype.name in ("string", "object", "string[python]")

    def test_class_cast_to_string(self):
        df = pd.DataFrame({"class": ["A", "B", "C"]})
        result = cast_specific_cats_to_string(df)
        assert result["class"].dtype.name in ("string", "object", "string[python]")

    def test_tshift_cast_to_string(self):
        df = pd.DataFrame({"tshift": [1, 2, 3]})
        result = cast_specific_cats_to_string(df)
        assert result["tshift"].dtype.name in ("string", "object", "string[python]")

    def test_non_cat_cols_unchanged(self):
        df = pd.DataFrame({"bt": [950.0, 960.0], "potnum": [1, 2]})
        result = cast_specific_cats_to_string(df)
        assert result["bt"].dtype == np.float64

    def test_no_crash_if_col_absent(self):
        """Tidak crash jika kolom kategorikal tidak ada."""
        df = pd.DataFrame({"bt": [950, 960]})
        result = cast_specific_cats_to_string(df)
        assert "bt" in result.columns

    def test_does_not_modify_original(self):
        df = pd.DataFrame({"potnum": [1, 2]})
        original_dtype = df["potnum"].dtype
        _ = cast_specific_cats_to_string(df)
        assert df["potnum"].dtype == original_dtype

    def test_multiple_cat_cols_cast(self):
        df = pd.DataFrame(
            {
                "potnum": [1, 2],
                "class": ["A", "B"],
                "tshift": [1, 2],
                "mt_shift": [1, 2],
            }
        )
        result = cast_specific_cats_to_string(df)
        for col in ["potnum", "class", "tshift", "mt_shift"]:
            assert result[col].dtype.name in ("string", "object", "string[python]")


# ============================================================
# build_flags_episode
# ============================================================


class TestBuildFlagsEpisode:
    def _make_df(self, potdays, potnums=None, metals=None, ces=None, leaks=None):
        n = len(potdays)
        if potnums is None:
            potnums = ["P1"] * n
        if metals is None:
            metals = [500] * n
        if ces is None:
            ces = [95] * n
        return pd.DataFrame(
            {
                "potnum": potnums,
                "tgl": pd.date_range("2024-01-01", periods=n).strftime("%Y-%m-%d"),
                "potday": potdays,
                "metal_kg": metals,
                "ce": ces,
                "metal_leak": leaks if leaks else [0] * n,
            }
        )

    def test_pot_active_created(self):
        df = self._make_df([1.0, 1.0])
        result = build_flags_episode(df, PipelineConfig())
        assert "pot_active" in result.columns

    def test_pot_active_1_for_potday_1(self):
        df = self._make_df([1.0, 1.0])
        result = build_flags_episode(df, PipelineConfig())
        assert all(result["pot_active"] == 1)

    def test_startup_flag_for_potday_0_5(self):
        df = self._make_df([0.5, 1.0])
        result = build_flags_episode(df, PipelineConfig())
        assert result["startup_flag"].iloc[0] == 1
        assert result["startup_flag"].iloc[1] == 0

    def test_idle_flag_for_potday_0(self):
        df = self._make_df([0.0, 1.0])
        result = build_flags_episode(df, PipelineConfig())
        assert result["idle_flag"].iloc[0] == 1

    def test_ce_valid_flag_true_when_active_metal_ce(self):
        df = self._make_df([1.0], metals=[500], ces=[95])
        result = build_flags_episode(df, PipelineConfig())
        assert bool(result["ce_valid_flag"].iloc[0]) is True

    def test_ce_valid_flag_false_when_metal_leak(self):
        df = self._make_df([1.0], leaks=[1])
        result = build_flags_episode(df, PipelineConfig())
        assert bool(result["ce_valid_flag"].iloc[0]) is False

    def test_episode_column_created(self):
        df = self._make_df([1.0, 1.0])
        result = build_flags_episode(df, PipelineConfig())
        assert "episode" in result.columns

    def test_sorted_by_date(self):
        df = pd.DataFrame(
            {
                "potnum": ["P1", "P1"],
                "tgl": ["2024-01-02", "2024-01-01"],  # reversed
                "potday": [1.0, 1.0],
                "metal_kg": [500, 500],
                "ce": [95, 96],
                "metal_leak": [0, 0],
            }
        )
        result = build_flags_episode(df, PipelineConfig())
        # Should be sorted by date ascending
        dates = pd.to_datetime(result["tgl"])
        assert dates.is_monotonic_increasing


# ============================================================
# drop_redundant_after_flags
# ============================================================


class TestDropRedundantAfterFlags:
    def test_removes_ce(self):
        df = pd.DataFrame({"ce": [95, 96], "bt": [950, 960]})
        result = drop_redundant_after_flags(df)
        assert "ce" not in result.columns

    def test_removes_potday(self):
        df = pd.DataFrame({"potday": [1.0, 1.0], "bt": [950, 960]})
        result = drop_redundant_after_flags(df)
        assert "potday" not in result.columns

    def test_removes_metal_leak(self):
        df = pd.DataFrame({"metal_leak": [0, 0], "bt": [950, 960]})
        result = drop_redundant_after_flags(df)
        assert "metal_leak" not in result.columns

    def test_preserves_other_cols(self):
        df = pd.DataFrame({"ce": [95], "bt": [950], "avv": [4.2]})
        result = drop_redundant_after_flags(df)
        assert "bt" in result.columns
        assert "avv" in result.columns


# ============================================================
# apply_static_feature_engineering
# ============================================================


class TestApplyStaticFeatureEngineering:
    def test_creates_ae_severity(self):
        df = pd.DataFrame({"aef": [0.5, 0.3], "ae_dur": [10, 5], "ae_kwh": [50, 20]})
        result = apply_static_feature_engineering(df)
        assert "ae_severity" in result.columns
        # ae_severity = aef * ae_dur + ae_kwh
        assert abs(result["ae_severity"].iloc[0] - (0.5 * 10 + 50)) < 0.01

    def test_creates_dross_ratio(self):
        df = pd.DataFrame({"dross": [50.0], "metal_kg": [500.0]})
        result = apply_static_feature_engineering(df)
        assert "dross_ratio" in result.columns

    def test_creates_dc_avv_ratio(self):
        df = pd.DataFrame({"dc": [100.0], "avv": [4.2]})
        result = apply_static_feature_engineering(df)
        assert "dc_avv_ratio" in result.columns

    def test_creates_noise_ratio(self):
        df = pd.DataFrame({"noise": [70.0], "avv": [4.2]})
        result = apply_static_feature_engineering(df)
        assert "noise_ratio" in result.columns

    def test_no_crash_with_empty_df(self):
        df = pd.DataFrame()
        result = apply_static_feature_engineering(df)
        assert isinstance(result, pd.DataFrame)

    def test_no_crash_with_missing_cols(self):
        df = pd.DataFrame({"bt": [950, 960]})
        result = apply_static_feature_engineering(df)
        assert "bt" in result.columns

    def test_does_not_modify_original(self):
        df = pd.DataFrame({"aef": [0.5], "ae_dur": [10], "ae_kwh": [50]})
        original_cols = list(df.columns)
        _ = apply_static_feature_engineering(df)
        assert list(df.columns) == original_cols


# ============================================================
# PipelineConfig
# ============================================================


class TestPipelineConfig:
    def test_default_values(self):
        cfg = PipelineConfig()
        assert cfg.id_col == "potnum"
        assert cfg.lags == (1, 2, 3)
        assert cfg.roll_windows == (3, 7)

    def test_custom_values(self):
        cfg = PipelineConfig(id_col="pot_id", lags=(1, 2))
        assert cfg.id_col == "pot_id"
        assert cfg.lags == (1, 2)

    def test_slope_cols_default(self):
        cfg = PipelineConfig()
        assert "bt" in cfg.slope_cols
        assert "noise" in cfg.slope_cols
