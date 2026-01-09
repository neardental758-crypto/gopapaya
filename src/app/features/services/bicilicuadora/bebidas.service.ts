import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Bebida {
  _id: string;
  nombre_bebida: string;
  foto_bebida?: string;
  descripcion?: string;
  tiempo_pedaleo: number;
  calorias_bebida?: number;
  calorias_quemar?: number;
  watts_aproximados?: number;
  link_video?: string;
  bebida_activa: boolean;
  ingredientes?: Ingrediente[];
  ritmos?: RitmoPedaleo[];
}

export interface Ingrediente {
  _id: string;
  bebida_id: string;
  nombre_ingrediente: string;
  cantidad: string;
  orden: number;
}

export interface RitmoPedaleo {
  _id: string;
  bebida_id: string;
  duracion: number;
  velocidad_min: number;
  velocidad_max: number;
  orden: number;
}

@Injectable({
  providedIn: 'root',
})
export class BebidasService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/bebida`;

  getAllBebidas(): Observable<Bebida[]> {
    return this.http
      .get<any>(`${this.apiUrl}`)
      .pipe(map((response) => response.data || []));
  }

  getBebidaById(id: string): Observable<Bebida> {
    return this.http
      .get<any>(`${this.apiUrl}/id/${id}`)
      .pipe(map((response) => response.data));
  }

  createBebida(data: Partial<Bebida>, foto?: File): Observable<Bebida> {
    const formData = new FormData();

    Object.keys(data).forEach((key) => {
      if (
        data[key as keyof Bebida] !== undefined &&
        data[key as keyof Bebida] !== null
      ) {
        formData.append(key, data[key as keyof Bebida] as any);
      }
    });

    if (foto) {
      formData.append('foto', foto);
    }

    return this.http.post<Bebida>(`${this.apiUrl}/registrar`, formData);
  }

  updateBebida(
    id: string,
    data: Partial<Bebida>,
    foto?: File
  ): Observable<Bebida> {
    const formData = new FormData();

    Object.keys(data).forEach((key) => {
      if (
        data[key as keyof Bebida] !== undefined &&
        data[key as keyof Bebida] !== null
      ) {
        formData.append(key, data[key as keyof Bebida] as any);
      }
    });

    if (foto) {
      formData.append('foto', foto);
    }

    return this.http.patch<Bebida>(`${this.apiUrl}/${id}`, formData);
  }

  deleteBebida(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
  createIngrediente(
    bebidaId: string,
    data: Partial<Ingrediente>
  ): Observable<Ingrediente> {
    return this.http
      .post<any>(`${this.apiUrl}/${bebidaId}/ingrediente`, data)
      .pipe(map((response) => response.data));
  }

  updateIngrediente(
    bebidaId: string,
    ingredienteId: string,
    data: Partial<Ingrediente>
  ): Observable<Ingrediente> {
    return this.http
      .patch<any>(
        `${this.apiUrl}/${bebidaId}/ingrediente/${ingredienteId}`,
        data
      )
      .pipe(map((response) => response.data));
  }

  deleteIngrediente(bebidaId: string, ingredienteId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${bebidaId}/ingrediente/${ingredienteId}`
    );
  }

  createRitmo(
    bebidaId: string,
    data: Partial<RitmoPedaleo>
  ): Observable<RitmoPedaleo> {
    return this.http
      .post<any>(`${this.apiUrl}/${bebidaId}/ritmo`, data)
      .pipe(map((response) => response.data));
  }

  updateRitmo(
    bebidaId: string,
    ritmoId: string,
    data: Partial<RitmoPedaleo>
  ): Observable<RitmoPedaleo> {
    return this.http
      .patch<any>(`${this.apiUrl}/${bebidaId}/ritmo/${ritmoId}`, data)
      .pipe(map((response) => response.data));
  }

  deleteRitmo(bebidaId: string, ritmoId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${bebidaId}/ritmo/${ritmoId}`
    );
  }

  getAllBebidasActivas(): Observable<Bebida[]> {
    return this.http
      .get<any>(`${this.apiUrl}`)
      .pipe(map((response) => response.data || []));
  }
}
