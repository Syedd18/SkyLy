"""Quick check for Supabase env config used by the backend.
Run after installing requirements: `pip install -r requirements.txt`.
"""
import Backend.auth as auth


def mask(s: str) -> str:
    if not s:
        return "(not set)"
    if len(s) > 8:
        return s[:4] + "…" + s[-4:]
    return s


def main():
    print("SUPABASE_URL:", mask(auth.SUPABASE_URL))
    print("SUPABASE_ANON_KEY:", mask(auth.SUPABASE_ANON_KEY))
    print("SUPABASE_SERVICE_ROLE_KEY:", mask(auth.SUPABASE_SERVICE_ROLE_KEY))
    print("SUPABASE_AVAILABLE:", bool(auth.SUPABASE_AVAILABLE))
    print("SUPABASE_SERVICE_AVAILABLE:", bool(auth.SUPABASE_SERVICE_AVAILABLE))


if __name__ == '__main__':
    main()
