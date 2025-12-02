import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Biketona {
  id: string;
  idSesion: string; // la API lo devuelve como string
  tipoPista: 'digital' | 'fisica';
  nBicicletas: number;
  nParticipantes: number;
  nVueltas: number;
  tipoCompetencia: '1vs1' | 'campeonato' | 'campeonato-equipos';
  distanciaPista: number;
  fechaCreacion: string;
  estado: string;
}

export interface BiketonaCreatePayload {
  id?: string; 
  idSesion: string | number;
  tipoPista: 'digital' | 'fisica';
  nBicicletas: number;
  nParticipantes: number;
  nVueltas: number;
  tipoCompetencia: '1vs1' | 'campeonato' | 'campeonato-equipos';
  distanciaPista: number;
  fechaCreacion: string;
  estado: string;
}

interface BiketonaApiResponse {
  status: number;
  data: Biketona;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class BiketonaService {
  // Queda: http://192.168.1.2:3306/api/biketona
  private apiUrl = `${environment.apiUrl}/biketona`;

  constructor(private http: HttpClient) {}

  createConfig(payload: BiketonaCreatePayload): Observable<Biketona> {
    return this.http
      .post<BiketonaApiResponse>(`${this.apiUrl}/registrar`, payload)
      .pipe(map((res) => res.data));
  }

  getBySesion(idSesion: number): Observable<Biketona | null> {
    return this.http
      .get<{ data: Biketona }>(`${this.apiUrl}/sesion/${idSesion}`)
      .pipe(
        map(res => res.data),
        catchError(err => {
          console.error('Error al obtener biketona por sesión:', err);
          // Si hay 404 u otro error, devolvemos null para que el setup siga normal
          return of(null);
        })
      );
  }

  actualizarEstado(idBiketona: string, nuevoEstado: 'activa' | 'finalizada'): Observable<Biketona> {
    // ⚠️ Ajusta esta ruta si tu backend expone otro endpoint
    return this.http
      .put<BiketonaApiResponse>(`${this.apiUrl}/${idBiketona}`, { estado: nuevoEstado })
      .pipe(map(res => res.data));
  }
}