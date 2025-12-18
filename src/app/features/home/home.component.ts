import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Usuario } from '../../core/interfaces/usuario.interface';
import { AuthService } from '../../core/services/auth.service';
import { Sesion, SesionService } from '../services/sesion.service';
import { FormsModule } from '@angular/forms';
import { EvidenciasModalComponent } from './evidencias/evidencias-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, EvidenciasModalComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  @ViewChild('evidenciasModal') evidenciasModal!: EvidenciasModalComponent;

  usuario: Usuario | null = null;
  sesionesActivas: Sesion[] = [];
  sesionesAgrupadas: any[] = [];
  sesionesAgrupadasAdmin: any[] = [];
  sesionesFiltradas: Sesion[] = [];
  cargandoSesiones = true;
  empresasExpandidas: Set<string> = new Set();

  filtroEmpresa: string = '';
  filtroLugar: string = '';
  filtroFecha: string = '';
  empresasDisponibles: string[] = [];
  lugaresDisponibles: string[] = [];
  empresasAdminExpandidas: Set<string> = new Set();

  constructor(
    private authService: AuthService,
    private sesionService: SesionService,
    private router: Router
  ) {}
  ngOnInit(): void {
    this.usuario = this.authService.getUsuario();

    if (this.usuario?.rol === 'viewer') {
      this.router.navigate(['/historial']);
      return;
    }

    this.cargarSesionesActivas();
  }

  cargarSesionesActivas(): void {
    this.cargandoSesiones = true;
    this.sesionService.getSesionesActivas().subscribe({
      next: (sesiones) => {
        this.sesionesActivas = sesiones;
        this.sesionesFiltradas = sesiones;

        if (this.isSuperAdmin()) {
          this.agruparSesiones(sesiones);
        } else {
          this.extraerOpcionesFiltros(sesiones);
          this.agruparSesionesAdmin(sesiones);
        }

        this.cargandoSesiones = false;
      },
      error: () => {
        this.sesionesActivas = [];
        this.sesionesAgrupadas = [];
        this.sesionesAgrupadasAdmin = [];
        this.cargandoSesiones = false;
      },
    });
  }

  extraerOpcionesFiltros(sesiones: Sesion[]): void {
    const empresasSet = new Set<string>();
    const lugaresSet = new Set<string>();

    sesiones.forEach((sesion) => {
      if (sesion.nombreCliente) {
        empresasSet.add(sesion.nombreCliente);
      }
      if (sesion.lugarEjecucion) {
        lugaresSet.add(sesion.lugarEjecucion);
      }
    });

    this.empresasDisponibles = Array.from(empresasSet).sort();
    this.lugaresDisponibles = Array.from(lugaresSet).sort();
  }

  aplicarFiltros(): void {
    let filtradas = [...this.sesionesActivas];

    if (this.filtroEmpresa) {
      filtradas = filtradas.filter(
        (s) => s.nombreCliente === this.filtroEmpresa
      );
    }

    if (this.filtroLugar) {
      filtradas = filtradas.filter(
        (s) => s.lugarEjecucion === this.filtroLugar
      );
    }

    if (this.filtroFecha) {
      filtradas = filtradas.filter((s) => {
        if (!s.fecha_sesion) return false;
        const fechaSesion = s.fecha_sesion.split('T')[0];
        return fechaSesion === this.filtroFecha;
      });
    }

    this.sesionesFiltradas = filtradas;
    this.agruparSesionesAdmin(filtradas);
  }

  agruparSesiones(sesiones: Sesion[]): void {
    const grupos = new Map<string, any>();

    sesiones.forEach((sesion) => {
      const empresaId = sesion.empresa_id;
      const empresaNombre = sesion.empresa?.nombre || 'Sin empresa';

      if (!grupos.has(empresaId)) {
        grupos.set(empresaId, {
          empresa_id: empresaId,
          empresa_nombre: empresaNombre,
          empresa_logo: sesion.empresa?.logo,
          admins: new Map<string, any>(),
        });
      }

      const grupoEmpresa = grupos.get(empresaId);

      if (sesion.admins && sesion.admins.length > 0) {
        sesion.admins.forEach((admin) => {
          if (!grupoEmpresa.admins.has(admin._id)) {
            grupoEmpresa.admins.set(admin._id, {
              admin_id: admin._id,
              admin_nombre: admin.nombre,
              admin_email: admin.email,
              sesiones: [],
            });
          }
          grupoEmpresa.admins.get(admin._id).sesiones.push(sesion);
        });
      } else {
        if (!grupoEmpresa.admins.has('sin_asignar')) {
          grupoEmpresa.admins.set('sin_asignar', {
            admin_id: 'sin_asignar',
            admin_nombre: 'Sin asignar',
            admin_email: '',
            sesiones: [],
          });
        }
        grupoEmpresa.admins.get('sin_asignar').sesiones.push(sesion);
      }
    });

    this.sesionesAgrupadas = Array.from(grupos.values()).map((grupo) => ({
      ...grupo,
      admins: Array.from(grupo.admins.values()),
    }));
  }

  agruparSesionesAdmin(sesiones: Sesion[]): void {
    const grupos = new Map<string, any>();

    sesiones.forEach((sesion) => {
      const empresaId = sesion.empresa_id;
      const empresaNombre = sesion.empresa?.nombre || 'Sin empresa';

      if (!grupos.has(empresaId)) {
        grupos.set(empresaId, {
          empresa_id: empresaId,
          empresa_nombre: empresaNombre,
          empresa_logo: sesion.empresa?.logo,
          sesiones: [],
        });
      }

      grupos.get(empresaId).sesiones.push(sesion);
    });

    this.sesionesAgrupadasAdmin = Array.from(grupos.values());
  }

  toggleEmpresa(empresaId: string): void {
    if (this.empresasExpandidas.has(empresaId)) {
      this.empresasExpandidas.delete(empresaId);
    } else {
      this.empresasExpandidas.add(empresaId);
    }
  }

  isEmpresaExpandida(empresaId: string): boolean {
    return this.empresasExpandidas.has(empresaId);
  }

  isAdmin(): boolean {
    return this.usuario?.rol === 'admin' || this.usuario?.rol === 'super_admin';
  }

  isSuperAdmin(): boolean {
    return this.usuario?.rol === 'super_admin';
  }

  irACrearSesion(): void {
    this.router.navigate(['/sesion/crear']);
  }

  irACalendario(): void {
    this.router.navigate(['/calendario']);
  }

  toggleEmpresaAdmin(empresaId: string): void {
    if (this.empresasAdminExpandidas.has(empresaId)) {
      this.empresasAdminExpandidas.delete(empresaId);
    } else {
      this.empresasAdminExpandidas.add(empresaId);
    }
  }

  isEmpresaAdminExpandida(empresaId: string): boolean {
    return this.empresasAdminExpandidas.has(empresaId);
  }

  continuarSesion(sesion: Sesion): void {
    this.sesionService.setSesionSeleccionada(sesion);

    // 👉 Guardamos el id de la sesión para usarlo luego en SetupComponent
    localStorage.setItem('idSesion', sesion.id.toString());

    if (sesion.juego_asignado === 'brain-bike') {
      this.router.navigate(['/brain-bike/parametros']);
    } else {
      this.router.navigate(['/sesion/seleccionar-juego', sesion.id]);
    }
  }

  finalizarSesion(sesion: Sesion, event: Event): void {
    event.stopPropagation();
    if (confirm(`¿Deseas finalizar la sesión "${sesion.nombreCliente}"?`)) {
      this.sesionService.finalizarSesion(sesion.id).subscribe({
        next: () => {
          this.cargarSesionesActivas();
        },
        error: (error) => {
          console.error('Error al finalizar sesión:', error);
          alert('Error al finalizar la sesión');
        },
      });
    }
  }

  irAUsuarios(): void {
    this.router.navigate(['/admin/usuarios']);
  }

  irABrainBike(): void {
    this.router.navigate(['/brain-bike']);
  }

  mostrarProximamente(modulo: string): void {
    alert(`🚧 ${modulo} - Módulo en desarrollo`);
  }

  irAAliados(): void {
    this.router.navigate(['/admin/aliados']);
  }

  puedeEditarSesion(sesion: Sesion): boolean {
    if (!sesion.fecha_sesion) return true;

    const [fechaPart, horaPart] = sesion.fecha_sesion.split(' ');
    const [año, mes, dia] = fechaPart.split('-').map(Number);
    const [hora, minuto] = horaPart.split(':').map(Number);
    const fechaSesion = new Date(año, mes - 1, dia, hora, minuto);

    const ahora = new Date();
    const diferenciaHoras =
      (fechaSesion.getTime() - ahora.getTime()) / (1000 * 60 * 60);

    return diferenciaHoras >= 1;
  }

  editarParametros(sesion: Sesion, event: Event): void {
    event.stopPropagation();

    if (!this.puedeEditarSesion(sesion)) {
      alert(
        'No se puede editar la sesión. Falta menos de 1 hora para su inicio.'
      );
      return;
    }

    this.router.navigate(['/sesion/editar-parametros', sesion.id]);
  }

  getTotalSesiones(grupoEmpresa: any): number {
    return grupoEmpresa.admins.reduce(
      (total: number, admin: any) => total + admin.sesiones.length,
      0
    );
  }
  logout(): void {
    this.authService.logout();
  }

  abrirEvidencias(sesion: Sesion, event: Event): void {
    event.stopPropagation();
    this.evidenciasModal.open(sesion.id, sesion.nombreCliente);
  }
}
