import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HistorialService } from '../../../services/historial-sesion.service';
import { SesionService } from '../../../services/sesion.service';
import * as XLSX from 'xlsx';
import { ExcelExporthistorialService } from '../services/excel-export-historial.service';
import { firstValueFrom } from 'rxjs';

interface Destinatario {
  email: string;
  nombre: string;
  tipo: 'agr' | 'empresa';
  seleccionado: boolean;
}

interface TipoEnvio {
  value: 'planilla' | 'estadisticas' | 'informe';
  label: string;
  icon: string;
  seleccionado: boolean;
}

@Component({
  selector: 'app-enviar-correo-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      (click)="cerrar()"
    >
      <div
        class="bg-dark-850 border-2 border-neon-blue/30 rounded-card max-w-2xl w-full max-h-[90vh] flex flex-col shadow-neon-blue-lg"
        (click)="$event.stopPropagation()"
      >
        <div
          class="sticky top-0 bg-dark-850 border-b border-neon-blue/20 p-6 flex items-center justify-between z-10"
        >
          <h2 class="text-2xl font-display text-neon-yellow">
            Enviar por Correo
          </h2>
          <button
            (click)="cerrar()"
            class="text-gray-400 hover:text-neon-red transition-colors"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div
          *ngIf="exito"
          class="mx-6 mt-6 p-4 bg-neon-green/10 border-2 border-neon-green/50 rounded-lg text-neon-green font-bold text-base flex items-center gap-3 animate-pulse"
        >
          <svg
            class="w-6 h-6 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>{{ exito }}</span>
        </div>

        <div
          *ngIf="error"
          class="mx-6 mt-6 p-4 bg-neon-red/10 border-2 border-neon-red/50 rounded-lg text-neon-red font-bold text-sm flex items-center gap-3"
        >
          <svg
            class="w-6 h-6 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{{ error }}</span>
        </div>

        <div class="overflow-y-auto flex-1 p-6 space-y-6">
          <div>
            <label class="block text-sm font-medium text-neon-blue mb-3">
              Contenido a Enviar (selecciona uno o varios)
            </label>
            <div class="grid grid-cols-3 gap-3">
              <button
                *ngFor="let tipo of tiposEnvio"
                (click)="toggleTipo(tipo)"
                [class]="getTipoButtonClass(tipo)"
                class="p-4 rounded-lg border-2 transition-all duration-200"
              >
                <div class="text-2xl mb-2">{{ tipo.icon }}</div>
                <div class="text-sm font-medium">{{ tipo.label }}</div>
                <div class="mt-2 flex justify-center">
                  <div
                    [class]="getCheckboxClassTipo(tipo)"
                    class="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                  >
                    <svg
                      *ngIf="tipo.seleccionado"
                      class="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div *ngIf="cargandoDestinatarios" class="flex justify-center py-8">
            <div
              class="animate-spin rounded-full h-8 w-8 border-2 border-neon-blue border-t-transparent"
            ></div>
          </div>

          <div *ngIf="!cargandoDestinatarios && destinatarios.length > 0">
            <label class="block text-sm font-medium text-neon-blue mb-3">
              Destinatarios (selecciona uno o varios)
            </label>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              <div
                *ngFor="let dest of destinatarios"
                (click)="toggleDestinatario(dest)"
                class="flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200"
                [class]="getDestinatarioClass(dest)"
              >
                <div
                  [class]="getCheckboxClass(dest)"
                  class="w-5 h-5 rounded border-2 flex items-center justify-center mr-3 transition-all"
                >
                  <svg
                    *ngIf="dest.seleccionado"
                    class="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
                <div class="flex-1">
                  <div
                    class="font-medium"
                    [class]="
                      dest.seleccionado ? 'text-neon-yellow' : 'text-white'
                    "
                  >
                    {{ dest.nombre }}
                  </div>
                  <div class="text-sm text-gray-400">{{ dest.email }}</div>
                </div>
                <span
                  class="text-xs px-2 py-1 rounded"
                  [class]="
                    dest.tipo === 'agr'
                      ? 'bg-neon-blue/20 text-neon-blue'
                      : 'bg-neon-green/20 text-neon-green'
                  "
                >
                  {{ dest.tipo === 'agr' ? 'AGR' : 'Empresa' }}
                </span>
              </div>
            </div>
          </div>

          <div
            *ngIf="!cargandoDestinatarios && destinatarios.length === 0"
            class="text-center py-8 text-gray-400"
          >
            No se encontraron destinatarios disponibles
          </div>

          <div>
            <label class="block text-sm font-medium text-neon-blue mb-2">
              Asunto (opcional)
            </label>
            <input
              [(ngModel)]="asunto"
              type="text"
              placeholder="Ingresa el asunto del correo..."
              class="w-full px-4 py-3 bg-dark-900 border-2 border-dark-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-neon-blue mb-2">
              Mensaje (opcional)
            </label>
            <textarea
              [(ngModel)]="mensaje"
              rows="4"
              placeholder="Agrega un mensaje adicional..."
              class="w-full px-4 py-3 bg-dark-900 border-2 border-dark-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue focus:outline-none transition-colors resize-none"
            ></textarea>
          </div>
        </div>

        <div
          class="sticky bottom-0 bg-dark-850 border-t border-neon-blue/20 p-6 flex gap-3 z-10"
        >
          <button
            (click)="cerrar()"
            [disabled]="enviando"
            class="flex-1 px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            (click)="enviar()"
            [disabled]="!puedeEnviar() || enviando"
            class="flex-1 px-6 py-3 bg-neon-blue hover:bg-neon-blue/80 text-dark-950 rounded-lg font-display font-bold shadow-neon-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <span *ngIf="!enviando">Enviar</span>
            <span
              *ngIf="enviando"
              class="flex items-center justify-center gap-2"
            >
              <div
                class="animate-spin rounded-full h-5 w-5 border-2 border-dark-950 border-t-transparent"
              ></div>
              Enviando...
            </span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class EnviarCorreoModalComponent implements OnInit {
  @Input() sesionId!: number;
  @Input() empresaId!: string;
  @Input() grupoSesion!: any;
  @Output() closed = new EventEmitter<void>();
  @Output() enviado = new EventEmitter<void>();

  tiposEnvio: TipoEnvio[] = [
    { value: 'planilla', label: 'Planilla', icon: '📋', seleccionado: false },
    {
      value: 'estadisticas',
      label: 'Estadísticas',
      icon: '📊',
      seleccionado: false,
    },
    { value: 'informe', label: 'Informe PDF', icon: '📄', seleccionado: false },
  ];

  destinatarios: Destinatario[] = [];
  asunto = '';
  mensaje = '';
  enviando = false;
  cargandoDestinatarios = false;
  error = '';
  exito = '';

  constructor(
    private sesionService: SesionService,
    private historialService: HistorialService,
    private excelExporthistorialService: ExcelExporthistorialService,
  ) {}

  ngOnInit(): void {
    this.cargarDestinatarios();
  }

  cargarDestinatarios(): void {
    this.cargandoDestinatarios = true;
    this.sesionService.getDestinatariosSesion(this.sesionId).subscribe({
      next: (data) => {
        this.destinatarios = data;
        this.cargandoDestinatarios = false;
      },
      error: () => {
        this.error = 'Error al cargar destinatarios';
        this.cargandoDestinatarios = false;
      },
    });
  }

  toggleDestinatario(dest: Destinatario): void {
    dest.seleccionado = !dest.seleccionado;
    this.error = '';
  }

  toggleTipo(tipo: TipoEnvio): void {
    tipo.seleccionado = !tipo.seleccionado;
    this.error = '';
  }

  getTipoButtonClass(tipo: TipoEnvio): string {
    return tipo.seleccionado
      ? 'border-neon-yellow bg-neon-yellow/10 text-neon-yellow shadow-neon-yellow'
      : 'border-dark-600 bg-dark-900 text-gray-400 hover:border-neon-blue/50 hover:text-white';
  }

  getCheckboxClassTipo(tipo: TipoEnvio): string {
    return tipo.seleccionado
      ? 'border-neon-yellow bg-neon-yellow text-dark-950'
      : 'border-gray-600';
  }

  getDestinatarioClass(dest: Destinatario): string {
    return dest.seleccionado
      ? 'border-neon-yellow bg-neon-yellow/5 hover:bg-neon-yellow/10'
      : 'border-dark-600 bg-dark-900 hover:border-dark-500';
  }

  getCheckboxClass(dest: Destinatario): string {
    return dest.seleccionado
      ? 'border-neon-yellow bg-neon-yellow text-dark-950'
      : 'border-gray-600';
  }

  puedeEnviar(): boolean {
    const hayDestinatarios = this.destinatarios.some((d) => d.seleccionado);
    const hayTipos = this.tiposEnvio.some((t) => t.seleccionado);
    return hayDestinatarios && hayTipos && !this.enviando;
  }

  async enviar(): Promise<void> {
    if (!this.puedeEnviar()) return;

    this.enviando = true;
    this.error = '';
    this.exito = '';

    const destinatariosSeleccionados = this.destinatarios
      .filter((d) => d.seleccionado)
      .map((d) => d.email);

    const tiposSeleccionados = this.tiposEnvio
      .filter((t) => t.seleccionado)
      .map((t) => t.value);

    const archivos: { tipo: string; blob: Blob; nombre: string }[] = [];

    try {
      if (tiposSeleccionados.includes('estadisticas') && this.grupoSesion) {
        const excelBlob = this.generarExcelCompleto(this.grupoSesion);
        if (excelBlob) {
          archivos.push({
            tipo: 'estadisticas',
            blob: excelBlob,
            nombre: `Historial_${this.grupoSesion.sesion.nombreCliente}_${
              new Date().toISOString().split('T')[0]
            }.xlsx`,
          });
        }
      }

      if (tiposSeleccionados.includes('informe')) {
        const pdfBlob = await firstValueFrom(
          this.sesionService.descargarInformePDF(this.sesionId),
        );
        if (pdfBlob) {
          archivos.push({
            tipo: 'informe',
            blob: pdfBlob,
            nombre: `Informe_${
              this.grupoSesion?.sesion?.nombreCliente || 'Sesion'
            }_${Date.now()}.pdf`,
          });
        }
      }

      this.sesionService
        .enviarCorreoSesion(
          this.sesionId,
          destinatariosSeleccionados,
          tiposSeleccionados,
          archivos,
          this.asunto,
          this.mensaje,
        )
        .subscribe({
          next: (response) => {
            this.exito = response.message || '✅ Correos enviados exitosamente';
            this.enviando = false;

            this.tiposEnvio.forEach((t) => (t.seleccionado = false));
            this.destinatarios.forEach((d) => (d.seleccionado = false));
            this.asunto = '';
            this.mensaje = '';

            setTimeout(() => {
              this.enviado.emit();
              this.cerrar();
            }, 3000);
          },
          error: (err) => {
            this.error =
              err.error?.message ||
              '❌ Error al enviar el correo. Intenta nuevamente.';
            this.enviando = false;
          },
        });
    } catch (error) {
      this.error = 'Error al preparar los archivos';
      this.enviando = false;
    }
  }

  private generarExcelCompleto(grupo: any): Blob | null {
    try {
      const wb = XLSX.utils.book_new();

      this.agregarHojaResumenSesion(wb, grupo);
      this.agregarHojaRankingGeneral(wb, grupo);
      this.agregarHojaTop3(wb, grupo);
      this.agregarHojaCarrerasDetalle(wb, grupo);
      this.agregarHojaEstadisticasGenerales(wb, grupo);

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      return new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    } catch (error) {
      console.error('Error generando Excel completo:', error);
      return null;
    }
  }

  private agregarHojaResumenSesion(wb: XLSX.WorkBook, grupo: any): void {
    const data = [
      ['RESUMEN DE SESIÓN'],
      [],
      ['Cliente', grupo.sesion.nombreCliente],
      ['Empresa', grupo.sesion.empresa?.nombre || 'N/A'],
      ['Lugar', grupo.sesion.lugarEjecucion || 'N/A'],
      ['Fecha Sesión', grupo.sesion.fecha_sesion],
      [],
      ['TOTALES'],
      ['Total Carreras', grupo.totales.totalCarreras],
      ['Total Participaciones', grupo.totales.totalParticipantes],
      ['Participantes Únicos', grupo.totales.participantesUnicos],
      ['Duración Total (min)', grupo.totales.duracionTotal],
      ['Preguntas Respondidas', grupo.totales.preguntasRespondidas],
      [],
      ['MÉTRICAS FÍSICAS'],
      [
        'Velocidad Promedio General (km/h)',
        this.calcularVelocidadPromedio(grupo),
      ],
      ['Velocidad Máxima (km/h)', this.calcularVelocidadMaxima(grupo)],
      ['Distancia Total (km)', this.calcularDistanciaTotal(grupo)],
      ['Calorías Totales (kcal)', this.calcularCaloriasTotales(grupo)],
      ['Vatios Totales (W)', this.calcularVatiosTotales(grupo)],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen');
  }

  private agregarHojaRankingGeneral(wb: XLSX.WorkBook, grupo: any): void {
    const todosParticipantes: any[] = [];

    grupo.carreras.forEach((carrera: any) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p: any) => {
          const existente = todosParticipantes.find(
            (tp) => tp.nombreParticipante === p.nombreParticipante,
          );
          if (existente) {
            existente.puntosAcumulados += Number(p.puntosCarrera) || 0;
            existente.carreras++;
          } else {
            todosParticipantes.push({
              nombreParticipante: p.nombreParticipante,
              puntosAcumulados: Number(p.puntosCarrera) || 0,
              carreras: 1,
              sexo:
                p.sexo === 'M'
                  ? 'Masculino'
                  : p.sexo === 'F'
                    ? 'Femenino'
                    : 'N/E',
            });
          }
        });
      }
    });

    todosParticipantes.sort((a, b) => b.puntosAcumulados - a.puntosAcumulados);

    const data = [
      ['RANKING GENERAL DE LA SESIÓN'],
      [],
      ['Posición', 'Nombre', 'Sexo', 'Puntos Totales', 'Carreras Participadas'],
    ];

    todosParticipantes.forEach((p, index) => {
      data.push([
        index + 1,
        p.nombreParticipante,
        p.sexo,
        p.puntosAcumulados,
        p.carreras,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 10 },
      { wch: 25 },
      { wch: 12 },
      { wch: 15 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Ranking General');
  }

  private agregarHojaTop3(wb: XLSX.WorkBook, grupo: any): void {
    const todosParticipantes: any[] = [];

    grupo.carreras.forEach((carrera: any) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p: any) => {
          const existente = todosParticipantes.find(
            (tp) => tp.nombreParticipante === p.nombreParticipante,
          );
          if (existente) {
            existente.puntosAcumulados += Number(p.puntosCarrera) || 0;
            existente.velocidadPromedio =
              (existente.velocidadPromedio + Number(p.velocidadPromedio)) / 2;
            existente.distanciaTotal += Number(p.distanciaRecorrida) || 0;
            existente.caloriasTotal += Number(p.caloriasQuemadas) || 0;
          } else {
            todosParticipantes.push({
              nombreParticipante: p.nombreParticipante,
              numeroBicicleta: p.numeroBicicleta,
              sexo:
                p.sexo === 'M'
                  ? 'Masculino'
                  : p.sexo === 'F'
                    ? 'Femenino'
                    : 'N/E',
              puntosAcumulados: Number(p.puntosCarrera) || 0,
              velocidadPromedio: Number(p.velocidadPromedio) || 0,
              velocidadMaxima: Number(p.velocidadMaxima) || 0,
              distanciaTotal: Number(p.distanciaRecorrida) || 0,
              caloriasTotal: Number(p.caloriasQuemadas) || 0,
              vatiosTotal: Number(p.vatiosGenerados) || 0,
            });
          }
        });
      }
    });

    todosParticipantes.sort((a, b) => b.puntosAcumulados - a.puntosAcumulados);
    const top3 = todosParticipantes.slice(0, 3);

    const data = [
      ['TOP 3 MEJORES PARTICIPANTES'],
      [],
      [
        'Posición',
        'Nombre',
        'Bicicleta',
        'Sexo',
        'Puntos',
        'Vel. Prom. (km/h)',
        'Vel. Máx. (km/h)',
        'Distancia (km)',
        'Calorías',
        'Vatios',
      ],
    ];

    top3.forEach((p, index) => {
      const medalla = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      data.push([
        `${medalla} ${index + 1}`,
        p.nombreParticipante,
        p.numeroBicicleta,
        p.sexo,
        p.puntosAcumulados,
        p.velocidadPromedio.toFixed(2),
        p.velocidadMaxima.toFixed(2),
        p.distanciaTotal.toFixed(2),
        p.caloriasTotal,
        p.vatiosTotal,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 12 },
      { wch: 25 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Top 3');
  }

  private agregarHojaCarrerasDetalle(wb: XLSX.WorkBook, grupo: any): void {
    const data = [
      ['DETALLE DE TODAS LAS CARRERAS'],
      [],
      [
        'Carrera #',
        'Fecha',
        'Duración (min)',
        'Participantes',
        'Preguntas',
        '% Acierto',
        'Ganador',
        'Puntos Ganador',
      ],
    ];

    grupo.carreras.forEach((carrera: any, index: number) => {
      const ganador = carrera.ranking_final?.[0];
      data.push([
        index + 1,
        new Date(carrera.fecha_fin).toLocaleDateString('es-ES'),
        carrera.duracion_minutos,
        carrera.participantes_data?.length || 0,
        carrera.estadisticas_generales?.preguntasRespondidas || 0,
        carrera.estadisticas_generales?.porcentajeAcierto
          ? `${carrera.estadisticas_generales.porcentajeAcierto}%`
          : '0%',
        ganador?.nombreParticipante || 'N/A',
        ganador?.puntosCarrera || 0,
      ]);
    });

    data.push([]);
    data.push(['DETALLE POR PARTICIPANTE EN CADA CARRERA']);
    data.push([]);

    grupo.carreras.forEach((carrera: any, carreraIndex: number) => {
      data.push([
        `CARRERA ${carreraIndex + 1} - ${new Date(
          carrera.fecha_fin,
        ).toLocaleDateString('es-ES')}`,
      ]);
      data.push([
        'Posición',
        'Nombre',
        'Bicicleta',
        'Sexo',
        'Puntos',
        'Vel. Prom.',
        'Vel. Máx.',
        'Distancia',
        'Calorías',
        'Vatios',
        'Correctas',
        'Incorrectas',
      ]);

      if (carrera.ranking_final) {
        carrera.ranking_final.forEach((p: any, index: number) => {
          data.push([
            index + 1,
            p.nombreParticipante,
            p.numeroBicicleta,
            p.sexo === 'M' ? 'Masculino' : p.sexo === 'F' ? 'Femenino' : 'N/E',
            p.puntosCarrera || 0,
            p.velocidadPromedio?.toFixed(2) || 0,
            p.velocidadMaxima?.toFixed(2) || 0,
            p.distanciaRecorrida?.toFixed(2) || 0,
            p.caloriasQuemadas || 0,
            p.vatiosGenerados || 0,
            p.respuestasCorrectas || 0,
            p.respuestasIncorrectas || 0,
          ]);
        });
      }
      data.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 12 },
      { wch: 25 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Detalle Carreras');
  }

  private agregarHojaEstadisticasGenerales(
    wb: XLSX.WorkBook,
    grupo: any,
  ): void {
    const distribucionSexo = this.calcularDistribucionSexo(grupo);

    const data = [
      ['ESTADÍSTICAS GENERALES DE LA SESIÓN'],
      [],
      ['DISTRIBUCIÓN POR SEXO'],
      ['Hombres', distribucionSexo.hombres],
      ['Mujeres', distribucionSexo.mujeres],
      ['Sin Especificar', distribucionSexo.sinEspecificar],
      [],
      ['MÉTRICAS DE RENDIMIENTO'],
      [
        'Velocidad Promedio General (km/h)',
        this.calcularVelocidadPromedio(grupo),
      ],
      [
        'Velocidad Máxima Alcanzada (km/h)',
        this.calcularVelocidadMaxima(grupo),
      ],
      ['Distancia Total Recorrida (km)', this.calcularDistanciaTotal(grupo)],
      ['Calorías Totales Quemadas (kcal)', this.calcularCaloriasTotales(grupo)],
      ['Vatios Totales Generados (W)', this.calcularVatiosTotales(grupo)],
      [],
      ['MÉTRICAS DE JUEGO'],
      ['Total Preguntas Respondidas', grupo.totales.preguntasRespondidas],
      [
        'Promedio Participantes por Carrera',
        (
          grupo.totales.totalParticipantes / grupo.totales.totalCarreras
        ).toFixed(1),
      ],
      [
        'Duración Promedio por Carrera (min)',
        (grupo.totales.duracionTotal / grupo.totales.totalCarreras).toFixed(1),
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 35 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Estadísticas');
  }

  private calcularVelocidadPromedio(grupo: any): string {
    let suma = 0;
    let total = 0;
    grupo.carreras.forEach((carrera: any) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p: any) => {
          suma += Number(p.velocidadPromedio) || 0;
          total++;
        });
      }
    });
    return total > 0 ? (suma / total).toFixed(2) : '0.00';
  }

  private calcularVelocidadMaxima(grupo: any): string {
    let max = 0;
    grupo.carreras.forEach((carrera: any) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p: any) => {
          const vel = Number(p.velocidadMaxima) || 0;
          if (vel > max) max = vel;
        });
      }
    });
    return max.toFixed(2);
  }

  private calcularDistanciaTotal(grupo: any): string {
    let total = 0;
    grupo.carreras.forEach((carrera: any) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p: any) => {
          total += Number(p.distanciaRecorrida) || 0;
        });
      }
    });
    return total.toFixed(2);
  }

  private calcularCaloriasTotales(grupo: any): number {
    let total = 0;
    grupo.carreras.forEach((carrera: any) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p: any) => {
          total += Number(p.caloriasQuemadas) || 0;
        });
      }
    });
    return Math.round(total);
  }

  private calcularVatiosTotales(grupo: any): number {
    let total = 0;
    grupo.carreras.forEach((carrera: any) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p: any) => {
          total += Number(p.vatiosGenerados) || 0;
        });
      }
    });
    return Math.round(total);
  }

  private calcularDistribucionSexo(grupo: any): {
    hombres: number;
    mujeres: number;
    sinEspecificar: number;
  } {
    let hombres = 0,
      mujeres = 0,
      sinEspecificar = 0;
    grupo.carreras.forEach((carrera: any) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p: any) => {
          if (p.sexo === 'M') hombres++;
          else if (p.sexo === 'F') mujeres++;
          else sinEspecificar++;
        });
      }
    });
    return { hombres, mujeres, sinEspecificar };
  }

  private async obtenerInformePDF(): Promise<Blob | null> {
    try {
      const blob = await this.sesionService
        .descargarInformePDF(this.sesionId)
        .toPromise();
      return blob || null;
    } catch (error) {
      console.error('Error obteniendo PDF:', error);
      return null;
    }
  }

  cerrar(): void {
    if (!this.enviando) {
      this.closed.emit();
    }
  }
}
