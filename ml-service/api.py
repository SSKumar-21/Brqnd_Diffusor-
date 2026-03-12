#python3 -m uvicorn api:app --reload --port 8001

from fastapi import FastAPI
import pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.naive_bayes import MultinomialNB
import os

app = FastAPI()

# ---------- Load Dataset ----------

file_path = os.path.join(os.path.dirname(__file__), "adviser_platform_dataset_100k.csv")

df = pd.read_csv(file_path)

print("Dataset loaded")

# ---------- Encode categorical columns ----------

le_dict = {}

for col in df.columns:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col])
    le_dict[col] = le

# ---------- Features ----------

X = df.drop("platform_name", axis=1)
y = df["platform_name"]

# ---------- Train Model ----------

model = MultinomialNB()
model.fit(X, y)

print("Model trained and ready")

# ---------- Root ----------

@app.get("/")
def home():
    return {"message": "Brand Diffusion ML API Running"}

# ---------- Prediction ----------

@app.post("/predict")
async def predict(data: dict):

    print("\n===== NEW PREDICTION REQUEST =====")
    print("Incoming data:", data)

    try:

        encoded_input = []

        for col in X.columns:

            value = data.get(col)

            if value is None:
                print("Missing field:", col)
                return {"error": f"Missing field: {col}"}

            classes = le_dict[col].classes_

            matched_value = None

            for cls in classes:
                if str(cls).lower().strip() == str(value).lower().strip():
                    matched_value = cls
                    break

            if matched_value is None:
                return {
                    "error": f"Invalid value for {col}",
                    "allowed_values": list(classes)
                }

            encoded_value = le_dict[col].transform([matched_value])[0]

            encoded_input.append(encoded_value)

        print("Encoded Input:", encoded_input)

        probs = model.predict_proba([encoded_input])[0]

        labels = le_dict["platform_name"].classes_

        result = []

        for i in range(len(probs)):
            result.append({
                "platform": labels[i],
                "probability": round(float(probs[i] * 100), 2)
            })

        result.sort(key=lambda x: x["probability"], reverse=True)

        print("Prediction Output:", result)

        return {"predictions": result}

    except Exception as e:
        print("Prediction Error:", str(e))
        return {"error": str(e)}