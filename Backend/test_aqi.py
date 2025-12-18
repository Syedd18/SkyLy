import pandas as pd

df = pd.read_csv("Dataset/city_day.csv")

print(df["AQI"].head(20))
print(df["AQI"].dtype)
print(df["AQI"].describe())
