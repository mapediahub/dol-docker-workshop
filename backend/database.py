import os
import asyncpg
from fastapi import FastAPI

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/dbname")

async def get_db_connection():
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None
