import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "ats_platform")

# ─── MongoDB Client & Database ──────────────────
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

# ─── Collections ────────────────────────────────
users_collection = db["users"]
candidates_collection = db["candidates"]
analysis_results_collection = db["analysis_results"]
analysis_collection = db["analysis_results"]  # Alias as requested
jobs_collection = db["jobs"]

def verify_connection():
    """Ping MongoDB to verify the connection is alive and print success message."""
    try:
        client.admin.command("ping")
        print(f"✅ MongoDB connected successfully to: {MONGO_URI}")
        print(f"📂 Using database: {DB_NAME}")
        return True
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        return False

# Initialize connection check on import
if __name__ == "__main__":
    verify_connection()
