from app.core.recommendation_engine import RecommendationEngine

def test_check_status_bt_low():
    limits = RecommendationEngine.get_limits(1)

    row = {
        "bt": 940
    }

    status = RecommendationEngine.check_status(row, limits)

    assert status["BT_LOW"] is True
    assert status["BT_HIGH"] is False