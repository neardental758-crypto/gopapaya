import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Contenido } from '../../../core/interfaces/tematica.interface';

export interface Respuesta {
  _id: string;
  id_pregunta: string;
  texto_respuesta: string;
  es_correcta: boolean;
}

export interface Pregunta {
  _id: string;
  id_contenido: string;
  texto_pregunta: string;
  respuestas: Respuesta[];
}

export interface PreguntaBrain {
  _id: string;
  id_contenido: string;
  texto_pregunta: string;
  tiempo_respuesta: number;
  respuestas: RespuestaBrain[];
}

export interface RespuestaBrain {
  _id: string;
  id_pregunta: string;
  texto_respuesta: string;
  color_respuesta: string;
  es_correcta: boolean;
  fecha_creacion?: Date;
  fecha_actualizacion?: Date;
}

export interface ContenidoConPreguntas extends Contenido {
  preguntas: Pregunta[];
}

@Injectable({
  providedIn: 'root',
})
export class ContenidoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/contenido`;

  create(data: Partial<Contenido>): Observable<Contenido> {
    return this.http.post<Contenido>(`${this.apiUrl}/registrar`, data);
  }

  update(id: string, data: Partial<Contenido>): Observable<Contenido> {
    return this.http.patch<Contenido>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getContenidoConPreguntas(
    idContenido: string
  ): Observable<ContenidoConPreguntas> {
    return this.http
      .get<any>(`${this.apiUrl}/${idContenido}/preguntas`)
      .pipe(map((response) => response.data || response));
  }

  getContenido(id: string): Observable<Contenido> {
    return this.http
      .get<any>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data || response));
  }

  getPreguntasContenido(idContenido: string): Observable<PreguntaBrain[]> {
    return this.http
      .get<any>(`${this.apiUrl}/${idContenido}/preguntas`)
      .pipe(map((response) => response.data || response));
  }
}
