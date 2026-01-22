# Workshop: DOL Docker Workshop

โปรเจกต์นี้เป็นตัวอย่างการสร้าง Web Application ที่ประกอบด้วย Frontend, Backend และ Database โดยใช้ Docker ในการจำลองสภาพแวดล้อม (Containerization) เพื่อให้ง่ายต่อการ Deploy และการสอน

## 📂 โครงสร้างโปรเจกต์ (Project Structure)

โครงสร้างไฟล์และโฟลเดอร์หลักของโปรเจกต์ประกอบด้วย:

```
.
├── .env                    # ไฟล์เก็บ Environment Variables (เช่น รหัสผ่าน Database)
├── docker-compose.yml      # ไฟล์หลักสำหรับจัดการ Service ทั้งหมด (DB, Backend, Frontend)
├── backend/                # Source code ส่วน Backend (FastAPI)
│   ├── Dockerfile          # วิธีการสร้าง Image ของ Backend
│   ├── main.py             # โค้ดหลักของ FastAPI
│   ├── database.py         # โค้ดเชื่อมต่อ Database
│   ├── requirements.txt    # รายชื่อ Python package ที่ต้องใช้
│   └── gisdata/            # โฟลเดอร์เก็บข้อมูล GIS และ script import
├── frontend/               # Source code ส่วน Frontend (Angular)
│   ├── Dockerfile          # วิธีการสร้าง Image ของ Frontend
│   └── ... (Angular files)
└── db/                     # ส่วนจัดการ Database
    └── Dockerfile          # วิธีการสร้าง Image ของ PostGIS พร้อมเครื่องมือเสริม
```

---

## 🛠️ ขั้นตอนการสร้าง (Step-by-Step Guide)

เนื้อหาส่วนนี้อธิบายไฟล์สำคัญที่ใช้ในการสร้าง Container สำหรับแต่ละส่วน

### 1. การตั้งค่า Environment Variables (`.env`)
เราจะแยกค่า configuration ต่างๆ เช่น ชื่อผู้ใช้ รหัสผ่าน หรือชื่อ Database ออกมาไว้ในไฟล์ `.env` เพื่อความปลอดภัยและแก้ไขง่าย

**ไฟล์:** `.env`
```env
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=gisdb
DB_PORT=3456
```

### 2. ส่วน Database (PostGIS) (`db/`)
เราใช้ **PostGIS** ซึ่งเป็น PostgreSQL extension สำหรับจัดการข้อมูลทางภูมิศาสตร์ (GIS)
ไฟล์ `db/Dockerfile` จะทำการดึง Image หลักมาและติดตั้งเครื่องมือเพิ่มเติม เช่น `postgis` client tools เพื่อให้สามารถใช้คำสั่ง `shp2pgsql` ได้

**ไฟล์:** `db/Dockerfile`
```dockerfile
FROM postgis/postgis:15-3.3

# ติดตั้ง PostGIS client tools (ที่มี shp2pgsql) ในฐานะ Root ตอน Build Image
RUN apt-get update \
    && apt-get install -y postgis \
    && rm -rf /var/lib/apt/lists/*
```

### 3. ส่วน Backend (FastAPI) (`backend/`)
Backend เขียนด้วย **Python (FastAPI)** ทำหน้าที่ให้บริการ API และเชื่อมต่อกับ Database
ไฟล์ `backend/Dockerfile` จะทำการติดตั้ง Python, Library ที่จำเป็นสำหรับ GIS (GDAL), และติดตั้ง Python dependencies

**ไฟล์:** `backend/Dockerfile`
```dockerfile
FROM python:3.9-slim

WORKDIR /app

# ติดตั้ง System Dependencies สำหรับ GIS (GDAL)
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# ตั้งค่า Environment ให้มองเห็น GDAL header files
ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

# คัดลอกและติดตั้ง Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# คัดลอก Source Code ทั้งหมดเข้า Container
COPY . .

# คำสั่งรัน Server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--reload", "--port", "8000"]
```

### 4. ส่วน Frontend (Angular + Nginx) (`frontend/`)
Frontend เขียนด้วย **Angular**
ไฟล์ `frontend/Dockerfile` ใช้เทคนิค **Multi-stage Build** เพื่อให้ Image มีขนาดเล็กที่สุด:
1.  **Stage 1 (Build)**: ใช้ Node.js เพื่อ Compile code Angular ให้เป็นไฟล์ HTML/JS/CSS (Production Build)
2.  **Stage 2 (Run)**: ใช้ Nginx (Web Server ขนาดเล็ก) เพื่อให้บริการไฟล์ที่ Build มาได้จาก Stage 1

**ไฟล์:** `frontend/nginx.conf`
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location /api/ {
        # ส่งต่อ request ไปยัง service name "fastapi" ที่ port 8000
        # เครื่องหมาย / ท้าย url สำคัญมาก (URL Rewrite)
        # มันจะเปลี่ยนจาก /api/users เป็น /users เมื่อส่งไปถึง FastAPI
        proxy_pass http://fastapi:8000; 
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**ไฟล์:** `frontend/Dockerfile`
```dockerfile
# Stage 1: Build Angular App
FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 5. การรวมทุกอย่างด้วย Docker Compose (`docker-compose.yml`)
ไฟล์นี้คือกุญแจสำคัญที่จะสั่งให้ทั้ง 3 ส่วน (Database, Backend, Frontend) ทำงานร่วมกัน เป็นเสมือนวงดนตรีที่เล่นพร้อมกัน

**ไฟล์:** `docker-compose.yml`
*   **Services**: นิยามบริการ 3 ตัวคือ `db`, `fastapi`, `webapp`
*   **Build**: ระบุตำแหน่งโฟลเดอร์ที่มี Dockerfile ของแต่ละ service
*   **Environment**: ดึงค่าจากไฟล์ `.env` มาใช้
*   **Volumes**: การ map ข้อมูลใน Container ออกมาเก็บไว้ที่เครื่องเรา (เพื่อให้ข้อมูลไม่หายเมื่อปิด Container) เช่น ข้อมูล Database
*   **Networks**: สร้างวง Network ให้ Container คุยกันเองได้ (เช่น Backend เรียกหา Database ด้วยชื่อ `db` ได้เลย)

```yaml
services:
  db:
    build: ./db                     
    platform: linux/amd64
    container_name: postgis-db
    restart: always
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
    ports:
      - "${DB_PORT}:5432"
    volumes:
      - postgis_data:/var/lib/postgresql/data
      - ./backend/gisdata:/gisdata
      - ./backend/gisdata/import_shapes.sh:/docker-entrypoint-initdb.d/import_shapes.sh
    networks:
      - app-network
  fastapi:
    build: ./backend
    container_name: fastapi-backend
    expose: 
      - "8000"
    volumes:
      - ./backend:/app
    environment:
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
    networks:
      - app-network
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    depends_on:
      - db
  webapp:
    build: ./frontend
    container_name: angular-webapp
    ports:
      - "80:80"
    depends_on:
      - fastapi
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  postgis_data:
```

---

## 🚀 วิธีการรัน (How to Run)

1.  ตรวจสอบว่าในเครื่องมี **Docker** และ **Docker Compose** ติดตั้งอยู่
2.  เปิด Terminal (MacOS/Linux) หรือ PowerShell/CMD (Windows) แล้วเข้าไปที่โฟลเดอร์โปรเจกต์
3.  รันคำสั่งเพื่อสร้าง (Build) และเริ่มทำงาน (Start) แบบ Background (`-d`):

    ```bash
    docker-compose up --build -d
    ```

4.  รอจนกว่าทุก Container จะสถานะเป็น `Running` (ตรวจสอบได้ด้วยคำสั่ง `docker-compose ps`)

---

## 🌐 การใช้งาน (Access)

| บริการ (Service) | URL | รายละเอียด |
| :--- | :--- | :--- |
| **Web Application** | [http://localhost](http://localhost) | หน้าเว็บหลัก (Frontend) |
| **API Backend** | [http://localhost:8000](http://localhost:8000) | Root endpoint ของ API |
| **API Docs (Swagger)**| [http://localhost:8000/docs](http://localhost:8000/docs) | เอกสารและทดสอบ API |
| **Database** | `localhost:3456` | เชื่อมต่อผ่าน PGAdmin หรือ DBeaver |

---

## 🛑 คำสั่งจัดการอื่นๆ (Utility Commands)

*   **หยุดการทำงาน**:
    ```bash
    docker-compose down
    ```
*   **หยุดการทำงานและลบ Volumes (ข้อมูล Database จะหาย)**:
    ```bash
    docker-compose down -v
    ```
*   **ดู Logs ของทุก Service**:
    ```bash
    docker-compose logs -f
    ```
*   **ดู Logs เฉพาะ Service (เช่น backend)**:
    ```bash
    docker-compose logs -f fastapi
    ```
