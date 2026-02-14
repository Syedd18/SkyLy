"""
Simple migration script to copy users, favorite_cities and user_preferences
from a local SQLite `users.db` into a MongoDB database specified by
the `MONGODB_URI` environment variable.

Usage (local machine):
    pip install pymongo dnspython
    python migrate_sqlite_to_mongodb.py

Notes:
- Set `MONGODB_URI` (include database name) or set `MONGODB_URI` and `MONGODB_DB`.
- If using `mongodb+srv://` URIs, ensure `dnspython` is installed.
"""
import os
import sqlite3
from pathlib import Path

try:
    from pymongo import MongoClient, errors
except Exception:
    raise SystemExit("pymongo is required to run this script. Install pymongo and dnspython.")

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB")
USERS_DB_PATH = os.getenv("USERS_DB_PATH") or str(Path(__file__).parent / "users.db")

if not MONGODB_URI:
    raise SystemExit("MONGODB_URI not set. Set MONGODB_URI to your MongoDB connection string.")

if not Path(USERS_DB_PATH).exists():
    raise SystemExit(f"SQLite DB not found at {USERS_DB_PATH}")

print(f"Migrating {USERS_DB_PATH} -> MongoDB ({'explicit DB ' + MONGODB_DB if MONGODB_DB else 'DB from URI'})")

# Read from SQLite
src_conn = sqlite3.connect(USERS_DB_PATH)
src_conn.row_factory = sqlite3.Row
src_cur = src_conn.cursor()

# Connect to MongoDB
client = MongoClient(MONGODB_URI)
try:
    if MONGODB_DB:
        db = client[MONGODB_DB]
    else:
        db = client.get_default_database()
except Exception:
    raise SystemExit("Could not determine target MongoDB database. Set MONGODB_DB or include DB in the URI.")

users_coll = db.get_collection("users")
prefs_coll = db.get_collection("user_preferences")
fav_coll = db.get_collection("favorite_cities")

# Ensure unique index on email for users
try:
    users_coll.create_index("email", unique=True)
except errors.OperationFailure as e:
    print("Warning creating index on users.email:", e)

def copy_users():
    src_cur.execute("SELECT id, email, name, password_hash, created_at FROM users")
    rows = src_cur.fetchall()
    print(f"Copying {len(rows)} users")
    for r in rows:
        doc = {
            "email": r["email"],
            "name": r["name"],
            "password_hash": r["password_hash"],
            "created_at": r["created_at"],
        }
        try:
            # Upsert by email, do not overwrite existing fields except those provided
            users_coll.update_one({"email": doc["email"]}, {"$setOnInsert": doc}, upsert=True)
        except Exception as e:
            print("Warning inserting user:", e)

def copy_preferences(email_map):
    # Map sqlite user_id -> email, then attach preferences to the user in prefs_coll
    for src_user_id, email in email_map.items():
        src_cur.execute("SELECT theme, notifications_enabled, alert_threshold FROM user_preferences WHERE user_id = ?", (src_user_id,))
        pref = src_cur.fetchone()
        if not pref:
            continue
        user = users_coll.find_one({"email": email})
        if not user:
            continue
        pref_doc = {
            "user_id": user.get("_id"),
            "theme": pref[0],
            "notifications_enabled": bool(pref[1]),
            "alert_threshold": pref[2],
        }
        try:
            prefs_coll.update_one({"user_id": pref_doc["user_id"]}, {"$set": pref_doc}, upsert=True)
        except Exception as e:
            print("Warning inserting preference:", e)

def copy_favorites(email_map):
    src_cur.execute("SELECT user_id, city_name, added_at FROM favorite_cities")
    rows = src_cur.fetchall()
    print(f"Copying {len(rows)} favorite rows")
    for r in rows:
        src_user_id = r[0]
        email = email_map.get(src_user_id)
        if not email:
            continue
        user = users_coll.find_one({"email": email})
        if not user:
            continue
        fav_doc = {
            "user_id": user.get("_id"),
            "city_name": r[1],
            "added_at": r[2],
        }
        try:
            fav_coll.update_one({"user_id": fav_doc["user_id"], "city_name": fav_doc["city_name"]}, {"$set": fav_doc}, upsert=True)
        except Exception as e:
            print("Warning inserting favorite:", e)

def main():
    # Copy users
    copy_users()

    # Build email map from sqlite id -> email
    src_cur.execute("SELECT id, email FROM users")
    email_map = {r["id"]: r["email"] for r in src_cur.fetchall()}

    # Copy preferences
    copy_preferences(email_map)

    # Copy favorite cities
    copy_favorites(email_map)

    print("Migration to MongoDB complete.")

if __name__ == "__main__":
    main()
