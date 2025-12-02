import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage/storage.service';

export interface BrainBikeConfig {
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

export interface BrainBikeParticipante {
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
export class BrainBikeService {
  private apiUrl = `${environment.apiUrl}/brainBike`;
  private configActual: BrainBikeConfig | null = null;

  constructor(private http: HttpClient) {}

  createConfig(config: BrainBikeConfig): Observable<BrainBikeConfig> {
    return this.http
      .post<{ data: BrainBikeConfig }>(this.apiUrl, config)
      .pipe(map((response) => response.data));
  }

  getConfig(id: number): Observable<BrainBikeConfig> {
    return this.http
      .get<{ data: BrainBikeConfig }>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  setConfigActual(config: BrainBikeConfig): void {
    this.configActual = config;
    localStorage.setItem('brainbike_config', JSON.stringify(config));
  }

  getConfigActual(): BrainBikeConfig | null {
    if (this.configActual) return this.configActual;

    const stored = localStorage.getItem('brainbike_config');
    if (stored) {
      this.configActual = JSON.parse(stored);
      return this.configActual;
    }

    return null;
  }

  clearConfigActual(): void {
    this.configActual = null;
    localStorage.removeItem('brainbike_config');
  }

  deleteConfig(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
