import pandas as pd

df = pd.read_csv("Dataset/city_day.csv")

df["City"] = df["City"].astype(str).str.strip()
df["City"] = df["City"].str.replace("\u200b", "", regex=False)
df["City"] = df["City"].str.replace("\xa0", "", regex=False)
df["City"] = df["City"].str.title()

print(df["City"].unique())
