import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface BrainBikeV2Config {
  id?: number;
  idSesion: number;
  contenido_id: string;
  urlVideo: string;
  numeroBicicletas: number;
  velocidadMinimaVideo: number;
  velocidadMinimaTrivia: number;
  numeroPreguntas: number;
  tipoCompetencia: string;
  fechaCreacion?: string;
  estado?: string;
}

export interface BrainBikeV2Participante {
  id?: number;
  idBrainBike: number;
  nombreParticipante: string;
  numeroBicicleta: number;
  colorBicicleta: string;
  equipoIdentificador?: string | null;
  puntosAcumulados?: number;
  puntosCarrera?: number;
  velocidadActual?: number;
}

@Injectable({
  providedIn: 'root',
})
export class BrainBikeV2Service {
  private apiUrl = `${environment.apiUrl}/brainBike`;
  private configActual: BrainBikeV2Config | null = null;

  constructor(private http: HttpClient) {}

  createConfig(config: BrainBikeV2Config): Observable<BrainBikeV2Config> {
    return this.http
      .post<{ data: BrainBikeV2Config }>(this.apiUrl, config)
      .pipe(map((response) => response.data));
  }

  getConfig(id: number): Observable<BrainBikeV2Config> {
    return this.http
      .get<{ data: BrainBikeV2Config }>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  setConfigActual(config: BrainBikeV2Config): void {
    this.configActual = config;
    localStorage.setItem('brainbike_v2_config', JSON.stringify(config));
  }

  getConfigActual(): BrainBikeV2Config | null {
    if (this.configActual) return this.configActual;

    const stored = localStorage.getItem('brainbike_v2_config');
    if (stored) {
      this.configActual = JSON.parse(stored);
      return this.configActual;
    }

    return null;
  }

  clearConfigActual(): void {
    this.configActual = null;
    localStorage.removeItem('brainbike_v2_config');
  }

  deleteConfig(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
