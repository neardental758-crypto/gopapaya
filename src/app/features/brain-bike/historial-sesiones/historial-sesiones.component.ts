import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  HistorialSesion,
  HistorialService,
  IndicadoresGlobales,
  SesionAgrupada,
} from '../../services/historial-sesion.service';
import { ExcelExporthistorialService } from './services/excel-export-historial.service';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Evidencia, SesionService } from '../../services/sesion.service';
import { EnviarCorreoModalComponent } from './correos/enviar-correo-modal.component';

@Component({
  selector: 'app-historial-sesiones',
  standalone: true,
  imports: [CommonModule, FormsModule, EnviarCorreoModalComponent],
  templateUrl: './historial-sesiones.component.html',
})
export class HistorialSesionesComponent implements OnInit {
  historial: HistorialSesion[] = [];
  sesionesAgrupadas: SesionAgrupada[] = [];
  indicadores: IndicadoresGlobales | null = null;
  empresas: any[] = [];
  cargando = true;
  empresaSeleccionada = '';
  filtroJuego = '';
  fechaInicio = '';
  fechaFin = '';
  sesionesExpandidas: Set<number> = new Set();

  paginacionSesiones: any = null;
  carrerasCache: Map<number, { data: HistorialSesion[]; paginacion: any }> =
    new Map();
  cargandoCarreras: Set<number> = new Set();

  planillasCache: Map<number, Evidencia | null> = new Map();
  cargandoPlanillas: Set<number> = new Set();
  subiendoPlanillas: Set<number> = new Set();

  mostrarModalCorreo = false;
  sesionIdParaCorreo: number | null = null;
  empresaIdParaCorreo: string | null = null;
  grupoParaCorreo: any = null;

  constructor(
    private historialService: HistorialService,
    private authService: AuthService,
    private router: Router,
    private excelExporthistorialService: ExcelExporthistorialService,
    private sesionService: SesionService
  ) {}

  ngOnInit(): void {
    this.cargarEmpresas();
    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.cargando = true;
    const empresaId = this.empresaSeleccionada || undefined;
    const fechaIni = this.fechaInicio || undefined;
    const fechaFn = this.fechaFin || undefined;

    this.historialService
      .getHistorial(empresaId, fechaIni, fechaFn, 1, 10)
      .subscribe({
        next: (response) => {
          this.sesionesAgrupadas = response.agrupado;
          this.indicadores = response.indicadores;
          this.paginacionSesiones = response.paginacion;
          this.aplicarFiltros();
          this.cargando = false;
        },
        error: (error) => {
          console.error('❌ Error al cargar historial:', error);
          this.cargando = false;
        },
      });
  }

  cargarEmpresas(): void {
    this.historialService.getEmpresas().subscribe({
      next: (data) => (this.empresas = data),
      error: (error) => console.error('Error al cargar empresas:', error),
    });
  }

  // cargarHistorial(): void {
  //   this.cargando = true;
  //   const empresaId = this.empresaSeleccionada || undefined;
  //   const fechaIni = this.fechaInicio || undefined;
  //   const fechaFn = this.fechaFin || undefined;

  //   this.historialService
  //     .getHistorial(empresaId, fechaIni, fechaFn, 1, 10)
  //     .subscribe({
  //       next: (response) => {
  //         this.sesionesAgrupadas = response.agrupado;
  //         this.indicadores = response.indicadores;
  //         this.paginacionSesiones = response.paginacion;
  //         this.aplicarFiltros();
  //         this.cargando = false;
  //       },
  //       error: (error) => {
  //         console.error('Error al cargar historial:', error);
  //         this.cargando = false;
  //       },
  //     });
  // }

  cambiarPaginaSesiones(pagina: number): void {
    if (pagina < 1 || pagina > this.paginacionSesiones.totalPaginas) return;

    this.cargando = true;
    const empresaId = this.empresaSeleccionada || undefined;
    const fechaIni = this.fechaInicio || undefined;
    const fechaFn = this.fechaFin || undefined;

    this.historialService
      .getHistorial(empresaId, fechaIni, fechaFn, pagina, 10)
      .subscribe({
        next: (response) => {
          this.sesionesAgrupadas = response.agrupado;
          this.paginacionSesiones = response.paginacion;
          this.aplicarFiltros();
          this.cargando = false;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: (error) => {
          console.error('Error al cargar historial:', error);
          this.cargando = false;
        },
      });
  }

  toggleSesion(sesionId: number): void {
    if (this.sesionesExpandidas.has(sesionId)) {
      this.sesionesExpandidas.delete(sesionId);
    } else {
      this.sesionesExpandidas.add(sesionId);
      this.cargarCarrerasSesion(sesionId, 1);
    }
  }

  cargarCarrerasSesion(sesionId: number, pagina: number): void {
    this.cargandoCarreras.add(sesionId);

    this.historialService.getCarrerasSesion(sesionId, pagina, 5).subscribe({
      next: (response) => {
        this.carrerasCache.set(sesionId, response);
        this.cargandoCarreras.delete(sesionId);
      },
      error: (error) => {
        console.error('Error al cargar carreras:', error);
        this.cargandoCarreras.delete(sesionId);
      },
    });
  }

  getCarrerasSesion(sesionId: number): HistorialSesion[] {
    return this.carrerasCache.get(sesionId)?.data || [];
  }

  getPaginacionCarreras(sesionId: number): any {
    return this.carrerasCache.get(sesionId)?.paginacion || null;
  }

  isCargandoCarreras(sesionId: number): boolean {
    return this.cargandoCarreras.has(sesionId);
  }

  cambiarPaginaCarreras(sesionId: number, pagina: number): void {
    const paginacion = this.getPaginacionCarreras(sesionId);
    if (!paginacion || pagina < 1 || pagina > paginacion.totalPaginas) return;

    this.cargarCarrerasSesion(sesionId, pagina);
  }

  exportarExcelGeneral(): void {
    this.cargando = true;
    const empresaId = this.empresaSeleccionada || undefined;
    const fechaIni = this.fechaInicio || undefined;
    const fechaFn = this.fechaFin || undefined;

    this.historialService
      .getHistorialCompleto(empresaId, fechaIni, fechaFn)
      .subscribe({
        next: (response) => {
          this.excelExporthistorialService.exportarHistorialCompleto(
            response.agrupado,
            response.indicadores
          );
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al exportar:', error);
          this.cargando = false;
        },
      });
  }

  onEmpresaChange(): void {
    this.cargarHistorial();
  }

  onFechaChange(): void {
    this.cargarHistorial();
  }

  limpiarFiltros(): void {
    this.empresaSeleccionada = '';
    this.filtroJuego = '';
    this.fechaInicio = '';
    this.fechaFin = '';
    this.cargarHistorial();
  }

  aplicarFiltros(): void {
    if (this.filtroJuego) {
      this.sesionesAgrupadas = this.sesionesAgrupadas
        .map((grupo) => ({
          ...grupo,
          carreras: grupo.carreras.filter(
            (c) => c.juego_jugado === this.filtroJuego
          ),
        }))
        .filter((grupo) => grupo.carreras.length > 0);
    }
  }

  onJuegoChange(): void {
    this.cargarHistorial();
  }

  isSesionExpandida(sesionId: number): boolean {
    return this.sesionesExpandidas.has(sesionId);
  }

  expandirTodas(): void {
    this.sesionesAgrupadas.forEach((s) =>
      this.sesionesExpandidas.add(s.sesion_id)
    );
  }

  contraerTodas(): void {
    this.sesionesExpandidas.clear();
  }

  verDetalle(id: number): void {
    this.router.navigate(['/historial', id]);
  }

  formatearDuracion(minutos: number): string {
    //Dejar todo en minutos
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return horas > 0 ? `${horas} ${mins}` : `${mins}`;
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatearFechaCorta(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    });
  }

  isSuperAdmin(): boolean {
    const usuario = this.authService.getUsuario();
    return usuario?.rol === 'super_admin';
  }

  isViewer(): boolean {
    const usuario = this.authService.getUsuario();
    return usuario?.rol === 'viewer';
  }

  volver(): void {
    this.router.navigate(['/home']);
  }

  getVelocidadPromedioGrupo(grupo: SesionAgrupada): number {
    let sumaVelocidades = 0;
    let totalParticipantes = 0;

    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data && carrera.participantes_data.length > 0) {
        carrera.participantes_data.forEach((p) => {
          sumaVelocidades += Number(p.velocidadPromedio) || 0;
          totalParticipantes++;
        });
      }
    });

    return totalParticipantes > 0
      ? parseFloat((sumaVelocidades / totalParticipantes).toFixed(1))
      : 0;
  }

  getCaloriasTotalesGrupo(grupo: SesionAgrupada): number {
    let totalCalorias = 0;
    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data && carrera.participantes_data.length > 0) {
        carrera.participantes_data.forEach((p) => {
          totalCalorias += Number(p.caloriasQuemadas) || 0;
        });
      }
    });
    return Math.round(totalCalorias);
  }

  getVatiosTotalesGrupo(grupo: SesionAgrupada): number {
    let totalVatios = 0;
    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data && carrera.participantes_data.length > 0) {
        carrera.participantes_data.forEach((p) => {
          totalVatios += Number(p.vatiosGenerados) || 0;
        });
      }
    });
    return Math.round(totalVatios);
  }

  getVelocidadMaximaGrupo(grupo: SesionAgrupada): number {
    let velocidadMaxima = 0;
    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data && carrera.participantes_data.length > 0) {
        carrera.participantes_data.forEach((p) => {
          const velMax = Number(p.velocidadMaxima) || 0;
          if (velMax > velocidadMaxima) {
            velocidadMaxima = velMax;
          }
        });
      }
    });
    return parseFloat(velocidadMaxima.toFixed(1));
  }

  getDistanciaTotalGrupo(grupo: SesionAgrupada): number {
    let totalDistancia = 0;
    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data && carrera.participantes_data.length > 0) {
        carrera.participantes_data.forEach((p) => {
          totalDistancia += Number(p.distanciaRecorrida) || 0;
        });
      }
    });
    return parseFloat(totalDistancia.toFixed(2));
  }

  getDistribucionSexoGrupo(grupo: SesionAgrupada): {
    hombres: number;
    mujeres: number;
    sinEspecificar: number;
  } {
    let hombres = 0;
    let mujeres = 0;
    let sinEspecificar = 0;

    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data && carrera.participantes_data.length > 0) {
        carrera.participantes_data.forEach((p) => {
          if (p.sexo === 'M') {
            hombres++;
          } else if (p.sexo === 'F') {
            mujeres++;
          } else {
            sinEspecificar++;
          }
        });
      }
    });

    return { hombres, mujeres, sinEspecificar };
  }

  descargarInforme(sesionId: number): void {
    this.sesionService.descargarInformePDF(sesionId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const sesion = this.sesionesAgrupadas.find(
          (s) => s.sesion_id === sesionId
        );
        a.download = `Informe_${
          sesion?.sesion?.nombreCliente || 'Sesion'
        }_${Date.now()}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        alert('Error al descargar el informe');
      },
    });
  }

  exportarExcel(grupo: SesionAgrupada): void {
    this.excelExporthistorialService.exportarHistorialSesion(grupo);
  }

  cargarPlanilla(sesionId: number): void {
    if (this.planillasCache.has(sesionId)) return;

    this.cargandoPlanillas.add(sesionId);
    this.sesionService.getPlanilla(sesionId).subscribe({
      next: (planilla) => {
        this.planillasCache.set(sesionId, planilla);
        this.cargandoPlanillas.delete(sesionId);
      },
      error: () => {
        this.cargandoPlanillas.delete(sesionId);
      },
    });
  }

  getPlanilla(sesionId: number): Evidencia | null | undefined {
    return this.planillasCache.get(sesionId);
  }

  isCargandoPlanilla(sesionId: number): boolean {
    return this.cargandoPlanillas.has(sesionId);
  }

  isSubiendoPlanilla(sesionId: number): boolean {
    return this.subiendoPlanillas.has(sesionId);
  }

  onPlanillaSelected(event: any, sesionId: number): void {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      alert(
        'Solo se permiten archivos Excel, PDF, Word o imágenes (JPG, PNG, WEBP)'
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo no debe superar 10MB');
      return;
    }

    const planillaExistente = this.getPlanilla(sesionId);
    if (planillaExistente) {
      if (!confirm('Ya existe una planilla. ¿Deseas reemplazarla?')) {
        event.target.value = '';
        return;
      }
    }

    this.subiendoPlanillas.add(sesionId);
    this.sesionService.crearPlanilla(sesionId, file).subscribe({
      next: (planilla) => {
        this.planillasCache.set(sesionId, planilla);
        this.subiendoPlanillas.delete(sesionId);
        event.target.value = '';
        alert('Planilla cargada exitosamente');
      },
      error: () => {
        this.subiendoPlanillas.delete(sesionId);
        event.target.value = '';
        alert('Error al cargar la planilla');
      },
    });
  }

  descargarPlanilla(sesionId: number): void {
    const planilla = this.getPlanilla(sesionId);
    if (!planilla || !planilla.url_archivo) return;

    window.open(planilla.url_archivo, '_blank');
  }

  onToggleSesion(sesionId: number): void {
    this.toggleSesion(sesionId);
    if (this.isSesionExpandida(sesionId)) {
      this.cargarPlanilla(sesionId);
    }
  }

  abrirModalCorreo(grupo: SesionAgrupada): void {
    this.sesionIdParaCorreo = grupo.sesion_id;
    this.empresaIdParaCorreo = grupo.sesion?.empresa_id || '';
    this.grupoParaCorreo = grupo;
    this.mostrarModalCorreo = true;
  }

  cerrarModalCorreo(): void {
    this.mostrarModalCorreo = false;
    this.sesionIdParaCorreo = null;
    this.empresaIdParaCorreo = null;
    this.grupoParaCorreo = null;
  }

  onCorreoEnviado(): void {
    this.cerrarModalCorreo();
  }
}
