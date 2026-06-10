import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.recommendation_engine import RecommendationEngine


def test_r1_recommendation():
    """
    AE High + OA Low => R1
    """

    row = {
        "pot_id": 101,
        "oa": 10,
        "aef": 0.7,
        "ae_dur": 250,
        "bt": 950
    }

    recs = RecommendationEngine.generate_recommendations(row)

    codes = [r["code"] for r in recs]

    assert "R1" in codes


def test_r5_recommendation():
    """
    BT Low => R5
    """

    row = {
        "pot_id": 101,
        "bt": 930
    }

    recs = RecommendationEngine.generate_recommendations(row)

    codes = [r["code"] for r in recs]

    assert "R5" in codes


def test_r6_recommendation():
    """
    BT High => R6
    """

    row = {
        "pot_id": 101,
        "bt": 980
    }

    recs = RecommendationEngine.generate_recommendations(row)

    codes = [r["code"] for r in recs]

    assert "R6" in codes


def test_r7_recommendation():
    """
    Noise High => R7
    """

    row = {
        "pot_id": 101,
        "noise": 150
    }

    recs = RecommendationEngine.generate_recommendations(row)

    codes = [r["code"] for r in recs]

    assert "R7" in codes


def test_r16_priority():
    """
    Metal level abnormal => R16
    dan harus menjadi prioritas pertama
    """

    row = {
        "pot_id": 101,
        "m": 22
    }

    recs = RecommendationEngine.generate_recommendations(row)

    assert recs[0]["code"] == "R16"
    assert recs[0]["priority"] == 0