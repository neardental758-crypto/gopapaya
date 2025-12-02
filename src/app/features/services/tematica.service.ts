import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Contenido {
  _id: string;
  id_tematica: string;
  nombre_contenido: string;
  link_video?: string | undefined;
  preguntas?: any[];
}

export interface Tematica {
  _id: string;
  nombre_tematica: string;
  descripcion?: string;
  logo_tematica?: string;
  tematica_activa: boolean;
  contenidos?: Contenido[];
}

@Injectable({
  providedIn: 'root',
})
export class TematicaService {
  private apiUrl = `${environment.apiUrl}/tematica`;

  constructor(private http: HttpClient) {}

  getTematicas(): Observable<Tematica[]> {
    return this.http.get<any>(`${this.apiUrl}/all`).pipe(
      map((response) => {
        // Si el backend devuelve { data: [...] }
        if (response && response.data) {
          return response.data;
        }
        // Si devuelve directamente el array
        return response;
      })
    );
  }

  getTematica(id: string): Observable<Tematica> {
    return this.http.get<any>(`${this.apiUrl}/id/${id}`).pipe(
      map((response) => {
        if (response && response.data) {
          return response.data;
        }
        return response;
      })
    );
  }

  createTematica(tematica: Partial<Tematica>): Observable<Tematica> {
    return this.http.post<any>(`${this.apiUrl}/registrar`, tematica).pipe(
      map((response) => {
        if (response && response.data) {
          return response.data;
        }
        return response;
      })
    );
  }

  updateTematica(
    id: string,
    tematica: Partial<Tematica>
  ): Observable<Tematica> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, tematica).pipe(
      map((response) => {
        if (response && response.data) {
          return response.data;
        }
        return response;
      })
    );
  }

  deleteTematica(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getTematicasConContenido(): Observable<Tematica[]> {
    return this.getTematicas();
  }
}
