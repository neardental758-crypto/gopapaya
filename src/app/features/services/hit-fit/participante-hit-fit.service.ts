import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ParticipanteHitFit {
  id?: number;
  idSesion: number;
  nombreParticipante: string;
  apellidoParticipante: string;
  sexo: 'M' | 'F';
  tiempoParticipacion?: number;
  puntosObtenidos?: number;
  fechaRegistro?: string;
  documento?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ParticipanteHitFitService {
  private apiUrl = `${environment.apiUrl}/participante_hit_fit`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ParticipanteHitFit[]> {
    return this.http
      .get<any>(this.apiUrl)
      .pipe(map((response) => response.data || response));
  }

  getBySesion(idSesion: number): Observable<ParticipanteHitFit[]> {
    return this.http
      .get<any>(`${this.apiUrl}/sesion/${idSesion}`)
      .pipe(map((response) => response.data || response));
  }

  create(participante: ParticipanteHitFit): Observable<ParticipanteHitFit> {
    return this.http
      .post<any>(this.apiUrl, participante)
      .pipe(map((response) => response.data || response));
  }

  update(
    id: number,
    participante: Partial<ParticipanteHitFit>,
  ): Observable<ParticipanteHitFit> {
    return this.http
      .put<any>(`${this.apiUrl}/${id}`, participante)
      .pipe(map((response) => response.data || response));
  }

  deleteById(id: number): Observable<any> {
    return this.http
      .delete<any>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data || response));
  }

  deleteBySesion(idSesion: number): Observable<any> {
    return this.http
      .delete<any>(`${this.apiUrl}/sesion/${idSesion}`)
      .pipe(map((response) => response.data || response));
  }
}
