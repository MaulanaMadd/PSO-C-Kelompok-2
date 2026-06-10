import logging
import os

import joblib
import pandas as pd

logger = logging.getLogger(__name__)


class ModelService:
    def __init__(self):
        self.model = None
        self._load_model()

    def _load_model(self):
        try:
            # Path relative to this file
            current_dir = os.path.dirname(__file__)
            model_path = os.path.join(current_dir, "artifacts", "model.pkl")

            if os.path.exists(model_path):
                self.model = joblib.load(model_path)
                logger.info(f"ML Model loaded from {model_path}")
            else:
                logger.warning(
                    f"ML Model not found at {model_path}. Predictions will be skipped/mocked."
                )
        except Exception as e:
            logger.error(f"Failed to load ML model: {e}")

    def predict(self, df: pd.DataFrame) -> pd.Series:
        """
        Takes a DataFrame of features and returns a Series of predictions.
        Expected columns: volt, noise, age_day, bt, m, ae
        """
        if self.model is None:
            return pd.Series([None] * len(df))

        # Ensure correct feature order/selection
        expected_features = ["volt", "noise", "age_day", "bt", "m", "ae"]

        # Check if all features exist, fill None with appropriate defaults or row drop
        # For simplicity, we fill NaNs with median or 0, but ideally we drop rows.
        X = df[expected_features].copy()

        # Simple imputation for now to avoid crashes
        X = X.fillna(0)

        try:
            preds = self.model.predict(X)
            return pd.Series(preds, index=df.index)
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            print(f"PREDICTION ERROR: {e}")
            return pd.Series([None] * len(df))
