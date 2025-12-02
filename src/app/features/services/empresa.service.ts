import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Empresa {
  _id: string;
  nombre: string;
  logo?: string;
  estado: 'activo' | 'inactivo';
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EmpresaService {
  private apiUrl = `${environment.apiUrl}/empresa`;

  constructor(private http: HttpClient) {}

  getEmpresas(): Observable<Empresa[]> {
    return this.http
      .get<any>(this.apiUrl)
      .pipe(map((response) => response.data || []));
  }

  getEmpresa(id: string): Observable<Empresa> {
    return this.http
      .get<any>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  createEmpresa(empresa: Partial<Empresa>): Observable<Empresa> {
    return this.http
      .post<any>(this.apiUrl, empresa)
      .pipe(map((response) => response.data));
  }

  updateEmpresa(id: string, empresa: Partial<Empresa>): Observable<Empresa> {
    return this.http
      .patch<any>(`${this.apiUrl}/${id}`, empresa)
      .pipe(map((response) => response.data));
  }

  deleteEmpresa(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
