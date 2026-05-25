import os
from pathlib import Path
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

def apply_schema():
    print("Applying schema...")
    db_url = os.getenv("DATABASE_URL")
    if db_url.startswith("postgres://"): db_url = db_url.replace("postgres://", "postgresql://", 1)
    engine = create_engine(db_url)
    
    # Read schema file from backend root
    schema_path = Path(__file__).resolve().parent.parent / 'schema.sql'
    with open(schema_path, "r") as f:
        sql = f.read()
        
    # Execute
    # Splitting by statement might be safer if the driver doesn't support multi-statement
    # Postgres usually supports it in one go via psycopg2
    try:
        with engine.begin() as conn:
            conn.execute(text(sql))
        print("Schema applied successfully.")
    except Exception as e:
        print(f"Error applying schema: {e}")

if __name__ == "__main__":
    apply_schema()
