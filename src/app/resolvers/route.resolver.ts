import { Injectable } from '@angular/core';
import { RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { Observable } from 'rxjs';

import { DataService } from '../services/data.service';

@Injectable({
  providedIn: 'root'
})
export class RouteResolver  {

  constructor(private dataService: DataService) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> | null {
    console.log('>>> RouteResolver >>> ', route.params, state)
    // return this.dataService.requestSummary(route.params)
    return null
  }
}
