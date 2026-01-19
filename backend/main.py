from fastapi import FastAPI, Response, Query, HTTPException #type: ignore
from typing import Optional #type: ignore
from fastapi.middleware.cors import CORSMiddleware  #type: ignore
from database import get_db_connection
from fastapi.staticfiles import StaticFiles #type: ignore
from rio_tiler.io import COGReader #type: ignore
from fastapi.responses import Response,StreamingResponse #type: ignore
from rasterio.warp import transform_bounds #type: ignore
from rio_tiler.colormap import cmap #type: ignore
import asyncpg  #type: ignore

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


@app.get("/api/geojson/{table_name}")
async def get_layer_geojson(table_name: str):
    """
    ดึงข้อมูลจากตาราง PostGIS แบบ Streaming (ลดการใช้ RAM และแก้ปัญหา Response too large)
    """
    
    # 1. SECURITY CHECK: ตรวจสอบตารางเหมือนเดิม
    # เราจำเป็นต้องเช็คก่อนจะเริ่ม Stream
    conn_check = await get_db_connection()
    if not conn_check:
        return {"error": "Database connection failed"}
    
    try:
        check_query = """
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1
            );
        """
        exists = await conn_check.fetchval(check_query, table_name)
        if not exists:
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")
    finally:
        await conn_check.close()

    # 2. Generator Function: ฟังก์ชันสำหรับทยอยสร้าง GeoJSON ทีละชิ้น
    async def geojson_generator():
        # สร้าง connection ใหม่สำหรับ stream นี้โดยเฉพาะ
        conn = await get_db_connection()
        if not conn:
            yield '{"error": "Database connection failed"}'
            return

        try:
            # SQL: ดึงทีละแถว (ลบ json_agg ออก)
            # เราจะประกอบร่าง JSON เองใน Python
            sql = f"""
                SELECT json_build_object(
                    'type', 'Feature',
                    'id', gid,
                    'geometry', ST_AsGeoJSON(geom)::json,
                    'properties', to_jsonb(t.*) - 'geom'
                )::text AS feature_json
                FROM "{table_name}" AS t
            """

            # เริ่มต้นโครงสร้าง FeatureCollection
            yield '{"type": "FeatureCollection", "features": ['

            first = True
            
            # ใช้ Transaction และ Cursor เพื่อดึงข้อมูลทีละส่วน
            async with conn.transaction():
                async for record in conn.cursor(sql):
                    if not first:
                        yield ","  # ใส่ลูกน้ำคั่นระหว่าง Feature
                    else:
                        first = False
                    
                    # ส่ง JSON ของ Feature แถวนั้นๆ ออกไป
                    yield record['feature_json']

            # ปิดโครงสร้าง JSON
            yield ']}'

        except Exception as e:
            # กรณี Error ระหว่าง Stream อาจจะทำอะไรมากไม่ได้นอกจาก log
            # เพราะ header ถูกส่งไปแล้ว แต่เรา yield error text ต่อท้ายได้
            yield f', "error": "{str(e)}"]}}' 
        finally:
            await conn.close()

    # 3. Return เป็น StreamingResponse
    return StreamingResponse(
        geojson_generator(), 
        media_type="application/geo+json"
    )