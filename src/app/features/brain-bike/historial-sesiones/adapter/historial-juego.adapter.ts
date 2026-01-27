import { Injectable } from '@angular/core';
import {
  HistorialSesion,
  SesionAgrupada,
} from '../../../services/historial-sesion.service';
import { HistorialBiciPaseoAdapter } from './historial-bici-paseo.adapter';

interface EstadisticasJuego {
  tabs: Array<
    'resumen' | 'preguntas' | 'participantes' | 'estadisticas' | 'equipos'
  >;
  tienePreguntas: boolean;
  camposParticipante: string[];
}

@Injectable({ providedIn: 'root' })
export class HistorialJuegoAdapter {
  getConfiguracionJuego(juegoJugado: string): EstadisticasJuego {
    const configs: { [key: string]: EstadisticasJuego } = {
      'Brain Bike': {
        tabs: ['resumen', 'preguntas', 'participantes', 'estadisticas'],
        tienePreguntas: true,
        camposParticipante: [
          'puntosCarrera',
          'puntosAcumulados',
          'velocidadPromedio',
          'velocidadMaxima',
          'caloriasQuemadas',
          'vatiosGenerados',
          'respuestasCorrectas',
          'respuestasIncorrectas',
        ],
      },
      Bicilicuadora: {
        tabs: ['resumen', 'participantes', 'estadisticas'],
        tienePreguntas: false,
        camposParticipante: [
          'nombreParticipante',
          'puntosTotales',
          'velocidadPromedio',
          'velocidadMaxima',
          'caloriasQuemadas',
          'vatiosGenerados',
          'cantidadBebidasSeleccionadas',
          'distanciaRecorrida',
        ],
      },
      'Biketona Campeonato': {
        tabs: ['resumen', 'participantes', 'estadisticas'],
        tienePreguntas: false,
        camposParticipante: [
          'nombre',
          'mejorTiempo',
          'velocidadPromedio',
          'velocidadMaxima',
          'calorias',
          'vatios',
          'posicion',
        ],
      },
      'Biketona Equipos': {
        tabs: ['resumen', 'equipos', 'participantes', 'estadisticas'],
        tienePreguntas: false,
        camposParticipante: [
          'nombre',
          'equipo',
          'mejorTiempo',
          'velocidadPromedio',
          'velocidadMaxima',
          'calorias',
          'vatios',
          'posicion',
        ],
      },
      'Biketona 1v1': {
        tabs: ['resumen', 'participantes', 'estadisticas'],
        tienePreguntas: false,
        camposParticipante: [
          'nombre',
          'velocidadPromedio',
          'velocidadMaxima',
          'calorias',
          'vatios',
          'mejorTiempo',
        ],
      },
      VR: {
        tabs: ['resumen', 'participantes'],
        tienePreguntas: false,
        camposParticipante: [
          'nombreParticipante',
          'apellidoParticipante',
          'sexo',
          'tiempoParticipacion',
          'tipoVr',
        ],
      },
      'Hit-Fit': {
        tabs: ['resumen', 'participantes'],
        tienePreguntas: false,
        camposParticipante: [
          'nombreParticipante',
          'apellidoParticipante',
          'sexo',
          'tiempoParticipacion',
          'puntosObtenidos',
        ],
      },
      BiciPaseo: {
        tabs: ['resumen', 'participantes'],
        tienePreguntas: false,
        camposParticipante: [
          'nombreParticipante',
          'apellidoParticipante',
          'sexo',
          'tipoVehiculo',
          'documento',
        ],
      },
    };
    return configs[juegoJugado] || configs['Brain Bike'];
  }

  getEstadisticasResumen(historial: HistorialSesion): any {
    if (historial.juego_jugado === 'VR') {
      return {
        totalParticipantes: historial.participantes_data?.length || 0,
        tiempoPromedioParticipacion: this.calcularTiempoPromedioVR(historial),
        tiempoTotalParticipacion: this.calcularTiempoTotalVR(historial),
      };
    }

    if (historial.juego_jugado === 'Hit-Fit') {
      return {
        totalParticipantes: historial.participantes_data?.length || 0,
        puntosTotal: this.calcularPuntosTotalHitFit(historial),
        tiempoPromedioParticipacion:
          this.calcularTiempoPromedioHitFit(historial),
        tiempoTotalParticipacion: this.calcularTiempoTotalHitFit(historial),
      };
    }

    if (historial.juego_jugado === 'BiciPaseo') {
      return HistorialBiciPaseoAdapter.getEstadisticas(historial);
    }

    if (historial.juego_jugado === 'Bicilicuadora') {
      return {
        totalParticipantes: historial.participantes_data?.length || 0,
        puntosTotal: this.calcularPuntosTotalBicilicuadora(historial),
        velocidadPromedio:
          this.calcularVelocidadPromedioBicilicuadora(historial),
        velocidadMaxima: this.calcularVelocidadMaximaBicilicuadora(historial),
        caloriasTotales: this.calcularCaloriasTotalesBicilicuadora(historial),
        vatiosTotales: this.calcularVatiosTotalesBicilicuadora(historial),
        bebidasRealizadas: this.calcularBebidasTotales(historial),
        distanciaTotal: this.calcularDistanciaTotalBicilicuadora(historial),
      };
    }

    if (historial.juego_jugado.includes('Biketona')) {
      const stats: any = {
        totalParticipantes: historial.participantes_data?.length || 0,
        velocidadPromedio: this.calcularVelocidadPromedioBiketona(historial),
        velocidadMaxima: this.calcularVelocidadMaximaBiketona(historial),
        caloriasTotales: this.calcularCaloriasTotalesBiketona(historial),
        vatiosTotales: this.calcularVatiosTotalesBiketona(historial),
      };

      if (historial.juego_jugado === 'Biketona Campeonato') {
        stats.totalRondas = historial.estadisticas_generales?.totalRondas || 0;
        stats.duracionTotalTorneo =
          historial.estadisticas_generales?.duracionTotal || 0;
        stats.distanciaPromedioGeneral =
          historial.estadisticas_generales?.distanciaPromedioGeneral || 0;
      }

      if (historial.juego_jugado === 'Biketona Equipos') {
        stats.totalEquipos =
          historial.estadisticas_generales?.equipos?.length || 0;
        stats.totalLlaves = historial.estadisticas_generales?.totalLlaves || 0;
        stats.duracionTotalTorneo =
          historial.estadisticas_generales?.duracionTotal || 0;
        stats.distanciaPromedioGeneral =
          historial.estadisticas_generales?.distanciaPromedioGeneral || 0;
        stats.equipos = historial.estadisticas_generales?.equipos || [];
      }

      return stats;
    }

    return {
      totalParticipantes: historial.participantes_data?.length || 0,
      puntosTotal: this.calcularPuntosTotal(historial),
      puntosAcumulados: this.calcularPuntosAcumulados(historial),
      velocidadPromedio: this.calcularVelocidadPromedio(historial),
      velocidadMaxima: this.calcularVelocidadMaxima(historial),
      caloriasTotales: this.calcularCaloriasTotales(historial),
      vatiosTotales: this.calcularVatiosTotales(historial),
      respuestasCorrectas: this.calcularRespuestasCorrectas(historial),
      respuestasIncorrectas: this.calcularRespuestasIncorrectas(historial),
    };
  }

  private calcularTiempoPromedioVR(historial: HistorialSesion): number {
    if (!historial.participantes_data?.length) return 0;
    const total = historial.participantes_data.reduce(
      (acc, p) => acc + (Number(p.tiempoParticipacion) || 0),
      0,
    );
    return Math.round(total / historial.participantes_data.length);
  }

  private calcularTiempoTotalVR(historial: HistorialSesion): number {
    if (!historial.participantes_data?.length) return 0;
    return historial.participantes_data.reduce(
      (acc, p) => acc + (Number(p.tiempoParticipacion) || 0),
      0,
    );
  }

  private calcularPuntosTotalHitFit(historial: HistorialSesion): number {
    if (!historial.participantes_data?.length) return 0;
    return historial.participantes_data.reduce(
      (acc, p) => acc + (Number(p.puntosObtenidos) || 0),
      0,
    );
  }

  private calcularTiempoPromedioHitFit(historial: HistorialSesion): number {
    if (!historial.participantes_data?.length) return 0;
    const total = historial.participantes_data.reduce(
      (acc, p) => acc + (Number(p.tiempoParticipacion) || 0),
      0,
    );
    return Math.round(total / historial.participantes_data.length);
  }

  private calcularTiempoTotalHitFit(historial: HistorialSesion): number {
    if (!historial.participantes_data?.length) return 0;
    return historial.participantes_data.reduce(
      (acc, p) => acc + (Number(p.tiempoParticipacion) || 0),
      0,
    );
  }

  private calcularPuntosTotalBicilicuadora(historial: HistorialSesion): number {
    if (!historial.participantes_data?.length) return 0;
    return historial.participantes_data.reduce(
      (acc, p) => acc + (Number(p.puntosTotales) || 0),
      0,
    );
  }

  private calcularVelocidadPromedioBicilicuadora(
    historial: HistorialSesion,
  ): number {
    if (!historial.participantes_data?.length) return 0;
    const total = historial.participantes_data.reduce(
      (acc, p) => acc + (Number(p.velocidadPromedio) || 0),
      0,
    );
    return Math.round((total / historial.participantes_data.length) * 10) / 10;
  }

  private calcularVelocidadMaximaBicilicuadora(
    historial: HistorialSesion,
  ): number {
    if (!historial.participantes_data?.length) return 0;
    return Math.max(
      ...historial.participantes_data.map(
        (p) => Number(p.velocidadMaxima) || 0,
      ),
    );
  }

  private calcularCaloriasTotalesBicilicuadora(
    historial: HistorialSesion,
  ): number {
    if (!historial.participantes_data?.length) return 0;
    return Math.round(
      historial.participantes_data.reduce(
        (acc, p) => acc + (Number(p.caloriasQuemadas) || 0),
        0,
      ),
    );
  }

  private calcularVatiosTotalesBicilicuadora(
    historial: HistorialSesion,
  ): number {
    if (!historial.participantes_data?.length) return 0;
    return Math.round(
      historial.participantes_data.reduce(
        (acc, p) => acc + (Number(p.vatiosGenerados) || 0),
        0,
      ),
    );
  }

  private calcularBebidasTotales(historial: HistorialSesion): number {
    if (!historial.participantes_data?.length) return 0;
    return historial.participantes_data.reduce(
      (acc, p) => acc + (Number(p.cantidadBebidasSeleccionadas) || 0),
      0,
    );
  }

  private calcularDistanciaTotalBicilicuadora(
    historial: HistorialSesion,
  ): number {
    if (!historial.participantes_data?.length) return 0;
    return parseFloat(
      historial.participantes_data
        .reduce((acc, p) => acc + (Number(p.distanciaRecorrida) || 0), 0)
        .toFixed(2),
    );
  }

  adaptarParticipantesBiketona(historial: HistorialSesion): any[] {
    if (historial.juego_jugado === 'VR') {
      return historial.participantes_data.map((p, index) => ({
        ...p,
        nombreCompleto: `${p.nombreParticipante} ${p.apellidoParticipante}`,
        posicionGeneral: index + 1,
        totalParticipantesGeneral: historial.participantes_data.length,
      }));
    }

    if (historial.juego_jugado === 'Hit-Fit') {
      return historial.participantes_data
        .sort((a, b) => (b.puntosObtenidos || 0) - (a.puntosObtenidos || 0))
        .map((p, index) => ({
          ...p,
          nombreCompleto: `${p.nombreParticipante} ${p.apellidoParticipante}`,
          posicionGeneral: index + 1,
          totalParticipantesGeneral: historial.participantes_data.length,
        }));
    }

    if (historial.juego_jugado === 'BiciPaseo') {
      return HistorialBiciPaseoAdapter.adaptarParticipantes(historial);
    }

    if (historial.juego_jugado === 'Bicilicuadora') {
      return historial.participantes_data
        .map((p) => ({
          ...p,
          nombre: p.nombreParticipante || 'Sin nombre',
          puntosCarrera: p.puntosTotales || 0,
          velocidadPromedio: Number(p.velocidadPromedio || 0),
          velocidadMaxima: Number(p.velocidadMaxima || 0),
          caloriasQuemadas: Number(p.caloriasQuemadas || 0),
          vatiosGenerados: Number(p.vatiosGenerados || 0),
          cantidadBebidasSeleccionadas: p.cantidadBebidasSeleccionadas || 1,
        }))
        .sort((a, b) => b.puntosCarrera - a.puntosCarrera)
        .map((p, index) => ({
          ...p,
          posicionGeneral: index + 1,
          totalParticipantesGeneral: historial.participantes_data.length,
        }));
    }

    if (!historial.juego_jugado.includes('Biketona')) {
      return historial.participantes_data;
    }

    const participantesOrdenados = [...historial.participantes_data]
      .filter((p) => p.mejorTiempo != null)
      .sort((a, b) => a.mejorTiempo - b.mejorTiempo);

    return participantesOrdenados.map((p, index) => ({
      ...p,
      nombre: p.nombre || 'Sin nombre',
      equipo: p.equipoNombre || '',
      equipoId: p.equipoId || null,
      puntosCarrera: p.mejorTiempo || 0,
      velocidadPromedio: Number(p.velocidadPromedio || 0),
      velocidadMaxima: Number(p.velocidadMaxima || 0),
      caloriasQuemadas: Number(p.calorias || 0),
      vatiosGenerados: Number(p.vatios || 0),
      posicionGeneral: index + 1,
      totalParticipantesGeneral: participantesOrdenados.length,
    }));
  }

  getRankingLabel(juegoJugado: string): string {
    if (juegoJugado === 'Bicilicuadora' || juegoJugado === 'Hit-Fit')
      return 'Puntos';
    if (juegoJugado === 'VR') return 'Tiempo';
    return juegoJugado.includes('Biketona') ? 'Mejor Tiempo' : 'Puntos';
  }

  formatearPuntos(puntos: number, juegoJugado: string): string {
    if (puntos === null || puntos === undefined) {
      if (juegoJugado.includes('Biketona') || juegoJugado === 'VR')
        return '0:00';
      return '0';
    }

    if (juegoJugado.includes('Biketona') || juegoJugado === 'VR') {
      const mins = Math.floor(puntos / 60);
      const secs = Math.round(puntos % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return puntos.toString();
  }

  getEquiposRanking(historial: HistorialSesion): any[] {
    if (historial.juego_jugado !== 'Biketona Equipos') return [];

    const equipos = historial.estadisticas_generales?.equipos || [];
    if (typeof equipos === 'string') {
      return JSON.parse(equipos);
    }
    return equipos;
  }

  getColorEquipo(equipoId: number, historial: HistorialSesion): string {
    const equipos = this.getEquiposRanking(historial);
    const equipo = equipos.find((e: any) => e.id === equipoId);
    return equipo?.color || '#22c55e';
  }

  tienePreguntas(juegoJugado: string): boolean {
    const config = this.getConfiguracionJuego(juegoJugado);
    return config.tienePreguntas;
  }

  grupoTienePreguntas(grupo: SesionAgrupada): boolean {
    if (!grupo.carreras || grupo.carreras.length === 0) return false;
    return grupo.carreras.some((c) => this.tienePreguntas(c.juego_jugado));
  }

  getDistribucionSexoParticipante(participante: any): 'M' | 'F' | 'otro' {
    if (participante.sexo === 'M') return 'M';
    if (participante.sexo === 'F') return 'F';
    if (participante.genero === 'masculino') return 'M';
    if (participante.genero === 'femenino') return 'F';
    return 'otro';
  }

  getCaloriasParticipante(participante: any): number {
    return Number(participante.caloriasQuemadas || participante.calorias || 0);
  }

  getVatiosParticipante(participante: any): number {
    return Number(participante.vatiosGenerados || participante.vatios || 0);
  }

  private calcularVelocidadPromedioBiketona(
    historial: HistorialSesion,
  ): number {
    if (!historial.participantes_data?.length) return 0;
    const total = historial.participantes_data.reduce(
      (acc, p) => acc + (Number(p.velocidadPromedio) || 0),
      0,
    );
    return Math.round((total / historial.participantes_data.length) * 10) / 10;
  }

  private calcularVelocidadMaximaBiketona(historial: HistorialSesion): number {
    if (!historial.participantes_data?.length) return 0;
    return Math.max(
      ...historial.participantes_data.map(
        (p) => Number(p.velocidadMaxima) || 0,
      ),
    );
  }

  private calcularCaloriasTotalesBiketona(historial: HistorialSesion): number {
    if (!historial.participantes_data?.length) return 0;
    return Math.round(
      historial.participantes_data.reduce(
        (acc, p) => acc + (Number(p.calorias) || 0),
        0,
      ),
    );
  }

  private calcularVatiosTotalesBiketona(historial: HistorialSesion): number {
    if (!historial.participantes_data?.length) return 0;
    return Math.round(
      historial.participantes_data.reduce(
        (acc, p) => acc + (Number(p.vatios) || 0),
        0,
      ),
    );
  }

  private calcularPuntosTotal(historial: HistorialSesion): number {
    if (!historial.participantes_data?.length) return 0;
    return historial.participantes_data.reduce(
      (acc, p) => acc + (Number(p.puntosCarrera) || 0),
      0,
    );
  }

  private calcularPuntosAcumulados(historial: HistorialSesion): number {
    if (!historial.participantes_data?.length) return 0;
    return historial.participantes_data.reduce(
      (acc, p) => acc + (Number(p.puntosAcumulados) || 0),
      0,
    );
  }

  private calcularVelocidadPromedio(historial: HistorialSesion): number {
    if (!historial.participantes_data?.length) return 0;
    const total = historial.participantes_data.reduce(
      (acc, p) => acc + (Number(p.velocidadPromedio) || 0),
      0,
    );
    return Math.round((total / historial.participantes_data.length) * 10) / 10;
  }

  private calcularVelocidadMaxima(historial: HistorialSesion): number {
    if (!historial.participantes_data?.length) return 0;
    return Math.max(
      ...historial.participantes_data.map(
        (p) => Number(p.velocidadMaxima) || 0,
      ),
    );
  }

  private calcularCaloriasTotales(historial: HistorialSesion): number {
    if (!historial.participantes_data?.length) return 0;
    return Math.round(
      historial.participantes_data.reduce(
        (acc, p) => acc + (Number(p.caloriasQuemadas) || 0),
        0,
      ),
    );
  }

  private calcularVatiosTotales(historial: HistorialSesion): number {
    if (!historial.participantes_data?.length) return 0;
    return Math.round(
      historial.participantes_data.reduce(
        (acc, p) => acc + (Number(p.vatiosGenerados) || 0),
        0,
      ),
    );
  }

  private calcularRespuestasCorrectas(historial: HistorialSesion): number {
    if (!historial.participantes_data?.length) return 0;
    return historial.participantes_data.reduce(
      (acc, p) => acc + (Number(p.respuestasCorrectas) || 0),
      0,
    );
  }

  private calcularRespuestasIncorrectas(historial: HistorialSesion): number {
    if (!historial.participantes_data?.length) return 0;
    return historial.participantes_data.reduce(
      (acc, p) => acc + (Number(p.respuestasIncorrectas) || 0),
      0,
    );
  }
}
