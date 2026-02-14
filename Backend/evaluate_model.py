"""
Model Evaluation & Visualization Script
Generates comprehensive metrics and plots for the XGBoost forecasting model.
"""
import sys
from pathlib import Path
# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, mean_absolute_percentage_error

# Set style
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (12, 8)

# Paths
MODELS_DIR = Path(__file__).parent / "models"
OUTPUT_DIR = Path(__file__).parent / "model_evaluation"
OUTPUT_DIR.mkdir(exist_ok=True)

def load_model_and_data():
    """Load the trained model and generate predictions on test set."""
    import joblib
    from Backend.intelligence.forecasting import train_forecasting_model, create_features, load_all_clusters
    from Backend.intelligence.schema import get_intel_conn
    
    # Check if model exists
    model_path = MODELS_DIR / "forecast_xgb.pkl"
    if not model_path.exists():
        print("No model found, training now...")
        train_forecasting_model(use_live_data=True)
    
    # Load model
    model = joblib.load(model_path)
    
    # Load metrics
    metrics_path = MODELS_DIR / "forecast_metrics.json"
    with open(metrics_path) as f:
        metrics = json.load(f)
    
    # Load feature columns
    with open(MODELS_DIR / "forecast_features.json") as f:
        feature_cols = json.load(f)
    
    # --- Step 1: Load CSV base data ---
    csv_path = Path(__file__).parent / "Dataset" / "aqi_timeseries.csv"
    print(f"Loading CSV data from {csv_path}")
    csv_df = pd.read_csv(csv_path)
    csv_df["date"] = pd.to_datetime(csv_df["date"], dayfirst=True, errors="coerce")
    print(f"  CSV records: {len(csv_df):,}, cities: {csv_df['city'].nunique()}")
    
    # --- Step 2: Load live Supabase data ---
    live_df = None
    try:
        with get_intel_conn() as (conn, is_pg):
            if is_pg:
                cur = conn.cursor()
                cur.execute("SELECT city, timestamp, aqi, temp, humidity, wind_speed FROM aqi_measurements ORDER BY timestamp")
                rows = cur.fetchall()
                if rows:
                    live_df = pd.DataFrame(rows, columns=["city", "timestamp", "aqi", "temp", "humidity", "wind_speed"])
            else:
                rows = conn.execute("SELECT city, timestamp, aqi, temp, humidity, wind_speed FROM aqi_measurements ORDER BY timestamp").fetchall()
                if rows:
                    live_df = pd.DataFrame(rows, columns=["city", "timestamp", "aqi", "temp", "humidity", "wind_speed"])
            
            if live_df is not None and len(live_df) > 0:
                live_df["date"] = pd.to_datetime(live_df["timestamp"], errors="coerce")
                # Remove timezone info to match CSV data (timezone-naive)
                if live_df["date"].dt.tz is not None:
                    live_df["date"] = live_df["date"].dt.tz_localize(None)
                print(f"  Live DB records: {len(live_df):,}, cities: {live_df['city'].nunique()}")
    except Exception as e:
        print(f"  ⚠ Failed to load live data: {e}")
        live_df = None
    
    # --- Step 3: Merge CSV + live data (same as training) ---
    if live_df is not None and len(live_df) > 0:
        csv_df["source"] = "csv"
        live_df["source"] = "database"
        
        # CSV doesn't have weather
        for col in ["temp", "humidity", "wind_speed"]:
            if col not in csv_df.columns:
                csv_df[col] = 0.0
        
        # Create merge keys
        csv_df["merge_key"] = csv_df["city"].str.lower() + "_" + csv_df["date"].dt.strftime("%Y-%m-%d")
        live_df["merge_key"] = live_df["city"].str.lower() + "_" + live_df["date"].dt.strftime("%Y-%m-%d")
        
        # Remove CSV rows that overlap with live data
        overlap_keys = set(live_df["merge_key"].dropna())
        csv_filtered = csv_df[~csv_df["merge_key"].isin(overlap_keys)]
        
        df = pd.concat([csv_filtered, live_df], ignore_index=True)
        df = df.drop(columns=["merge_key", "source", "timestamp"], errors="ignore")
        print(f"  Merged dataset: {len(df):,} records ({len(csv_filtered):,} CSV + {len(live_df):,} live)")
    else:
        df = csv_df
        for col in ["temp", "humidity", "wind_speed"]:
            if col not in df.columns:
                df[col] = 0.0
        print(f"  Using CSV only: {len(df):,} records")
    
    # Clean and sort
    df = df.dropna(subset=["date", "aqi"])
    df = df.sort_values(["city", "date"])
    
    # Create features
    cluster_map = load_all_clusters()
    df, label_encoder = create_features(df, cluster_map)
    df = df.dropna(subset=feature_cols)
    
    # Same 80/20 split as training
    split_idx = int(len(df) * 0.8)
    test_df = df.iloc[split_idx:].copy()
    
    X_test = test_df[feature_cols]
    y_test = test_df['aqi'].values
    
    # Generate predictions
    print(f"Generating predictions for {len(X_test):,} test samples...")
    y_pred = model.predict(X_test)
    
    return model, X_test, y_test, y_pred, test_df, metrics, feature_cols


def plot_actual_vs_predicted(y_test, y_pred):
    """Scatter plot: Actual vs Predicted AQI."""
    fig, ax = plt.subplots(figsize=(10, 8))
    
    # Scatter plot
    ax.scatter(y_test, y_pred, alpha=0.3, s=10, color='#2196F3')
    
    # Perfect prediction line
    min_val, max_val = y_test.min(), y_test.max()
    ax.plot([min_val, max_val], [min_val, max_val], 'r--', lw=2, label='Perfect Prediction')
    
    # Metrics text
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    textstr = f'MAE: {mae:.2f}\nRMSE: {rmse:.2f}\nR²: {r2:.4f}'
    props = dict(boxstyle='round', facecolor='wheat', alpha=0.5)
    ax.text(0.05, 0.95, textstr, transform=ax.transAxes, fontsize=12,
            verticalalignment='top', bbox=props)
    
    ax.set_xlabel('Actual AQI', fontsize=12)
    ax.set_ylabel('Predicted AQI', fontsize=12)
    ax.set_title('Actual vs Predicted AQI (Test Set)', fontsize=14, fontweight='bold')
    ax.legend()
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '1_actual_vs_predicted.png', dpi=300, bbox_inches='tight')
    print(f"✓ Saved: 1_actual_vs_predicted.png")
    plt.close()


def plot_residuals(y_test, y_pred):
    """Residual plot to check prediction errors."""
    residuals = y_test - y_pred
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))
    
    # Residual scatter
    ax1.scatter(y_pred, residuals, alpha=0.3, s=10, color='#FF5722')
    ax1.axhline(y=0, color='black', linestyle='--', lw=2)
    ax1.set_xlabel('Predicted AQI', fontsize=12)
    ax1.set_ylabel('Residuals (Actual - Predicted)', fontsize=12)
    ax1.set_title('Residual Plot', fontsize=14, fontweight='bold')
    ax1.grid(True, alpha=0.3)
    
    # Residual histogram
    ax2.hist(residuals, bins=50, color='#4CAF50', alpha=0.7, edgecolor='black')
    ax2.axvline(x=0, color='red', linestyle='--', lw=2)
    ax2.set_xlabel('Residuals', fontsize=12)
    ax2.set_ylabel('Frequency', fontsize=12)
    ax2.set_title('Residual Distribution', fontsize=14, fontweight='bold')
    ax2.grid(True, alpha=0.3)
    
    # Add stats
    mean_res = np.mean(residuals)
    std_res = np.std(residuals)
    ax2.text(0.02, 0.98, f'Mean: {mean_res:.2f}\nStd: {std_res:.2f}',
             transform=ax2.transAxes, fontsize=11, verticalalignment='top',
             bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '2_residuals.png', dpi=300, bbox_inches='tight')
    print(f"✓ Saved: 2_residuals.png")
    plt.close()


def plot_feature_importance(model, feature_cols):
    """Feature importance bar chart."""
    importances = model.feature_importances_
    indices = np.argsort(importances)[::-1]
    
    fig, ax = plt.subplots(figsize=(12, 8))
    
    # Top 15 features
    top_n = min(15, len(feature_cols))
    top_indices = indices[:top_n]
    
    colors = plt.cm.viridis(np.linspace(0, 1, top_n))
    ax.barh(range(top_n), importances[top_indices], color=colors)
    ax.set_yticks(range(top_n))
    ax.set_yticklabels([feature_cols[i] for i in top_indices])
    ax.invert_yaxis()
    ax.set_xlabel('Feature Importance', fontsize=12)
    ax.set_title('Top 15 Feature Importances (XGBoost)', fontsize=14, fontweight='bold')
    ax.grid(True, axis='x', alpha=0.3)
    
    # Add values on bars
    for i, v in enumerate(importances[top_indices]):
        ax.text(v + 0.005, i, f'{v:.3f}', va='center', fontsize=9)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '3_feature_importance.png', dpi=300, bbox_inches='tight')
    print(f"✓ Saved: 3_feature_importance.png")
    plt.close()


def plot_error_distribution(y_test, y_pred):
    """Distribution of absolute and percentage errors."""
    abs_errors = np.abs(y_test - y_pred)
    pct_errors = np.abs((y_test - y_pred) / (y_test + 1e-6)) * 100  # Avoid div by 0
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))
    
    # Absolute error histogram
    ax1.hist(abs_errors, bins=50, color='#9C27B0', alpha=0.7, edgecolor='black')
    ax1.axvline(x=np.median(abs_errors), color='red', linestyle='--', lw=2, label=f'Median: {np.median(abs_errors):.2f}')
    ax1.set_xlabel('Absolute Error (AQI)', fontsize=12)
    ax1.set_ylabel('Frequency', fontsize=12)
    ax1.set_title('Absolute Error Distribution', fontsize=14, fontweight='bold')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # Percentage error histogram (capped at 100%)
    pct_errors_capped = np.clip(pct_errors, 0, 100)
    ax2.hist(pct_errors_capped, bins=50, color='#FF9800', alpha=0.7, edgecolor='black')
    ax2.axvline(x=np.median(pct_errors_capped), color='red', linestyle='--', lw=2, label=f'Median: {np.median(pct_errors_capped):.1f}%')
    ax2.set_xlabel('Percentage Error (%)', fontsize=12)
    ax2.set_ylabel('Frequency', fontsize=12)
    ax2.set_title('Percentage Error Distribution', fontsize=14, fontweight='bold')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '4_error_distribution.png', dpi=300, bbox_inches='tight')
    print(f"✓ Saved: 4_error_distribution.png")
    plt.close()


def plot_prediction_ranges(y_test, y_pred):
    """Box plot showing prediction accuracy across AQI ranges."""
    # Define AQI categories
    def categorize_aqi(aqi):
        if aqi <= 50: return 'Good (0-50)'
        elif aqi <= 100: return 'Moderate (51-100)'
        elif aqi <= 150: return 'Unhealthy SG (101-150)'
        elif aqi <= 200: return 'Unhealthy (151-200)'
        elif aqi <= 300: return 'Very Unhealthy (201-300)'
        else: return 'Hazardous (301+)'
    
    df_errors = pd.DataFrame({
        'actual_aqi': y_test,
        'predicted_aqi': y_pred,
        'abs_error': np.abs(y_test - y_pred),
        'category': [categorize_aqi(a) for a in y_test]
    })
    
    fig, ax = plt.subplots(figsize=(14, 8))
    
    category_order = ['Good (0-50)', 'Moderate (51-100)', 'Unhealthy SG (101-150)', 
                     'Unhealthy (151-200)', 'Very Unhealthy (201-300)', 'Hazardous (301+)']
    
    # Filter to existing categories
    existing_cats = [c for c in category_order if c in df_errors['category'].unique()]
    
    df_errors['category'] = pd.Categorical(df_errors['category'], categories=existing_cats, ordered=True)
    
    sns.boxplot(data=df_errors, x='category', y='abs_error', ax=ax, palette='Set2')
    ax.set_xlabel('AQI Category', fontsize=12)
    ax.set_ylabel('Absolute Error (AQI)', fontsize=12)
    ax.set_title('Prediction Error by AQI Category', fontsize=14, fontweight='bold')
    ax.tick_params(axis='x', rotation=45)
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '5_error_by_category.png', dpi=300, bbox_inches='tight')
    print(f"✓ Saved: 5_error_by_category.png")
    plt.close()


def plot_time_series_sample(test_df, y_pred):
    """Time series plot comparing actual vs predicted for a sample city."""
    # Pick a city with enough data
    city_counts = test_df['city'].value_counts()
    if len(city_counts) > 0:
        sample_city = city_counts.index[0]
        city_data = test_df[test_df['city'] == sample_city].copy()
        
        # Use date column (CSV data)
        time_col = 'timestamp' if 'timestamp' in city_data.columns else 'date'
        city_data = city_data.sort_values(time_col)
        
        # Limit to first 100 points for clarity
        city_data = city_data.head(100)
        city_pred = y_pred[test_df['city'] == sample_city][:len(city_data)]
        
        fig, ax = plt.subplots(figsize=(16, 6))
        
        ax.plot(city_data[time_col], city_data['aqi'], 'o-', label='Actual AQI', 
                color='#2196F3', linewidth=2, markersize=4)
        ax.plot(city_data[time_col], city_pred, 's-', label='Predicted AQI', 
                color='#FF5722', linewidth=2, markersize=4, alpha=0.7)
        
        ax.set_xlabel('Date', fontsize=12)
        ax.set_ylabel('AQI', fontsize=12)
        ax.set_title(f'Time Series: Actual vs Predicted AQI for {sample_city} (Test Set)', 
                    fontsize=14, fontweight='bold')
        ax.legend(fontsize=11)
        ax.grid(True, alpha=0.3)
        plt.xticks(rotation=45)
        
        plt.tight_layout()
        plt.savefig(OUTPUT_DIR / '6_time_series_sample.png', dpi=300, bbox_inches='tight')
        print(f"✓ Saved: 6_time_series_sample.png (city: {sample_city})")
        plt.close()


def generate_metrics_report(y_test, y_pred, metrics, test_df):
    """Generate comprehensive metrics report."""
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    # Calculate MAPE (handle zeros)
    mape = np.mean(np.abs((y_test - y_pred) / (y_test + 1e-6))) * 100
    
    # Median absolute error
    median_ae = np.median(np.abs(y_test - y_pred))
    
    # 90th percentile error
    p90_error = np.percentile(np.abs(y_test - y_pred), 90)
    
    # Percentage within thresholds
    within_10 = np.mean(np.abs(y_test - y_pred) <= 10) * 100
    within_20 = np.mean(np.abs(y_test - y_pred) <= 20) * 100
    within_30 = np.mean(np.abs(y_test - y_pred) <= 30) * 100
    
    report = f"""
{'='*70}
                    MODEL EVALUATION REPORT
{'='*70}

MODEL INFORMATION:
  Model Type:        XGBoost Regressor
  Version:           {metrics.get('model_version', 'xgb-v2')}
  Training Date:     {metrics.get('trained_at', 'N/A')}
  Data Source:       {metrics.get('data_source', 'csv+database')}
  
DATASET STATISTICS:
  Training Size:     {metrics.get('train_size', 'N/A'):,} samples
  Test Size:         {len(y_test):,} samples
  Total Cities:      {metrics.get('n_cities', 'N/A')}
  Features:          {metrics.get('n_features', 'N/A')}
  
REGRESSION METRICS:
  R² Score:          {r2:.4f}  {'✓ Excellent' if r2 > 0.8 else '⚠ Needs improvement'}
  MAE:               {mae:.2f} AQI units
  RMSE:              {rmse:.2f} AQI units
  MAPE:              {mape:.2f}%
  Median Abs Error:  {median_ae:.2f} AQI units
  90th Percentile:   {p90_error:.2f} AQI units
  
PREDICTION ACCURACY:
  Within ±10 AQI:    {within_10:.1f}%
  Within ±20 AQI:    {within_20:.1f}%
  Within ±30 AQI:    {within_30:.1f}%
  
WORST PERFORMING CITIES (from training):
"""
    
    if 'top10_worst_cities' in metrics:
        for city, error in metrics['top10_worst_cities'].items():
            report += f"  {city:25s} MAE: {error:.2f}\n"
    
    report += "\n" + "="*70 + "\n"
    
    # Save report
    with open(OUTPUT_DIR / 'model_metrics_report.txt', 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(report)
    print(f"✓ Saved: model_metrics_report.txt")


def main():
    print("\n" + "="*70)
    print("           XGBoost AQI Forecasting Model Evaluation")
    print("="*70 + "\n")
    
    print("Loading model and generating predictions...")
    model, X_test, y_test, y_pred, test_df, metrics, feature_cols = load_model_and_data()
    print(f"✓ Loaded model with {len(feature_cols)} features\n")
    
    print("Generating visualizations...")
    plot_actual_vs_predicted(y_test, y_pred)
    plot_residuals(y_test, y_pred)
    plot_feature_importance(model, feature_cols)
    plot_error_distribution(y_test, y_pred)
    plot_prediction_ranges(y_test, y_pred)
    plot_time_series_sample(test_df, y_pred)
    
    print("\nGenerating metrics report...")
    generate_metrics_report(y_test, y_pred, metrics, test_df)
    
    print(f"\n{'='*70}")
    print(f"✓ All files saved to: {OUTPUT_DIR.absolute()}")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    main()
