นี่คือโครงสร้าง `README.md` ที่ออกแบบมาเพื่อใช้เป็นเอกสารประกอบการสอน (Course Material) สำหรับ Workshop นี้โดยเฉพาะ โดยเน้นความชัดเจนของขั้นตอน (Step-by-Step) และแบ่งส่วนตาม Session เพื่อให้ผู้เรียนทำตามได้ง่ายครับ

คุณสามารถ Copy โค้ดด้านล่างนี้ไปสร้างเป็นไฟล์ `README.md` หรือ `INSTRUCTION.md` ใน Repository ของคลาสเรียนได้เลย

---

```markdown
# 🐳 Docker Orchestration & Real-world Project Workshop

ยินดีต้อนรับสู่ Workshop "Orchestration & Real-world Project" ในเซสชั่นนี้เราจะเน้นการใช้งาน Docker Compose เพื่อจัดการ Container หลายตัวพร้อมกัน และลงมือทำโปรเจกต์จริง (Capstone Project) ที่เกี่ยวข้องกับระบบ GIS และการย้ายระบบเก่า (Migration)

---

## 🗓️ Agenda

| เวลา | หัวข้อ | รายละเอียด |
|---|---|---|
| **09:00 - 10:30** | **Session 5: Advanced Build Techniques** | Multi-stage Builds, Environment Variables |
| **10:45 - 12:00** | **Session 6: Docker Compose** | Concept, YAML Structure, Commands |
| **13:00 - 16:00** | **Session 7: Capstone Project** | GIS Stack Implementation & Legacy Migration |

---

## 🛠️ Prerequisites (สิ่งที่ต้องเตรียม)
* Docker Desktop ติดตั้งเรียบร้อย
* Visual Studio Code (หรือ Editor ที่ถนัด)
* Source Code ตั้งต้น (Clone จาก Repository นี้)

---

## 🚀 Session 5: Advanced Build Techniques (09:00 - 10:30)

### 1. Multi-stage Builds
**Objective:** ลดขนาด Docker Image ให้เล็กที่สุด (Small Footprint) เพื่อประหยัดพื้นที่และเพิ่มความปลอดภัย

* **Concept:** การแยก Stage `Build` (ที่มี Compiler/Tools) ออกจาก Stage `Run` (ที่มีแค่ Runtime)
* **Workshop:** แก้ไข `Dockerfile` ของแอปพลิเคชันตัวอย่าง

**ตัวอย่าง Dockerfile (Multi-stage):**
```dockerfile
# Stage 1: Build
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Run (Production)
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm install --production
CMD ["node", "dist/main.js"]

```

### 2. Environment Variables (.env)

**Objective:** แยก Config ออกจาก Code เพื่อความยืดหยุ่นและความปลอดภัย

* สร้างไฟล์ `.env`
* การส่งค่าผ่าน flag `--env-file`
* การเรียกใช้ใน Code (เช่น `process.env.DB_HOST`)

---

## 🐙 Session 6: Docker Compose (10:45 - 12:00)

### 1. Concept & Structure

ทำไมต้องใช้ Docker Compose? -> *จัดการหลาย Container (Services) ได้ในคำสั่งเดียว*

โครงสร้างหลักของ `docker-compose.yml`:

1. **Services:** นิยาม Container แต่ละตัว (Web, DB)
2. **Networks:** การเชื่อมต่อสื่อสารระหว่าง Container
3. **Volumes:** พื้นที่เก็บข้อมูลถาวร

### 2. Workshop: Convert Lab 1 to Compose

แปลงคำสั่ง `docker run` ยาวๆ ให้เป็นไฟล์ `docker-compose.yml`

**Essential Commands:**

```bash
docker-compose up -d       # สร้างและรัน Container (Background)
docker-compose logs -f     # ดู Logs แบบ Real-time
docker-compose ps          # ดูสถานะ Services
docker-compose down        # หยุดและลบ Container/Network

```

---

## 🌍 Session 7: Capstone Project (13:00 - 16:00)

### Part 1: Dockerizing GIS Stack (ระบบแผนที่ใหม่)

เราจะสร้างระบบ GIS ที่ประกอบด้วย 4 Services หลัก เชื่อมต่อกันด้วย Docker Network

#### 🏗️ Architecture Overview

1. **Database:** PostGIS (เก็บข้อมูล Vector/Spatial)
2. **Backend:** Python/Node.js + GDAL (API & Processing)
3. **Raster Storage:** Bind Mount (เก็บไฟล์ภาพถ่ายดาวเทียม)
4. **Frontend:** Web Map Lib (Leaflet/MapLibre)

#### 📝 Steps

**Service 1: Spatial Database (PostGIS)**

* Image: `postgis/postgis`
* Task: Config Environment (`POSTGRES_USER`, `POSTGRES_DB`) และเตรียม Script โหลด Shapefile

**Service 2: Map Service (Backend)**

* Language: Python (FastAPI) หรือ Node.js (Express)
* Dockerfile Requirement: ติดตั้ง System Dependencies (`libgdal-dev`)
* Task: เขียน API Endpoint `/search` และ `/wms`

**Service 3: Raster Data Management**

* Type: **Volume (Bind Mounts)**
* Task: แชร์โฟลเดอร์ `/data/raster` จาก Host เข้าสู่ Container เพื่อให้ Backend อ่านไฟล์ภาพขนาดใหญ่ได้โดยไม่ต้อง Copy เข้า Image

**Service 4: Frontend Visualization**

* Task: เชื่อมต่อ API ผ่านชื่อ Service (Internal DNS) เช่น `http://backend:3000`

---

### Part 2: Migrating Legacy Web to Docker

จำลองสถานการณ์ลูกค้าต้องการย้ายเว็บเก่า (Legacy) ขึ้น Docker

#### 🔍 Analysis Phase

1. **Dependencies:** เช็ค Version ของ PHP/Node.js เก่า
2. **Ports:** เช็ค Port ที่ใช้งาน (80, 8080)
3. **Data:** ระบุโฟลเดอร์ที่เก็บไฟล์ Upload

#### 🛠️ Workshop Tasks

1. เขียน `Dockerfile` จาก Source Code เดิม
2. แยก **Config** (db connection) ออกมาเป็น Environment Variable
3. แยก **Uploads Folder** ออกมาเป็น Volume (เพื่อให้ข้อมูลไม่หายเมื่อ Restart)

```yaml
# ตัวอย่าง snippet สำหรับ Legacy App
services:
  legacy-web:
    build: ./legacy-source
    volumes:
      - ./uploads:/var/www/html/uploads # Persist user uploads
    environment:
      - DB_HOST=db

```

---

## 📚 Resources & References

* [Docker Compose Documentation](https://docs.docker.com/compose/)
* [PostGIS Image](https://hub.docker.com/r/postgis/postgis)
* [GDAL Documentation](https://gdal.org/)

---

*Happy Dockering!* 🐳

```

### ข้อแนะนำเพิ่มเติมสำหรับการเตรียมสอน (Next Steps)

หากคุณต้องการให้การสอนลื่นไหลที่สุด ผมแนะนำให้เตรียม **"Skeleton Code"** ไว้ให้ผู้เรียนล่วงหน้าครับ:
1.  **โฟลเดอร์ `lab-starter`:** เตรียม Source Code (Node.js/Python) แบบง่ายๆ ที่ยังไม่มี Dockerfile
2.  **โฟลเดอร์ `gis-data`:** เตรียมไฟล์ Shapefile หรือ GeoJSON ตัวอย่าง และไฟล์ภาพ Raster (เช่น .tif) ใส่ไว้ให้เลย ผู้เรียนจะได้ไม่ต้องเสียเวลาหาข้อมูล
3.  **ไฟล์ `legacy-app`:** เตรียมโค้ด PHP หรือ HTML ง่ายๆ ที่มีจุดบกพร่องเล็กน้อย (เช่น Hardcode Database IP) เพื่อให้ผู้เรียนได้ฝึกแก้ตอนทำ Migration ครับ

```