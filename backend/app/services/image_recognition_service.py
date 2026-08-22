from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image, UnidentifiedImageError

from app.core.config import settings


SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


class ImageRecognitionError(ValueError):
    pass


@dataclass(frozen=True)
class ImageFeatures:
    width: int
    height: int
    mean_red: float
    mean_green: float
    mean_blue: float
    green_ratio: float
    yellow_ratio: float
    brown_ratio: float
    white_ratio: float
    dark_ratio: float
    contrast: float
    edge_strength: float

    def vector(self) -> list[float]:
        return [
            self.mean_red,
            self.mean_green,
            self.mean_blue,
            self.green_ratio,
            self.yellow_ratio,
            self.brown_ratio,
            self.white_ratio,
            self.dark_ratio,
            self.contrast,
            self.edge_strength,
        ]


def extract_image_features(image_bytes: bytes) -> ImageFeatures:
    try:
        with Image.open(BytesIO(image_bytes)) as source:
            source.load()
            width, height = source.size
            if width < 64 or height < 64:
                raise ImageRecognitionError("The image is too small. Please upload an image at least 64 × 64 pixels.")
            image = source.convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise ImageRecognitionError("The uploaded file is not a readable crop image.") from exc

    pixels = np.asarray(image.resize((224, 224)), dtype=np.float32) / 255.0
    red, green, blue = pixels[..., 0], pixels[..., 1], pixels[..., 2]
    brightness = pixels.mean(axis=2)
    gray = red * 0.299 + green * 0.587 + blue * 0.114
    green_mask = (green > red * 1.08) & (green > blue * 1.08) & (green > 0.2)
    yellow_mask = (red > 0.42) & (green > 0.38) & (blue < 0.38) & (np.abs(red - green) < 0.25)
    brown_mask = (red > 0.22) & (green > 0.10) & (green < red * 0.88) & (blue < green * 0.88)
    white_mask = (red > 0.72) & (green > 0.72) & (blue > 0.72)
    vertical_edges = np.abs(np.diff(gray, axis=0)).mean()
    horizontal_edges = np.abs(np.diff(gray, axis=1)).mean()
    return ImageFeatures(
        width=width,
        height=height,
        mean_red=round(float(red.mean()), 4),
        mean_green=round(float(green.mean()), 4),
        mean_blue=round(float(blue.mean()), 4),
        green_ratio=round(float(green_mask.mean()), 4),
        yellow_ratio=round(float(yellow_mask.mean()), 4),
        brown_ratio=round(float(brown_mask.mean()), 4),
        white_ratio=round(float(white_mask.mean()), 4),
        dark_ratio=round(float((brightness < 0.22).mean()), 4),
        contrast=round(float(gray.std()), 4),
        edge_strength=round(float(vertical_edges + horizontal_edges), 4),
    )


ADVISORIES = {
    "Leaf spot pattern": {
        "observation": "Brown or dark spot-like regions are prominent in the submitted image.",
        "action": "Inspect both sides of affected leaves and compare nearby plants for spreading spots.",
        "prevention": "Improve airflow, avoid prolonged leaf wetness, and remove heavily affected debris.",
        "management": "Use locally recommended integrated disease management after field confirmation.",
    },
    "Possible chlorosis or nutrient stress": {
        "observation": "Yellow regions are prominent compared with healthy green tissue.",
        "action": "Check whether yellowing follows leaf veins or affects older leaves first, then review soil moisture and nutrients.",
        "prevention": "Use soil-test-guided nutrition and avoid both waterlogging and prolonged moisture stress.",
        "management": "Correct confirmed nutrient or irrigation problems and consult a local expert if yellowing spreads.",
    },
    "Powdery surface pattern": {
        "observation": "Light surface regions are prominent and may resemble powdery residue.",
        "action": "Inspect the leaf surface in natural light and check whether the residue can be gently disturbed.",
        "prevention": "Maintain spacing and airflow, and avoid unnecessary overhead irrigation late in the day.",
        "management": "Confirm locally before using any crop-protection product and follow the approved label.",
    },
    "Possible blight or tissue stress": {
        "observation": "Dark tissue regions are prominent in the submitted image.",
        "action": "Check stems and neighboring leaves for expanding dark or water-soaked areas.",
        "prevention": "Remove severely affected debris and avoid moving through wet plants.",
        "management": "Seek crop-specific field confirmation if dark areas expand rapidly.",
    },
    "No clear disease pattern": {
        "observation": "The image does not contain a strong color or lesion pattern that this demo recognizer can separate reliably.",
        "action": "Upload a closer, well-lit image of the affected leaf area or use symptom-based guidance.",
        "prevention": "Continue routine crop scouting and keep a record of changes over several days.",
        "management": "Consult a local agricultural expert when symptoms persist or spread.",
    },
}


class DiseaseRecognitionService(ABC):
    @abstractmethod
    def analyze(self, image_bytes: bytes, crop_name: str) -> dict:
        raise NotImplementedError


class DemoDiseaseRecognizer(DiseaseRecognitionService):
    def analyze(self, image_bytes: bytes, crop_name: str) -> dict:
        features = extract_image_features(image_bytes)
        candidates = [
            (features.brown_ratio, "Leaf spot pattern"),
            (features.yellow_ratio, "Possible chlorosis or nutrient stress"),
            (features.white_ratio * 0.8, "Powdery surface pattern"),
            (features.dark_ratio * 0.75, "Possible blight or tissue stress"),
        ]
        signal, issue = max(candidates, key=lambda item: item[0])
        poor_quality = features.edge_strength < 0.006 and features.contrast < 0.03
        confidence = round(min(88.0, 34.0 + signal * 210 + features.contrast * 34), 1)
        if signal < 0.055 or poor_quality:
            issue = "No clear disease pattern"
            confidence = min(confidence, 42.0)
        advisory = ADVISORIES[issue]
        return {
            "crop": crop_name,
            "possible_issue": issue,
            "confidence": confidence,
            "low_confidence": confidence < 45,
            "observation": advisory["observation"],
            "recommended_action": advisory["action"],
            "prevention": advisory["prevention"],
            "management": advisory["management"],
            "analysis_mode": "demo-image-heuristic",
            "analysis_label": "Demo image analysis — color and texture heuristic, not a trained diagnostic model",
            "features": asdict(features),
            "disclaimer": "This is an advisory estimate, not a confirmed diagnosis. Confirm important decisions with a qualified agricultural expert.",
        }


class MLModelDiseaseRecognizer(DiseaseRecognitionService):
    def __init__(self, model_path: str):
        import joblib

        self.model = joblib.load(model_path)

    def analyze(self, image_bytes: bytes, crop_name: str) -> dict:
        features = extract_image_features(image_bytes)
        probabilities = self.model.predict_proba([features.vector()])[0]
        best_index = int(np.argmax(probabilities))
        issue = str(self.model.classes_[best_index])
        confidence = round(float(probabilities[best_index]) * 100, 1)
        advisory = ADVISORIES.get(issue, ADVISORIES["No clear disease pattern"])
        return {
            "crop": crop_name,
            "possible_issue": issue,
            "confidence": confidence,
            "low_confidence": confidence < 55,
            "observation": advisory["observation"],
            "recommended_action": advisory["action"],
            "prevention": advisory["prevention"],
            "management": advisory["management"],
            "analysis_mode": "configured-ml-model",
            "analysis_label": "Configured image classification model",
            "features": asdict(features),
            "disclaimer": "This is an advisory estimate, not a confirmed diagnosis. Confirm important decisions with a qualified agricultural expert.",
        }


def get_disease_recognizer() -> DiseaseRecognitionService:
    model_path = Path(settings.disease_model_path) if settings.disease_model_path else None
    if model_path and model_path.is_file() and settings.disease_model_type.lower() == "sklearn":
        return MLModelDiseaseRecognizer(str(model_path))
    return DemoDiseaseRecognizer()
