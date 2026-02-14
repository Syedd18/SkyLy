import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ No GEMINI_API_KEY found in .env")
    exit(1)

print(f"✅ API Key found: {api_key[:20]}...")
genai.configure(api_key=api_key)

print("\n📋 Available models:")
try:
    for model in genai.list_models():
        if 'generateContent' in model.supported_generation_methods:
            print(f"  ✓ {model.name}")
except Exception as e:
    print(f"❌ Error listing models: {e}")

print("\n🧪 Testing model...")
try:
    # Try different model names
    for model_name in ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro']:
        try:
            print(f"\nTrying: {model_name}")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content("Say 'Hello, working!' in one word")
            print(f"  ✅ {model_name} works!")
            print(f"  Response: {response.text}")
            break
        except Exception as e:
            print(f"  ❌ {model_name} failed: {str(e)[:100]}")
except Exception as e:
    print(f"❌ Test failed: {e}")
