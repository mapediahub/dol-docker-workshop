from fastapi import FastAPI  #type: ignore
from fastapi.middleware.cors import CORSMiddleware  #type: ignore
from database import get_db_connection
from fastapi.staticfiles import StaticFiles #type: ignore
from rio_tiler.io import COGReader #type: ignore
from fastapi.responses import Response #type: ignore
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/gisdata", StaticFiles(directory="/app/gisdata"), name="gisdata")

@app.get("/")
async def root():
    return {"message": "API GIS DATA"}

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


@app.get("/api/bounds/{filename}")
async def get_bounds(filename: str):
    image_path = f"/app/gisdata/{filename}"
    try:
        with COGReader(image_path) as cog:
            # geographic_bounds จะคืนค่าเป็น (min_lon, min_lat, max_lon, max_lat)
            # ซึ่งเป็น EPSG:4326 เสมอ เหมาะกับ MapLibre
            bounds = cog.bounds
            return {
                "filename": filename,
                "bounds": bounds 
            }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/tiles/{z}/{x}/{y}")
async def tile(z: int, x: int, y: int, filename: str = "suanmokkh.tif"):
    """Handle tile requests."""
    image_path = f"/app/gisdata/{filename}"
    
    try:
        with COGReader(image_path) as cog:
            img = cog.tile(x, y, z)
            content = img.render(img_format="PNG")
            return Response(content, media_type="image/png")
    except Exception as e:
        return {"error": str(e)}
