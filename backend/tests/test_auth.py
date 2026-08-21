def test_registration_and_current_user(client):
    payload = {"name":"Test Farmer","mobile":"8888888888","password":"secret12","location":"Anand, Gujarat","farm_size":1.5,"preferred_language":"gu"}
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    body = response.json()
    assert body["user"]["mobile"] == payload["mobile"]
    assert "password" not in body["user"] and "password_hash" not in body["user"]
    me = client.get("/api/auth/me", headers={"Authorization":f"Bearer {body['access_token']}"})
    assert me.status_code == 200 and me.json()["preferred_language"] == "gu"


def test_login_and_invalid_login(client):
    valid = client.post("/api/auth/login", json={"mobile":"9999999999","password":"demo123"})
    invalid = client.post("/api/auth/login", json={"mobile":"9999999999","password":"wrong-pass"})
    assert valid.status_code == 200 and valid.json()["token_type"] == "bearer"
    assert invalid.status_code == 401


def test_ownership_prevents_cross_farmer_access(client):
    registration = client.post("/api/auth/register", json={"name":"Other Farmer","mobile":"7777777777","password":"secret12","location":"Rajkot","farm_size":1,"preferred_language":"en"})
    headers = {"Authorization":f"Bearer {registration.json()['access_token']}"}
    assert client.get("/api/fields/1", headers=headers).status_code == 404
