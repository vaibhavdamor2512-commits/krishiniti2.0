import json
from pathlib import Path


def test_crop_recommendation_is_ranked(client, auth_headers):
    response = client.post("/api/crops/recommend", json={"field_id":1,"season":"Kharif"}, headers=auth_headers)
    assert response.status_code == 200
    items = response.json()["recommendations"]
    assert len(items) >= 3
    assert items == sorted(items, key=lambda item:item["risk_adjusted_score"], reverse=True)
    assert all(item["explanation"] for item in items)
    assert all(item["model"] == "transparent-baseline-v1" for item in items)


def test_weather_ndvi_and_dashboard(client, auth_headers):
    weather = client.get("/api/weather/1", headers=auth_headers)
    ndvi = client.get("/api/ndvi/1", headers=auth_headers)
    dashboard = client.get("/api/dashboard", headers=auth_headers)
    assert weather.status_code == ndvi.status_code == dashboard.status_code == 200
    assert weather.json()["provider"] == "demo"
    assert "Vegetation condition indicator" in ndvi.json()["interpretation"]["disclaimer"]


def test_crop_specific_disease_matching_and_low_confidence(client, auth_headers):
    crops = client.get("/api/diseases/crops", headers=auth_headers).json()
    cotton = next(item for item in crops if item["name"] == "Cotton")
    symptoms = client.get(f"/api/diseases/symptoms/{cotton['id']}", headers=auth_headers).json()
    selected = [item["id"] for item in symptoms if item["name"] in {"Leaf curling","Yellow leaves","Abnormal growth"}]
    result = client.post("/api/diseases/analyze", json={"crop_id":cotton["id"],"symptom_ids":selected}, headers=auth_headers).json()
    assert result["matches"][0]["possible_issue"] == "Cotton leaf curl"
    assert "not a confirmed diagnosis" in result["disclaimer"]


def test_all_four_language_files():
    i18n = Path(__file__).parents[2] / "frontend" / "src" / "i18n"
    for code in ("en","hi","gu","pa"):
        values = json.loads((i18n / f"{code}.json").read_text(encoding="utf-8"))
        assert values["dashboard"] and values["advisoryDisclaimer"]
