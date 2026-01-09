import sqlite3
from pathlib import Path

# Get the database path relative to this script
DB_PATH = Path(__file__).parent / "users.db"

# Check if database exists and has tables
if not DB_PATH.exists():
    print(f"⚠️  Database not found at {DB_PATH}")
    print("Run the backend server first to initialize the database.")
    exit(1)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor() 

# List all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("=" * 60)
print("DATABASE TABLES:")
print("=" * 60)
for table in tables:
    print(f"  - {table[0]}")

print("\n" + "=" * 60)
print("USERS TABLE:")
print("=" * 60)
cursor.execute("SELECT id, email, name, created_at FROM users")
users = cursor.fetchall()
if users:
    print(f"{'ID':<5} {'Email':<30} {'Name':<20} {'Created At'}")
    print("-" * 80)
    for user in users:
        print(f"{user[0]:<5} {user[1]:<30} {user[2]:<20} {user[3]}")
else:
    print("  No users found")

print("\n" + "=" * 60)
print("FAVORITE CITIES:")
print("=" * 60)
cursor.execute("SELECT fc.id, u.name, fc.city_name, fc.added_at FROM favorite_cities fc JOIN users u ON fc.user_id = u.id")
favorites = cursor.fetchall()
if favorites:
    print(f"{'ID':<5} {'User':<20} {'City':<20} {'Added At'}")
    print("-" * 70)
    for fav in favorites:
        print(f"{fav[0]:<5} {fav[1]:<20} {fav[2]:<20} {fav[3]}")
else:
    print("  No favorite cities found")

print("\n" + "=" * 60)
print("USER PREFERENCES:")
print("=" * 60)
cursor.execute("SELECT up.id, u.name, up.theme, up.notifications_enabled, up.alert_threshold FROM user_preferences up JOIN users u ON up.user_id = u.id")
prefs = cursor.fetchall()
if prefs:
    print(f"{'ID':<5} {'User':<20} {'Theme':<10} {'Notifications':<15} {'Alert Threshold'}")
    print("-" * 70)
    for pref in prefs:
        print(f"{pref[0]:<5} {pref[1]:<20} {pref[2]:<10} {'Yes' if pref[3] else 'No':<15} {pref[4]}")
else:
    print("  No preferences found")

conn.close()
print("\n" + "=" * 60)
