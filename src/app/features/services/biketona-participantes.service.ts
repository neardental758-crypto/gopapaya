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
  velocidadPromedio?: string;  // km/h
  velocidadMax?: string;       // km/h
  calorias?: string;           // kcal
  vatios?: string;             // W
  distanciaReal?: string;      // km (por ejemplo)
  tiempoTotal?: string;        // mm:ss
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
  // Queda: http://192.168.1.2:3306/api/biketona-participantes
  // ⚠️ Ajusta este path al que tengas en tu backend
  private apiUrl = `${environment.apiUrl}/biketonaParticipantes`;

  constructor(private http: HttpClient) {}

  crearParticipante(participante: BiketonaParticipante): Observable<BiketonaParticipante> {
    return this.http
      .post<BiketonaParticipanteApiResponse>(`${this.apiUrl}/registrar`, participante)
      .pipe(map(res => res.data));
  }

  // obtener todos los participantes de una biketona
  getByBiketona(idBiketona: string): Observable<BiketonaParticipante[]> {
    return this.http
      .get<BiketonaParticipantesListResponse>(`${this.apiUrl}/participantes/${idBiketona}`)
      .pipe(map(res => res.data));
  }
}
