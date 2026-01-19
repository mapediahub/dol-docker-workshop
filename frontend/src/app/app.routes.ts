import { Routes } from '@angular/router';
import { MapLibreMapComponent } from './maplibre-map/maplibre-map.component';

export const routes: Routes = [
    { path: 'home', component: MapLibreMapComponent },
    { path: '', redirectTo: '/home', pathMatch: 'full' }
];
