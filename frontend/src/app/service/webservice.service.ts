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

  


  // async getBounds(data: any) {
  //   return new Promise((res, rej) => {
  //     this.http
  //       .post(this.base_path + `simulate-water`, data, this.httpOptions)
  //       .subscribe(
  //         (data: any) => res(data),
  //         (err: any) => rej(err)
  //       );
  //   });
  // }

}
