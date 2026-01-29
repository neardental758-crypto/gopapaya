import * as XLSX from 'xlsx';
import {
  IndicadoresGlobales,
  SesionAgrupada,
} from '../../../services/historial-sesion.service';
import { Injectable } from '@angular/core';
import { HistorialBiciPaseoAdapter } from '../adapter/historial-bici-paseo.adapter';
import { ExcelExportDrBiciService } from './ExcelExportDrBiciService.service';
import { HistorialJuegoAdapter } from '../adapter/historial-juego.adapter';

@Injectable({ providedIn: 'root' })
export class ExcelExporthistorialService {
  constructor(private juegoAdapter: HistorialJuegoAdapter) {}

  private drBiciService = new ExcelExportDrBiciService();

  exportarHistorialSesion(grupo: SesionAgrupada): void {
    const juego = grupo.carreras[0]?.juego_jugado;

    if (juego === 'DrBici') {
      this.juegoAdapter.cargarComponentes().subscribe(() => {
        const wb = XLSX.utils.book_new();
        this.drBiciService.exportarDrBici(
          wb,
          grupo,
          this.juegoAdapter['componentesMap'],
        );
        const nombreArchivo = `Historial_${grupo.sesion.nombreCliente}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, nombreArchivo);
      });
      return;
    }

    const wb = XLSX.utils.book_new();

    if (juego === 'BiciPaseo') {
      this.exportarBiciPaseo(wb, grupo);
    } else if (juego === 'VR' || juego === 'Hit-Fit') {
      this.exportarVRoHitFit(wb, grupo, juego);
    } else if (juego === 'Bicilicuadora') {
      this.exportarBicilicuadora(wb, grupo);
    } else if (juego?.includes('Biketona')) {
      this.exportarBiketona(wb, grupo);
    } else if (juego === 'Brain Bike') {
      this.exportarBrainBike(wb, grupo);
    } else {
      this.exportarOtrosJuegos(wb, grupo);
    }

    const nombreArchivo = `Historial_${grupo.sesion.nombreCliente}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  }

  private exportarBicilicuadora(
    wb: XLSX.WorkBook,
    grupo: SesionAgrupada,
  ): void {
    this.agregarHojaResumenSesion(wb, grupo);
    this.agregarHojaRankingGeneral(wb, grupo);
    this.agregarHojaTop3(wb, grupo);
    this.agregarHojaCarrerasDetalle(wb, grupo);
    this.agregarHojaEstadisticasGenerales(wb, grupo);
  }

  private exportarVRoHitFit(
    wb: XLSX.WorkBook,
    grupo: SesionAgrupada,
    juego: string,
  ): void {
    this.agregarHojaResumenSesionVR(wb, grupo);
    this.agregarHojaRankingVR(wb, grupo);
    this.agregarHojaParticipantesVR(wb, grupo);
  }

  private agregarHojaResumenSesionVR(
    wb: XLSX.WorkBook,
    grupo: SesionAgrupada,
  ): void {
    const esHitFit = grupo.carreras[0]?.juego_jugado === 'Hit-Fit';
    const tiempoTotal =
      grupo.carreras[0]?.estadisticas_generales?.tiempoTotal || 0;

    const data = [
      ['RESUMEN DE SESIÓN'],
      [],
      ['Cliente', grupo.sesion.nombreCliente],
      ['Empresa', grupo.sesion.empresa?.nombre || grupo.sesion.nombreCliente],
      ['Lugar', grupo.sesion.lugarEjecucion || 'N/A'],
      ['Fecha Sesión', grupo.sesion.fecha_sesion],
      ['Tipo de Juego', grupo.carreras[0]?.juego_jugado || 'N/A'],
      [],
      ['TOTALES'],
      ['Total Sesiones', grupo.totales.totalCarreras],
      ['Total Participantes', grupo.totales.totalParticipantes],
      ['Duración Total (segundos)', tiempoTotal],
    ];

    if (esHitFit) {
      const puntosTotal =
        grupo.carreras[0]?.estadisticas_generales?.puntosTotal || 0;
      data.push(['Puntos Totales', puntosTotal]);
    }

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen');
  }

  private agregarHojaParticipantesVR(
    wb: XLSX.WorkBook,
    grupo: SesionAgrupada,
  ): void {
    const esHitFit = grupo.carreras[0]?.juego_jugado === 'Hit-Fit';

    const headers = [
      'Nombre',
      'Apellido',
      'Documento',
      'Sexo',
      'Fecha Registro',
    ];

    if (esHitFit) {
      headers.push('Puntos', 'Tiempo (seg)');
    } else {
      headers.push('Tiempo (seg)', 'Tipo VR');
    }

    const data = [['DETALLE DE PARTICIPANTES'], [], headers];

    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p) => {
          const row: any[] = [
            p.nombreParticipante,
            p.apellidoParticipante || '',
            p.documento || 'N/A',
            p.sexo === 'M' ? 'Masculino' : p.sexo === 'F' ? 'Femenino' : 'N/E',
            new Date(p.fechaRegistro).toLocaleString('es-ES'),
          ];

          if (esHitFit) {
            row.push(p.puntosObtenidos || 0, p.tiempoParticipacion || 0);
          } else {
            row.push(p.tiempoParticipacion || 0, p.tipoVr || 'N/A');
          }

          data.push(row);
        });
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = esHitFit
      ? [
          { wch: 20 },
          { wch: 20 },
          { wch: 15 },
          { wch: 12 },
          { wch: 20 },
          { wch: 12 },
          { wch: 12 },
        ]
      : [
          { wch: 20 },
          { wch: 20 },
          { wch: 15 },
          { wch: 12 },
          { wch: 20 },
          { wch: 12 },
          { wch: 30 },
        ];
    XLSX.utils.book_append_sheet(wb, ws, 'Participantes');
  }

  private agregarHojaRankingVR(wb: XLSX.WorkBook, grupo: SesionAgrupada): void {
    const esHitFit = grupo.carreras[0]?.juego_jugado === 'Hit-Fit';
    const participantes: any[] = [];

    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p) => {
          participantes.push({
            nombre: p.nombreParticipante,
            apellido: p.apellidoParticipante || '',
            sexo:
              p.sexo === 'M'
                ? 'Masculino'
                : p.sexo === 'F'
                  ? 'Femenino'
                  : 'N/E',
            tiempo: p.tiempoParticipacion || 0,
            puntos: p.puntosObtenidos || 0,
          });
        });
      }
    });

    if (esHitFit) {
      participantes.sort((a, b) => b.puntos - a.puntos);
    } else {
      participantes.sort((a, b) => b.tiempo - a.tiempo);
    }

    const headers = ['Posición', 'Nombre', 'Apellido', 'Sexo'];

    if (esHitFit) {
      headers.push('Puntos', 'Tiempo (seg)');
    } else {
      headers.push('Tiempo (seg)');
    }

    const data = [[esHitFit ? 'RANKING HIT-FIT' : 'RANKING VR'], [], headers];

    participantes.forEach((p, index) => {
      const row: any[] = [index + 1, p.nombre, p.apellido, p.sexo];

      if (esHitFit) {
        row.push(p.puntos, p.tiempo);
      } else {
        row.push(p.tiempo);
      }

      data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = esHitFit
      ? [
          { wch: 10 },
          { wch: 20 },
          { wch: 20 },
          { wch: 12 },
          { wch: 12 },
          { wch: 12 },
        ]
      : [{ wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Ranking');
  }

  private exportarBrainBike(wb: XLSX.WorkBook, grupo: SesionAgrupada): void {
    this.agregarHojaResumenSesion(wb, grupo);
    this.agregarHojaRankingGeneral(wb, grupo);
    this.agregarHojaTop3(wb, grupo);
    this.agregarHojaCarrerasDetalle(wb, grupo);
    this.agregarHojaEstadisticasGenerales(wb, grupo);
  }

  private exportarBiketona(wb: XLSX.WorkBook, grupo: SesionAgrupada): void {
    this.agregarHojaResumenBiketona(wb, grupo);
    this.agregarHojaRankingBiketona(wb, grupo);
    this.agregarHojaTop3Biketona(wb, grupo);
  }

  private agregarHojaResumenBiketona(
    wb: XLSX.WorkBook,
    grupo: SesionAgrupada,
  ): void {
    const duracionTotalSegundos = grupo.carreras.reduce((total, carrera) => {
      return total + (carrera.estadisticas_generales?.duracionTotal || 0);
    }, 0);

    const data = [
      ['RESUMEN DE SESIÓN'],
      [],
      ['Cliente', grupo.sesion.nombreCliente],
      ['Empresa', grupo.sesion.empresa?.nombre || grupo.sesion.nombreCliente],
      ['Lugar', grupo.sesion.lugarEjecucion || 'N/A'],
      ['Fecha Sesión', grupo.sesion.fecha_sesion],
      ['Tipo de Juego', grupo.carreras[0]?.juego_jugado],
      [],
      ['TOTALES'],
      ['Total Carreras', grupo.totales.totalCarreras],
      ['Total Participaciones', grupo.totales.totalParticipantes],
      ['Participantes Únicos', grupo.totales.participantesUnicos],
      ['Duración Total (segundos)', duracionTotalSegundos],
      [],
      ['MÉTRICAS FÍSICAS'],
      [
        'Velocidad Promedio General (km/h)',
        this.calcularVelocidadPromedioBiketona(grupo),
      ],
      ['Velocidad Máxima (km/h)', this.calcularVelocidadMaximaBiketona(grupo)],
      ['Calorías Totales (kcal)', this.calcularCaloriasBiketona(grupo)],
      ['Vatios Totales (W)', this.calcularVatiosBiketona(grupo)],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen');
  }

  private agregarHojaRankingBiketona(
    wb: XLSX.WorkBook,
    grupo: SesionAgrupada,
  ): void {
    const todosParticipantes: any[] = [];

    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p) => {
          const existente = todosParticipantes.find(
            (tp) => tp.nombre === p.nombre,
          );
          const mejorTiempo = Number(p.puntos || p.mejorTiempo) || 0;

          if (existente) {
            existente.mejorTiempo = Math.min(
              existente.mejorTiempo,
              mejorTiempo,
            );
            existente.carreras++;
          } else {
            todosParticipantes.push({
              nombre: p.nombre,
              sexo:
                p.genero === 'masculino'
                  ? 'Masculino'
                  : p.genero === 'femenino'
                    ? 'Femenino'
                    : 'N/E',
              mejorTiempo: mejorTiempo,
              carreras: 1,
            });
          }
        });
      }
    });

    todosParticipantes.sort((a, b) => a.mejorTiempo - b.mejorTiempo);

    const data = [
      ['RANKING GENERAL DE LA SESIÓN'],
      [],
      [
        'Posición',
        'Nombre',
        'Sexo',
        'Mejor Tiempo (seg)',
        'Carreras Participadas',
      ],
    ];

    todosParticipantes.forEach((p, index) => {
      data.push([index + 1, p.nombre, p.sexo, p.mejorTiempo, p.carreras]);
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

  private agregarHojaTop3Biketona(
    wb: XLSX.WorkBook,
    grupo: SesionAgrupada,
  ): void {
    const todosParticipantes: any[] = [];

    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p) => {
          const existente = todosParticipantes.find(
            (tp) => tp.nombre === p.nombre,
          );
          const mejorTiempo = Number(p.puntos || p.mejorTiempo) || 0;

          if (existente) {
            existente.mejorTiempo = Math.min(
              existente.mejorTiempo,
              mejorTiempo,
            );
            existente.velocidadPromedio =
              (existente.velocidadPromedio + Number(p.velocidadPromedio)) / 2;
            existente.calorias += Number(p.calorias) || 0;
            existente.vatios += Number(p.vatios) || 0;
          } else {
            todosParticipantes.push({
              nombre: p.nombre,
              sexo:
                p.genero === 'masculino'
                  ? 'Masculino'
                  : p.genero === 'femenino'
                    ? 'Femenino'
                    : 'N/E',
              mejorTiempo: mejorTiempo,
              velocidadPromedio: Number(p.velocidadPromedio) || 0,
              velocidadMaxima: Number(p.velocidadMaxima) || 0,
              calorias: Number(p.calorias) || 0,
              vatios: Number(p.vatios) || 0,
            });
          }
        });
      }
    });

    todosParticipantes.sort((a, b) => a.mejorTiempo - b.mejorTiempo);
    const top3 = todosParticipantes.slice(0, 3);

    const data = [
      ['TOP 3 MEJORES PARTICIPANTES'],
      [],
      [
        'Posición',
        'Nombre',
        'Sexo',
        'Mejor Tiempo (seg)',
        'Vel. Prom. (km/h)',
        'Vel. Máx. (km/h)',
        'Calorías',
        'Vatios',
      ],
    ];

    top3.forEach((p, index) => {
      const medalla = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      data.push([
        `${medalla} ${index + 1}`,
        p.nombre,
        p.sexo,
        p.mejorTiempo,
        p.velocidadPromedio.toFixed(2),
        p.velocidadMaxima.toFixed(2),
        p.calorias,
        p.vatios,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 12 },
      { wch: 25 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Top 3');
  }

  private calcularVelocidadPromedioBiketona(grupo: SesionAgrupada): string {
    let suma = 0,
      total = 0;
    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p) => {
          suma += Number(p.velocidadPromedio) || 0;
          total++;
        });
      }
    });
    return total > 0 ? (suma / total).toFixed(2) : '0.00';
  }

  private calcularVelocidadMaximaBiketona(grupo: SesionAgrupada): string {
    let max = 0;
    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p) => {
          const vel = Number(p.velocidadMaxima) || 0;
          if (vel > max) max = vel;
        });
      }
    });
    return max.toFixed(2);
  }

  private calcularCaloriasBiketona(grupo: SesionAgrupada): number {
    let total = 0;
    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p) => {
          total += Number(p.calorias) || 0;
        });
      }
    });
    return Math.round(total);
  }

  private calcularVatiosBiketona(grupo: SesionAgrupada): number {
    let total = 0;
    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p) => {
          total += Number(p.vatios) || 0;
        });
      }
    });
    return Math.round(total);
  }

  private exportarOtrosJuegos(wb: XLSX.WorkBook, grupo: SesionAgrupada): void {
    this.agregarHojaResumenSesion(wb, grupo);
    this.agregarHojaRankingGeneral(wb, grupo);
    this.agregarHojaTop3(wb, grupo);
    this.agregarHojaCarrerasDetalle(wb, grupo);
    this.agregarHojaEstadisticasGenerales(wb, grupo);
  }

  private agregarHojaResumenSesion(
    wb: XLSX.WorkBook,
    grupo: SesionAgrupada,
  ): void {
    const esBicilicuadora = this.esBicilicuadora(grupo);

    const data = [
      ['RESUMEN DE SESIÓN'],
      [],
      ['Cliente', grupo.sesion.nombreCliente],
      ['Empresa', grupo.sesion.empresa?.nombre || grupo.sesion.nombreCliente],
      ['Lugar', grupo.sesion.lugarEjecucion || 'N/A'],
      ['Fecha Sesión', grupo.sesion.fecha_sesion],
      [],
      ['TOTALES'],
      ['Total Carreras', grupo.totales.totalCarreras],
      ['Total Participaciones', grupo.totales.totalParticipantes],
      ['Participantes Únicos', grupo.totales.participantesUnicos],
      ['Duración Total (min)', grupo.totales.duracionTotal],
    ];

    if (!esBicilicuadora) {
      data.push(['Preguntas Respondidas', grupo.totales.preguntasRespondidas]);
    }

    if (esBicilicuadora) {
      const bebidasTotales = this.calcularBebidasTotales(grupo);
      data.push(['Bebidas Realizadas', bebidasTotales]);
    }

    data.push(
      [],
      ['MÉTRICAS FÍSICAS'],
      [
        'Velocidad Promedio General (km/h)',
        this.calcularVelocidadPromedio(grupo),
      ],
      ['Velocidad Máxima (km/h)', this.calcularVelocidadMaxima(grupo)],
    );

    if (!this.deberiaOcultarDistancia(grupo)) {
      data.push(['Distancia Total (km)', this.calcularDistanciaTotal(grupo)]);
    }

    data.push(
      ['Calorías Totales (kcal)', this.calcularCaloriasTotales(grupo)],
      ['Vatios Totales (W)', this.calcularVatiosTotales(grupo)],
    );

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen');
  }

  private agregarHojaTop3(wb: XLSX.WorkBook, grupo: SesionAgrupada): void {
    const todosParticipantes: any[] = [];
    const esBicilicuadora = this.esBicilicuadora(grupo);

    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p) => {
          const existente = todosParticipantes.find(
            (tp) => tp.nombreParticipante === p.nombreParticipante,
          );
          if (existente) {
            existente.puntosAcumulados +=
              Number(p.puntosTotales || p.puntosCarrera) || 0;
            existente.velocidadPromedio =
              (existente.velocidadPromedio + Number(p.velocidadPromedio)) / 2;
            existente.distanciaTotal += Number(p.distanciaRecorrida) || 0;
            existente.caloriasTotal += Number(p.caloriasQuemadas) || 0;
            if (esBicilicuadora) {
              existente.bebidasSeleccionadas +=
                Number(p.cantidadBebidasSeleccionadas) || 0;
            }
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
              puntosAcumulados: Number(p.puntosTotales || p.puntosCarrera) || 0,
              velocidadPromedio: Number(p.velocidadPromedio) || 0,
              velocidadMaxima: Number(p.velocidadMaxima) || 0,
              distanciaTotal: Number(p.distanciaRecorrida) || 0,
              caloriasTotal: Number(p.caloriasQuemadas) || 0,
              vatiosTotal: Number(p.vatiosGenerados) || 0,
              bebidasSeleccionadas: Number(p.cantidadBebidasSeleccionadas) || 0,
            });
          }
        });
      }
    });

    todosParticipantes.sort((a, b) => b.puntosAcumulados - a.puntosAcumulados);
    const top3 = todosParticipantes.slice(0, 3);

    const headers = [
      'Posición',
      'Nombre',
      'Bicicleta',
      'Sexo',
      'Puntos',
      'Vel. Prom. (km/h)',
      'Vel. Máx. (km/h)',
    ];

    if (!this.deberiaOcultarDistancia(grupo)) {
      headers.push('Distancia (km)');
    }

    headers.push('Calorías', 'Vatios');

    if (esBicilicuadora) {
      headers.push('Bebidas');
    }

    const data = [['TOP 3 MEJORES PARTICIPANTES'], [], headers];

    top3.forEach((p, index) => {
      const medalla = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      const row: any[] = [
        `${medalla} ${index + 1}`,
        p.nombreParticipante,
        p.numeroBicicleta,
        p.sexo,
        p.puntosAcumulados,
        p.velocidadPromedio.toFixed(2),
        p.velocidadMaxima.toFixed(2),
      ];

      if (!this.deberiaOcultarDistancia(grupo)) {
        row.push(p.distanciaTotal.toFixed(2));
      }

      row.push(p.caloriasTotal, p.vatiosTotal);

      if (esBicilicuadora) {
        row.push(p.bebidasSeleccionadas);
      }

      data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const colWidths = [
      { wch: 12 },
      { wch: 25 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
    ];

    if (!this.deberiaOcultarDistancia(grupo)) {
      colWidths.push({ wch: 15 });
    }

    colWidths.push({ wch: 12 }, { wch: 12 });

    if (esBicilicuadora) {
      colWidths.push({ wch: 12 });
    }

    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, 'Top 3');
  }

  private agregarHojaCarrerasDetalle(
    wb: XLSX.WorkBook,
    grupo: SesionAgrupada,
  ): void {
    const esBicilicuadora = this.esBicilicuadora(grupo);
    const ocultarDistancia = this.deberiaOcultarDistancia(grupo);

    const headersResumen = [
      'Carrera #',
      'Fecha',
      'Duración (min)',
      'Participantes',
    ];

    if (esBicilicuadora) {
      headersResumen.push('Bebidas Realizadas');
    } else {
      headersResumen.push('Preguntas', '% Acierto');
    }

    headersResumen.push('Ganador', 'Puntos Ganador');

    const data = [['DETALLE DE TODAS LAS CARRERAS'], [], headersResumen];

    grupo.carreras.forEach((carrera, index) => {
      const ganador = carrera.ranking_final?.[0];
      const duracionMinutos = carrera.estadisticas_generales?.duracionTotal
        ? (carrera.estadisticas_generales.duracionTotal / 60).toFixed(1)
        : carrera.duracion_minutos;

      const row: any[] = [
        index + 1,
        new Date(carrera.fecha_fin).toLocaleDateString('es-ES'),
        duracionMinutos,
        carrera.participantes_data?.length || 0,
      ];

      if (esBicilicuadora) {
        row.push(carrera.estadisticas_generales?.bebidasRealizadas || 0);
      } else {
        row.push(
          carrera.estadisticas_generales?.preguntasRespondidas || 0,
          carrera.estadisticas_generales?.porcentajeAcierto
            ? `${carrera.estadisticas_generales.porcentajeAcierto}%`
            : '0%',
        );
      }

      const puntosGanador = esBicilicuadora
        ? ganador?.puntos || 0
        : ganador?.puntosCarrera || 0;

      row.push(
        ganador?.nombre || ganador?.nombreParticipante || 'N/A',
        puntosGanador,
      );
      data.push(row);
    });

    data.push([], ['DETALLE POR PARTICIPANTE EN CADA CARRERA'], []);

    grupo.carreras.forEach((carrera, carreraIndex) => {
      data.push([
        `CARRERA ${carreraIndex + 1} - ${new Date(
          carrera.fecha_fin,
        ).toLocaleDateString('es-ES')}`,
      ]);

      const headersParticipante = [
        'Posición',
        'Nombre',
        'Bicicleta',
        'Sexo',
        'Puntos',
        'Vel. Prom.',
        'Vel. Máx.',
      ];

      if (!ocultarDistancia) {
        headersParticipante.push('Distancia');
      }

      headersParticipante.push('Calorías', 'Vatios');

      if (esBicilicuadora) {
        headersParticipante.push('Bebidas');
      } else {
        headersParticipante.push('Correctas', 'Incorrectas');
      }

      data.push(headersParticipante);

      if (carrera.participantes_data) {
        const participantesOrdenados = esBicilicuadora
          ? [...carrera.participantes_data].sort(
              (a, b) => (b.puntosTotales || 0) - (a.puntosTotales || 0),
            )
          : carrera.ranking_final || carrera.participantes_data;

        participantesOrdenados.forEach((p, index) => {
          const puntosParticipante = esBicilicuadora
            ? p.puntosTotales || 0
            : p.puntosCarrera || 0;

          const row: any[] = [
            index + 1,
            p.nombreParticipante || p.nombre,
            p.numeroBicicleta,
            p.sexo === 'M' ? 'Masculino' : p.sexo === 'F' ? 'Femenino' : 'N/E',
            puntosParticipante,
            Number(p.velocidadPromedio || 0).toFixed(2),
            Number(p.velocidadMaxima || 0).toFixed(2),
          ];

          if (!ocultarDistancia) {
            row.push(Number(p.distanciaRecorrida || 0).toFixed(2));
          }

          row.push(
            Math.round(Number(p.caloriasQuemadas || 0)),
            Math.round(Number(p.vatiosGenerados || 0)),
          );

          if (esBicilicuadora) {
            row.push(p.cantidadBebidasSeleccionadas || 0);
          } else {
            row.push(p.respuestasCorrectas || 0, p.respuestasIncorrectas || 0);
          }

          data.push(row);
        });
      }
      data.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const colWidths = [
      { wch: 12 },
      { wch: 25 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
    ];

    if (!ocultarDistancia) {
      colWidths.push({ wch: 12 });
    }

    colWidths.push({ wch: 10 }, { wch: 10 });

    if (esBicilicuadora) {
      colWidths.push({ wch: 12 });
    } else {
      colWidths.push({ wch: 12 }, { wch: 12 });
    }

    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, 'Detalle Carreras');
  }

  private agregarHojaEstadisticasGenerales(
    wb: XLSX.WorkBook,
    grupo: SesionAgrupada,
  ): void {
    const distribucionSexo = this.calcularDistribucionSexo(grupo);
    const esBicilicuadora = this.esBicilicuadora(grupo);
    const ocultarDistancia = this.deberiaOcultarDistancia(grupo);

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
    ];

    if (!ocultarDistancia) {
      data.push([
        'Distancia Total Recorrida (km)',
        this.calcularDistanciaTotal(grupo),
      ]);
    }

    data.push(
      ['Calorías Totales Quemadas (kcal)', this.calcularCaloriasTotales(grupo)],
      ['Vatios Totales Generados (W)', this.calcularVatiosTotales(grupo)],
    );

    data.push([], ['MÉTRICAS DE JUEGO']);

    if (esBicilicuadora) {
      const bebidasTotales = this.calcularBebidasTotales(grupo);
      data.push(['Total Bebidas Realizadas', bebidasTotales]);
    } else {
      data.push([
        'Total Preguntas Respondidas',
        grupo.totales.preguntasRespondidas,
      ]);
    }

    data.push(
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
    );

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 35 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Estadísticas');
  }

  private esBicilicuadora(grupo: SesionAgrupada): boolean {
    return grupo.carreras.every((c) => c.juego_jugado === 'Bicilicuadora');
  }

  private deberiaOcultarDistancia(grupo: SesionAgrupada): boolean {
    return grupo.carreras.every(
      (c) =>
        c.juego_jugado.includes('Biketona') ||
        c.juego_jugado === 'Bicilicuadora',
    );
  }

  private calcularBebidasTotales(grupo: SesionAgrupada): number {
    let total = 0;
    grupo.carreras.forEach((carrera) => {
      if (carrera.estadisticas_generales?.bebidasRealizadas) {
        total += Number(carrera.estadisticas_generales.bebidasRealizadas);
      }
    });
    return total;
  }

  private agregarHojaRankingGeneral(
    wb: XLSX.WorkBook,
    grupo: SesionAgrupada,
  ): void {
    const todosParticipantes: any[] = [];
    const esBicilicuadora = this.esBicilicuadora(grupo);

    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p) => {
          const nombrePart = p.nombreParticipante || p.nombre;
          const existente = todosParticipantes.find(
            (tp) => tp.nombreParticipante === nombrePart,
          );

          const puntos = esBicilicuadora
            ? Number(p.puntosTotales) || 0
            : Number(p.puntosCarrera || p.puntos) || 0;

          const sexoParticipante = p.sexo
            ? p.sexo === 'M'
              ? 'Masculino'
              : p.sexo === 'F'
                ? 'Femenino'
                : 'N/E'
            : p.genero === 'masculino'
              ? 'Masculino'
              : p.genero === 'femenino'
                ? 'Femenino'
                : 'N/E';

          if (existente) {
            existente.puntosAcumulados += puntos;
            existente.carreras++;
          } else {
            todosParticipantes.push({
              nombreParticipante: nombrePart,
              puntosAcumulados: puntos,
              carreras: 1,
              sexo: sexoParticipante,
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

  private calcularVelocidadPromedio(grupo: SesionAgrupada): string {
    let suma = 0;
    let total = 0;
    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p) => {
          suma += Number(p.velocidadPromedio) || 0;
          total++;
        });
      }
    });
    return total > 0 ? (suma / total).toFixed(2) : '0.00';
  }

  private calcularVelocidadMaxima(grupo: SesionAgrupada): string {
    let max = 0;
    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p) => {
          const vel = Number(p.velocidadMaxima) || 0;
          if (vel > max) max = vel;
        });
      }
    });
    return max.toFixed(2);
  }

  private calcularDistanciaTotal(grupo: SesionAgrupada): string {
    let total = 0;
    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p) => {
          total += Number(p.distanciaRecorrida) || 0;
        });
      }
    });
    return total.toFixed(2);
  }

  private calcularCaloriasTotales(grupo: SesionAgrupada): number {
    let total = 0;
    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p) => {
          total += Number(p.caloriasQuemadas || p.calorias) || 0;
        });
      }
    });
    return Math.round(total);
  }

  private calcularVatiosTotales(grupo: SesionAgrupada): number {
    let total = 0;
    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p) => {
          total += Number(p.vatiosGenerados || p.vatios) || 0;
        });
      }
    });
    return Math.round(total);
  }

  private calcularDistribucionSexo(grupo: SesionAgrupada): {
    hombres: number;
    mujeres: number;
    sinEspecificar: number;
  } {
    let hombres = 0,
      mujeres = 0,
      sinEspecificar = 0;
    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p) => {
          if (p.sexo === 'M' || p.genero === 'masculino') hombres++;
          else if (p.sexo === 'F' || p.genero === 'femenino') mujeres++;
          else sinEspecificar++;
        });
      }
    });
    return { hombres, mujeres, sinEspecificar };
  }

  exportarHistorialCompleto(
    sesionesAgrupadas: SesionAgrupada[],
    indicadores: IndicadoresGlobales,
  ): void {
    const wb = XLSX.utils.book_new();

    this.agregarHojaIndicadoresGlobales(wb, indicadores);
    this.agregarHojaTodasSesiones(wb, sesionesAgrupadas);
    this.agregarHojaRankingGlobalCompleto(wb, sesionesAgrupadas);
    this.agregarHojaTop10Global(wb, sesionesAgrupadas);
    this.agregarHojaEstadisticasGlobales(wb, sesionesAgrupadas);
    this.agregarHojaDistribucionSexoGlobal(wb, sesionesAgrupadas);

    const nombreArchivo = `Historial_Completo_${
      new Date().toISOString().split('T')[0]
    }.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  }

  private agregarHojaIndicadoresGlobales(
    wb: XLSX.WorkBook,
    indicadores: IndicadoresGlobales,
  ): void {
    const data = [
      ['INDICADORES GLOBALES'],
      [],
      ['Total de Sesiones', indicadores.totalSesiones],
      ['Total de Carreras', indicadores.totalCarreras],
      ['Total de Participaciones', indicadores.totalParticipantes],
      ['Duración Total (minutos)', indicadores.duracionTotalSegundos],
      [
        'Promedio Participantes por Carrera',
        indicadores.promedioParticipantesPorCarrera,
      ],
      [
        'Promedio Duración por Carrera (min)',
        indicadores.promedioDuracionMinutos,
      ],
      ['Total Preguntas Respondidas', indicadores.totalPreguntasRespondidas],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 35 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Indicadores');
  }

  private agregarHojaTodasSesiones(
    wb: XLSX.WorkBook,
    sesionesAgrupadas: SesionAgrupada[],
  ): void {
    const data = [
      ['RESUMEN DE TODAS LAS SESIONES'],
      [],
      [
        'Cliente',
        'Empresa',
        'Carreras',
        'Participantes Únicos',
        'Duración Total (min)',
        'Vel. Prom. (km/h)',
        'Distancia (km)',
        'Calorías',
        'Vatios',
        'Preguntas',
      ],
    ];

    sesionesAgrupadas.forEach((grupo) => {
      data.push([
        grupo.sesion.nombreCliente,
        grupo.sesion.empresa?.nombre || 'N/A',
        grupo.totales.totalCarreras,
        grupo.totales.participantesUnicos,
        grupo.totales.duracionTotal,
        this.calcularVelocidadPromedio(grupo),
        this.calcularDistanciaTotal(grupo),
        this.calcularCaloriasTotales(grupo),
        this.calcularVatiosTotales(grupo),
        grupo.totales.preguntasRespondidas,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 25 },
      { wch: 25 },
      { wch: 10 },
      { wch: 18 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Todas las Sesiones');
  }

  private agregarHojaRankingGlobalCompleto(
    wb: XLSX.WorkBook,
    sesionesAgrupadas: SesionAgrupada[],
  ): void {
    const todosParticipantes: any[] = [];

    sesionesAgrupadas.forEach((grupo) => {
      grupo.carreras.forEach((carrera) => {
        if (
          carrera.juego_jugado === 'DrBici' ||
          carrera.juego_jugado === 'VR' ||
          carrera.juego_jugado === 'Hit-Fit' ||
          carrera.juego_jugado === 'BiciPaseo'
        ) {
          return;
        }

        if (carrera.participantes_data) {
          carrera.participantes_data.forEach((p) => {
            const existente = todosParticipantes.find(
              (tp) => tp.nombreParticipante === p.nombreParticipante,
            );
            if (existente) {
              existente.puntosTotal += Number(p.puntosCarrera) || 0;
              existente.carreras++;
              existente.distanciaTotal += Number(p.distanciaRecorrida) || 0;
              existente.caloriasTotal += Number(p.caloriasQuemadas) || 0;
              existente.vatiosTotal += Number(p.vatiosGenerados) || 0;
              existente.velocidadPromedio =
                (existente.velocidadPromedio +
                  (Number(p.velocidadPromedio) || 0)) /
                2;
              if (
                (Number(p.velocidadMaxima) || 0) > existente.velocidadMaxima
              ) {
                existente.velocidadMaxima = Number(p.velocidadMaxima) || 0;
              }
            } else {
              todosParticipantes.push({
                nombreParticipante: p.nombreParticipante,
                sexo:
                  p.sexo === 'M'
                    ? 'Masculino'
                    : p.sexo === 'F'
                      ? 'Femenino'
                      : 'N/E',
                puntosTotal: Number(p.puntosCarrera) || 0,
                carreras: 1,
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
    });

    todosParticipantes.sort((a, b) => b.puntosTotal - a.puntosTotal);

    const data = [
      ['RANKING GLOBAL DE TODOS LOS PARTICIPANTES'],
      [],
      [
        'Pos.',
        'Nombre',
        'Sexo',
        'Puntos Totales',
        'Carreras',
        'Vel. Prom.',
        'Vel. Máx.',
        'Distancia',
        'Calorías',
        'Vatios',
      ],
    ];

    todosParticipantes.forEach((p, index) => {
      data.push([
        index + 1,
        p.nombreParticipante,
        p.sexo,
        p.puntosTotal,
        p.carreras,
        p.velocidadPromedio.toFixed(2),
        p.velocidadMaxima.toFixed(2),
        p.distanciaTotal.toFixed(2),
        p.caloriasTotal,
        p.vatiosTotal,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 8 },
      { wch: 25 },
      { wch: 12 },
      { wch: 15 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Ranking Global');
  }

  private agregarHojaTop10Global(
    wb: XLSX.WorkBook,
    sesionesAgrupadas: SesionAgrupada[],
  ): void {
    const todosParticipantes: any[] = [];

    sesionesAgrupadas.forEach((grupo) => {
      grupo.carreras.forEach((carrera) => {
        if (carrera.participantes_data) {
          carrera.participantes_data.forEach((p) => {
            const existente = todosParticipantes.find(
              (tp) => tp.nombreParticipante === p.nombreParticipante,
            );
            if (existente) {
              existente.puntosTotal += Number(p.puntosCarrera) || 0;
              existente.carreras++;
              existente.distanciaTotal += Number(p.distanciaRecorrida) || 0;
              existente.caloriasTotal += Number(p.caloriasQuemadas) || 0;
              existente.vatiosTotal += Number(p.vatiosGenerados) || 0;
              existente.correctasTotal += Number(p.respuestasCorrectas) || 0;
              existente.incorrectasTotal +=
                Number(p.respuestasIncorrectas) || 0;
              existente.velocidadPromedio =
                (existente.velocidadPromedio +
                  (Number(p.velocidadPromedio) || 0)) /
                2;
              if (
                (Number(p.velocidadMaxima) || 0) > existente.velocidadMaxima
              ) {
                existente.velocidadMaxima = Number(p.velocidadMaxima) || 0;
              }
            } else {
              todosParticipantes.push({
                nombreParticipante: p.nombreParticipante,
                sexo:
                  p.sexo === 'M'
                    ? 'Masculino'
                    : p.sexo === 'F'
                      ? 'Femenino'
                      : 'N/E',
                puntosTotal: Number(p.puntosCarrera) || 0,
                carreras: 1,
                velocidadPromedio: Number(p.velocidadPromedio) || 0,
                velocidadMaxima: Number(p.velocidadMaxima) || 0,
                distanciaTotal: Number(p.distanciaRecorrida) || 0,
                caloriasTotal: Number(p.caloriasQuemadas) || 0,
                vatiosTotal: Number(p.vatiosGenerados) || 0,
                correctasTotal: Number(p.respuestasCorrectas) || 0,
                incorrectasTotal: Number(p.respuestasIncorrectas) || 0,
              });
            }
          });
        }
      });
    });

    todosParticipantes.sort((a, b) => b.puntosTotal - a.puntosTotal);
    const top10 = todosParticipantes.slice(0, 10);

    const data = [
      ['TOP 10 MEJORES PARTICIPANTES - GLOBAL'],
      [],
      [
        'Pos.',
        'Nombre',
        'Sexo',
        'Puntos',
        'Carreras',
        'Vel. Prom.',
        'Vel. Máx.',
        'Distancia',
        'Calorías',
        'Vatios',
        'Correctas',
        'Incorrectas',
      ],
    ];

    top10.forEach((p, index) => {
      const medallas = ['🥇', '🥈', '🥉'];
      const posicion =
        index < 3 ? `${medallas[index]} ${index + 1}` : `${index + 1}`;
      data.push([
        posicion,
        p.nombreParticipante,
        p.sexo,
        p.puntosTotal,
        p.carreras,
        p.velocidadPromedio.toFixed(2),
        p.velocidadMaxima.toFixed(2),
        p.distanciaTotal.toFixed(2),
        p.caloriasTotal,
        p.vatiosTotal,
        p.correctasTotal,
        p.incorrectasTotal,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 10 },
      { wch: 25 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Top 10 Global');
  }

  private agregarHojaEstadisticasGlobales(
    wb: XLSX.WorkBook,
    sesionesAgrupadas: SesionAgrupada[],
  ): void {
    let velocidadPromedioTotal = 0;
    let velocidadMaxima = 0;
    let distanciaTotal = 0;
    let caloriasTotal = 0;
    let vatiosTotal = 0;
    let participantesTotal = 0;

    sesionesAgrupadas.forEach((grupo) => {
      grupo.carreras.forEach((carrera) => {
        if (
          carrera.juego_jugado === 'DrBici' ||
          carrera.juego_jugado === 'VR' ||
          carrera.juego_jugado === 'Hit-Fit' ||
          carrera.juego_jugado === 'BiciPaseo'
        ) {
          return;
        }

        if (carrera.participantes_data) {
          carrera.participantes_data.forEach((p) => {
            velocidadPromedioTotal += Number(p.velocidadPromedio) || 0;
            const velMax = Number(p.velocidadMaxima) || 0;
            if (velMax > velocidadMaxima) velocidadMaxima = velMax;
            distanciaTotal += Number(p.distanciaRecorrida) || 0;
            caloriasTotal += Number(p.caloriasQuemadas) || 0;
            vatiosTotal += Number(p.vatiosGenerados) || 0;
            participantesTotal++;
          });
        }
      });
    });

    const velocidadPromedio =
      participantesTotal > 0
        ? (velocidadPromedioTotal / participantesTotal).toFixed(2)
        : '0.00';

    const data = [
      ['ESTADÍSTICAS GLOBALES'],
      [],
      ['MÉTRICAS DE RENDIMIENTO'],
      ['Velocidad Promedio Global (km/h)', velocidadPromedio],
      ['Velocidad Máxima Global (km/h)', velocidadMaxima.toFixed(2)],
      ['Distancia Total Recorrida (km)', distanciaTotal.toFixed(2)],
      ['Calorías Totales Quemadas (kcal)', caloriasTotal],
      ['Vatios Totales Generados (W)', vatiosTotal],
      ['Total de Participaciones', participantesTotal],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 35 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Estadísticas Globales');
  }

  private agregarHojaDistribucionSexoGlobal(
    wb: XLSX.WorkBook,
    sesionesAgrupadas: SesionAgrupada[],
  ): void {
    let hombres = 0,
      mujeres = 0,
      sinEspecificar = 0;

    sesionesAgrupadas.forEach((grupo) => {
      grupo.carreras.forEach((carrera) => {
        if (carrera.participantes_data) {
          carrera.participantes_data.forEach((p) => {
            if (p.sexo === 'M') hombres++;
            else if (p.sexo === 'F') mujeres++;
            else sinEspecificar++;
          });
        }
      });
    });

    const total = hombres + mujeres + sinEspecificar;

    const data = [
      ['DISTRIBUCIÓN POR SEXO - GLOBAL'],
      [],
      ['Categoría', 'Cantidad', 'Porcentaje'],
      [
        'Hombres',
        hombres,
        total > 0 ? `${((hombres / total) * 100).toFixed(1)}%` : '0%',
      ],
      [
        'Mujeres',
        mujeres,
        total > 0 ? `${((mujeres / total) * 100).toFixed(1)}%` : '0%',
      ],
      [
        'Sin Especificar',
        sinEspecificar,
        total > 0 ? `${((sinEspecificar / total) * 100).toFixed(1)}%` : '0%',
      ],
      [],
      ['Total Participaciones', total, '100%'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Distribución Sexo');
  }

  private exportarBiciPaseo(wb: XLSX.WorkBook, grupo: SesionAgrupada): void {
    this.agregarHojaResumenBiciPaseo(wb, grupo);
    this.agregarHojaParticipantesBiciPaseo(wb, grupo);
  }

  private agregarHojaResumenBiciPaseo(
    wb: XLSX.WorkBook,
    grupo: SesionAgrupada,
  ): void {
    const historial = grupo.carreras[0];
    const estadisticas = HistorialBiciPaseoAdapter.getEstadisticas(historial);

    const data = [
      ['RESUMEN DE SESIÓN BICIPASEO'],
      [],
      ['Cliente', grupo.sesion.nombreCliente],
      ['Empresa', grupo.sesion.empresa?.nombre || grupo.sesion.nombreCliente],
      ['Lugar', grupo.sesion.lugarEjecucion || 'N/A'],
      ['Fecha Sesión', grupo.sesion.fecha_sesion],
      [],
      ['INFORMACIÓN DEL RECORRIDO'],
      ['Ruta', estadisticas.ruta],
      ['Distancia', estadisticas.distancia],
      [],
      ['TOTALES'],
      ['Total Participantes', estadisticas.totalParticipantes],
      ['Hombres', estadisticas.hombres],
      ['Mujeres', estadisticas.mujeres],
      [],
      ['DISTRIBUCIÓN DE VEHÍCULOS'],
      ['Patinetas Eléctricas', estadisticas.distribucionVehiculos.patineta],
      [
        'Bicicletas Mecánicas',
        estadisticas.distribucionVehiculos.bicicletaMecanica,
      ],
      [
        'Bicicletas Eléctricas',
        estadisticas.distribucionVehiculos.bicicletaElectrica,
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 30 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen');
  }

  private agregarHojaParticipantesBiciPaseo(
    wb: XLSX.WorkBook,
    grupo: SesionAgrupada,
  ): void {
    const historial = grupo.carreras[0];
    const participantes =
      HistorialBiciPaseoAdapter.adaptarParticipantes(historial);

    const headers = [
      'Nombre',
      'Apellido',
      'Sexo',
      'Tipo de Vehículo',
      'Documento',
      'Fecha Registro',
    ];
    const data = [['DETALLE DE PARTICIPANTES'], [], headers];

    participantes.forEach((p) => {
      const nombreVehiculo = HistorialBiciPaseoAdapter.getNombreVehiculo(
        p.tipoVehiculo,
      );

      const row = [
        p.nombre,
        p.apellido,
        p.sexo === 'M' ? 'Masculino' : p.sexo === 'F' ? 'Femenino' : 'N/E',
        nombreVehiculo,
        p.documento || 'N/A',
        p.fechaRegistro
          ? new Date(p.fechaRegistro).toLocaleString('es-ES')
          : 'N/A',
      ];
      data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
      { wch: 20 },
      { wch: 15 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Participantes');
  }
}
