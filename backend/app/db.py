import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
db_name = os.environ.get("DB_NAME", "domainforge")

try:
    from pymongo import MongoClient
    test_client = MongoClient(mongo_url, serverSelectionTimeoutMS=1200)
    test_client.admin.command("ping")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
except Exception as e:
    import mongomock_motor
    client = mongomock_motor.AsyncMongoMockClient()
    db = client[db_name]


def get_db():
    return db
