"""
Simple migration script to copy users, favorite_cities and user_preferences
from a local SQLite `users.db` into a Postgres database specified by
the `DATABASE_URL` environment variable.

Usage (local machine):
    python migrate_sqlite_to_postgres.py

Requirements: `psycopg[binary]` installed and access to target Postgres DB.
"""
import os
import sqlite3
from pathlib import Path

try:
    import psycopg
except Exception as e:
    raise SystemExit("psycopg is required to run this script. Install psycopg[binary].")

DATABASE_URL = os.getenv("DATABASE_URL")
USERS_DB_PATH = os.getenv("USERS_DB_PATH") or str(Path(__file__).parent / "users.db")

if not DATABASE_URL:
    raise SystemExit("DATABASE_URL not set. Set DATABASE_URL to your Postgres connection string.")

if not Path(USERS_DB_PATH).exists():
    raise SystemExit(f"SQLite DB not found at {USERS_DB_PATH}")

print(f"Migrating {USERS_DB_PATH} -> {DATABASE_URL}")

# Read from SQLite
src_conn = sqlite3.connect(USERS_DB_PATH)
src_conn.row_factory = sqlite3.Row
src_cur = src_conn.cursor()

# Connect to Postgres
pg_conn = psycopg.connect(DATABASE_URL)
pg_cur = pg_conn.cursor()

# Ensure target tables exist by using the auth module init (import triggers init)
print("Ensuring target tables exist (calling Backend.auth.init_db)")
try:
    # Importing Backend.auth will call init_db() on import and create Postgres tables
    from Backend.auth import init_db as _init_db
    _init_db()
except Exception as e:
    print("Warning: could not auto-init via auth.init_db():", e)

# Helper to copy rows from a table
def copy_table(table, columns, insert_sql):
    src_cur.execute(f"SELECT {', '.join(columns)} FROM {table}")
    rows = src_cur.fetchall()
    print(f"Copying {len(rows)} rows into {table}")
    for r in rows:
        vals = [r[c] for c in columns]
        try:
            pg_cur.execute(insert_sql, tuple(vals))
        except Exception as e:
            # On conflict, skip (e.g., duplicate emails)
            pg_conn.rollback()
            print(f"Skipping row due to error: {e}")
        else:
            pg_conn.commit()

# Copy users
copy_table(
    "users",
    ["email", "name", "password_hash", "created_at"],
    "INSERT INTO users (email, name, password_hash, created_at) VALUES (%s, %s, %s, %s) ON CONFLICT (email) DO NOTHING",
)

# Copy user_preferences (user_id mapping should be consistent if emails existed before)
# We'll attempt to map by email -> id
src_cur.execute("SELECT id, email FROM users")
email_map = {r['id']: r['email'] for r in src_cur.fetchall()}

for src_user_id, email in email_map.items():
    # find dest user id
    pg_cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    dest = pg_cur.fetchone()
    if not dest:
        continue
    dest_user_id = dest[0]
    # copy preference if exists
    src_cur.execute("SELECT theme, notifications_enabled, alert_threshold FROM user_preferences WHERE user_id = ?", (src_user_id,))
    pref = src_cur.fetchone()
    if pref:
        try:
            pg_cur.execute(
                "INSERT INTO user_preferences (user_id, theme, notifications_enabled, alert_threshold) VALUES (%s, %s, %s, %s) ON CONFLICT (user_id) DO NOTHING",
                (dest_user_id, pref[0], bool(pref[1]), pref[2]),
            )
            pg_conn.commit()
        except Exception as e:
            pg_conn.rollback()
            print("Warning copying preference:", e)

# Copy favorite_cities
src_cur.execute("SELECT user_id, city_name, added_at FROM favorite_cities")
fav_rows = src_cur.fetchall()
print(f"Copying {len(fav_rows)} favorite rows")
for r in fav_rows:
    src_user_id = r[0]
    email = email_map.get(src_user_id)
    if not email:
        continue
    pg_cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    dest = pg_cur.fetchone()
    if not dest:
        continue
    dest_user_id = dest[0]
    try:
        pg_cur.execute(
            "INSERT INTO favorite_cities (user_id, city_name, added_at) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
            (dest_user_id, r[1], r[2]),
        )
        pg_conn.commit()
    except Exception as e:
        pg_conn.rollback()
        print("Warning copying favorite:", e)

print("Migration complete.")

src_conn.close()
pg_conn.close()
