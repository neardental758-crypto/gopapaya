import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface UsoTTS {
  mes: number;
  anio: number;
  caracteres_usados: number;
  limite_mensual: number;
  porcentaje_usado: string;
  caracteres_disponibles: number;
  api_key_activa: string;
}

@Injectable({
  providedIn: 'root',
})
export class TextToSpeechService {
  private apiUrl = `${environment.apiUrl}/sesion`;

  constructor(private http: HttpClient) {}

  registrarUso(caracteres: number): Observable<UsoTTS> {
    return this.http
      .post<{ data: UsoTTS }>(`${this.apiUrl}/uso-tts`, { caracteres })
      .pipe(map((response) => response.data));
  }

  obtenerUso(): Observable<UsoTTS> {
    return this.http
      .get<{ data: UsoTTS }>(`${this.apiUrl}/uso-tts`)
      .pipe(map((response) => response.data));
  }
}
