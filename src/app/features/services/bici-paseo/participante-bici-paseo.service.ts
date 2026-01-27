import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ParticipanteBiciPaseo {
  id?: number;
  idSesion: number;
  nombreParticipante: string;
  apellidoParticipante: string;
  sexo: 'M' | 'F';
  documento?: string;
  tipoVehiculo: string;
  fechaRegistro?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ParticipanteBiciPaseoService {
  private apiUrl = `${environment.apiUrl}/participante_bici_paseo`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ParticipanteBiciPaseo[]> {
    return this.http
      .get<any>(this.apiUrl)
      .pipe(map((response) => response.data || response));
  }

  getBySesion(idSesion: number): Observable<ParticipanteBiciPaseo[]> {
    return this.http
      .get<any>(`${this.apiUrl}/sesion/${idSesion}`)
      .pipe(map((response) => response.data || response));
  }

  create(
    participante: ParticipanteBiciPaseo,
  ): Observable<ParticipanteBiciPaseo> {
    return this.http
      .post<any>(this.apiUrl, participante)
      .pipe(map((response) => response.data || response));
  }

  createBatch(
    participantes: ParticipanteBiciPaseo[],
  ): Observable<ParticipanteBiciPaseo[]> {
    return this.http
      .post<any>(`${this.apiUrl}/batch`, { participantes })
      .pipe(map((response) => response.data || response));
  }

  update(
    id: number,
    participante: Partial<ParticipanteBiciPaseo>,
  ): Observable<ParticipanteBiciPaseo> {
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
