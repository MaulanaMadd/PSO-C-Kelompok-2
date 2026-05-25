import os
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from datetime import timedelta
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from run_predictions import run_daily_predictions

load_dotenv()

def ingest_history():
    print("Starting Historical Ingestion (Last 31 Days)...")
    
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found!")
        return
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
        
    engine = create_engine(db_url)
    
    files = ["../data/potline_1_26.xlsx", "../data/potline_3_26.xlsx"]
    data_frames = []
    
    # 1. Read all data first to find global max date
    print("Reading Excel files to determine date range...")
    for filename in files:
        file_path = os.path.join(os.getcwd(), "backend", filename)
        if not os.path.exists(file_path):
            file_path = os.path.join(os.getcwd(), filename) # try root
        
        if not os.path.exists(file_path):
            print(f"File not found: {filename}")
            continue
            
        print(f"Reading {filename}...")
        try:
            df = pd.read_excel(file_path, dtype=str)
            df.columns = [str(c).strip().lower() for c in df.columns]
            df['source'] = filename
            
            if 'tgl' in df.columns:
                df['dt_parsed'] = pd.to_datetime(df['tgl'], dayfirst=False, errors='coerce')
                data_frames.append(df)
            else:
                print(f"Column 'tgl' not found in {filename}")
        except Exception as e:
            print(f"Error reading {filename}: {e}")

    if not data_frames:
        print("No valid data found.")
        return

    # 2. Combine to find Max Date
    all_dates = pd.concat([d['dt_parsed'] for d in data_frames])
    max_date = all_dates.max()
    
    if pd.isna(max_date):
        print("Could not determine max date.")
        return
        
    start_date = max_date - timedelta(days=30) # 31 days total including max_date
    print(f"Date Range: {start_date.date()} to {max_date.date()}")
    
    # 3. Truncate STG
    print("Truncating staging table...")
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE stg.pot_daily_ingest;"))
        
    # 4. Filter and Insert
    total_rows = 0
    for df in data_frames:
        mask = (df['dt_parsed'] >= start_date) & (df['dt_parsed'] <= max_date)
        filtered_df = df[mask].copy()
        
        # Cleanup temp col
        filtered_df = filtered_df.drop(columns=['dt_parsed'])
        filtered_df['ingested_at'] = pd.Timestamp.now()
        
        if filtered_df.empty:
            continue
            
        print(f"Inserting {len(filtered_df)} rows from {filtered_df['source'].iloc[0]}...")
        
        # Insert
        try:
            filtered_df.to_sql(
                "pot_daily_ingest",
                engine,
                schema="stg",
                if_exists="append",
                index=False,
                method="multi",
                chunksize=1000
            )
            total_rows += len(filtered_df)
        except Exception as e:
            print(f"Insert failed: {e}")
            
    print(f"Ingestion complete. Total {total_rows} rows inserted to STG.")
    
    # 5. Run ETL and Predictions
    print("Triggering ETL processing...")
    run_daily_predictions()

if __name__ == "__main__":
    ingest_history()
