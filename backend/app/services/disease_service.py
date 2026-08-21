from sqlalchemy.orm import Session

from app.models import Disease, DiseaseSymptom, Symptom


def analyze_symptoms(db: Session, crop_id: int, symptom_ids: list[int]) -> dict:
    diseases = db.query(Disease).filter(Disease.crop_id == crop_id).all()
    observed = db.query(Symptom).filter(Symptom.crop_id == crop_id, Symptom.id.in_(symptom_ids)).all()
    if not observed:
        return {"matches": [], "low_confidence": True, "message": "We could not find a strong match. Please check additional symptoms or consult an agricultural expert."}
    selected = {item.id for item in observed}
    matches = []
    for disease in diseases:
        links = db.query(DiseaseSymptom).filter(DiseaseSymptom.disease_id == disease.id).all()
        total = sum(link.importance for link in links) or 1
        matched = sum(link.importance for link in links if link.symptom_id in selected)
        confidence = matched / total
        if confidence > 0:
            matches.append({"disease_id": disease.id, "possible_issue": disease.name, "match_confidence": round(confidence*100, 1), "severity": disease.severity, "observed_symptoms": [s.name for s in observed], "recommended_action": "Inspect affected plants and follow suitable prevention and management practices.", "prevention": disease.prevention, "management": disease.management})
    matches.sort(key=lambda x: x["match_confidence"], reverse=True)
    low = not matches or matches[0]["match_confidence"] < 45
    return {"matches": matches[:3], "low_confidence": low, "message": "We could not find a strong match. Please check additional symptoms or consult an agricultural expert." if low else "Possible issues ranked from the selected visible symptoms.", "disclaimer": "This is an advisory estimate, not a confirmed diagnosis."}
