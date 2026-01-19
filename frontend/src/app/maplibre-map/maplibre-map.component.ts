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
    { name: "51421", path: "51421.tif",type:"raster", visible: false },
    { name: "51424", path: "51424.tif",type:"raster", visible: false },
    { name: "51431", path: "51431.tif",type:"raster", visible: false },
    { name: "51432", path: "51432.tif",type:"raster", visible: false },
    { name: "51433", path: "51433.tif",type:"raster", visible: false },
    { name: "ALOS_PALSAR_DEM", path: "ALOS_PALSAR_DEM.tif&colormap=terrain&rescale=0,250",type:"raster", visible: false },
    { name: "S2B_MSIL1C_20181106_RGB", path: "S2B_MSIL1C_20181106_RGB.tif",type:"raster", visible: false },
    { name: "amphoe", path: "amphoe",type:"geojson", visible: false },
    { name: "tambon", path: "tambon",type:"geojson", visible: false },
    { name: "bokdin", path: "bokdin",type:"geojson", visible: false },
    { name: "stream", path: "stream",type:"geojson", visible: false },
    { name: "index_4k", path: "index_4k",type:"geojson", visible: false },
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
      this.control_layer.forEach(async layer => {
        const sourceId = `source-${layer.name}`;
        const layerId = layer.name;

        // --- กรณีที่ 1: Raster (Tile Service) ---
        if (layer.type === 'raster') {
          this.map!.addSource(sourceId, {
            type: 'raster',
            tiles: [
              `${environment.base_path}tiles/{z}/{x}/{y}?filename=${layer.path}`
            ],
            tileSize: 256
          });

          this.map!.addLayer({
            id: layerId,
            type: 'raster',
            source: sourceId,
            layout: {
              visibility: layer.visible ? 'visible' : 'none'
            },
            paint: {}
          });
        }
        // --- กรณีที่ 2: GeoJSON (Webservice) ---
        else if (layer.type === 'geojson') {
          // เรียก Service เพื่อดึงข้อมูล GeoJSON (Asynchronous)
          const geojsonData:any = await this.webservice.getGeojson(layer.path);
          if(geojsonData){
            // console.log(geojsonData);
            if (!this.map) return;

              // เพิ่ม Source
              this.map.addSource(sourceId, {
                type: 'geojson',
                data: geojsonData
              });

              this.addGeoJsonLayer(layerId, sourceId, layer);
          }
        }
      });
    });
  }

  // Helper Function สำหรับกำหนด Style ของ GeoJSON ตามชื่อ Layer
  private addGeoJsonLayer(layerId: string, sourceId: string, layer: any) {
    const visibility = layer.visible ? 'visible' : 'none';

    // ตัวอย่างการแยก Style ตามชื่อ (ปรับแต่งสีได้ตามใจชอบ)
    if (layer.name === 'stream') {
      // ถ้าเป็นแม่น้ำ ใช้ Type: Line
      this.map!.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { visibility: visibility },
        paint: {
          'line-color': '#00BFFF', // สีฟ้า
          'line-width': 2
        }
      });
    } else if (layer.name === 'bokdin') {
      this.map!.addLayer({
        id: layerId,
        type: 'circle',  // <--- สำคัญ: ต้องใช้ circle สำหรับจุด
        source: sourceId,
        layout: { visibility: visibility },
        paint: {
          'circle-radius': 6,         // ขนาดของจุด (pixel)
          'circle-color': this.getColorByLayerName(layer.name), // ดึงสีเขียวจากฟังก์ชันเดิม
          'circle-stroke-width': 1,   // ใส่ขอบขาวให้จุดดูชัดขึ้น
          'circle-stroke-color': '#FFFFFF',
          'circle-opacity': 0.8       // โปร่งแสงนิดหน่อย (เผื่อจุดซ้อนกัน)
        }
      });
    } else {
      // Layer อื่นๆ (amphoe, tambon, etc.) สมมติว่าเป็น Polygon
      // เราอาจจะวาดเป็นเส้นขอบ (Line) เพื่อไม่ให้บังแผนที่
      this.map!.addLayer({
        id: layerId,
        type: 'line', 
        source: sourceId,
        layout: { visibility: visibility },
        paint: {
          'line-color': this.getColorByLayerName(layer.name),
          'line-width': 1.5
        }
      });

      // (Optional) ถ้าอยากให้มีสีพื้นด้วย ให้เพิ่ม Layer type 'fill' อีกอัน
      // โดยใช้ sourceId เดิม แต่ตั้ง id ใหม่ เช่น layerId + '_fill'
    }
  }

  private getColorByLayerName(name: string): string {
    switch (name) {
      case 'amphoe': return '#FF0000'; // แดง
      case 'tambon': return '#FFA500'; // ส้ม
      case 'bokdin': return '#008000'; // เขียว
      case 'index_4k': return '#800080'; // ม่วง
      default: return '#FFFF00'; // เหลือง
    }
  }

  // 6. ฟังก์ชันสำหรับ Toggle Layer
  toggleLayer(layer: any, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    layer.visible = isChecked;

    if (this.map && this.map.getLayer(layer.name)) {
      const visibility = isChecked ? 'visible' : 'none';
      this.map.setLayoutProperty(layer.name, 'visibility', visibility);

      if (isChecked) {
        // ถ้าเป็น Raster ใช้ zoomToLayer เดิม (getBounds)
        // แต่ถ้า GeoJSON ข้อมูลมีอยู่แล้วใน Map อาจจะใช้ map.getSource().getData() คำนวณ bounds ก็ได้
        // ในที่นี้ใช้ logic เดิมไปก่อน
        if(layer.type=="raster"){
          this.zoomToLayer(layer.path);
        }
      }
    } else {
       // กรณี GeoJSON อาจจะยังโหลดไม่เสร็จ (Async) ตอนกด Toggle
       console.warn(`Layer ${layer.name} is not loaded yet.`);
    }
  }

  async zoomToLayer(filename: string) {
    try {
      // เช็คว่าเป็น GeoJSON หรือ Raster เพื่อเรียก Bounds ให้ถูกวิธี (ถ้า API แยกกัน)
      // สมมติว่า webservice.getBounds รองรับทั้งคู่
      
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
