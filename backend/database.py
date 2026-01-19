import os
import asyncpg #type: ignore 
from fastapi import FastAPI #type: ignore

DATABASE_URL = os.getenv("DATABASE_URL")

async def get_db_connection():
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None
