import os
from pathlib import Path

print("cwd:", os.getcwd())
print("__file__:", Path(__file__).resolve())
print("USERS_DB_PATH env:", os.getenv("USERS_DB_PATH"))
print("/data exists:", Path("/data").exists())