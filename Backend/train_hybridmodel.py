# train_lstm_aqi_prediction_dataset_seeded.py

import os
import math
import random
import numpy as np
import pandas as pd

from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error

import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
from tensorflow.keras.callbacks import EarlyStopping

# ------------ REPRODUCIBILITY ------------

SEED = 42  # change this if you want a different deterministic run

np.random.seed(SEED)
tf.random.set_seed(SEED)
random.seed(SEED)

# ------------ CONFIG ------------

CSV_PATH = r"C:\Users\acer\Air Pollution\Backend\Dataset\city_day.csv"
MODELS_DIR = r"C:\Users\acer\Air Pollution\Backend\models"

SEQ_LEN = 30      # days of history
TEST_RATIO = 0.2  # last 20% as test
EPOCHS = 60
BATCH_SIZE = 32

os.makedirs(MODELS_DIR, exist_ok=True)


def mape(y_true, y_pred):
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    return np.mean(
        np.abs((y_true - y_pred) / np.clip(np.abs(y_true), 1e-6, None))
    ) * 100


# ------------ 1. LOAD & PREPARE DATA ------------

df = pd.read_csv(CSV_PATH)

df["Date"] = pd.to_datetime(
    df["Date"].astype(str).str.strip(),
    format="mixed",
    dayfirst=True,
    errors="coerce"
)
df = df.dropna(subset=["Date"])
df = df.sort_values("Date").reset_index(drop=True)

df = df.dropna(subset=["AQI"])

feature_cols = [
    "PM2.5", "PM10", "NO2", "NOx", "CO", "SO2", "O3",
    "temp", "max_temp", "min_temp", "humid", "visible", "wind"
]
target_col = "AQI"

for col in feature_cols + [target_col]:
    df[col] = df[col].interpolate().ffill().bfill()

# ------------ 2. TRAIN / TEST SPLIT ------------

n = len(df)
split_idx = int((1 - TEST_RATIO) * n)
train_df = df.iloc[:split_idx].copy()
test_df = df.iloc[split_idx - SEQ_LEN:].copy()  # overlap for sequences

# ------------ 3. SCALING ------------

feat_scaler = MinMaxScaler()
train_df[feature_cols] = feat_scaler.fit_transform(train_df[feature_cols])
test_df[feature_cols] = feat_scaler.transform(test_df[feature_cols])

aqi_scaler = MinMaxScaler()
train_df[[target_col]] = aqi_scaler.fit_transform(train_df[[target_col]])
test_df[[target_col]] = aqi_scaler.transform(test_df[[target_col]])


def build_sequences(df_seq, seq_len, feature_cols, target_col):
    feats = df_seq[feature_cols].values
    target = df_seq[target_col].values
    X, y = [], []
    for i in range(len(df_seq) - seq_len):
        X.append(feats[i:i + seq_len])
        y.append(target[i + seq_len])
    return np.array(X), np.array(y)


X_train, y_train = build_sequences(train_df, SEQ_LEN, feature_cols, target_col)
X_test, y_test = build_sequences(test_df, SEQ_LEN, feature_cols, target_col)

print("Train shape:", X_train.shape, "Test shape:", X_test.shape)

# ------------ 4. BUILD & TRAIN LSTM (ORIGINAL ARCH) ------------

n_features = X_train.shape[2]

model = Sequential()
model.add(LSTM(64, activation="tanh", return_sequences=True,
               input_shape=(SEQ_LEN, n_features)))
model.add(LSTM(32, activation="tanh"))
model.add(Dense(1))
model.compile(optimizer="adam", loss="mse")

es = EarlyStopping(
    monitor="val_loss",
    patience=6,
    restore_best_weights=True
)

# shuffle=False for full determinism with fixed seed
history = model.fit(
    X_train,
    y_train,
    validation_split=0.1,
    epochs=EPOCHS,
    batch_size=BATCH_SIZE,
    shuffle=False,
    verbose=1,
    callbacks=[es]
)

# ------------ 5. EVALUATE (UNSCALE AQI) ------------

y_pred_scaled = model.predict(X_test).flatten()
y_pred = aqi_scaler.inverse_transform(y_pred_scaled.reshape(-1, 1)).flatten()
y_true = aqi_scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()

mae = mean_absolute_error(y_true, y_pred)
rmse = math.sqrt(mean_squared_error(y_true, y_pred))
mape_val = mape(y_true, y_pred)

print("\n=== Seeded LSTM on AQI_prediction_dataset ===")
print(f"MAE : {mae:.3f}")
print(f"RMSE: {rmse:.3f}")
print(f"MAPE: {mape_val:.2f}%")

# ------------ 6. SAVE MODEL & METRICS (NO OVERWRITE) ------------

# unique filename with MAPE & seed so best model is never overwritten
model_filename = f"lstm_aqi_prediction_dataset_mape{mape_val:.2f}_seed{SEED}.keras"
model_path = os.path.join(MODELS_DIR, model_filename)
model.save(model_path)
print("Saved LSTM model to:", model_path)

metrics_df = pd.DataFrame([{
    "MAE": mae,
    "RMSE": rmse,
    "MAPE": mape_val,
    "SEQ_LEN": SEQ_LEN,
    "EPOCHS": EPOCHS,
    "BATCH_SIZE": BATCH_SIZE,
    "SEED": SEED
}])
metrics_filename = f"lstm_aqi_prediction_dataset_metrics_mape{mape_val:.2f}_seed{SEED}.csv"
metrics_path = os.path.join(MODELS_DIR, metrics_filename)
metrics_df.to_csv(metrics_path, index=False)
print("Saved metrics to:", metrics_path)

# ------------ 7. TEST MODEL ON RANDOM REALISTIC DATA ------------

# Use min/max from *unscaled* training data to generate realistic random inputs
raw_train = df.iloc[:split_idx]  # before scaling

feature_mins = raw_train[feature_cols].min()
feature_maxs = raw_train[feature_cols].max()


def generate_random_sample():
    """Generate one random feature row within observed ranges (original units)."""
    random_values = {}
    for col in feature_cols:
        low = feature_mins[col]
        high = feature_maxs[col]
        random_values[col] = np.random.uniform(low, high)
    return random_values


# Random sequence of SEQ_LEN days (unscaled)
random_rows = [generate_random_sample() for _ in range(SEQ_LEN)]
random_df_unscaled = pd.DataFrame(random_rows)

# Scale with the same feature scaler
random_scaled = feat_scaler.transform(random_df_unscaled[feature_cols])

# Reshape to [1, SEQ_LEN, n_features]
X_random = random_scaled.reshape(1, SEQ_LEN, n_features)

# Predict and unscale AQI
random_pred_scaled = model.predict(X_random).flatten()[0]
random_pred_aqi = float(aqi_scaler.inverse_transform([[random_pred_scaled]])[0, 0])

print("\n=== Random input test (unscaled example) ===")
print("First random day (original units):")
print(random_df_unscaled.iloc[0])
print(f"\nPredicted AQI for random sequence: {random_pred_aqi:.2f}")
