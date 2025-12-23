import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BiketonaParticipante {
  id?: string;
  idBiketona: string;
  nombre: string;
  genero: string;
  equipo?: string | null;
  puntos?: number;
  tiempo?: string;
  velocidadPromedio?: string;
  velocidadMax?: string;
  calorias?: string;
  vatios?: string;
  distanciaReal?: string;
  tiempoTotal?: string;
  posicion?: number;
  llave: number;
  estadoLlave: string;
}

interface BiketonaParticipanteApiResponse {
  status: number;
  data: BiketonaParticipante;
  message: string;
}

interface BiketonaParticipantesListResponse {
  data: BiketonaParticipante[];
}

@Injectable({ providedIn: 'root' })
export class BiketonaParticipantesService {
  private apiUrl = `${environment.apiUrl}/biketonaParticipantes`;

  constructor(private http: HttpClient) {}

  crearParticipante(
    participante: BiketonaParticipante
  ): Observable<BiketonaParticipante> {
    return this.http
      .post<BiketonaParticipanteApiResponse>(
        `${this.apiUrl}/registrar`,
        participante
      )
      .pipe(map((res) => res.data));
  }

  getByBiketona(idBiketona: string): Observable<BiketonaParticipante[]> {
    return this.http
      .get<BiketonaParticipantesListResponse>(
        `${this.apiUrl}/participantes/${idBiketona}`
      )
      .pipe(map((res) => res.data));
  }
  crearBulk(
    participantes: BiketonaParticipante[]
  ): Observable<BiketonaParticipante[]> {
    return this.http
      .post<{ data: BiketonaParticipante[] }>(
        `${this.apiUrl}/bulk`,
        participantes
      )
      .pipe(map((res) => res.data));
  }

  actualizarParticipante(
    id: string,
    datos: Partial<BiketonaParticipante>
  ): Observable<BiketonaParticipante> {
    return this.http
      .put<BiketonaParticipanteApiResponse>(`${this.apiUrl}/${id}`, datos)
      .pipe(map((res) => res.data));
  }
}
