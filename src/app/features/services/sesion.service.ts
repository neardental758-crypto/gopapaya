import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Empresa {
  _id: string;
  nombre: string;
  logo?: string;
}

export interface Sesion {
  id: number;
  nombreCliente: string;
  logoCliente?: string;
  lugarEjecucion?: string;
  empresa_id: string;
  usuario_id?: string;
  admins_asignados?: string;
  admins?: Admin[];
  fechaCreacion: Date;
  fecha_sesion?: string;
  nota?: string;
  juego_asignado?: string;
  parametros_juego?: any;
  cronograma?: string;
  secuencia?: string;
  estadoSesion: string;
  empresa?: {
    _id: string;
    nombre: string;
    logo?: string;
  };
}

export interface Admin {
  _id: string;
  nombre: string;
  email: string;
}

export interface Evidencia {
  id: number;
  sesion_id: number;
  tipo: 'foto' | 'texto';
  seccion?: string;
  orden?: number;
  contenido?: string;
  url_archivo?: string;
  nombre_archivo?: string;
  creado_por: string;
  fecha_creacion: Date;
}

@Injectable({
  providedIn: 'root',
})
export class SesionService {
  private apiUrl = `${environment.apiUrl}/sesion`;
  private sesionSeleccionada$ = new BehaviorSubject<Sesion | null>(null);

  constructor(private http: HttpClient) {
    // Cargar sesión desde localStorage al iniciar el servicio
    const sesionGuardada = localStorage.getItem('sesion_seleccionada');
    if (sesionGuardada) {
      this.sesionSeleccionada$.next(JSON.parse(sesionGuardada));
    }
  }

  getSesiones(): Observable<Sesion[]> {
    return this.http
      .get<{ data: Sesion[] }>(this.apiUrl)
      .pipe(map((response) => response.data));
  }

  getSesionesActivas(): Observable<Sesion[]> {
    return this.http
      .get<{ data: Sesion[] }>(`${this.apiUrl}/activas`)
      .pipe(map((response) => response.data));
  }

  getMisSesiones(): Observable<Sesion[]> {
    return this.http
      .get<{ data: Sesion[] }>(`${this.apiUrl}/mis-sesiones`)
      .pipe(map((response) => response.data));
  }

  getSesion(id: number): Observable<Sesion> {
    return this.http
      .get<{ data: Sesion }>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  crearSesion(sesion: any): Observable<Sesion> {
    return this.http
      .post<{ data: Sesion }>(this.apiUrl, sesion)
      .pipe(map((response) => response.data));
  }

  actualizarSesion(id: number, sesion: any): Observable<Sesion> {
    return this.http
      .put<{ data: Sesion }>(`${this.apiUrl}/${id}`, sesion)
      .pipe(map((response) => response.data));
  }

  finalizarSesion(id: number): Observable<Sesion> {
    return this.http
      .put<{ data: Sesion }>(`${this.apiUrl}/${id}/finalizar`, {})
      .pipe(map((response) => response.data));
  }

  eliminarSesion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  iniciarSesion(id: number): Observable<Sesion> {
    return this.http
      .put<{ data: Sesion }>(`${this.apiUrl}/${id}/iniciar`, {})
      .pipe(
        map((response) => response.data),
        tap((sesion) => {
          this.setSesionSeleccionada(sesion);
        })
      );
  }

  setSesionSeleccionada(sesion: Sesion): void {
    this.sesionSeleccionada$.next(sesion);
    localStorage.setItem('sesion_seleccionada', JSON.stringify(sesion));
  }

  getSesionSeleccionada(): Sesion | null {
    const sesionEnMemoria = this.sesionSeleccionada$.value;
    if (sesionEnMemoria) {
      return sesionEnMemoria;
    }

    const sesionGuardada = localStorage.getItem('sesion_seleccionada');
    if (sesionGuardada) {
      const sesion = JSON.parse(sesionGuardada);
      this.sesionSeleccionada$.next(sesion);
      return sesion;
    }

    return null;
  }

  getSesionSeleccionada$(): Observable<Sesion | null> {
    return this.sesionSeleccionada$.asObservable();
  }

  clearSesionSeleccionada(): void {
    console.log('Limpiando sesión');
    this.sesionSeleccionada$.next(null);
    localStorage.removeItem('sesion_seleccionada');
  }

  getEvidencias(sesionId: number): Observable<Evidencia[]> {
    return this.http
      .get<{ data: Evidencia[] }>(
        `${environment.apiUrl}/sesionEvidencia/${sesionId}`
      )
      .pipe(map((response) => response.data));
  }

  crearEvidenciaTexto(
    sesionId: number,
    contenido: string,
    seccion: string
  ): Observable<Evidencia> {
    return this.http
      .post<{ data: Evidencia }>(
        `${environment.apiUrl}/sesionEvidencia/${sesionId}`,
        {
          tipo: 'texto',
          contenido: contenido,
          seccion: seccion,
        }
      )
      .pipe(map((response) => response.data));
  }

  crearEvidenciaFoto(
    sesionId: number,
    archivo: File,
    seccion: string,
    orden?: number
  ): Observable<Evidencia> {
    const formData = new FormData();
    formData.append('tipo', 'foto');
    formData.append('archivo', archivo);
    formData.append('seccion', seccion);
    if (orden !== undefined) formData.append('orden', orden.toString());

    return this.http
      .post<{ data: Evidencia }>(
        `${environment.apiUrl}/sesionEvidencia/${sesionId}`,
        formData
      )
      .pipe(map((response) => response.data));
  }

  descargarInformePDF(sesionId: number): Observable<Blob> {
    return this.http.get(
      `${environment.apiUrl}/sesionEvidencia/${sesionId}/informe-pdf`,
      {
        responseType: 'blob',
      }
    );
  }

  eliminarEvidencia(id: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/sesionEvidencia/${id}`
    );
  }

  crearPlanilla(sesionId: number, archivo: File): Observable<Evidencia> {
    const formData = new FormData();
    formData.append('archivo', archivo);

    return this.http
      .post<{ data: Evidencia }>(
        `${environment.apiUrl}/sesionEvidencia/${sesionId}/planilla`,
        formData
      )
      .pipe(map((response) => response.data));
  }

  getPlanilla(sesionId: number): Observable<Evidencia | null> {
    return this.http
      .get<{ data: Evidencia | null }>(
        `${environment.apiUrl}/sesionEvidencia/${sesionId}/planilla`
      )
      .pipe(map((response) => response.data));
  }

  enviarCorreoSesion(
    sesionId: number,
    destinatarios: string[],
    tiposEnvio: string[],
    archivos: { tipo: string; blob: Blob; nombre: string }[],
    asunto?: string,
    mensaje?: string
  ): Observable<any> {
    const formData = new FormData();

    formData.append('destinatarios', JSON.stringify(destinatarios));
    formData.append('tiposEnvio', JSON.stringify(tiposEnvio));
    if (asunto) formData.append('asunto', asunto);
    if (mensaje) formData.append('mensaje', mensaje);

    archivos.forEach((archivo, index) => {
      formData.append(`archivo_${archivo.tipo}`, archivo.blob, archivo.nombre);
    });

    return this.http.post(
      `${environment.apiUrl}/sesionEvidencia/${sesionId}/enviar-correo`,
      formData
    );
  }

  getDestinatariosSesion(sesionId: number): Observable<any[]> {
    return this.http
      .get<{ data: any[] }>(
        `${environment.apiUrl}/sesionEvidencia/${sesionId}/destinatarios`
      )
      .pipe(map((response) => response.data));
  }
}
