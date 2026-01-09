import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ParticipanteBicilicuadora } from './bicilicuadora-config.service';

@Injectable({
  providedIn: 'root',
})
export class ParticipanteBicilicuadoraService {
  private apiUrl = `${environment.apiUrl}/participante_bicilicuadora`;
  private STORAGE_KEY = 'participantesBicilicuadora';

  constructor(private http: HttpClient) {}

  getAll(): Observable<ParticipanteBicilicuadora[]> {
    return this.http
      .get<any>(this.apiUrl)
      .pipe(map((response) => response.data || response));
  }

  getByBicilicuadora(
    idBicilicuadora: number
  ): Observable<ParticipanteBicilicuadora[]> {
    return this.http
      .get<any>(`${this.apiUrl}/bicilicuadora/${idBicilicuadora}`)
      .pipe(
        map((response) => response.data || response),
        tap((participantes) => {
          if (participantes && participantes.length > 0) {
            this.guardarParticipantesLocales(idBicilicuadora, participantes);
          }
        })
      );
  }

  createBulk(
    participantes: ParticipanteBicilicuadora[]
  ): Observable<ParticipanteBicilicuadora[]> {
    return this.http.post<any>(`${this.apiUrl}/bulk`, participantes).pipe(
      map((response) => response.data || response),
      tap((participantesCreados) => {
        if (participantesCreados && participantesCreados.length > 0) {
          const idBicilicuadora = participantesCreados[0].idBicilicuadora;
          this.guardarParticipantesLocales(
            idBicilicuadora,
            participantesCreados
          );
        }
      })
    );
  }

  update(
    id: number,
    participante: Partial<ParticipanteBicilicuadora>
  ): Observable<ParticipanteBicilicuadora> {
    return this.http
      .put<any>(`${this.apiUrl}/${id}`, participante)
      .pipe(map((response) => response.data || response));
  }

  deleteByBicilicuadora(idBicilicuadora: number): Observable<any> {
    this.limpiarParticipantesLocales(idBicilicuadora);
    return this.http
      .delete<any>(`${this.apiUrl}/bicilicuadora/${idBicilicuadora}`)
      .pipe(map((response) => response.data || response));
  }

  private guardarParticipantesLocales(
    idBicilicuadora: number,
    participantes: ParticipanteBicilicuadora[]
  ): void {
    const key = `${this.STORAGE_KEY}_${idBicilicuadora}`;
    localStorage.setItem(key, JSON.stringify(participantes));
  }

  private limpiarParticipantesLocales(idBicilicuadora: number): void {
    const key = `${this.STORAGE_KEY}_${idBicilicuadora}`;
    localStorage.removeItem(key);
  }
}
