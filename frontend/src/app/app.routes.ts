import { Routes } from '@angular/router';
import { LeafletMapComponent } from './leaflet-map/leaflet-map.component';
import { MapLibreMapComponent } from './maplibre-map/maplibre-map.component';

export const routes: Routes = [
    { path: 'leaflet', component: LeafletMapComponent },
    { path: 'maplibre', component: MapLibreMapComponent },
    { path: '', redirectTo: '/leaflet', pathMatch: 'full' }
];
