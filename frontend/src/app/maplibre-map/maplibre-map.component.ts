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

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    this.map = new maplibregl.Map({
      container: 'maplibre-map',
      style: 'https://demotiles.maplibre.org/style.json', // Demo style
      center: [100.5018, 13.7563], // Bangkok [lng, lat]
      zoom: 5
    });
  }
}
