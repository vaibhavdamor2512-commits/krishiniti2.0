class CropModelAdapter:
    """Plug-in boundary for a future fitted Random Forest/Gradient Boosting model."""
    is_trained = False

    def predict(self, features):
        raise RuntimeError("No trained crop model is installed; use deterministic scoring.")
