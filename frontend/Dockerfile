# Stage 1: Build the Angular app
FROM node:18 AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# Build แบบ Production
RUN npm run build -- --configuration production

FROM nginx:alpine

# 1. Copy Nginx Config ที่เราสร้างใหม่
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 2. Copy ไฟล์ที่ Build เสร็จแล้ว (แก้ 'frontend' ให้ตรงชื่อโปรเจกต์คุณ)
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]