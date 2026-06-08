from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_backend_app_running():
    response = client.get("/")
    assert response.status_code in [200, 404]