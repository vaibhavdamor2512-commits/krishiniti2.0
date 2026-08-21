import os

os.environ["DATABASE_URL"] = "sqlite:///./test_krishiniti.db"
os.environ["JWT_SECRET"] = "test-secret-only"
os.environ["DEMO_MODE"] = "true"

import pytest
from fastapi.testclient import TestClient

from app.core.database import Base, engine
from app.main import app
from seed import seed


@pytest.fixture(scope="session", autouse=True)
def database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed()
    yield


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def auth_headers(client):
    response = client.post("/api/auth/login", json={"mobile": "9999999999", "password": "demo123"})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
