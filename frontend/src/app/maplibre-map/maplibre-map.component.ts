import { Component, OnInit, AfterViewInit } from '@angular/core';
import maplibregl from 'maplibre-gl';

@Component({
  selector: 'app-maplibre-map',
  standalone: true,
  imports: [],
  template: '<div id="maplibre-map" style="height: 100%; width: 100%;"></div>',
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

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    this.map = new maplibregl.Map({
      container: 'maplibre-map',
      style: this.basemapStyles.ghyb, // Demo style
      center: [100.577982, 13.845845],
      zoom: 10,
    });

    this.map.on('load', () => {
      this.map!.addSource('suanmokkh-source', {
        type: 'raster',
        tiles: [
          'http://localhost:8000/api/tiles/{z}/{x}/{y}?filename=suanmokkh.tif'
        ],
        tileSize: 256
      });

      this.map!.addLayer({
        id: 'suanmokkh-layer',
        type: 'raster',
        source: 'suanmokkh-source',
        paint: {}
      });
    });
  }
}
