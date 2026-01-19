import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ParticipanteVR {
  id?: number;
  idSesion: number;
  tipoVr: string;
  nombreParticipante: string;
  apellidoParticipante: string;
  sexo: 'M' | 'F';
  tiempoParticipacion?: number;
  fechaRegistro?: string;
  documento?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ParticipanteVRService {
  private apiUrl = `${environment.apiUrl}/participante_vr`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ParticipanteVR[]> {
    return this.http
      .get<any>(this.apiUrl)
      .pipe(map((response) => response.data || response));
  }

  getBySesion(idSesion: number): Observable<ParticipanteVR[]> {
    return this.http
      .get<any>(`${this.apiUrl}/sesion/${idSesion}`)
      .pipe(map((response) => response.data || response));
  }

  create(participante: ParticipanteVR): Observable<ParticipanteVR> {
    return this.http
      .post<any>(this.apiUrl, participante)
      .pipe(map((response) => response.data || response));
  }

  update(
    id: number,
    participante: Partial<ParticipanteVR>,
  ): Observable<ParticipanteVR> {
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
