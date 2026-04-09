"""
Job Ingestion Runner
"""
import asyncio
from dotenv import load_dotenv  # ⭐ ADD THIS
import os

# ⭐ LOAD .env BEFORE importing app
load_dotenv()

# ⭐ DEBUG: Check if DATABASE_URL loaded
db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("❌ ERROR: DATABASE_URL not found in .env file!")
    print(f"Current directory: {os.getcwd()}")
    print(f"Looking for .env at: {os.path.join(os.getcwd(), '.env')}")
    exit(1)

from app.orchestrator import run_ingest_once

if __name__ == "__main__":
    asyncio.run(run_ingest_once())