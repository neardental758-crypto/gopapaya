import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Aliado {
  _id: string;
  nombre: string;
  logo?: string;
  nombre_poc?: string;
  email_poc?: string;
  telefono?: string;
  notas?: string;
  estado: 'activo' | 'inactivo';
  createdAt?: string;
  updatedAt?: string;
  agrs?: AGR[];
}

export interface AGR {
  _id: string;
  aliado_id: string;
  nombre: string;
  email: string;
  telefono?: string;
  notas?: string;
  estado: 'activo' | 'inactivo';
  createdAt?: string;
  updatedAt?: string;
  empresas?: Empresa[];
}

export interface Empresa {
  _id: string;
  agr_id: string;
  nombre: string;
  nombre_poc?: string;
  logo?: string;
  email?: string;
  telefono?: string;
  notas?: string;
  estado: 'activo' | 'inactivo';
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AliadosService {
  private aliadoUrl = `${environment.apiUrl}/aliado`;
  private agrUrl = `${environment.apiUrl}/agr`;
  private empresaUrl = `${environment.apiUrl}/empresa`;

  constructor(private http: HttpClient) {}

  getAliados(): Observable<Aliado[]> {
    return this.http
      .get<any>(this.aliadoUrl)
      .pipe(map((response) => response.data || []));
  }

  getAliado(id: string): Observable<Aliado> {
    return this.http
      .get<any>(`${this.aliadoUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  createAliado(aliado: Partial<Aliado>): Observable<Aliado> {
    return this.http
      .post<any>(this.aliadoUrl, aliado)
      .pipe(map((response) => response.data));
  }

  updateAliado(id: string, aliado: Partial<Aliado>): Observable<Aliado> {
    return this.http
      .patch<any>(`${this.aliadoUrl}/${id}`, aliado)
      .pipe(map((response) => response.data));
  }

  deleteAliado(id: string): Observable<any> {
    return this.http.delete<any>(`${this.aliadoUrl}/${id}`);
  }

  getAGRs(): Observable<AGR[]> {
    return this.http
      .get<any>(this.agrUrl)
      .pipe(map((response) => response.data || []));
  }

  getAGR(id: string): Observable<AGR> {
    return this.http
      .get<any>(`${this.agrUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  getAGRsByAliado(aliadoId: string): Observable<AGR[]> {
    return this.http
      .get<any>(`${this.agrUrl}/aliado/${aliadoId}`)
      .pipe(map((response) => response.data || []));
  }

  createAGR(agr: Partial<AGR>): Observable<AGR> {
    return this.http
      .post<any>(this.agrUrl, agr)
      .pipe(map((response) => response.data));
  }

  updateAGR(id: string, agr: Partial<AGR>): Observable<AGR> {
    return this.http
      .patch<any>(`${this.agrUrl}/${id}`, agr)
      .pipe(map((response) => response.data));
  }

  deleteAGR(id: string): Observable<any> {
    return this.http.delete<any>(`${this.agrUrl}/${id}`);
  }

  getEmpresas(): Observable<Empresa[]> {
    return this.http
      .get<any>(this.empresaUrl)
      .pipe(map((response) => response.data || []));
  }

  getEmpresa(id: string): Observable<Empresa> {
    return this.http
      .get<any>(`${this.empresaUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  getEmpresasByAGR(agrId: string): Observable<Empresa[]> {
    return this.http
      .get<any>(`${this.empresaUrl}/agr/${agrId}`)
      .pipe(map((response) => response.data || []));
  }

  createEmpresa(empresa: Partial<Empresa>): Observable<Empresa> {
    return this.http
      .post<any>(this.empresaUrl, empresa)
      .pipe(map((response) => response.data));
  }

  updateEmpresa(id: string, empresa: Partial<Empresa>): Observable<Empresa> {
    return this.http
      .patch<any>(`${this.empresaUrl}/${id}`, empresa)
      .pipe(map((response) => response.data));
  }

  deleteEmpresa(id: string): Observable<any> {
    return this.http.delete<any>(`${this.empresaUrl}/${id}`);
  }
}
