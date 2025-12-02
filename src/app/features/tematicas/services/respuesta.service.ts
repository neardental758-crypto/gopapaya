import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Respuesta } from '../../../core/interfaces/tematica.interface';

@Injectable({
  providedIn: 'root',
})
export class RespuestaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/respuestasBrain`;

  create(data: Partial<Respuesta>): Observable<Respuesta> {
    console.log('POST:', `${this.apiUrl}/registrar`, data);
    return this.http.post<Respuesta>(`${this.apiUrl}/registrar`, data);
  }

  update(id: string, data: Partial<Respuesta>): Observable<Respuesta> {
    return this.http.patch<Respuesta>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
