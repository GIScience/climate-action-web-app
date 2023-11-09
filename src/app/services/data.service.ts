import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, takeUntil } from 'rxjs';

import { environment } from '../../environments/environment';
import { ActivatedRoute, Router } from '@angular/router';

@Injectable()
export class DataService {

  url = environment.climateActionApiUrl

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router) {
  }

}
