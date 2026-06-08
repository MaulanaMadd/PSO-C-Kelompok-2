from app.core.recommendation_engine import get_status

def test_bt_normal():
    assert get_status("BT", 960) == "OK"

def test_bt_high():
    assert get_status("BT", 980) == "HIGH"

def test_bt_low():
    assert get_status("BT", 930) == "LOW"