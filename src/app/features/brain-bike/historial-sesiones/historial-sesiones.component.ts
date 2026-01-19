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
import { HistorialJuegoAdapter } from './adapter/historial-juego.adapter';

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

  filtroCronograma = '';
  filtroSecuencia = '';
  cronogramas: string[] = [];
  secuencias: string[] = [];

  constructor(
    private historialService: HistorialService,
    private authService: AuthService,
    private router: Router,
    private excelExporthistorialService: ExcelExporthistorialService,
    private sesionService: SesionService,
    private juegoAdapter: HistorialJuegoAdapter
  ) {}

  ngOnInit(): void {
    this.cargarEmpresas();
    this.cargarHistorial();
  }

  cargarEmpresas(): void {
    this.historialService.getEmpresas().subscribe({
      next: (data) => (this.empresas = data),
      error: (error) => console.error('Error al cargar empresas:', error),
    });
  }

  cambiarPaginaSesiones(pagina: number): void {
    if (pagina < 1 || pagina > this.paginacionSesiones.totalPaginas) return;

    this.cargando = true;
    const empresaId = this.empresaSeleccionada || undefined;
    const fechaIni = this.fechaInicio || undefined;
    const fechaFn = this.fechaFin || undefined;
    const juego = this.filtroJuego || undefined;
    const cronograma = this.filtroCronograma || undefined;
    const secuencia = this.filtroSecuencia || undefined;

    this.historialService
      .getHistorial(
        empresaId,
        fechaIni,
        fechaFn,
        pagina,
        10,
        juego,
        cronograma,
        secuencia
      )
      .subscribe({
        next: (response) => {
          this.sesionesAgrupadas = response.agrupado;
          this.paginacionSesiones = response.paginacion;
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
    const juego = this.filtroJuego || undefined;

    this.historialService
      .getHistorialCompleto(empresaId, fechaIni, fechaFn, juego)
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
    this.filtroCronograma = '';
    this.filtroSecuencia = '';
    this.cargarHistorial();
  }

  onCronogramaChange(): void {
    this.cargarHistorial();
  }

  onSecuenciaChange(): void {
    this.cargarHistorial();
  }

  onJuegoChange(): void {
    if (this.filtroJuego === 'Biketona') {
      this.filtroJuego = '';
    }
    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.cargando = true;
    const empresaId = this.empresaSeleccionada || undefined;
    const fechaIni = this.fechaInicio || undefined;
    const fechaFn = this.fechaFin || undefined;
    let juego = this.filtroJuego || undefined;
    const cronograma = this.filtroCronograma || undefined;
    const secuencia = this.filtroSecuencia || undefined;

    if (juego === 'Biketona') {
      juego = undefined;
    }

    this.historialService
      .getHistorial(
        empresaId,
        fechaIni,
        fechaFn,
        1,
        10,
        juego,
        cronograma,
        secuencia
      )
      .subscribe({
        next: (response) => {
          if (this.filtroJuego === 'Biketona') {
            this.sesionesAgrupadas = response.agrupado.filter((grupo) =>
              grupo.carreras.some((c) => c.juego_jugado.includes('Biketona'))
            );
          } else {
            this.sesionesAgrupadas = response.agrupado;
          }
          this.indicadores = response.indicadores;
          this.paginacionSesiones = response.paginacion;
          this.extraerValoresUnicos();
          this.cargando = false;
        },
        error: (error) => {
          console.error('❌ Error al cargar historial:', error);
          this.cargando = false;
        },
      });
  }

  extraerValoresUnicos(): void {
    const cronogramasSet = new Set<string>();
    const secuenciasSet = new Set<string>();

    this.sesionesAgrupadas.forEach((grupo) => {
      if (grupo.sesion?.cronograma) {
        cronogramasSet.add(grupo.sesion.cronograma);
      }
      if (grupo.sesion?.secuencia) {
        secuenciasSet.add(grupo.sesion.secuencia);
      }
    });

    this.cronogramas = Array.from(cronogramasSet).sort();
    this.secuencias = Array.from(secuenciasSet).sort();
  }

  juegoFiltradoTienePreguntas(): boolean {
    if (!this.filtroJuego) return false;
    return this.juegoAdapter.tienePreguntas(this.filtroJuego);
  }

  aplicarFiltros(): void {
    return;
  }

  isSesionExpandida(sesionId: number): boolean {
    return this.sesionesExpandidas.has(sesionId);
  }

  expandirTodas(): void {
    this.sesionesAgrupadas.forEach((s) => {
      this.sesionesExpandidas.add(s.sesion_id);
      if (!this.carrerasCache.has(s.sesion_id)) {
        this.cargarCarrerasSesion(s.sesion_id, 1);
      }
    });
  }

  contraerTodas(): void {
    this.sesionesExpandidas.clear();
  }

  verDetalle(id: number): void {
    this.router.navigate(['/historial', id]);
  }

  formatearDuracion(segundos: number): string {
    if (segundos === 0) return '0min';

    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);

    if (horas > 0) {
      return minutos > 0 ? `${horas}h ${minutos}min` : `${horas}h`;
    }

    return `${minutos}min`;
  }

  getDuracionTotalGrupo(grupo: SesionAgrupada): number {
    let duracionTotalSegundos = 0;

    grupo.carreras.forEach((carrera) => {
      let estadisticasGenerales = carrera.estadisticas_generales;

      if (typeof estadisticasGenerales === 'string') {
        try {
          estadisticasGenerales = JSON.parse(estadisticasGenerales);
        } catch (e) {
          estadisticasGenerales = null;
        }
      }

      if (estadisticasGenerales?.duracionTotal) {
        duracionTotalSegundos += Number(estadisticasGenerales.duracionTotal);
      } else if (carrera.duracion_minutos) {
        duracionTotalSegundos += carrera.duracion_minutos * 60;
      }
    });

    return duracionTotalSegundos;
  }

  formatearDuracionTexto(segundos: number): string {
    if (segundos === 0) {
      return '0';
    }

    if (segundos < 60) {
      return segundos.toString();
    }

    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);

    if (horas > 0) {
      return minutos > 0
        ? `${horas}:${minutos.toString().padStart(2, '0')}`
        : horas.toString();
    }

    return minutos.toString();
  }

  getUnidadDuracion(segundos: number): string {
    if (segundos < 60) {
      return 'sg';
    }

    const horas = Math.floor(segundos / 3600);
    return horas > 0 ? 'hrs' : 'min';
  }
  getDuracionCarrera(carrera: HistorialSesion): number {
    let estadisticasGenerales = carrera.estadisticas_generales;

    if (typeof estadisticasGenerales === 'string') {
      try {
        estadisticasGenerales = JSON.parse(estadisticasGenerales);
      } catch (e) {
        return carrera.duracion_minutos * 60 || 0;
      }
    }

    if (estadisticasGenerales?.duracionTotal) {
      return Number(estadisticasGenerales.duracionTotal);
    }

    return carrera.duracion_minutos * 60 || 0;
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

  grupoTienePreguntas(grupo: SesionAgrupada): boolean {
    return this.juegoAdapter.grupoTienePreguntas(grupo);
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
          totalCalorias += this.juegoAdapter.getCaloriasParticipante(p);
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
          totalVatios += this.juegoAdapter.getVatiosParticipante(p);
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
          const sexo = this.juegoAdapter.getDistribucionSexoParticipante(p);
          if (sexo === 'M') {
            hombres++;
          } else if (sexo === 'F') {
            mujeres++;
          } else {
            sinEspecificar++;
          }
        });
      }
    });

    return { hombres, mujeres, sinEspecificar };
  }

  getPreguntasRespondidasGrupo(grupo: SesionAgrupada): number {
    let total = 0;
    grupo.carreras.forEach((carrera) => {
      if (carrera.estadisticas_generales?.preguntasRespondidas) {
        total += Number(carrera.estadisticas_generales.preguntasRespondidas);
      }
    });
    return total;
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

  esVRoHitFit(grupo: SesionAgrupada): boolean {
    return grupo.carreras.some(
      (c) => c.juego_jugado === 'VR' || c.juego_jugado === 'Hit-Fit'
    );
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

  mostrarIndicadoresGlobales(): boolean {
    return true;
  }

  deberiaOcultarDistancia(grupo: SesionAgrupada): boolean {
    return grupo.carreras.every((c) => c.juego_jugado.includes('Biketona'));
  }
  onCorreoEnviado(): void {
    this.cerrarModalCorreo();
  }
}
