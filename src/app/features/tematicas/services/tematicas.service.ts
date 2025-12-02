import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Tematica } from '../../../core/interfaces/tematica.interface';

@Injectable({
  providedIn: 'root',
})
export class TematicasService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tematica`;

  getAllTematicas(): Observable<Tematica[]> {
    return this.http
      .get<any>(`${this.apiUrl}`)
      .pipe(map((response) => response.data || []));
  }

  getTematicaById(id: string): Observable<Tematica> {
    return this.http
      .get<any>(`${this.apiUrl}/id/${id}`)
      .pipe(map((response) => response.data));
  }

  createTematica(data: Partial<Tematica>): Observable<Tematica> {
    return this.http.post<Tematica>(`${this.apiUrl}/registrar`, data);
  }

  updateTematica(id: string, data: Partial<Tematica>): Observable<Tematica> {
    return this.http.patch<Tematica>(`${this.apiUrl}/${id}`, data);
  }

  deleteTematica(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
