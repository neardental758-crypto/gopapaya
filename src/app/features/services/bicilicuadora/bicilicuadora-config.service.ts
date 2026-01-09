import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
export interface BicilicuadoraConfig {
  id?: number;
  idSesion: number;
  numeroBicicletas: number;
  configuracionBicicletas?: ConfiguracionBicicleta[];
  estado?: 'configurando' | 'en_progreso' | 'finalizado';
  fechaCreacion?: string;
  participantes?: ParticipanteBicilicuadora[];
}

export interface ConfiguracionBicicleta {
  numeroBicicleta: number;
  participantes: number;
  bebidasSeleccionadas: BebidaSeleccionada[];
}

export interface BebidaSeleccionada {
  bebidaId: string;
  nombreBebida: string;
  cantidad: number;
}

export interface ParticipanteBicilicuadora {
  id?: number;
  idBicilicuadora: number;
  nombreParticipante: string;
  numeroBicicleta: number;
  colorBicicleta: string;
  sexo?: 'M' | 'F';
  caloriasQuemadas?: number;
  vatiosGenerados?: number;
  duracionTotal?: number;
  distanciaRecorrida?: number;
  velocidadPromedio?: number;
  velocidadMaxima?: number;
}

export interface ColorBicicleta {
  nombre: string;
  valor: string;
  sombra: string;
}

@Injectable({
  providedIn: 'root',
})
export class BicilicuadoraConfigService {
  private apiUrl = `${environment.apiUrl}/bicilicuadora`;
  private configActualSubject = new BehaviorSubject<BicilicuadoraConfig | null>(
    null
  );
  public configActual$ = this.configActualSubject.asObservable();

  constructor(private http: HttpClient) {}

  createConfig(config: BicilicuadoraConfig): Observable<BicilicuadoraConfig> {
    return this.http.post<any>(this.apiUrl + '/config', config).pipe(
      map((response) => {
        const data = response.data || response;
        this.setConfigActual(data);
        return data;
      })
    );
  }

  getConfigBySesion(idSesion: number): Observable<BicilicuadoraConfig> {
    return this.http
      .get<any>(`${this.apiUrl}/config/sesion/${idSesion}`)
      .pipe(map((response) => response.data || response));
  }

  setConfigActual(config: BicilicuadoraConfig | null): void {
    this.configActualSubject.next(config);
    if (config) {
      localStorage.setItem('bicilicuadoraConfig', JSON.stringify(config));
    } else {
      localStorage.removeItem('bicilicuadoraConfig');
    }
  }

  getConfigActual(): BicilicuadoraConfig | null {
    const configLocal = localStorage.getItem('bicilicuadoraConfig');
    if (configLocal) {
      return JSON.parse(configLocal);
    }
    return this.configActualSubject.value;
  }

  limpiarConfig(): void {
    this.setConfigActual(null);
  }
  getConfigById(id: number): Observable<BicilicuadoraConfig> {
    return this.http
      .get<any>(`${this.apiUrl}/config/${id}`)
      .pipe(map((response) => response.data || response));
  }
}
