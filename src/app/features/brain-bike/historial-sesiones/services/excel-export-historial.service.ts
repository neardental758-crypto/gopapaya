import * as XLSX from 'xlsx';
import {
  IndicadoresGlobales,
  SesionAgrupada,
} from '../../../services/historial-sesion.service';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ExcelExporthistorialService {
  exportarHistorialSesion(grupo: SesionAgrupada): void {
    const wb = XLSX.utils.book_new();

    this.agregarHojaResumenSesion(wb, grupo);
    this.agregarHojaRankingGeneral(wb, grupo);
    this.agregarHojaTop3(wb, grupo);
    this.agregarHojaCarrerasDetalle(wb, grupo);
    this.agregarHojaEstadisticasGenerales(wb, grupo);

    const nombreArchivo = `Historial_${grupo.sesion.nombreCliente}_${
      new Date().toISOString().split('T')[0]
    }.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  }

  private agregarHojaResumenSesion(
    wb: XLSX.WorkBook,
    grupo: SesionAgrupada
  ): void {
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

  private agregarHojaRankingGeneral(
    wb: XLSX.WorkBook,
    grupo: SesionAgrupada
  ): void {
    const todosParticipantes: any[] = [];

    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p) => {
          const existente = todosParticipantes.find(
            (tp) => tp.nombreParticipante === p.nombreParticipante
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

  private agregarHojaTop3(wb: XLSX.WorkBook, grupo: SesionAgrupada): void {
    const todosParticipantes: any[] = [];

    grupo.carreras.forEach((carrera) => {
      if (carrera.participantes_data) {
        carrera.participantes_data.forEach((p) => {
          const existente = todosParticipantes.find(
            (tp) => tp.nombreParticipante === p.nombreParticipante
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

  private agregarHojaCarrerasDetalle(
    wb: XLSX.WorkBook,
    grupo: SesionAgrupada
  ): void {
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

    grupo.carreras.forEach((carrera, index) => {
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

    grupo.carreras.forEach((carrera, carreraIndex) => {
      data.push([
        `CARRERA ${carreraIndex + 1} - ${new Date(
          carrera.fecha_fin
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
        carrera.ranking_final.forEach((p, index) => {
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
    grupo: SesionAgrupada
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
          total += Number(p.caloriasQuemadas) || 0;
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
          total += Number(p.vatiosGenerados) || 0;
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
          if (p.sexo === 'M') hombres++;
          else if (p.sexo === 'F') mujeres++;
          else sinEspecificar++;
        });
      }
    });
    return { hombres, mujeres, sinEspecificar };
  }

  exportarHistorialCompleto(
    sesionesAgrupadas: SesionAgrupada[],
    indicadores: IndicadoresGlobales
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
    indicadores: IndicadoresGlobales
  ): void {
    const data = [
      ['INDICADORES GLOBALES'],
      [],
      ['Total de Sesiones', indicadores.totalSesiones],
      ['Total de Carreras', indicadores.totalCarreras],
      ['Total de Participaciones', indicadores.totalParticipantes],
      ['Duración Total (minutos)', indicadores.duracionTotalMinutos],
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
    sesionesAgrupadas: SesionAgrupada[]
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
    sesionesAgrupadas: SesionAgrupada[]
  ): void {
    const todosParticipantes: any[] = [];

    sesionesAgrupadas.forEach((grupo) => {
      grupo.carreras.forEach((carrera) => {
        if (carrera.participantes_data) {
          carrera.participantes_data.forEach((p) => {
            const existente = todosParticipantes.find(
              (tp) => tp.nombreParticipante === p.nombreParticipante
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
    sesionesAgrupadas: SesionAgrupada[]
  ): void {
    const todosParticipantes: any[] = [];

    sesionesAgrupadas.forEach((grupo) => {
      grupo.carreras.forEach((carrera) => {
        if (carrera.participantes_data) {
          carrera.participantes_data.forEach((p) => {
            const existente = todosParticipantes.find(
              (tp) => tp.nombreParticipante === p.nombreParticipante
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
    sesionesAgrupadas: SesionAgrupada[]
  ): void {
    let velocidadPromedioTotal = 0;
    let velocidadMaxima = 0;
    let distanciaTotal = 0;
    let caloriasTotal = 0;
    let vatiosTotal = 0;
    let participantesTotal = 0;

    sesionesAgrupadas.forEach((grupo) => {
      grupo.carreras.forEach((carrera) => {
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
    sesionesAgrupadas: SesionAgrupada[]
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
}
