def risk_label(score: float) -> str:
    return "Low" if score < .25 else "Medium" if score < .5 else "High"
