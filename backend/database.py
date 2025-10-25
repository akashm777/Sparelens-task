from pymongo import MongoClient
from config import settings
import logging

logger = logging.getLogger(__name__)

class Database:
    client: MongoClient = None
    database = None

db = Database()

async def connect_to_mongo():
    """Create database connection"""
    try:
        db.client = MongoClient(settings.mongodb_url)
        db.database = db.client[settings.database_name]
        
        # Test connection
        db.client.admin.command('ping')
        logger.info("Successfully connected to MongoDB Atlas")
        
        # Create indexes for better performance
        db.database.users.create_index("email", unique=True)
        db.database.datasets.create_index([("user_id", 1), ("created_at", -1)])
        
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        logger.warning("Running without database connection - some features may not work")
        # Don't raise the exception, let the app continue

async def close_mongo_connection():
    """Close database connection"""
    if db.client:
        db.client.close()
        logger.info("Disconnected from MongoDB")

def get_database():
    return db.database