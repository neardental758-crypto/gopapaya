import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Usuario } from '../core/interfaces/usuario.interface';

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private apiUrl = `${environment.apiUrl}/usuario`;

  constructor(private http: HttpClient) {}

  getUsuarios(): Observable<{ data: Usuario[] }> {
    return this.http.get<{ data: Usuario[] }>(this.apiUrl);
  }

  getAdmins(): Observable<Usuario[]> {
    return this.http
      .get<{ data: Usuario[] }>(`${this.apiUrl}/admins`)
      .pipe(map((response) => response.data));
  }

  getUsuario(id: string): Observable<{ data: Usuario }> {
    return this.http.get<{ data: Usuario }>(`${this.apiUrl}/${id}`);
  }

  createUsuario(usuario: any): Observable<any> {
    return this.http.post(this.apiUrl, usuario);
  }

  updateUsuario(id: string, usuario: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}`, usuario);
  }

  deleteUsuario(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
