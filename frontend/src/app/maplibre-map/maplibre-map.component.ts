import { Component, OnInit, AfterViewInit } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { WebserviceService } from '../service/webservice.service';
import { NgFor } from '@angular/common';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-maplibre-map',
  standalone: true,
  imports: [NgFor],
  templateUrl: './maplibre-map.component.html',
  styleUrl: './maplibre-map.component.css'
})
export class MapLibreMapComponent implements OnInit, AfterViewInit {
  private map: maplibregl.Map | undefined;

  basemapStyles: Record<'osm' | 'ghyb', any> = {
    osm: {
      version: 8,
      glyphs: '/assets/glyphs/{fontstack}/{range}.pbf',
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256
        }
      },
      layers: [{ id: 'osm-layer', type: 'raster', source: 'osm-tiles' }]
    },
    ghyb: {
      version: 8,
      glyphs: '/assets/glyphs/{fontstack}/{range}.pbf',
      sources: {
        'google-hybrid': {
          type: 'raster',
          tiles: ['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'],
          tileSize: 256
        }
      },
      layers: [{ id: 'google-layer', type: 'raster', source: 'google-hybrid' }]
    }
  };

  control_layer: any[] = [
    { name: "51421", path: "51421.tif", visible: false },
    { name: "51424", path: "51424.tif", visible: false },
    { name: "51431", path: "51431.tif", visible: false },
    { name: "51432", path: "51432.tif", visible: false },
    { name: "51433", path: "51433.tif", visible: false },
    { name: "ALOS_PALSAR_DEM", path: "ALOS_PALSAR_DEM.tif&colormap=terrain&rescale=0,250", visible: false },
    { name: "S2B_MSIL1C_20181106_RGB", path: "S2B_MSIL1C_20181106_RGB.tif", visible: false },
  ];

  constructor(private webservice: WebserviceService) { }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    this.map = new maplibregl.Map({
      container: 'map',
      style: this.basemapStyles.ghyb,
      center: [100.74772532288121, 16.74671209795611],
      zoom: 10,
    });

    this.map.on('load', () => {
      // 5. วนลูปเพื่อ Add Source และ Layer ทั้งหมดเข้าแผนที่ แต่ตั้งค่า visibility ตาม array
      this.control_layer.forEach(layer => {
        const sourceId = `source-${layer.name}`;
        const layerId = layer.name; // ใช้ชื่อ layer เป็น ID เลยเพื่อให้เรียกง่าย

        // เพิ่ม Source
        this.map!.addSource(sourceId, {
          type: 'raster',
          // ใช้ URL pattern เดิมที่คุณมี (Tile Service)
          tiles: [
            `${environment.base_path}tiles/{z}/{x}/{y}?filename=${layer.path}`
          ],
          tileSize: 256
        });

        // เพิ่ม Layer
        this.map!.addLayer({
          id: layerId,
          type: 'raster',
          source: sourceId,
          layout: {
            // สำคัญ: กำหนดการแสดงผลเริ่มต้นตามค่า visible ใน array
            visibility: layer.visible ? 'visible' : 'none'
          },
          paint: {}
        });
      });
    });
  }

  // 6. ฟังก์ชันสำหรับ Toggle Layer เมื่อกด Checkbox
  toggleLayer(layer: any, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    layer.visible = isChecked; // อัปเดตค่าใน Array

    if (this.map && this.map.getLayer(layer.name)) {
      const visibility = isChecked ? 'visible' : 'none';
      this.map.setLayoutProperty(layer.name, 'visibility', visibility);
      
      // (Optional) ถ้าเปิด Layer แล้วอยากให้ Zoom ไปหาอัตโนมัติ
      if(isChecked) {
         this.zoomToLayer(layer.path); 
      }
    }
  }

  // แยกฟังก์ชัน Zoom ออกมาเผื่อเรียกใช้
  async zoomToLayer(filename: string) {
      try {
        const res: any = await this.webservice.getBounds(filename);
        if (res && res.bounds) {
          this.map!.fitBounds(res.bounds, {
              padding: 20,
              maxZoom: 18,
              duration: 1000
          });
        }
      } catch (error) {
        console.error('Error fetching bounds:', error);
      }
  }
}
