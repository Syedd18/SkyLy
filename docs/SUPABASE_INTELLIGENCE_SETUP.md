# Supabase Setup for SkyLy Intelligence Engine

## 🎯 Overview
The intelligence engine stores all live AQI data, forecasts, and model metadata in **Supabase PostgreSQL**.

---

## 📋 Setup Steps

### 1. Get Your Supabase Database URL

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create new)
3. Navigate to: **Settings** → **Database**
4. Copy the **Connection String (URI)** under "Connection Pooling"
   - Format: `postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres`
   - ⚠️ Use **Port 6543** (pooler) not 5432 (direct)

### 2. Configure Environment

Add to your `.env` file:
```bash
DATABASE_URL=postgresql://postgres.xxxxx:your-password@aws-0-region.pooler.supabase.com:6543/postgres
```

### 3. Run Migrations

```bash
python -m Backend.intelligence.schema
```

Expected output:
```
INTEL DB: ✓ Supabase PostgreSQL schema created/verified (aws-0-region.pooler.supabase.com)
```

---

## 🗄️ Tables Created

The migration creates 4 tables in your Supabase database:

| Table | Purpose | Indexes |
|-------|---------|---------|
| `aqi_measurements` | Live AQI + weather snapshots | `(city, timestamp DESC)` |
| `city_clusters` | City → cluster assignments | `city` (PK) |
| `forecast_cache` | Cached predictions (6h TTL) | `(city, target_time, model_version)` |
| `model_metadata` | Model registry & metrics | `(model_name, version)` |

---

## 🔍 Verify Setup

### Check Tables in Supabase Dashboard
1. Go to **Database** → **Tables**
2. You should see: `aqi_measurements`, `city_clusters`, `forecast_cache`, `model_metadata`

### Test Ingestion
```bash
python Backend/run_ingestion.py
```

Then check in Supabase:
```sql
SELECT COUNT(*), city FROM aqi_measurements 
GROUP BY city 
ORDER BY COUNT(*) DESC 
LIMIT 10;
```

---

## 🔒 Security Notes

- ✅ Use **Connection Pooling** port (6543) for better performance
- ✅ Never commit `.env` file to git
- ✅ Rotate password if leaked
- ✅ Enable Row Level Security (RLS) if needed:
  ```sql
  ALTER TABLE aqi_measurements ENABLE ROW LEVEL SECURITY;
  ```

---

## 🔄 Switching from SQLite to Supabase

If you already have data in SQLite (`intelligence.db`):

1. **Export SQLite data** (optional):
   ```python
   import sqlite3, pandas as pd
   conn = sqlite3.connect('Backend/intelligence.db')
   df = pd.read_sql('SELECT * FROM aqi_measurements', conn)
   df.to_csv('backup_measurements.csv', index=False)
   ```

2. **Set DATABASE_URL** in `.env`

3. **Reimport via ingestion**:
   ```bash
   python Backend/run_ingestion.py
   ```

Data will now flow to Supabase automatically.

---

## ❓ Troubleshooting

### "psycopg not installed"
```bash
pip install psycopg[binary]
```

### "Connection refused"
- Check your DATABASE_URL format
- Verify firewall allows outbound on port 6543
- Try direct connection (port 5432) if pooler fails

### "SSL required"
Add to DATABASE_URL:
```
?sslmode=require
```

---

## 📊 Performance Tips

1. **Connection Pooling**: Always use port 6543 (Supavisor pooler)
2. **Indexes**: Already created on `(city, timestamp DESC)`
3. **Partitioning**: For >1M rows, consider partitioning by month:
   ```sql
   CREATE TABLE aqi_measurements_2026_02 PARTITION OF aqi_measurements
   FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
   ```

---

**Need help?** Check [Supabase Docs](https://supabase.com/docs/guides/database) or run with SQLite fallback (no DATABASE_URL).
