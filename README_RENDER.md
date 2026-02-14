# Deploying SkyLy to Render

This guide covers deploying the backend to Render with **Supabase PostgreSQL** for the intelligence engine.

---

## 🗄️ Database Architecture

| Component | Storage | Purpose |
|-----------|---------|---------|
| **User Auth** | SQLite (Render Disk) | User accounts, JWT tokens, favorites |
| **Intelligence Engine** | Supabase PostgreSQL | Live AQI data, forecasts, clusters, models |

---

## 📋 Prerequisites

1. **Render Account** → [render.com](https://render.com)
2. **Supabase Account** → [supabase.com](https://supabase.com)
3. **Git Repository** (GitHub/GitLab)

---

## 🚀 Deployment Steps

### 1. Setup Supabase Database

Follow [docs/SUPABASE_INTELLIGENCE_SETUP.md](docs/SUPABASE_INTELLIGENCE_SETUP.md):
- Create Supabase project
- Get DATABASE_URL (Connection Pooling string, port 6543)
- Run migrations locally to verify

### 2. Create Render Web Service

1. Connect your Git repository
2. **Build Command:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Start Command:**
   ```bash
   bash ./render_start.sh
   ```

### 3. Configure Persistent Disk (for SQLite auth DB)

- Enable **Render Persistent Disk**
- Mount at: `/data`

### 4. Environment Variables

Set in Render → Service → Environment:

#### Required
```bash
# Authentication
SECRET_KEY=your-32-char-random-secret
USERS_DB_PATH=/data/users.db

# WAQI API
WAQI_TOKEN=your_waqi_api_token

# Intelligence Engine (Supabase)
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres
```

#### Optional
```bash
# Supabase Auth (if using)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Google Gemini Chatbot
GEMINI_API_KEY=your_gemini_key

# AWS Backups
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name
```

### 5. Deploy & Verify

After deployment:

1. **Check health:**
   ```bash
   curl https://your-app.onrender.com/
   ```

2. **Verify intelligence engine:**
   ```bash
   curl https://your-app.onrender.com/api/intelligence/health
   ```
   Expected: `"status": "operational"`

3. **Trigger data ingestion:**
   ```bash
   curl -X POST https://your-app.onrender.com/api/intelligence/ingest
   ```

4. **Train model:**
   ```bash
   curl -X POST https://your-app.onrender.com/api/intelligence/train
   ```

---

## 🔄 Intelligence Engine Workflow

### Initial Setup (run once)
```bash
# 1. Ingest live data (30 seconds)
POST /api/intelligence/ingest

# 2. Compute city clusters (1 minute)
POST /api/intelligence/cluster

# 3. Train forecasting model (5 minutes)
POST /api/intelligence/train
```

### Regular Operations (automated)
- **Ingestion**: Run hourly via cron or background thread
- **Model retraining**: Weekly or when MAE degrades

---

## 📊 Monitoring

Check Render logs for:
```
✓ Intelligence engine router loaded
✓ Supabase PostgreSQL schema created/verified
```

Check Supabase Dashboard:
- **Database → Tables** → Verify `aqi_measurements` has data
- **Database → Logs** → Check query performance

---

## 🔒 Security Notes

- ✅ Use **Connection Pooling** (port 6543) for Supabase
- ✅ Rotate DATABASE_URL password if exposed
- ✅ Enable Render's auto-deploy on push
- ✅ Use Render's built-in SSL (HTTPS)

---

## 🔧 Troubleshooting

### "Intelligence engine not loaded"
- Check `DATABASE_URL` is set correctly
- Verify `psycopg[binary]` in requirements.txt
- Check Render logs for import errors

### "No clusters computed"
- Run: `POST /api/intelligence/cluster`
- Check Supabase `city_clusters` table

### "No model trained"
- Run: `POST /api/intelligence/train`
- Check Render CPU/memory limits (training needs 1GB+ RAM)

---

## 📈 Scaling Tips

1. **Increase Render Plan**: Standard+ for model training
2. **Connection Pooling**: Supabase handles this automatically (port 6543)
3. **Cache Forecasts**: 6-hour TTL in `forecast_cache` table
4. **Async Ingestion**: Background thread instead of API calls

---

## 🗂️ Optional: Scheduled Tasks

Create Render Cron Jobs:

**Hourly Data Ingestion:**
```bash
python -c "from Backend.intelligence.ingestion import run_ingestion, INDIAN_CITIES; run_ingestion(INDIAN_CITIES)"
```

**Weekly Model Retraining:**
```bash
python -m Backend.intelligence.forecasting
```

---

**Need help?** Check logs in Render Dashboard or Supabase Dashboard → Database → Logs.
