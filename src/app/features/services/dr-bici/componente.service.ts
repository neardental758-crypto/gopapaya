import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Componente {
  id: number;
  nombre: string;
  descripcion: string;
  categoriaId: number;
  activo: number;
}

export interface CategoriaComponente {
  id: number;
  nombre: string;
  descripcion: string;
  activo: number;
}

@Injectable({
  providedIn: 'root',
})
export class ComponenteService {
  private apiUrl = `${environment.apiUrl}/componente`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<{
    componentes: Componente[];
    categorias: CategoriaComponente[];
  }> {
    return this.http
      .get<any>(this.apiUrl)
      .pipe(map((response) => response.data || response));
  }
}
