import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface TimelineEvento {
  tipo: string;
  descripcion: string;
  timestamp: string;
  segundosDesdeInicio: number;
  datos?: any;
}

export interface EstadisticaPregunta {
  numeroPregunta: number;
  textoPregunta: string;
  respuestaCorrecta: string;
  respuestaSeleccionada: string;
  esCorrecta: boolean;
  tiempoUsado: number;
  tiempoMaximo: number;
  participanteRespondio?: string;
  colorParticipante?: string;
}

export interface HistorialSesion {
  id: number;
  sesion_id: number;
  juego_id?: string;
  fecha_inicio: string;
  fecha_fin: string;
  duracion_minutos: number;
  juego_jugado: string;
  parametros_utilizados: any;
  participantes_data: any[];
  ranking_final: any[];
  estadisticas_generales: any;
  timeline_eventos?: TimelineEvento[];
  estadisticas_preguntas?: EstadisticaPregunta[];
  notas_finales?: string;
  creado_por: number;
  sesion?: any;
  creador?: any;
}

export interface SesionAgrupada {
  sesion_id: number;
  sesion: any;
  carreras: HistorialSesion[];
  totales: {
    totalCarreras: number;
    totalParticipantes: number;
    duracionTotal: number;
    participantesUnicos: number;
    puntosAcumulados: number;
    velocidadPromedioGeneral: number;
    preguntasRespondidas: number;
  };
}

export interface IndicadoresGlobales {
  totalSesiones: number;
  totalCarreras: number;
  totalParticipantes: number;
  duracionTotalSegundos: number;
  promedioParticipantesPorCarrera: number;
  promedioDuracionMinutos: number;
  totalPreguntasRespondidas: number;
}

export interface HistorialResponse {
  data: HistorialSesion[];
  agrupado: SesionAgrupada[];
  indicadores: IndicadoresGlobales;
}

@Injectable({ providedIn: 'root' })
export class HistorialService {
  private apiUrl = `${environment.apiUrl}/historialSesion`;

  constructor(private http: HttpClient) {}

  getHistorialDetalle(id: number): Observable<HistorialSesion> {
    return this.http
      .get<{ data: HistorialSesion }>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  crearHistorial(historial: any): Observable<HistorialSesion> {
    return this.http
      .post<{ data: HistorialSesion }>(this.apiUrl, historial)
      .pipe(map((response) => response.data));
  }

  getEmpresas(): Observable<any[]> {
    return this.http
      .get<{ data: any[] }>(`${this.apiUrl}/empresas`)
      .pipe(map((response) => response.data));
  }

  getHistorial(
    empresaId?: string,
    fechaInicio?: string,
    fechaFin?: string,
    pagina: number = 1,
    limite: number = 10,
    juegoFiltro?: string
  ): Observable<HistorialResponse & { paginacion: any }> {
    const params: any = {
      pagina: pagina.toString(),
      limite: limite.toString(),
    };
    if (empresaId && empresaId.trim() !== '') params['empresa_id'] = empresaId;
    if (fechaInicio) params['fecha_inicio'] = fechaInicio;
    if (fechaFin) params['fecha_fin'] = fechaFin;
    if (juegoFiltro && juegoFiltro.trim() !== '') params['juego'] = juegoFiltro;

    return this.http.get<HistorialResponse & { paginacion: any }>(this.apiUrl, {
      params,
    });
  }

  getCarrerasSesion(
    sesionId: number,
    pagina: number = 1,
    limite: number = 5
  ): Observable<{ data: HistorialSesion[]; paginacion: any }> {
    const params = { pagina: pagina.toString(), limite: limite.toString() };
    return this.http.get<{ data: HistorialSesion[]; paginacion: any }>(
      `${this.apiUrl}/sesion/${sesionId}/carreras`,
      { params }
    );
  }

  getHistorialCompleto(
    empresaId?: string,
    fechaInicio?: string,
    fechaFin?: string,
    juegoFiltro?: string
  ): Observable<HistorialResponse> {
    const params: any = { pagina: '1', limite: '999999' };
    if (empresaId && empresaId.trim() !== '') params['empresa_id'] = empresaId;
    if (fechaInicio) params['fecha_inicio'] = fechaInicio;
    if (fechaFin) params['fecha_fin'] = fechaFin;
    if (juegoFiltro && juegoFiltro.trim() !== '') params['juego'] = juegoFiltro;

    return this.http.get<HistorialResponse>(this.apiUrl, { params });
  }
}
