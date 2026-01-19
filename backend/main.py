from fastapi import FastAPI, Response, Query #type: ignore
from typing import Optional #type: ignore
from fastapi.middleware.cors import CORSMiddleware  #type: ignore
from database import get_db_connection
from fastapi.staticfiles import StaticFiles #type: ignore
from rio_tiler.io import COGReader #type: ignore
from fastapi.responses import Response #type: ignore
from rasterio.warp import transform_bounds #type: ignore
from rio_tiler.colormap import cmap #type: ignore
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
            # ดึง bounds เดิม (Native CRS)
            native_bounds = cog.bounds
            
            # แปลงจาก CRS ของไฟล์ ไปเป็น EPSG:4326
            # transform_bounds(src_crs, dst_crs, *bounds)
            bounds_4326 = transform_bounds(
                cog.crs, 
                "EPSG:4326", 
                *native_bounds
            )
            
            return {
                "filename": filename,
                "bounds": bounds_4326
            }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/tiles/{z}/{x}/{y}")
async def tile(
    z: int, 
    x: int, 
    y: int, 
    filename: str = "suanmokkh.tif",
    # เพิ่ม parameter สำหรับเลือก colormap (เช่น "viridis", "terrain")
    colormap: Optional[str] = Query(None, description="Colormap name for single band images (e.g., viridis)"),
    # เพิ่ม parameter สำหรับ rescale ค่า (จำเป็นมากสำหรับ DSM เพื่อให้เห็นความแตกต่างของความสูง)
    rescale: Optional[str] = Query(None, description="Comma separated min,max values (e.g., '0,100')")
):
    """Handle tile requests with optional Colormap and Rescaling."""
    image_path = f"/app/gisdata/{filename}"
    
    try:
        with COGReader(image_path) as cog:
            # 1. อ่านข้อมูล Tile
            img = cog.tile(x, y, z)
            
            # 2. เตรียม Options สำหรับ render
            render_options = {}

            # --- จัดการ Rescale (สำคัญสำหรับ DSM) ---
            # ถ้าเป็น DSM ค่า Pixel อาจจะเป็นความสูง (เช่น 20.5 เมตร ถึง 500 เมตร)
            # เราต้องบีบอัดค่าเหล่านี้ให้เป็น 0-255 เพื่อแสดงผลเป็นภาพได้
            if rescale:
                # แปลง string "0,500" เป็น list [(0, 500)]
                min_v, max_v = map(float, rescale.split(","))
                img.rescale(in_range=[(min_v, max_v)])

            # --- จัดการ Colormap (สำหรับ DSM) ---
            if colormap:
                # ใช้ cmap.get() เพื่อดึง color map dictionary ตามชื่อที่ส่งมา
                render_options["colormap"] = cmap.get(colormap)
            
            # 3. Render ภาพ
            # rio-tiler จะจัดการให้เอง: ถ้าเป็น RGB 3 bands ก็จะ render ปกติ
            # ถ้ามี colormap ส่งไป มันจะ apply สีให้เอง
            content = img.render(img_format="PNG", **render_options)
            
            return Response(content, media_type="image/png")
            
    except Exception as e:
        return {"error": str(e)}
