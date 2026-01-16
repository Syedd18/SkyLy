import pandas as pd
import numpy as np
import pickle
from sklearn.metrics import mean_absolute_error, r2_score

# ==============================
# PATHS
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
# EVALUATION
# ==============================
def evaluate():
    print("📥 Loading data & model...")

    df = pd.read_csv(DATA_PATH)
    df["date"] = pd.to_datetime(df["date"])

    model = pickle.load(open(MODEL_PATH, "rb"))
    encoder = pickle.load(open(ENCODER_PATH, "rb"))

    df["city_encoded"] = encoder.transform(df["city"])

    df = create_features(df)

    X = df[
        ["city_encoded", "month", "day", "weekday", "lag_1", "lag_7", "lag_14"]
    ]
    y = df["aqi"]

    # ⛔ Time-aware split (NO leakage)
    split_idx = int(len(df) * 0.8)
    X_test = X.iloc[split_idx:]
    y_test = y.iloc[split_idx:]

    print("🧠 Predicting on test set...")
    y_pred = model.predict(X_test)

    # ==============================
    # METRICS
    # ==============================
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(np.mean((y_test - y_pred) ** 2))
    r2 = r2_score(y_test, y_pred)

    print("\n📊 GLOBAL MODEL PERFORMANCE")
    print(f"MAE  : {mae:.2f}")
    print(f"RMSE : {rmse:.2f}")
    print(f"R²   : {r2:.3f}")

    # ==============================
    # CITY-WISE MAE (TOP 10)
    # ==============================
    df_test = df.iloc[split_idx:].copy()
    df_test["predicted_aqi"] = y_pred
    df_test["abs_error"] = abs(df_test["aqi"] - df_test["predicted_aqi"])

    city_mae = (
        df_test.groupby("city")["abs_error"]
        .mean()
        .sort_values()
        .head(10)
    )

    print("\n🏙️ TOP 10 CITIES WITH LOWEST MAE")
    print(city_mae)

# ==============================
# RUN
# ==============================
if __name__ == "__main__":
    evaluate()
