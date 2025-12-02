import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Pregunta } from '../../../core/interfaces/tematica.interface';

@Injectable({
  providedIn: 'root',
})
export class PreguntaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/preguntasBrain`;

  create(data: Partial<Pregunta>): Observable<Pregunta> {
    console.log('URL:', `${this.apiUrl}/registrar`);
    console.log('Data:', data);
    return this.http.post<Pregunta>(`${this.apiUrl}/registrar`, data);
  }

  update(id: string, data: Partial<Pregunta>): Observable<Pregunta> {
    return this.http.patch<Pregunta>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
