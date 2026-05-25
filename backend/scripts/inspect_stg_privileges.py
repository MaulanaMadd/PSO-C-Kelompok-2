import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'), override=True)
db_url = os.getenv('DATABASE_URL')
print('DB URL:', db_url)
engine = create_engine(db_url)
with engine.connect() as conn:
    current_user = conn.execute(text('SELECT current_user')).scalar()
    print('current_user:', current_user)
    exists = conn.execute(text("SELECT schema_name FROM information_schema.schemata WHERE schema_name='stg' ")).scalar()
    print('stg exists:', bool(exists))
    rows = conn.execute(text("SELECT nspname, nspowner, pg_get_userbyid(nspowner) as owner FROM pg_namespace WHERE nspname='stg'"))
    print('namespace rows:')
    for r in rows:
        print(r)
    privs = conn.execute(text("SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_schema='stg' ORDER BY grantee, privilege_type"))
    print('role_table_grants:')
    for r in privs:
        print(r)
    schema_acl = conn.execute(text("SELECT nspacl FROM pg_namespace WHERE nspname='stg'"))
    print('pg_namespace ACL:')
    for r in schema_acl:
        print(r)
    has_usage = conn.execute(text("SELECT has_schema_privilege(current_user, 'stg', 'USAGE') as has_usage, has_schema_privilege(current_user, 'stg', 'CREATE') as has_create"))
    print('schema usage privileges for current_user:')
    for r in has_usage:
        print(r)
    has_usage_optina = conn.execute(text("SELECT has_schema_privilege('optina_user', 'stg', 'USAGE') as optina_usage, has_schema_privilege('optina_user', 'stg', 'CREATE') as optina_create"))
    print('schema usage privileges for optina_user:')
    for r in has_usage_optina:
        print(r)
