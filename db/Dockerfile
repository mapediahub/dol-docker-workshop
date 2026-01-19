FROM postgis/postgis:15-3.3

# ติดตั้ง PostGIS client tools (ที่มี shp2pgsql) ในฐานะ Root ตอน Build Image
RUN apt-get update \
    && apt-get install -y postgis \
    && rm -rf /var/lib/apt/lists/*