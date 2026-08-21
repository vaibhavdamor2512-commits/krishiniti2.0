"""Idempotent demo dataset for a zero-credential local run."""
from datetime import date, timedelta

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models import Advisory, Crop, CropCost, CropRequirement, Disease, DiseaseSymptom, Farm, Field, MarketPrice, NdviRecord, Notification, SoilData, Symptom, User
from app.services.field_service import calculate_area_acres, polygon_centroid


CROPS = [
    # name, locals, season, water, price/q, yield q/acre, N, P, K, pH, temp, rainfall mm, soils, costs
    ("Cotton", {"hi":"कपास","gu":"કપાસ","pa":"ਕਪਾਹ"}, "Kharif", "medium", 7100, 8.2, (60,120),(30,70),(35,80),(5.8,8.0),(21,35),(50,120),["Loamy","Black"], (3800,6200,4300,3800,10500,2400)),
    ("Groundnut", {"hi":"मूंगफली","gu":"મગફળી","pa":"ਮੂੰਗਫਲੀ"}, "Kharif", "low", 6900, 7.4, (20,80),(35,80),(30,75),(5.5,7.5),(20,32),(45,100),["Loamy","Sandy"], (4200,4800,2500,2300,9200,1800)),
    ("Wheat", {"hi":"गेहूं","gu":"ઘઉં","pa":"ਕਣਕ"}, "Rabi", "medium", 2450, 18.0, (80,140),(35,80),(30,80),(6.0,7.5),(10,25),(20,65),["Loamy","Clay"], (2800,6500,2200,4100,9800,1800)),
    ("Rice", {"hi":"धान","gu":"ડાંગર","pa":"ਝੋਨਾ"}, "Kharif", "high", 2350, 22.0, (80,160),(40,90),(40,100),(5.0,7.0),(22,35),(100,240),["Clay","Loamy"], (3600,7200,3800,7800,12500,2600)),
    ("Millet", {"hi":"बाजरा","gu":"બાજરી","pa":"ਬਾਜਰਾ"}, "Kharif", "low", 2850, 12.5, (30,90),(20,60),(20,65),(5.5,8.0),(24,36),(25,75),["Sandy","Loamy"], (1800,3200,1300,1400,6900,1200)),
    ("Tomato", {"hi":"टमाटर","gu":"ટામેટા","pa":"ਟਮਾਟਰ"}, "Year-round", "high", 1800, 32.0, (70,150),(45,100),(60,140),(5.5,7.5),(18,30),(40,100),["Loamy","Sandy"], (7800,9200,6500,6800,15800,4200)),
    ("Maize", {"hi":"मक्का","gu":"મકાઈ","pa":"ਮੱਕੀ"}, "Kharif", "medium", 2250, 19.0, (60,130),(30,80),(30,90),(5.5,7.8),(18,32),(50,120),["Loamy","Sandy"], (3200,5800,2300,3500,9200,1700)),
    ("Chickpea", {"hi":"चना","gu":"ચણા","pa":"ਛੋਲੇ"}, "Rabi", "low", 5750, 8.5, (20,70),(35,90),(25,70),(6.0,8.0),(12,28),(20,65),["Loamy","Black"], (3000,3900,1800,1600,7600,1400)),
]


DISEASES = {
    "Cotton": [
        ("Cotton leaf curl", "Viral leaf-curl complex often associated with whitefly activity.", "high", ["Leaf curling", "Yellow leaves", "Abnormal growth"], "Use tolerant varieties and monitor whiteflies.", "Remove severely affected plants where locally advised and manage vectors using approved integrated pest management."),
        ("Cotton bacterial blight", "A bacterial leaf and boll disease favored by wet conditions.", "medium", ["Brown spots", "Black spots", "Leaf drying"], "Use clean seed and avoid working in wet fields.", "Consult local guidance on sanitation and approved treatments."),
    ],
    "Tomato": [
        ("Early blight", "A common fungal disease producing expanding leaf lesions.", "medium", ["Brown spots", "Yellow leaves", "Leaf drying"], "Rotate crops, improve airflow and avoid wetting foliage.", "Remove affected leaves and use locally approved fungicide guidance if needed."),
        ("Whitefly pressure", "Sap-feeding insects that may weaken plants and transmit viruses.", "medium", ["Visible insects", "Yellow leaves", "Leaf curling"], "Use yellow sticky traps and inspect leaf undersides.", "Use integrated pest management and locally approved controls."),
    ],
    "Wheat": [("Leaf rust", "A fungal issue that can form colored pustules on leaves.", "medium", ["Brown spots", "Yellow leaves", "Leaf drying"], "Use resistant varieties and balanced nutrition.", "Seek local advice before applying an approved fungicide.")],
}


GENERIC_SYMPTOMS = ["Yellow leaves", "Brown spots", "Black spots", "Leaf curling", "White powder", "Holes in leaves", "Leaf drying", "Yellowing between veins", "Visible insects", "Wilting", "Abnormal growth"]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Crop).count() == 0:
            for row in CROPS:
                name, locals_, season, water, price, base_yield, n, p, k, ph, temp, rain, soils, costs = row
                crop = Crop(name=name, local_names=locals_, season=season, water_requirement=water, base_market_price=price, base_yield=base_yield, description=f"Demo agronomic profile for {name}.")
                crop.requirements = CropRequirement(min_n=n[0],max_n=n[1],min_p=p[0],max_p=p[1],min_k=k[0],max_k=k[1],min_ph=ph[0],max_ph=ph[1],min_temperature=temp[0],max_temperature=temp[1],min_rainfall=rain[0],max_rainfall=rain[1],suitable_soil_types=soils)
                crop.costs = CropCost(seed_cost=costs[0],fertilizer_cost=costs[1],pesticide_cost=costs[2],irrigation_cost=costs[3],labour_cost=costs[4],other_cost=costs[5])
                db.add(crop); db.flush(); db.add(MarketPrice(crop_id=crop.id, location="Ahmedabad, Gujarat", price=price, date=date.today()))
            db.commit()

        if db.query(User).filter(User.mobile == "9999999999").first() is None:
            user = User(name="Demo Farmer", mobile="9999999999", password_hash=hash_password("demo123"), location="Ahmedabad, Gujarat", farm_size=2.4, preferred_language="en")
            db.add(user); db.flush()
            polygon = [[22.98083,72.46830],[22.98142,72.46906],[22.98078,72.46979],[22.98012,72.46894],[22.98083,72.46830]]
            area = calculate_area_acres(polygon); lat, lon = polygon_centroid(polygon)
            farm = Farm(user_id=user.id, name="Green Valley Farm", location="Ahmedabad, Gujarat", total_area=area, latitude=lat, longitude=lon)
            db.add(farm); db.flush()
            field = Field(farm_id=farm.id, name="Field One", polygon=polygon, latitude=lat, longitude=lon, area=area, current_crop="Cotton", sowing_date=date.today()-timedelta(days=64), irrigation_available=True)
            db.add(field); db.flush()
            db.add(SoilData(field_id=field.id, nitrogen=75, phosphorus=42, potassium=55, ph=6.8, soil_type="Loamy", moisture=38))
            db.add_all([
                Advisory(field_id=field.id, type="irrigation", message="Rain is expected. Consider delaying irrigation and monitor soil moisture.", severity="moderate", language="en"),
                Advisory(field_id=field.id, type="crop_health", message="Vegetation condition is good. Continue routine field checks.", severity="low", language="en"),
                Notification(user_id=user.id, title="Rain likely this evening", message="Check soil moisture tomorrow before irrigating Field One.", type="weather"),
                Notification(user_id=user.id, title="Field health updated", message="The latest vegetation condition indicator is 0.67.", type="ndvi"),
            ])
            for i, value in enumerate([.31,.38,.46,.54,.61,.66,.69,.67]):
                db.add(NdviRecord(field_id=field.id, observation_date=date.today()-timedelta(days=(7-i)*12), average_ndvi=value, minimum_ndvi=max(0,value-.13), maximum_ndvi=min(1,value+.12)))
            db.commit()

        if db.query(Symptom).count() == 0:
            for crop in db.query(Crop).all():
                symptom_map = {}
                for name in GENERIC_SYMPTOMS:
                    item = Symptom(crop_id=crop.id, name=name, description=f"Visible sign: {name.lower()}.")
                    db.add(item); db.flush(); symptom_map[name] = item
                for issue in DISEASES.get(crop.name, []):
                    name, description, severity, symptoms, prevention, management = issue
                    disease = Disease(crop_id=crop.id, name=name, description=description, severity=severity, prevention=prevention, management=management)
                    db.add(disease); db.flush()
                    for index, symptom_name in enumerate(symptoms):
                        db.add(DiseaseSymptom(disease_id=disease.id, symptom_id=symptom_map[symptom_name].id, importance=3-index*.5))
            db.commit()
        print("Demo data ready. Login: 9999999999 / demo123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
