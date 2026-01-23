"""
User Authentication Module
Handles user registration, login, JWT token generation, and password hashing.
Supports Postgres via `DATABASE_URL` (psycopg) and falls back to SQLite using `USERS_DB_PATH`.
"""
import os
import json
from datetime import datetime, timedelta
from typing import Optional
from contextlib import contextmanager
from pathlib import Path
from pathlib import Path as _Path
import sqlite3
import requests
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr

# Try to auto-load a .env file from the repository root if python-dotenv is present.
try:
    from dotenv import load_dotenv as _load_dotenv
    # Prefer a top-level .env (repo root). Fallback to current working dir.
    repo_root = _Path(__file__).resolve().parents[1]
    env_path = repo_root / ".env"
    _load_dotenv(env_path)
except Exception:
    pass

# Optional Postgres driver
try:
    import psycopg
    HAS_PSYCOPG = True
except Exception:
    HAS_PSYCOPG = False

# ---------------- CONFIG ----------------
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

security = HTTPBearer()

# ---------------- Supabase config (optional) ----------------
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY")
# Flags: anon key + URL required for normal Supabase auth operations; service role is optional (admin-only)
SUPABASE_AVAILABLE = bool(SUPABASE_URL and SUPABASE_ANON_KEY)
SUPABASE_SERVICE_AVAILABLE = bool(SUPABASE_SERVICE_ROLE_KEY)

# ---------------- DATABASE CONFIG ----------------
BASE_DIR = Path(__file__).parent
DATABASE_URL = os.getenv("DATABASE_URL")
USERS_DB_PATH = os.getenv("USERS_DB_PATH") or str(BASE_DIR / "users.db")

@contextmanager
def get_conn():
    """Yield a tuple (conn, is_pg). If DATABASE_URL is set, returns a psycopg connection."""
    if DATABASE_URL:
        if not HAS_PSYCOPG:
            raise RuntimeError("psycopg is required to use DATABASE_URL. Install psycopg[binary].")
        conn = psycopg.connect(DATABASE_URL)
        try:
            yield conn, True
        finally:
            conn.close()
    else:
        conn = sqlite3.connect(USERS_DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            yield conn, False
        finally:
            conn.close()

# ---------------- Pydantic models ----------------
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserProfile(BaseModel):
    id: int
    email: str
    name: str
    created_at: str
    favorite_cities: list = []

# ---------------- Database initialization ----------------
def init_db():
    """Create required tables in Postgres or SQLite."""
    with get_conn() as (conn, is_pg):
        cur = conn.cursor()
        if is_pg:
            # Postgres schema
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS favorite_cities (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    city_name TEXT NOT NULL,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, city_name)
                )
                """
            )

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS user_preferences (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER UNIQUE NOT NULL,
                    theme TEXT DEFAULT 'dark',
                    notifications_enabled BOOLEAN DEFAULT TRUE,
                    alert_threshold INTEGER DEFAULT 150
                )
                """
            )
            conn.commit()
        else:
            # SQLite schema
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS favorite_cities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    city_name TEXT NOT NULL,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    UNIQUE(user_id, city_name)
                )
                """
            )

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS user_preferences (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER UNIQUE NOT NULL,
                    theme TEXT DEFAULT 'dark',
                    notifications_enabled BOOLEAN DEFAULT 1,
                    alert_threshold INTEGER DEFAULT 150,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
                """
            )
            conn.commit()

    print("Database initialized successfully")

# Initialize DB on import
try:
    init_db()
except Exception as e:
    print(f"DB init warning: {e}")

# ---------------- Password & JWT helpers ----------------
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash using bcrypt directly."""
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8') if isinstance(hashed_password, str) else hashed_password
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt directly. Truncates to 72 bytes."""
    # Bcrypt has a 72 byte maximum password length
    pw_bytes = password[:72].encode('utf-8')
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pw_bytes, salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------- Supabase helper functions ----------------
def supabase_admin_create_user(email: str, password: str, name: Optional[str] = None) -> dict:
    """Create a user via Supabase Admin API. Requires SUPABASE_SERVICE_ROLE_KEY."""
    # If service role key is available, use admin endpoint (recommended for server-side creation)
    if SUPABASE_SERVICE_AVAILABLE:
        url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/admin/users"
        payload = {"email": email, "password": password, "email_confirm": True}
        if name:
            payload["user_metadata"] = {"name": name}
        headers = {
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
        }
        try:
            r = requests.post(url, data=json.dumps(payload), headers=headers, timeout=10)
        except requests.RequestException as req_err:
            raise HTTPException(status_code=502, detail={"supabase_error": str(req_err)})
        if r.status_code not in (200, 201):
            try:
                err = r.json()
            except Exception:
                err = r.text
            raise HTTPException(status_code=502, detail={"supabase_error": err})
        return r.json()

    # If no service role, fall back to client-side signup endpoint using anon key (self-signup)
    if SUPABASE_AVAILABLE:
        url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/signup"
        payload = {"email": email, "password": password}
        if name:
            payload["data"] = {"name": name}
        headers = {"Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY}
        try:
            r = requests.post(url, data=json.dumps(payload), headers=headers, timeout=10)
        except requests.RequestException as req_err:
            raise HTTPException(status_code=502, detail={"supabase_error": str(req_err)})
        if r.status_code not in (200, 201):
            try:
                err = r.json()
            except Exception:
                err = r.text
            raise HTTPException(status_code=502, detail={"supabase_error": err})
        return r.json()

    raise HTTPException(status_code=500, detail="Supabase not configured on server. Set SUPABASE_URL and SUPABASE_ANON_KEY in environment or .env")


def supabase_sign_in(email: str, password: str) -> dict:
    """Sign in a user using Supabase token endpoint. Returns JSON with access_token etc."""
    if not SUPABASE_AVAILABLE:
        raise HTTPException(status_code=500, detail="Supabase not configured on server. Set SUPABASE_URL and SUPABASE_ANON_KEY in environment or .env")

    url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/token?grant_type=password"
    headers = {"Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY}
    payload = {"email": email, "password": password}
    try:
        r = requests.post(url, data=json.dumps(payload), headers=headers, timeout=10)
    except requests.RequestException as req_err:
        raise HTTPException(status_code=502, detail={"supabase_error": str(req_err)})
    if r.status_code != 200:
        try:
            err = r.json()
        except Exception:
            err = r.text
        raise HTTPException(status_code=401, detail={"supabase_error": err})
    return r.json()


def supabase_get_user_from_token(token: str) -> Optional[dict]:
    """Validate an access token with Supabase and return the user object if valid."""
    if not SUPABASE_AVAILABLE:
        return None

    url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/user"
    headers = {"Authorization": f"Bearer {token}", "apikey": SUPABASE_ANON_KEY}
    try:
        r = requests.get(url, headers=headers, timeout=8)
    except requests.RequestException:
        return None
    if r.status_code != 200:
        return None
    try:
        return r.json()
    except Exception:
        return None


def ensure_local_user_from_supabase(email: str, name: Optional[str] = None) -> int:
    """Ensure a corresponding local user record exists. Returns local user id."""
    existing = get_user_by_email(email)
    if existing:
        return existing["id"] if isinstance(existing, dict) and "id" in existing else existing[0]

    # Insert a placeholder password hash (random) so DB constraints are satisfied
    # Keep password under 72 bytes for bcrypt
    random_pw = os.urandom(16).hex()[:72]
    pw_hash = get_password_hash(random_pw)
    with get_conn() as (conn, is_pg):
        cur = conn.cursor()
        if is_pg:
            cur.execute("INSERT INTO users (email, name, password_hash) VALUES (%s, %s, %s) RETURNING id", (email, name or email, pw_hash))
            user_id = cur.fetchone()[0]
            cur.execute("INSERT INTO user_preferences (user_id) VALUES (%s)", (user_id,))
            conn.commit()
            return user_id
        else:
            cur.execute("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)", (email, name or email, pw_hash))
            user_id = cur.lastrowid
            cur.execute("INSERT INTO user_preferences (user_id) VALUES (?)", (user_id,))
            conn.commit()
            return user_id

# ---------------- DB utility functions ----------------
def _row_to_dict(cursor, row):
    if row is None:
        return None
    cols = [c[0] for c in cursor.description]
    return {cols[i]: row[i] for i in range(len(cols))}

def get_user_by_email(email: str):
    with get_conn() as (conn, is_pg):
        cur = conn.cursor()
        if is_pg:
            cur.execute("SELECT id, email, name, password_hash, created_at FROM users WHERE email = %s", (email,))
            row = cur.fetchone()
            return _row_to_dict(cur, row)
        else:
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("SELECT * FROM users WHERE email = ?", (email,))
            row = cur.fetchone()
            return dict(row) if row else None

def create_user(email: str, name: str, password: str):
    password_hash = get_password_hash(password)
    try:
        with get_conn() as (conn, is_pg):
            cur = conn.cursor()
            if is_pg:
                cur.execute(
                    "INSERT INTO users (email, name, password_hash) VALUES (%s, %s, %s) RETURNING id",
                    (email, name, password_hash),
                )
                user_id = cur.fetchone()[0]
                cur.execute("INSERT INTO user_preferences (user_id) VALUES (%s)", (user_id,))
                conn.commit()
                return user_id
            else:
                cur.execute(
                    "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)",
                    (email, name, password_hash),
                )
                user_id = cur.lastrowid
                cur.execute("INSERT INTO user_preferences (user_id) VALUES (?)", (user_id,))
                conn.commit()
                return user_id
    except Exception as e:
        if isinstance(e, sqlite3.IntegrityError) or (HAS_PSYCOPG and getattr(e, 'pgcode', None) is not None):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        raise

def get_user_favorites(user_id: int):
    with get_conn() as (conn, is_pg):
        cur = conn.cursor()
        if is_pg:
            cur.execute(
                "SELECT city_name, added_at FROM favorite_cities WHERE user_id = %s ORDER BY added_at DESC",
                (user_id,),
            )
            rows = cur.fetchall()
            return [{"city": r[0], "added_at": r[1]} for r in rows]
        else:
            cur.execute(
                "SELECT city_name, added_at FROM favorite_cities WHERE user_id = ? ORDER BY added_at DESC",
                (user_id,),
            )
            return [{"city": row[0], "added_at": row[1]} for row in cur.fetchall()]

def add_favorite_city(user_id: int, city_name: str):
    try:
        with get_conn() as (conn, is_pg):
            cur = conn.cursor()
            if is_pg:
                cur.execute(
                    "INSERT INTO favorite_cities (user_id, city_name) VALUES (%s, %s)",
                    (user_id, city_name),
                )
                conn.commit()
                return True
            else:
                cur.execute(
                    "INSERT INTO favorite_cities (user_id, city_name) VALUES (?, ?)",
                    (user_id, city_name),
                )
                conn.commit()
                return True
    except Exception:
        return False

def remove_favorite_city(user_id: int, city_name: str):
    with get_conn() as (conn, is_pg):
        cur = conn.cursor()
        if is_pg:
            cur.execute(
                "DELETE FROM favorite_cities WHERE user_id = %s AND city_name = %s",
                (user_id, city_name),
            )
            conn.commit()
        else:
            cur.execute(
                "DELETE FROM favorite_cities WHERE user_id = ? AND city_name = ?",
                (user_id, city_name),
            )
            conn.commit()

# ---------------- Authentication dependencies (Supabase-backed) ----------------
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Validate bearer token (backend JWT or Supabase token) and return a local user dict."""
    token = credentials.credentials
    
    # First, try to decode as a backend JWT
    try:
        payload = decode_token(token)
        email = payload.get("sub")
        if email:
            # Token is a valid backend JWT, get user from database
            user = get_user_by_email(email)
            if user:
                return user
    except HTTPException:
        # Not a valid backend JWT, try Supabase validation below
        pass
    
    # Fallback: try to validate via Supabase
    supa_user = supabase_get_user_from_token(token)
    if not supa_user or not supa_user.get("email"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

    email = supa_user.get("email")
    name = None
    # Supabase may return user_metadata
    try:
        name = supa_user.get("user_metadata", {}).get("name") or supa_user.get("aud")
    except Exception:
        name = None

    # Ensure a local profile exists (creates one if missing)
    local_id = ensure_local_user_from_supabase(email, name)
    user = get_user_by_email(email)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))):
    """Optional authentication - returns None if no token provided"""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
