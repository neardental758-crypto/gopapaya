import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage/storage.service';

export interface BrainBikeParticipante {
  id?: number;
  idBrainBike: number;
  nombreParticipante: string;
  numeroBicicleta: number;
  colorBicicleta: string;
  sexo?: 'M' | 'F';
  equipoIdentificador?: string | null;
  puntosAcumulados?: number;
  velocidadPromedio?: number;
  velocidadMaxima?: number;
  caloriasQuemadas?: number;
  vatiosGenerados?: number;
  duracionTotal?: number;
  posicionRanking?: number;
  distanciaRecorrida?: number;
}

@Injectable({
  providedIn: 'root',
})
export class BrainBikeParticipanteService {
  private apiUrl = `${environment.apiUrl}/brainBikeParticipante`;
  private STORAGE_KEY = 'brainBikeParticipantes';

  constructor(
    private http: HttpClient,
    private storageService: StorageService
  ) {}

  getAll(): Observable<BrainBikeParticipante[]> {
    return this.http
      .get<any>(this.apiUrl)
      .pipe(map((response) => response.data || response));
  }

  getById(id: number): Observable<BrainBikeParticipante> {
    return this.http
      .get<any>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data || response));
  }

  getRankingSesion(idSesion: number): Observable<BrainBikeParticipante[]> {
    return this.http.get<any>(`${this.apiUrl}/ranking/sesion/${idSesion}`).pipe(
      map((response) => {
        const data = response.data || response;
        return Array.isArray(data) ? data : [];
      }),
      catchError((error) => {
        console.error('Error en getRankingSesion:', error);
        return of([]);
      })
    );
  }

  create(
    participante: BrainBikeParticipante
  ): Observable<BrainBikeParticipante> {
    return this.http
      .post<any>(this.apiUrl, participante)
      .pipe(map((response) => response.data || response));
  }

  createBulk(
    participantes: BrainBikeParticipante[]
  ): Observable<BrainBikeParticipante[]> {
    return this.http.post<any>(`${this.apiUrl}/bulk`, participantes).pipe(
      map((response) => {
        return response.data || response;
      }),
      tap((participantesCreados) => {
        if (participantesCreados && participantesCreados.length > 0) {
          const idBrainBike = participantesCreados[0].idBrainBike;
          this.guardarParticipantesLocales(idBrainBike, participantesCreados);
        }
      }),
      catchError((error) => {
        console.error('❌ [SERVICE] Error creando bulk:', error);
        throw error;
      })
    );
  }

  getByBrainBike(idBrainBike: number): Observable<BrainBikeParticipante[]> {
    return this.http.get<any>(`${this.apiUrl}/brainbike/${idBrainBike}`).pipe(
      map((response) => response.data || response),
      tap((participantes) => {
        if (participantes && participantes.length > 0) {
          this.guardarParticipantesLocales(idBrainBike, participantes);
        } else {
          console.warn('⚠️ [SERVICE] No se encontraron participantes');
        }
      }),
      catchError((error) => {
        console.error('❌ [SERVICE] Error obteniendo participantes:', error);
        return of([]);
      })
    );
  }

  update(
    id: number,
    participante: Partial<BrainBikeParticipante>
  ): Observable<BrainBikeParticipante> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, participante).pipe(
      map((response) => response.data || response),
      tap((participanteActualizado) => {
        this.actualizarParticipanteLocal(participanteActualizado);
      }),
      catchError((error) => {
        console.error('❌ [SERVICE] Error actualizando:', error);
        throw error;
      })
    );
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete<any>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data || response));
  }

  deleteByBrainBike(idBrainBike: number): Observable<any> {
    this.limpiarParticipantesLocales(idBrainBike);
    return this.http
      .delete<any>(`${this.apiUrl}/brainbike/${idBrainBike}`)
      .pipe(map((response) => response.data || response));
  }

  private guardarParticipantesLocales(
    idBrainBike: number,
    participantes: BrainBikeParticipante[]
  ): void {
    const key = `${this.STORAGE_KEY}_${idBrainBike}`;
    this.storageService.set(key, participantes);
  }

  private getParticipantesLocales(
    idBrainBike: number
  ): BrainBikeParticipante[] | null {
    const key = `${this.STORAGE_KEY}_${idBrainBike}`;
    return this.storageService.get<BrainBikeParticipante[]>(key);
  }

  private actualizarParticipanteLocal(
    participante: BrainBikeParticipante
  ): void {
    const participantes = this.getParticipantesLocales(
      participante.idBrainBike
    );
    if (participantes) {
      const index = participantes.findIndex((p) => p.id === participante.id);
      if (index !== -1) {
        participantes[index] = participante;
        this.guardarParticipantesLocales(
          participante.idBrainBike,
          participantes
        );
      }
    }
  }

  private limpiarParticipantesLocales(idBrainBike: number): void {
    const key = `${this.STORAGE_KEY}_${idBrainBike}`;
    this.storageService.remove(key);
  }

  limpiarTodosLosParticipantes(): void {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith(this.STORAGE_KEY)
    );
    keys.forEach((key) => localStorage.removeItem(key));
  }
}
