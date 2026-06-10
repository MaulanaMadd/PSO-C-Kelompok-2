import os
from datetime import datetime

import joblib
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()


def register_model(
    model_name: str,
    model_version: str,
    model_type: str = "lgbm",
    file_path: str = None,
    trained_by: str = None,
    training_metrics: dict = None,
    training_data_period: dict = None,
    notes: str = None,
):
    """
    Register a model in the model registry

    Args:
        model_name: Name of the model (e.g., "lgbm_production")
        model_version: Version string (e.g., "v1.0")
        model_type: Type of model (e.g., "lgbm", "xgboost")
        file_path: Path to model file
        trained_by: Name of person who trained the model
        training_metrics: Dict of metrics {rmse, mae, r2, etc}
        training_data_period: Dict {start_date, end_date, num_rows}
        notes: Additional notes about the model
    """
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL not found")

    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    engine = create_engine(db_url)

    # Get feature count from bundle if available
    feature_count = None
    feature_list = None
    if file_path and os.path.exists(file_path):
        try:
            bundle = joblib.load(file_path)
            feature_count = len(bundle.get("feature_cols", []))
            feature_list = bundle.get("feature_cols", [])
        except:
            pass

    with engine.begin() as conn:
        # Set all existing models for this name to inactive
        conn.execute(
            text("""
            UPDATE ml.model_registry
            SET status = 'inactive'
            WHERE model_name = :model_name AND status = 'active'
        """),
            {"model_name": model_name},
        )

        # Insert new model as active
        conn.execute(
            text("""
            INSERT INTO ml.model_registry (
                model_name, model_version, model_type, file_path,
                trained_at, trained_by, training_metrics, training_data_period,
                feature_count, feature_list, status, notes
            )
            VALUES (
                :model_name, :model_version, :model_type, :file_path,
                :trained_at, :trained_by, :training_metrics::jsonb, :training_data_period::jsonb,
                :feature_count, :feature_list, 'active', :notes
            )
            ON CONFLICT (model_name, model_version) DO UPDATE
            SET
                status = 'active',
                trained_at = EXCLUDED.trained_at,
                trained_by = EXCLUDED.trained_by,
                training_metrics = EXCLUDED.training_metrics,
                training_data_period = EXCLUDED.training_data_period,
                feature_count = EXCLUDED.feature_count,
                notes = EXCLUDED.notes
        """),
            {
                "model_name": model_name,
                "model_version": model_version,
                "model_type": model_type,
                "file_path": file_path,
                "trained_at": datetime.now(),
                "trained_by": trained_by or "system",
                "training_metrics": str(training_metrics) if training_metrics else None,
                "training_data_period": str(training_data_period)
                if training_data_period
                else None,
                "feature_count": feature_count,
                "feature_list": feature_list,
                "notes": notes,
            },
        )

    print(f"✓ Registered model: {model_name} {model_version} as active")


if __name__ == "__main__":
    # Register the production model
    bundle_path = os.path.join(
        os.path.dirname(__file__),
        "..",
        "app",
        "ml",
        "artifacts",
        "lgbm_ce_next_bundle.pkl",
    )

    register_model(
        model_name="lgbm_production",
        model_version="v1.0",
        model_type="lgbm",
        file_path=bundle_path,
        trained_by="Data Science Team",
        training_metrics={"note": "Metrics to be added after model evaluation"},
        training_data_period={"note": "Training period to be documented"},
        notes="Production LightGBM model for CE prediction with full preprocessing pipeline",
    )
