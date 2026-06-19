import os

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv()


def monitor_predictions(days_back=7):
    """
    Monitor prediction quality and alert on anomalies

    Args:
        days_back: How many days of logs to analyze
    """
    db_url = os.getenv("DATABASE_URL")
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    engine = create_engine(db_url)

    print(f"\n{'=' * 60}")
    print("ML PREDICTION MONITORING REPORT")
    print(f"{'=' * 60}\n")

    # 1. Recent prediction runs
    print("📊 RECENT PREDICTION RUNS")
    print("-" * 60)

    query_runs = f"""
    SELECT 
        run_timestamp::date as date,
        model_version,
        pots_predicted,
        ROUND(execution_time_sec, 2) as time_sec,
        ROUND(avg_prediction::numeric, 2) as avg_ce,
        ROUND(min_prediction::numeric, 2) as min_ce,
        ROUND(max_prediction::numeric, 2) as max_ce,
        status,
        warnings
    FROM ml.prediction_logs
    WHERE run_timestamp >= NOW() - INTERVAL '{days_back} days'
    ORDER BY run_timestamp DESC
    LIMIT 10
    """

    runs = pd.read_sql(query_runs, engine)

    if runs.empty:
        print("  No prediction runs found in the last {} days".format(days_back))
    else:
        print(runs.to_string(index=False))

    # 2. Status summary
    print(f"\n\n📈 STATUS SUMMARY (Last {days_back} days)")
    print("-" * 60)

    query_status = f"""
    SELECT 
        status,
        COUNT(*) as count,
        ROUND(AVG(execution_time_sec), 2) as avg_time_sec
    FROM ml.prediction_logs
    WHERE run_timestamp >= NOW() - INTERVAL '{days_back} days'
    GROUP BY status
    ORDER BY count DESC
    """

    status_summary = pd.read_sql(query_status, engine)

    if not status_summary.empty:
        print(status_summary.to_string(index=False))

        # Alert on errors
        errors = status_summary[status_summary["status"] == "error"]
        if not errors.empty:
            print(f"\n⚠️  WARNING: {errors.iloc[0]['count']} failed runs detected!")

    # 3. Prediction quality trend
    print("\n\n📉 PREDICTION QUALITY TREND")
    print("-" * 60)

    query_trend = f"""
    SELECT 
        run_timestamp::date as date,
        ROUND(AVG(avg_prediction)::numeric, 2) as daily_avg_ce,
        ROUND(AVG(std_prediction)::numeric, 2) as daily_avg_std
    FROM ml.prediction_logs
    WHERE run_timestamp >= NOW() - INTERVAL '{days_back} days'
      AND status != 'error'
    GROUP BY run_timestamp::date
    ORDER BY date DESC
    """

    trend = pd.read_sql(query_trend, engine)

    if not trend.empty:
        print(trend.to_string(index=False))

        # Check for significant changes
        if len(trend) >= 2:
            latest_avg = trend.iloc[0]["daily_avg_ce"]
            previous_avg = trend.iloc[1]["daily_avg_ce"]
            change = abs(latest_avg - previous_avg)

            if change > 5:
                print(
                    f"\n⚠️  ALERT: Average prediction changed by {change:.2f}% from previous day!"
                )

    # 4. Active model info
    print("\n\n🤖 ACTIVE MODEL")
    print("-" * 60)

    query_model = """
    SELECT 
        model_name,
        model_version,
        model_type,
        feature_count,
        status,
        created_at::date as registered_date
    FROM ml.model_registry
    WHERE status = 'active'
    ORDER BY created_at DESC
    LIMIT 1
    """

    model_info = pd.read_sql(query_model, engine)

    if not model_info.empty:
        print(model_info.to_string(index=False))
    else:
        print("  No active model registered")

    print(f"\n{'=' * 60}\n")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=7, help="Days to look back")
    args = parser.parse_args()

    monitor_predictions(days_back=args.days)
