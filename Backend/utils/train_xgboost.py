import pandas as pd
import numpy as np
import pickle
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBRegressor
from datetime import datetime

# ==============================
# PATHS (CHANGE ONLY IF NEEDED)
# ==============================
DATA_PATH = r"C:\Users\acer\Air Pollution\Backend\Dataset\aqi_timeseries.csv"
MODEL_PATH = r"C:\Users\acer\Air Pollution\Backend\forecasting\global_aqi_model.pkl"
ENCODER_PATH = r"C:\Users\acer\Air Pollution\Backend\forecasting\city_encoder.pkl"

# ==============================
# FEATURE ENGINEERING
# ==============================
def create_features(df):
    df = df.copy()

    df["month"] = df["date"].dt.month
    df["day"] = df["date"].dt.day
    df["weekday"] = df["date"].dt.weekday

    df["lag_1"] = df.groupby("city")["aqi"].shift(1)
    df["lag_7"] = df.groupby("city")["aqi"].shift(7)
    df["lag_14"] = df.groupby("city")["aqi"].shift(14)

    return df.dropna()

# ==============================
# TRAIN MODEL
# ==============================
def train_model():
    print("📥 Loading dataset...")
    df = pd.read_csv(DATA_PATH)
    df["date"] = pd.to_datetime(df["date"])

    print("📊 Records:", len(df))
    print("🏙 Cities:", df["city"].nunique())

    # Encode city
    le = LabelEncoder()
    df["city_encoded"] = le.fit_transform(df["city"])

    df = create_features(df)

    X = df[
        ["city_encoded", "month", "day", "weekday", "lag_1", "lag_7", "lag_14"]
    ]
    y = df["aqi"]

    model = XGBRegressor(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="reg:squarederror",
        random_state=42
    )

    print("🧠 Training global AQI model...")
    model.fit(X, y)

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)

    with open(ENCODER_PATH, "wb") as f:
        pickle.dump(le, f)

    print("✅ SINGLE GLOBAL AQI MODEL SAVED")
    print("📁", MODEL_PATH)

# ==============================
# PREDICT AQI
# ==============================
def predict_aqi(city, future_date):
    model = pickle.load(open(MODEL_PATH, "rb"))
    le = pickle.load(open(ENCODER_PATH, "rb"))

    df = pd.read_csv(DATA_PATH)
    df["date"] = pd.to_datetime(df["date"])

    city_df = df[df["city"] == city].sort_values("date")

    if len(city_df) < 15:
        raise ValueError("Not enough historical data for this city")

    future_date = pd.to_datetime(future_date)

    features = {
        "city_encoded": le.transform([city])[0],
        "month": future_date.month,
        "day": future_date.day,
        "weekday": future_date.weekday(),
        "lag_1": city_df.iloc[-1]["aqi"],
        "lag_7": city_df.iloc[-7]["aqi"],
        "lag_14": city_df.iloc[-14]["aqi"]
    }

    X = pd.DataFrame([features])
    prediction = model.predict(X)[0]

    return round(prediction, 2)

# ==============================
# RUN
# ==============================
if __name__ == "__main__":
    # 1️⃣ Train model (run once)
    train_model()

    # 2️⃣ Example prediction
    city_name = "Nalbari"
    date_to_predict = "2025-05-10"

    pred = predict_aqi(city_name, date_to_predict)
    print(f"\n📈 Predicted AQI for {city_name} on {date_to_predict}: {pred}")
