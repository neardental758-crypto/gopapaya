import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ParticipanteDrBici {
  id?: number;
  idSesion: number;
  tipoVehiculo: string;
  tiposTrabajo: string[];
  repuestosUtilizados?: string[];
  nombreParticipante: string;
  apellidoParticipante: string;
  documento?: string;
  sexo: string;
  fechaRegistro?: string;
  tiempoParticipacion?: number;
}

export interface RepuestoDrBici {
  id: number;
  nombre: string;
  categoria: string;
  activo: number;
}

@Injectable({
  providedIn: 'root',
})
export class ParticipanteDrBiciService {
  private apiUrl = `${environment.apiUrl}/participanteDrBici`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ParticipanteDrBici[]> {
    return this.http
      .get<any>(this.apiUrl)
      .pipe(map((response) => response.data || response));
  }

  getBySesion(idSesion: number): Observable<ParticipanteDrBici[]> {
    return this.http
      .get<any>(`${this.apiUrl}/sesion/${idSesion}`)
      .pipe(map((response) => response.data || response));
  }

  create(participante: ParticipanteDrBici): Observable<ParticipanteDrBici> {
    return this.http
      .post<any>(this.apiUrl, participante)
      .pipe(map((response) => response.data || response));
  }

  update(
    id: number,
    participante: Partial<ParticipanteDrBici>,
  ): Observable<ParticipanteDrBici> {
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
