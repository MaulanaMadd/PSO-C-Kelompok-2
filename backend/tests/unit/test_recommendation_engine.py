"""
tests/unit/test_recommendation_engine.py

Unit test untuk RecommendationEngine di app/core/recommendation_engine.py.
Tidak butuh DB atau server — murni logic testing.
"""

from app.core.recommendation_engine import RecommendationEngine

# ============================================================
# Helpers
# ============================================================


def _limits_pl1():
    return RecommendationEngine.get_limits(1)


def _limits_pl2():
    return RecommendationEngine.get_limits(2)


# ============================================================
# get_potline_from_id
# ============================================================


class TestGetPotlineFromId:
    def test_potline1_range_lower(self):
        assert RecommendationEngine.get_potline_from_id(101) == 1

    def test_potline1_range_upper(self):
        assert RecommendationEngine.get_potline_from_id(285) == 1

    def test_potline3_range_lower(self):
        assert RecommendationEngine.get_potline_from_id(501) == 3

    def test_potline3_range_upper(self):
        assert RecommendationEngine.get_potline_from_id(685) == 3

    def test_unknown_returns_default(self):
        assert RecommendationEngine.get_potline_from_id(999) == 2

    def test_zero_returns_default(self):
        assert RecommendationEngine.get_potline_from_id(0) == 2


# ============================================================
# get_limits
# ============================================================


class TestGetLimits:
    def test_returns_dict(self):
        limits = RecommendationEngine.get_limits(1)
        assert isinstance(limits, dict)

    def test_potline1_has_required_keys(self):
        limits = RecommendationEngine.get_limits(1)
        required_keys = [
            "BT_MIN",
            "BT_MAX",
            "AED_MAX",
            "AVV_MAX",
            "NOISE_MAX",
            "OA_MIN",
            "OA_MAX",
            "AEF_MAX",
            "SA_MIN",
            "SA_MAX",
            "PL_CURRENT_SP",
            "M_MIN",
            "M_MAX",
        ]
        for key in required_keys:
            assert key in limits, f"Key '{key}' missing from limits"

    def test_potline3_same_as_potline1(self):
        limits_1 = RecommendationEngine.get_limits(1)
        limits_3 = RecommendationEngine.get_limits(3)
        assert limits_1 == limits_3

    def test_potline2_different_bt_min(self):
        limits_1 = RecommendationEngine.get_limits(1)
        limits_2 = RecommendationEngine.get_limits(2)
        assert limits_2["BT_MIN"] > limits_1["BT_MIN"]

    def test_potline2_different_avv_max(self):
        limits_1 = RecommendationEngine.get_limits(1)
        limits_2 = RecommendationEngine.get_limits(2)
        assert limits_2["AVV_MAX"] < limits_1["AVV_MAX"]

    def test_bt_min_less_than_bt_max(self):
        for pl in [1, 2, 3]:
            limits = RecommendationEngine.get_limits(pl)
            assert limits["BT_MIN"] < limits["BT_MAX"]

    def test_m_min_less_than_m_max(self):
        for pl in [1, 2, 3]:
            limits = RecommendationEngine.get_limits(pl)
            assert limits["M_MIN"] < limits["M_MAX"]

    def test_numeric_values(self):
        limits = RecommendationEngine.get_limits(1)
        for key, val in limits.items():
            assert isinstance(val, (int, float)), f"Key '{key}' is not numeric"


# ============================================================
# check_status
# ============================================================


class TestCheckStatus:
    def test_returns_dict(self):
        limits = _limits_pl1()
        status = RecommendationEngine.check_status({"bt": 960}, limits)
        assert isinstance(status, dict)

    def test_empty_row_returns_dict(self):
        limits = _limits_pl1()
        status = RecommendationEngine.check_status({}, limits)
        assert isinstance(status, dict)

    def test_none_values_handled(self):
        limits = _limits_pl1()
        status = RecommendationEngine.check_status({"bt": None, "oa": None}, limits)
        assert isinstance(status, dict)
        # bt=None → BT_LOW/HIGH=False
        assert status["BT_LOW"] is False
        assert status["BT_HIGH"] is False

    # --- Bath Temperature ---
    def test_bt_low(self):
        limits = _limits_pl1()
        # limits['BT_MIN'] = 945
        status = RecommendationEngine.check_status({"bt": 940}, limits)
        assert status["BT_LOW"] is True
        assert status["BT_HIGH"] is False
        assert status["BT_OK"] is False

    def test_bt_high(self):
        limits = _limits_pl1()
        # limits['BT_MAX'] = 965
        status = RecommendationEngine.check_status({"bt": 970}, limits)
        assert status["BT_HIGH"] is True
        assert status["BT_LOW"] is False
        assert status["BT_OK"] is False

    def test_bt_ok(self):
        limits = _limits_pl1()
        status = RecommendationEngine.check_status({"bt": 955}, limits)
        assert status["BT_OK"] is True
        assert status["BT_LOW"] is False
        assert status["BT_HIGH"] is False

    def test_bt_at_min_boundary(self):
        limits = _limits_pl1()
        # BT_MIN = 945, strict '<' so 945 is NOT low
        status = RecommendationEngine.check_status({"bt": 945}, limits)
        assert status["BT_LOW"] is False

    def test_bt_just_below_min(self):
        limits = _limits_pl1()
        status = RecommendationEngine.check_status({"bt": 944}, limits)
        assert status["BT_LOW"] is True

    # --- Metal Level (M) ---
    def test_m_low(self):
        limits = _limits_pl1()
        # M_MIN = 23, rule: m <= 23 is LOW
        status = RecommendationEngine.check_status({"m": 23}, limits)
        assert status["M_LOW"] is True

    def test_m_high(self):
        limits = _limits_pl1()
        # M_MAX = 27, rule: m >= 27 is HIGH
        status = RecommendationEngine.check_status({"m": 27}, limits)
        assert status["M_HIGH"] is True

    def test_m_ok(self):
        limits = _limits_pl1()
        status = RecommendationEngine.check_status({"m": 25}, limits)
        assert status["M_OK"] is True
        assert status["M_LOW"] is False
        assert status["M_HIGH"] is False

    # --- AE ---
    def test_aef_high(self):
        limits = _limits_pl1()
        # AEF_MAX = 0.5
        status = RecommendationEngine.check_status({"aef": 0.6}, limits)
        assert status["AEF_HIGH"] is True
        assert status["AE_HIGH"] is True

    def test_ae_kwh_positive_triggers_ae_high(self):
        limits = _limits_pl1()
        status = RecommendationEngine.check_status({"ae_kwh": 10}, limits)
        assert status["AE_HIGH"] is True

    def test_ae_zero_not_high(self):
        limits = _limits_pl1()
        status = RecommendationEngine.check_status(
            {"aef": 0, "ae_dur": 0, "ae_kwh": 0}, limits
        )
        assert status["AE_HIGH"] is False

    # --- AVV ---
    def test_avv_high(self):
        limits = _limits_pl1()
        # AVV_MAX = 4.5
        status = RecommendationEngine.check_status({"avv": 4.6}, limits)
        assert status["AVV_HIGH"] is True

    def test_avv_ok(self):
        limits = _limits_pl1()
        status = RecommendationEngine.check_status({"avv": 4.2}, limits)
        assert status["AVV_HIGH"] is False
        assert status["AVV_OK"] is True

    # --- OA (Alumina Overhead) ---
    def test_oa_low(self):
        limits = _limits_pl1()
        # OA_MIN = 12
        status = RecommendationEngine.check_status({"oa": 10}, limits)
        assert status["OA_LOW"] is True

    def test_oa_high(self):
        limits = _limits_pl1()
        # OA_MAX = 20
        status = RecommendationEngine.check_status({"oa": 22}, limits)
        assert status["OA_HIGH"] is True

    # --- Feed ---
    def test_feed_low(self):
        limits = _limits_pl1()
        status = RecommendationEngine.check_status({"feed_pct": 85}, limits)
        assert status["FEED_LOW"] is True

    def test_feed_ok(self):
        limits = _limits_pl1()
        status = RecommendationEngine.check_status({"feed_pct": 100}, limits)
        assert status["FEED_OK"] is True

    # --- Noise ---
    def test_noise_high(self):
        limits = _limits_pl1()
        # NOISE_MAX = 100
        status = RecommendationEngine.check_status({"noise": 110}, limits)
        assert status["NOISE_HIGH"] is True

    def test_noise_ok(self):
        limits = _limits_pl1()
        status = RecommendationEngine.check_status({"noise": 80}, limits)
        assert status["NOISE_OK"] is True

    # --- Freeze Indication ---
    def test_freeze_indicator_frozen_bath(self):
        limits = _limits_pl1()
        status = RecommendationEngine.check_status({"frozen_bath": 1}, limits)
        assert status["FREEZE_IND"] is True

    def test_freeze_indicator_off(self):
        limits = _limits_pl1()
        status = RecommendationEngine.check_status(
            {"frozen_bath": 0, "bath_powder": 0}, limits
        )
        assert status["FREEZE_IND"] is False

    # --- Setpoint Drift ---
    def test_setpoint_drift_detected(self):
        limits = _limits_pl1()
        status = RecommendationEngine.check_status({"osp": 5.0, "psp": 4.0}, limits)
        assert status["SETPOINT_DRIFT"] is True

    def test_no_setpoint_drift(self):
        limits = _limits_pl1()
        status = RecommendationEngine.check_status({"osp": 4.2, "psp": 4.2}, limits)
        assert status["SETPOINT_DRIFT"] is False

    # --- SA (Superheat) ---
    def test_sa_out_low(self):
        limits = _limits_pl1()
        # SA_MIN = 8
        status = RecommendationEngine.check_status({"sa": 5}, limits)
        assert status["SA_OUT"] is True
        assert status["SA_OK"] is False

    def test_sa_out_high(self):
        limits = _limits_pl1()
        # SA_MAX = 12
        status = RecommendationEngine.check_status({"sa": 15}, limits)
        assert status["SA_OUT"] is True


# ============================================================
# generate_recommendations
# ============================================================


class TestGenerateRecommendations:
    def test_returns_list(self):
        row = {"pot_id": 150, "potline_id": 1, "bt": 960}
        result = RecommendationEngine.generate_recommendations(row)
        assert isinstance(result, list)

    def test_all_ok_returns_empty_or_minimal(self):
        row = {
            "pot_id": 150,
            "potline_id": 1,
            "bt": 955,
            "avv": 4.2,
            "noise": 70,
            "oa": 16,
            "feed_pct": 100,
            "aef": 0.1,
            "ae_dur": 0,
            "ae_kwh": 0,
            "sa": 10,
            "caf2": 4,
            "m": 25,
            "osp": 4.2,
            "psp": 4.2,
        }
        result = RecommendationEngine.generate_recommendations(row)
        # Tidak ada kondisi abnormal → list kosong atau minimal
        assert isinstance(result, list)
        assert len(result) == 0

    def test_bt_low_generates_r5(self):
        row = {
            "pot_id": 150,
            "potline_id": 1,
            "bt": 930,  # sangat rendah
            "avv": 4.2,
            "noise": 70,
            "oa": 16,
            "feed_pct": 100,
            "aef": 0,
            "ae_dur": 0,
            "ae_kwh": 0,
        }
        result = RecommendationEngine.generate_recommendations(row)
        codes = [r["code"] for r in result]
        assert "R5" in codes

    def test_ae_high_oa_low_generates_r1(self):
        row = {
            "pot_id": 150,
            "potline_id": 1,
            "bt": 955,
            "aef": 0.8,
            "ae_dur": 300,
            "ae_kwh": 50,
            "oa": 5,  # OA rendah
        }
        result = RecommendationEngine.generate_recommendations(row)
        codes = [r["code"] for r in result]
        assert "R1" in codes

    def test_m_deviation_generates_r16(self):
        row = {"pot_id": 150, "potline_id": 1, "m": 20}  # M sangat rendah
        result = RecommendationEngine.generate_recommendations(row)
        codes = [r["code"] for r in result]
        assert "R16" in codes

    def test_recommendations_sorted_by_priority(self):
        row = {
            "pot_id": 150,
            "potline_id": 1,
            "bt": 930,
            "aef": 0.8,
            "ae_dur": 300,
            "oa": 5,
            "noise": 120,
            "sa": 15,
        }
        result = RecommendationEngine.generate_recommendations(row)
        priorities = [r["priority"] for r in result]
        assert priorities == sorted(priorities)

    def test_recommendation_has_required_fields(self):
        row = {
            "pot_id": 150,
            "potline_id": 1,
            "bt": 930,
        }
        result = RecommendationEngine.generate_recommendations(row)
        if result:
            rec = result[0]
            assert "code" in rec
            assert "diagnosis" in rec
            assert "actions" in rec
            assert "priority" in rec
            assert "impact" in rec

    def test_alf3_zero_run_detected_from_history(self):
        row = {"pot_id": 150, "potline_id": 1, "bt": 955}
        history = [
            {"alf3": 0},
            {"alf3": 0},
            {"alf3": 0},
        ]
        result = RecommendationEngine.generate_recommendations(
            row, history_rows=history
        )
        codes = [r["code"] for r in result]
        assert "R13" in codes

    def test_alf3_spike_detected_from_history(self):
        row = {"pot_id": 150, "potline_id": 1, "bt": 955}
        history = [
            {"alf3": 100},
            {"alf3": 90},
            {"alf3": 85},
        ]
        result = RecommendationEngine.generate_recommendations(
            row, history_rows=history
        )
        codes = [r["code"] for r in result]
        assert "R14" in codes

    def test_potline_inferred_from_pot_id(self):
        """Jika potline_id tidak ada di row, harus di-infer dari pot_id."""
        row = {"pot_id": 150}  # pot_id 150 → potline 1 (101-285)
        result = RecommendationEngine.generate_recommendations(row)
        assert isinstance(result, list)

    def test_empty_row_no_crash(self):
        """Row kosong tidak boleh crash."""
        result = RecommendationEngine.generate_recommendations({})
        assert isinstance(result, list)
