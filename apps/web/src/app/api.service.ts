import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ICsku,
  ILocation,
  IMapDataResponse,
  ITimeBucket,
  ITotalInfoRow,
} from './types';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = '/api';

  getLocations(): Observable<ILocation[]> {
    return this.http.get<ILocation[]>(`${this.base}/locations`);
  }
  getTimeBuckets(): Observable<ITimeBucket[]> {
    return this.http.get<ITimeBucket[]>(`${this.base}/time-buckets`);
  }
  getCskus(): Observable<ICsku[]> {
    return this.http.get<ICsku[]>(`${this.base}/cskus`);
  }
  getTotalInfo(): Observable<ITotalInfoRow[]> {
    return this.http.get<ITotalInfoRow[]>(`${this.base}/total-info`);
  }
  getMapData(csku: string, tb: string): Observable<IMapDataResponse> {
    return this.http.get<IMapDataResponse>(`${this.base}/map-data`, {
      params: new HttpParams().set('csku', csku).set('tb', tb),
    });
  }
  getResourceBalance(csku: string, warehouse: string, tb: string): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/resource-balance`, {
      params: new HttpParams().set('csku', csku).set('warehouse', warehouse).set('tb', tb),
    });
  }
  getMovements(csku: string, from: string, to: string, tb: string): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/movements`, {
      params: new HttpParams().set('csku', csku).set('from', from).set('to', to).set('tb', tb),
    });
  }
  getFinalProductions(csku: string, factory: string, tb: string): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/final-productions`, {
      params: new HttpParams().set('csku', csku).set('factory', factory).set('tb', tb),
    });
  }
  getFactoryLoad(
    factory: string,
    tb: string
  ): Observable<{ workcenterLoad: Record<string, unknown>[]; secondaryResourceLoad: Record<string, unknown>[] }> {
    return this.http.get<{
      workcenterLoad: Record<string, unknown>[];
      secondaryResourceLoad: Record<string, unknown>[];
    }>(`${this.base}/factory-load`, {
      params: new HttpParams().set('factory', factory).set('tb', tb),
    });
  }
  login(email: string, password: string): Observable<{ token: string; email: string }> {
    return this.http.post<{ token: string; email: string }>(`${this.base}/auth/login`, { email, password });
  }
}
