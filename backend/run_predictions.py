import os
import time
import uuid
from datetime import datetime
from typing import Dict, List

import joblib
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

from app.ml.preprocessing import PipelineConfig, preprocess_for_prediction

load_dotenv()


def log_prediction_run(
    engine,
    run_id: str,
    model_name: str,
    model_version: str,
    pots_predicted: int,
    execution_time: float,
    predictions: np.ndarray,
    status: str = "success",
    warnings: list = None,
    error_message: str = None,
):
    """Log prediction run to ml.prediction_logs"""
    try:
        with engine.begin() as conn:
            conn.execute(
                text("""
                INSERT INTO ml.prediction_logs (
                    run_id, run_timestamp, model_name, model_version,
                    pots_predicted, execution_time_sec,
                    avg_prediction, min_prediction, max_prediction, std_prediction,
                    status, warnings, error_message
                )
                VALUES (
                    :run_id, :run_timestamp, :model_name, :model_version,
                    :pots_predicted, :execution_time,
                    :avg_pred, :min_pred, :max_pred, :std_pred,
                    :status, :warnings, :error_message
                )
            """),
                {
                    "run_id": run_id,
                    "run_timestamp": datetime.now(),
                    "model_name": model_name,
                    "model_version": model_version,
                    "pots_predicted": pots_predicted,
                    "execution_time": round(execution_time, 2),
                    "avg_pred": float(np.mean(predictions))
                    if len(predictions) > 0
                    else None,
                    "min_pred": float(np.min(predictions))
                    if len(predictions) > 0
                    else None,
                    "max_pred": float(np.max(predictions))
                    if len(predictions) > 0
                    else None,
                    "std_pred": float(np.std(predictions))
                    if len(predictions) > 0
                    else None,
                    "status": status,
                    "warnings": warnings,
                    "error_message": error_message,
                },
            )
    except Exception as e:
        print(f"Warning: Failed to log prediction run: {e}")


def validate_predictions(predictions: np.ndarray) -> tuple:
    """
    Validate prediction quality and return (status, warnings)

    Returns:
        tuple: (status: str, warnings: list)
    """
    warnings = []

    # Check for NaN/Inf
    nan_count = np.isnan(predictions).sum()
    if nan_count > 0:
        warnings.append(f"{nan_count} NaN predictions detected")

    inf_count = np.isinf(predictions).sum()
    if inf_count > 0:
        warnings.append(f"{inf_count} Inf predictions detected")

    # Valid predictions only
    valid_preds = predictions[~np.isnan(predictions) & ~np.isinf(predictions)]

    if len(valid_preds) == 0:
        return "error", ["All predictions are invalid"]

    # Check prediction range (CE should be 0-100%)
    out_of_range = ((valid_preds < 0) | (valid_preds > 100)).sum()
    if out_of_range > 0:
        pct = (out_of_range / len(valid_preds)) * 100
        warnings.append(f"{out_of_range} ({pct:.1f}%) predictions outside 0-100% range")

    # Check for extreme predictions
    extreme_low = (valid_preds < 50).sum()
    extreme_high = (valid_preds > 98).sum()

    if extreme_low / len(valid_preds) > 0.1:
        warnings.append(f"{extreme_low} predictions below 50% (unusual)")

    if extreme_high / len(valid_preds) > 0.1:
        warnings.append(f"{extreme_high} predictions above 98% (unusual)")

    # Determine overall status
    if len(warnings) == 0:
        return "success", []
    elif len(warnings) <= 2 and "error" not in str(warnings).lower():
        return "warning", warnings
    else:
        return "error", warnings


def prep_like_train_for_lgbm(df_feat: pd.DataFrame, bundle: Dict) -> pd.DataFrame:
    """Prepare features to match training schema exactly"""
    ID_COL = bundle["id_col"]
    MISSING_TOKEN = bundle["missing_token"]
    FEATURE_COLS: List[str] = bundle["feature_cols"]
    CAT_COLS: List[str] = bundle["cat_cols"]
    NUM_COLS: List[str] = bundle["num_cols"]
    CAT_CATEGORIES: Dict[str, List[str]] = bundle["cat_categories"]

    # Drop non-features/leakage if exist
    drop_cols = [ID_COL, "ce_next", "ce_next_pred", "tgl", "ce_event", "ce_valid_flag"]
    X = df_feat.drop(
        columns=[c for c in drop_cols if c in df_feat.columns], errors="ignore"
    ).copy()

    # Ensure all expected columns exist
    for c in FEATURE_COLS:
        if c not in X.columns:
            X[c] = np.nan

    # Exact order, remove extra
    X = X.reindex(columns=FEATURE_COLS)

    # Categorical alignment
    for c in CAT_COLS:
        X[c] = (
            X[c].astype("object").fillna(MISSING_TOKEN).astype(str).astype("category")
        )
        X[c] = X[c].cat.set_categories(CAT_CATEGORIES[c])

        # Unknown categories -> missing token
        if MISSING_TOKEN not in X[c].cat.categories:
            X[c] = X[c].cat.add_categories([MISSING_TOKEN])
        X[c] = X[c].fillna(MISSING_TOKEN)

    # Numeric coercion
    for c in NUM_COLS:
        X[c] = pd.to_numeric(X[c], errors="coerce")

    return X


def run_daily_predictions():
    """
    Main prediction function:
    1. Query raw.pot_daily from database
    2. Apply full preprocessing pipeline
    3. Load model bundle and predict
    4. Validate predictions
    5. Save predictions to mart.ce_predicted_daily
    6. Log run to ml.prediction_logs
    """
    run_id = str(uuid.uuid4())
    start_time = time.time()

    print(f"Starting Production ML Predictions... (run_id: {run_id[:8]})")

    # Database connection
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL not found!")

    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    engine = create_engine(db_url)

    try:
        # 1. Load model bundle
        bundle_path = os.path.join(
            os.path.dirname(__file__),
            "app",
            "ml",
            "artifacts",
            "lgbm_ce_next_bundle.pkl",
        )

        if not os.path.exists(bundle_path):
            print(f"WARNING: Model bundle not found at {bundle_path}")
            print("Using dummy predictions instead...")
            run_simple_dummy_predictions(engine)
            return

        print(f"Loading model bundle from {bundle_path}")
        bundle = joblib.load(bundle_path)
        model = bundle["model"]
        best_iter = bundle.get("best_iteration", None)

        model_name = "lgbm_production"
        model_version = "v1.0"

        # 2. Query raw data from database
        print("Querying raw.pot_daily from database...")
        query = """
        SELECT 
            pot_id::text as potnum,
            date as tgl,
            potline_id, gen, ctype, pot_status_code as pot_status, 
            transition, age_day, age_month,
            class, pot_design, tshift, ac_schedule, mt_schedule, mt_shift, mt_day,
            metal_kg, dross, ov, ce, dc, metal_leak, group_current, avv, psp,
            osp, noise, cb, fd, oa, aef, aev, ae_dur, ae_kwh, m, mc, s, cd, bt,
            alf3_kg, mt_bb, feed_pct, pl_current, bt_in_target, bath_tap,
            bath_charge, anode_reset, nipple_kg, c_tapping, meji, frozen_bath,
            bath_powder, return_crust, dross_trp, bbar_miring, belly_helly,
            temp_ac, metal_scrap, metal_ball, soda_ash, break_sp, break_local,
            nipple_freq, broke_anode_kg, broke_anode_freq, rwb_kg, rwb_freq,
            potday
        FROM raw.pot_daily
        WHERE date IS NOT NULL 
          AND pot_id IS NOT NULL
        ORDER BY pot_id, date
        """

        df_raw = pd.read_sql(query, engine)

        if df_raw.empty:
            print("No data found in raw.pot_daily")
            log_prediction_run(
                engine,
                run_id,
                model_name,
                model_version,
                0,
                time.time() - start_time,
                np.array([]),
                status="error",
                error_message="No data in raw.pot_daily",
            )
            return

        print(f"Loaded {len(df_raw)} rows from database")

        # 3. Apply preprocessing pipeline
        print("Applying preprocessing pipeline...")
        cfg = PipelineConfig()
        df_processed = preprocess_for_prediction(df_raw, cfg)

        # 4. Filter to LATEST row per pot
        # User Logic: "pot that doesnt tapiing at 31 should can predict ewith data 31"
        # Strategy:
        # 1. Filter to ACTIVE pots (potday=1) regardless of whether they have CE/Metal data.
        #    This allows using continuous 24h data (volt, noise) from Jan 31 even if no tap (CE=0).
        print("Filtering to keep only active pots (pot_active == 1)...")
        df_active = df_processed[df_processed["pot_active"] == 1].copy()

        print("Selecting latest data per active pot...")
        df_latest = (
            df_active.sort_values(["potnum", "tgl"])
            .groupby("potnum")
            .tail(1)
            .reset_index(drop=True)
        )

        print(
            f"Predicting for {len(df_latest)} active pots (including those with 0 CE/no tap)"
        )

        # 5. Prepare features for model
        print("Preparing features for model...")
        X = prep_like_train_for_lgbm(df_latest, bundle)

        # 6. Generate predictions
        print("Generating predictions...")
        if best_iter is not None and best_iter > 0:
            predictions = model.predict(X, num_iteration=best_iter)
        else:
            predictions = model.predict(X)

        df_latest["ce_next_pred"] = predictions

        # --- NEW: Simulated Confidence Intervals ---
        # Using fixed margin of +/- 0.84% (based on RMSE) for transparency
        df_latest["yhat_lo"] = df_latest["ce_next_pred"] - 0.84
        df_latest["yhat_hi"] = df_latest["ce_next_pred"] + 0.84

        # 7. Validate predictions
        print("Validating predictions...")
        status, warnings = validate_predictions(predictions)

        if status == "warning":
            print("⚠️  Warnings detected:")
            for w in warnings:
                print(f"   - {w}")
        elif status == "error":
            print("❌ Errors detected:")
            for w in warnings:
                print(f"   - {w}")
        else:
            print("✓ Predictions look good")

        # 8. Prepare output for database
        print("Preparing predictions for database...")

        output_df = df_latest[
            ["potnum", "tgl", "ce_next_pred", "yhat_lo", "yhat_hi"]
        ].copy()
        output_df = output_df.dropna(subset=["ce_next_pred"])

        # Prediction is for NEXT DAY (t+1)
        output_df["pred_date"] = pd.to_datetime(output_df["tgl"]) + pd.Timedelta(days=1)
        output_df = output_df.rename(
            columns={"potnum": "pot_id", "ce_next_pred": "yhat_ce"}
        )
        output_df = output_df.drop(columns=["tgl"])

        # Convert pot_id back to integer
        output_df["pot_id"] = pd.to_numeric(
            output_df["pot_id"], errors="coerce"
        ).astype("Int64")
        output_df = output_df.dropna(subset=["pot_id"])

        # Add metadata
        output_df["model_name"] = model_name
        output_df["model_version"] = model_version
        output_df["feature_version"] = "v1.0"
        output_df["as_of_date"] = datetime.now().date()
        output_df["created_at"] = datetime.now()

        # Get potline_id from raw data
        potline_map = df_raw[["potnum", "potline_id"]].drop_duplicates()
        potline_map["potnum"] = pd.to_numeric(
            potline_map["potnum"], errors="coerce"
        ).astype("Int64")
        potline_map = potline_map.rename(columns={"potnum": "pot_id"})

        output_df = output_df.merge(potline_map, on="pot_id", how="left")

        print(f"Saving {len(output_df)} predictions to database...")

        # 9. Save to database using temp table + upsert
        with engine.begin() as conn:
            conn.execute(
                text("""
                CREATE TEMP TABLE temp_preds (
                    pred_date date,
                    pot_id int,
                    potline_id int,
                    as_of_date date,
                    model_name text,
                    model_version text,
                    feature_version text,
                    yhat_ce numeric,
                    yhat_lo numeric,
                    yhat_hi numeric,
                    created_at timestamptz
                ) ON COMMIT DROP
            """)
            )

            output_df[
                [
                    "pred_date",
                    "pot_id",
                    "potline_id",
                    "as_of_date",
                    "model_name",
                    "model_version",
                    "feature_version",
                    "yhat_ce",
                    "yhat_lo",
                    "yhat_hi",
                    "created_at",
                ]
            ].to_sql(
                "temp_preds", conn, if_exists="append", index=False, method="multi"
            )

            conn.execute(
                text("""
                INSERT INTO mart.ce_predicted_daily (
                    pred_date, pot_id, potline_id, as_of_date, 
                    model_name, model_version, feature_version, 
                    yhat_ce, yhat_lo, yhat_hi, created_at
                )
                SELECT pred_date, pot_id, potline_id, as_of_date,
                       model_name, model_version, feature_version, 
                       yhat_ce, yhat_lo, yhat_hi, created_at
                FROM temp_preds
                ON CONFLICT (pot_id, pred_date, model_version) 
                DO UPDATE SET
                    yhat_ce = EXCLUDED.yhat_ce,
                    yhat_lo = EXCLUDED.yhat_lo,
                    yhat_hi = EXCLUDED.yhat_hi,
                    as_of_date = EXCLUDED.as_of_date,
                    created_at = EXCLUDED.created_at
            """)
            )

        execution_time = time.time() - start_time

        # 10. Log prediction run
        log_prediction_run(
            engine,
            run_id,
            model_name,
            model_version,
            len(output_df),
            execution_time,
            predictions,
            status=status,
            warnings=warnings if warnings else None,
        )

        print(f"Predictions saved successfully in {execution_time:.1f}s.")
        print(
            f"Sample predictions:\n{output_df[['pot_id', 'pred_date', 'yhat_ce']].head()}"
        )

    except Exception as e:
        execution_time = time.time() - start_time
        error_msg = str(e)
        print(f"❌ Error during prediction: {error_msg}")

        # Log error
        log_prediction_run(
            engine,
            run_id,
            "lgbm_production",
            "v1.0",
            0,
            execution_time,
            np.array([]),
            status="error",
            error_message=error_msg,
        )
        raise


def run_simple_dummy_predictions(engine):
    """Fallback to simple dummy predictions if model bundle not found"""
    print("Running simple dummy predictions...")

    query = """
    SELECT DISTINCT ON (pot_id)
        pot_id, potline_id, date, 
        ov as volt, noise, age_day, bt, m, aef as ae
    FROM raw.pot_daily
    WHERE date IS NOT NULL
    ORDER BY pot_id, date DESC
    """

    df = pd.read_sql(query, engine)

    if df.empty:
        print("No data to predict")
        return

    # Simple dummy logic
    # CI Logic (Dummy) +/- 0.84
    df["yhat_lo"] = df["yhat_ce"] - 0.84
    df["yhat_hi"] = df["yhat_ce"] + 0.84

    # Prediction is for NEXT DAY (T+1), same as production logic
    df["pred_date"] = pd.to_datetime(df["date"]) + pd.Timedelta(days=1)

    df["model_name"] = "dummy"
    df["model_version"] = "v1.0"  # Updated to match repo filter
    df["feature_version"] = "v0.1"
    df["as_of_date"] = datetime.now().date()
    df["created_at"] = datetime.now()

    with engine.begin() as conn:
        conn.execute(
            text("""
            CREATE TEMP TABLE temp_preds (
                pred_date date, pot_id int, potline_id int, as_of_date date, 
                model_name text, model_version text, feature_version text, 
                yhat_ce numeric, yhat_lo numeric, yhat_hi numeric, created_at timestamptz
            ) ON COMMIT DROP
        """)
        )

        df[
            [
                "pred_date",
                "pot_id",
                "potline_id",
                "as_of_date",
                "model_name",
                "model_version",
                "feature_version",
                "yhat_ce",
                "yhat_lo",
                "yhat_hi",
                "created_at",
            ]
        ].to_sql("temp_preds", conn, if_exists="append", index=False, method="multi")

        conn.execute(
            text("""
            INSERT INTO mart.ce_predicted_daily (
                pred_date, pot_id, potline_id, as_of_date, 
                model_name, model_version, feature_version, 
                yhat_ce, yhat_lo, yhat_hi, created_at
            )
            SELECT pred_date, pot_id, potline_id, as_of_date, 
                   model_name, model_version, feature_version, 
                   yhat_ce, yhat_lo, yhat_hi, created_at
            FROM temp_preds
            ON CONFLICT (pot_id, pred_date, model_version) 
            DO UPDATE SET 
                yhat_ce = EXCLUDED.yhat_ce,
                yhat_lo = EXCLUDED.yhat_lo,
                yhat_hi = EXCLUDED.yhat_hi,
                as_of_date = EXCLUDED.as_of_date, 
                created_at = EXCLUDED.created_at
        """)
        )

    print(f"Dummy predictions saved for {len(df)} pots.")


if __name__ == "__main__":
    run_daily_predictions()
