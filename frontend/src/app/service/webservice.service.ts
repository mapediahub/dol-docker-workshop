import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from "@angular/common/http";
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebserviceService {


  base_path = environment.base_path;

  constructor(
    public http: HttpClient,
  ) { }

  async getBounds(filepath: any) {
    return new Promise((res, rej) => {
      this.http
        .get(`${this.base_path}bounds/${filepath}`)
        .subscribe(
          (data: any) => res(data),
          (err: any) => rej(err)
        );
    });
  }

  async getGeojson(layer: any) {
    return new Promise((res, rej) => {
      this.http
        .get(`${this.base_path}geojson/${layer}`)
        .subscribe(
          (data: any) => res(data),
          (err: any) => rej(err)
        );
    });
  }


}
