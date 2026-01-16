import pandas as pd
import numpy as np
import joblib

from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor

# =============================
# LOAD DATA
# =============================
CSV_PATH = "Backend/Dataset/city_day_corrected.csv"
df = pd.read_csv(CSV_PATH)
df = df.dropna()

df["Datetime"] = pd.to_datetime(df["Datetime"])
df["year"] = df["Datetime"].dt.year
df["month"] = df["Datetime"].dt.month
df["day"] = df["Datetime"].dt.day

# =============================
# ENCODE CITY
# =============================
city_encoder = LabelEncoder()
df["city_encoded"] = city_encoder.fit_transform(df["City"])

# =============================
# FEATURES & TARGET
# =============================
FEATURES = [
    "city_encoded",
    "PM2.5", "PM10", "NO", "NO2", "NOx",
    "NH3", "CO", "SO2", "O3",
    "Benzene", "Toluene", "Xylene",
    "year", "month", "day"
]

TARGET = "AQI_corrected"

X = df[FEATURES]
y = df[TARGET]

# =============================
# TRAIN / TEST SPLIT
# =============================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# =============================
# MODEL
# =============================
model = XGBRegressor(
    n_estimators=400,
    max_depth=8,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="reg:squarederror",
    random_state=42
)

model.fit(X_train, y_train)

# =============================
# EVALUATION
# =============================
y_pred = model.predict(X_test)

rmse = np.sqrt(mean_squared_error(y_test, y_pred))
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print("\n📊 MODEL PERFORMANCE")
print(f"RMSE : {rmse:.2f}")
print(f"MAE  : {mae:.2f}")
print(f"R²   : {r2:.4f}")

# =============================
# SAVE ARTIFACTS
# =============================
joblib.dump(model, "Backend/models/xgb_aqi_model.pkl")
joblib.dump(city_encoder, "Backend/models/city_encoder.pkl")
joblib.dump(FEATURES, "Backend/models/feature_columns.pkl")

print("\n✅ Model + encoders saved")