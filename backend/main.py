from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import get_db_connection

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/api/data/geojson")
async def get_geojson():
    # Example logic to query PostGIS
    conn = await get_db_connection()
    if conn:
        try:
            # logic to select st_asgeojson ...
            await conn.close()
            return {"type": "FeatureCollection", "features": []} # Success
        except Exception as e:
            return {"error": str(e)}
    return {"type": "FeatureCollection", "features": [], "status": "No DB connection"}

@app.get("/api/data/tif/{filename}")
async def get_tif(filename: str):
    # Example logic to read TIF with Rasterio
    # In a real app, this might return a WMS tile or metadata
    try:
        import rasterio
        file_path = f"/data/raster/{filename}" # Assuming bind mount
        # with rasterio.open(file_path) as dataset:
        #     return {"bounds": dataset.bounds}
        return {"filename": filename, "status": "Simulated read success (file not found)"}
    except ImportError:
        return {"error": "Rasterio not installed"}
    except Exception as e:
        return {"error": str(e)}
