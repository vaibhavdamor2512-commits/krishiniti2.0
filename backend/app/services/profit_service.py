def calculate_profit(expected_yield: float, market_price: float, costs: float, area: float = 1.0, risk_score: float = 0.0) -> dict:
    revenue = expected_yield * market_price * area
    total_cost = costs * area
    profit = revenue - total_cost
    risk_penalty = max(0, profit) * risk_score * 0.28
    return {
        "expected_revenue": round(revenue, 2),
        "total_cost": round(total_cost, 2),
        "expected_profit": round(profit, 2),
        "risk_penalty": round(risk_penalty, 2),
        "risk_adjusted_score": round(profit - risk_penalty, 2),
    }
