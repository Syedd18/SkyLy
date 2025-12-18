import pandas as pd

df = pd.read_csv("Dataset/city_day.csv")

print(df["Datetime"].head(20))
print(df["Datetime"].dtype)
