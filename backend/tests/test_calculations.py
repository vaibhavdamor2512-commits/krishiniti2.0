from app.services.crop_service import range_score
from app.services.field_service import calculate_area_acres, validate_polygon
from app.services.ndvi_service import calculate_ndvi, interpret_ndvi
from app.services.profit_service import calculate_profit


def test_polygon_validation_and_real_area():
    polygon = [[22.98083,72.46830],[22.98142,72.46906],[22.98078,72.46979],[22.98012,72.46894]]
    assert validate_polygon(polygon)[0] == validate_polygon(polygon)[-1]
    area = calculate_area_acres(polygon)
    assert 1 < area < 10


def test_scoring_range():
    assert range_score(75, 60, 120) == 1
    assert 0 < range_score(45, 60, 120) < 1
    assert range_score(-100, 60, 120) == 0


def test_profit_example():
    result = calculate_profit(expected_yield=8, market_price=5000, costs=22000)
    assert result["expected_revenue"] == 40000
    assert result["total_cost"] == 22000
    assert result["expected_profit"] == 18000


def test_ndvi_formula_and_interpretation():
    assert calculate_ndvi(nir=.72, red=.18) == .60
    assert interpret_ndvi(.60)["label"] == "Moderate / good vegetation"
    assert interpret_ndvi(.35, .50)["significant_decline"] is True
