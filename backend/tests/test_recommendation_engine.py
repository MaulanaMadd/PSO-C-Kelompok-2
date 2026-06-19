import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.recommendation_engine import RecommendationEngine


# =========================
# AE RULES
# =========================


def test_r1_recommendation():
    row = {"pot_id": 101, "oa": 10, "aef": 0.7, "ae_dur": 250, "bt": 950}

    recs = RecommendationEngine.generate_recommendations(row)

    codes = [r["code"] for r in recs]

    assert "R1" in codes


def test_r2_recommendation():
    row = {"pot_id": 101, "oa": 15, "aef": 0.7, "bt": 930}

    recs = RecommendationEngine.generate_recommendations(row)

    codes = [r["code"] for r in recs]

    assert "R2" in codes


def test_r3_recommendation():
    row = {"pot_id": 101, "aef": 0.7, "feed_pct": 80}

    recs = RecommendationEngine.generate_recommendations(row)

    codes = [r["code"] for r in recs]

    assert "R3" in codes


def test_r4_recommendation():
    row = {"pot_id": 101, "aef": 0.7, "noise": 150}

    recs = RecommendationEngine.generate_recommendations(row)

    codes = [r["code"] for r in recs]

    assert "R4" in codes


# =========================
# THERMAL RULES
# =========================


def test_r5_recommendation():
    row = {"pot_id": 101, "bt": 930}

    recs = RecommendationEngine.generate_recommendations(row)

    codes = [r["code"] for r in recs]

    assert "R5" in codes


def test_r6_recommendation():
    row = {"pot_id": 101, "bt": 980}

    recs = RecommendationEngine.generate_recommendations(row)

    codes = [r["code"] for r in recs]

    assert "R6" in codes


# =========================
# STABILITY RULES
# =========================


def test_r7_recommendation():
    row = {"pot_id": 101, "noise": 150}

    recs = RecommendationEngine.generate_recommendations(row)

    codes = [r["code"] for r in recs]

    assert "R7" in codes


# =========================
# ELECTRICAL RULES
# =========================


def test_r8_recommendation():
    row = {"pot_id": 101, "avv": 4.8}

    recs = RecommendationEngine.generate_recommendations(row)

    codes = [r["code"] for r in recs]

    assert "R8" in codes


def test_r9_recommendation():
    row = {"pot_id": 101, "pl_current": 210}

    recs = RecommendationEngine.generate_recommendations(row)

    codes = [r["code"] for r in recs]

    assert "R9" in codes


def test_r10_recommendation():
    row = {"pot_id": 101, "osp": 5.5, "psp": 4.0}

    recs = RecommendationEngine.generate_recommendations(row)

    codes = [r["code"] for r in recs]

    assert "R10" in codes


# =========================
# CHEMISTRY RULES
# =========================


def test_r11_recommendation():
    row = {"pot_id": 101, "sa": 15}

    recs = RecommendationEngine.generate_recommendations(row)

    codes = [r["code"] for r in recs]

    assert "R11" in codes


def test_r12_recommendation():
    row = {"pot_id": 101, "caf2": 8}

    recs = RecommendationEngine.generate_recommendations(row)

    codes = [r["code"] for r in recs]

    assert "R12" in codes


def test_r13_recommendation():
    row = {"pot_id": 101}

    history = [{"alf3": 0}, {"alf3": 0}, {"alf3": 0}]

    recs = RecommendationEngine.generate_recommendations(row, history)

    codes = [r["code"] for r in recs]

    assert "R13" in codes


def test_r14_recommendation():
    row = {"pot_id": 101}

    history = [{"alf3": 100}, {"alf3": 100}, {"alf3": 100}]

    recs = RecommendationEngine.generate_recommendations(row, history)

    codes = [r["code"] for r in recs]

    assert "R14" in codes


# =========================
# FEEDING RULES
# =========================


def test_r15_recommendation():
    row = {"pot_id": 101, "feed_pct": 120, "bt": 930}

    recs = RecommendationEngine.generate_recommendations(row)

    codes = [r["code"] for r in recs]

    assert "R15" in codes


# =========================
# PRIORITY RULES
# =========================


def test_r16_priority():
    row = {"pot_id": 101, "m": 22}

    recs = RecommendationEngine.generate_recommendations(row)

    assert recs[0]["code"] == "R16"
    assert recs[0]["priority"] == 0
