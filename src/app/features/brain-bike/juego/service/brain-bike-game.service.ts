import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription, Subject } from 'rxjs';
export interface ParticipanteJuego {
  id: number;
  idBrainBike: number;
  nombreParticipante: string;
  numeroBicicleta: number;
  colorBicicleta: string;
  equipoIdentificador?: string | null;
  puntosAcumulados: number;
  puntosCarrera: number;
  velocidadActual: number;
  velocidadPromedio: number;
  velocidadMaxima: number;
  caloriasQuemadas?: number;
  vatiosGenerados?: number;
  duracionTotal?: number;
  distanciaRecorrida: number;
  respuestasCorrectas: number;
  respuestasIncorrectas: number;
  tiempoTotalRespuesta: number;
  posicionRanking: number;
  lecturaVelocidades: number[];
  botonesActivos: boolean;
  alertaVelocidad: boolean;
  sexo?: 'M' | 'F';
}

export interface RespuestaParticipante {
  participante: ParticipanteJuego;
  respuesta: any;
  tiempoRespuesta: number;
  esCorrecta: boolean;
}

@Injectable({ providedIn: 'root' })
export class BrainBikeGameService {
  private participantes$ = new BehaviorSubject<ParticipanteJuego[]>([]);
  private fechaInicio: Date = new Date();
  private velocidadMinimaVideo = 10;
  private velocidadMinimaTrivia = 15;

  participanteRespondio$ = new Subject<{
    participante: ParticipanteJuego;
    esCorrecta: boolean;
  }>();

  participantes = this.participantes$.asObservable();
  private bonoVelocidadOtorgado = false;

  inicializarParticipantes(participantesBase: any[]): void {
    const participantes: ParticipanteJuego[] = participantesBase.map(
      (p, index) => ({
        ...p,
        puntosCarrera: 0,
        puntosAcumulados: p.puntosAcumulados || 0,
        velocidadActual: 0,
        velocidadPromedio: 0,
        velocidadMaxima: 0,
        distanciaRecorrida: 0,
        respuestasCorrectas: 0,
        respuestasIncorrectas: 0,
        tiempoTotalRespuesta: 0,
        posicionRanking: index + 1,
        lecturaVelocidades: [],
        botonesActivos: false,
        alertaVelocidad: true,
      }),
    );
    this.participantes$.next(participantes);
  }

  setVelocidadesMinimas(video: number, trivia: number): void {
    this.velocidadMinimaVideo = video;
    this.velocidadMinimaTrivia = trivia;
  }

  procesarRespuesta(
    participanteId: number,
    esCorrecta: boolean,
    tiempoUsado: number,
  ): void {
    const participantes = this.participantes$.value.map((p) => {
      if (p.id === participanteId) {
        const puntosRespuesta = esCorrecta ? 2 : 0;
        return {
          ...p,
          puntosCarrera: p.puntosCarrera + puntosRespuesta,
          respuestasCorrectas: p.respuestasCorrectas + (esCorrecta ? 1 : 0),
          respuestasIncorrectas: p.respuestasIncorrectas + (esCorrecta ? 0 : 1),
          tiempoTotalRespuesta: p.tiempoTotalRespuesta + tiempoUsado,
        };
      }
      return p;
    });

    this.actualizarRankings(participantes);

    const participante = participantes.find((p) => p.id === participanteId);
    if (participante) {
      this.participanteRespondio$.next({ participante, esCorrecta });
    }
  }

  private actualizarRankings(participantes: ParticipanteJuego[]): void {
    const ordenados = [...participantes]
      .sort((a, b) => b.puntosCarrera - a.puntosCarrera)
      .map((p, index) => ({ ...p, posicionRanking: index + 1 }));

    this.participantes$.next(ordenados);
  }

  getRankingCarrera(): ParticipanteJuego[] {
    return [...this.participantes$.value].sort(
      (a, b) => b.puntosCarrera - a.puntosCarrera,
    );
  }

  getRankingGeneral(): ParticipanteJuego[] {
    return [...this.participantes$.value].sort(
      (a, b) => b.puntosAcumulados - a.puntosAcumulados,
    );
  }

  iniciarCarrera(): void {
    this.fechaInicio = new Date();
    this.registrarEvento('carrera_iniciada', 'Carrera iniciada');
  }

  registrarEvento(tipo: string, descripcion: string, datos?: any): void {}

  async finalizarCarrera(): Promise<ParticipanteJuego[]> {
    const participantes = this.participantes$.value.map((p) => ({
      ...p,
      puntosAcumulados: p.puntosAcumulados + p.puntosCarrera,
    }));

    this.actualizarRankings(participantes);
    this.registrarEvento('carrera_finalizada', 'Carrera finalizada', {
      ganador: this.getRankingCarrera()[0]?.nombreParticipante,
    });

    return participantes;
  }

  actualizarParticipantesEnMemoria(
    participantesActualizados: ParticipanteJuego[],
  ): void {
    this.participantes$.next(participantesActualizados);
  }

  construirHistorial(sesionId: number, brainBikeId: number, config: any): any {
    const fechaFin = new Date();
    const duracionMinutos = Math.floor(
      (fechaFin.getTime() - this.fechaInicio.getTime()) / 60000,
    );
    const participantes = this.participantes$.value;

    const participantesLimpios = participantes.map((p) => ({
      id: p.id,
      idBrainBike: p.idBrainBike,
      nombreParticipante: p.nombreParticipante,
      numeroBicicleta: p.numeroBicicleta,
      colorBicicleta: p.colorBicicleta,
      equipoIdentificador: p.equipoIdentificador,
      puntosAcumulados: p.puntosAcumulados,
      puntosCarrera: p.puntosCarrera,
      velocidadPromedio: p.velocidadPromedio,
      velocidadMaxima: p.velocidadMaxima,
      caloriasQuemadas: p.caloriasQuemadas,
      vatiosGenerados: p.vatiosGenerados,
      distanciaRecorrida: p.distanciaRecorrida,
      duracionTotal: p.duracionTotal,
      posicionRanking: p.posicionRanking,
      respuestasCorrectas: p.respuestasCorrectas,
      respuestasIncorrectas: p.respuestasIncorrectas,
      tiempoTotalRespuesta: p.tiempoTotalRespuesta,
      sexo: p.sexo,
    }));

    const rankingLimpio = this.getRankingCarrera().map((p) => ({
      id: p.id,
      idBrainBike: p.idBrainBike,
      nombreParticipante: p.nombreParticipante,
      numeroBicicleta: p.numeroBicicleta,
      colorBicicleta: p.colorBicicleta,
      puntosAcumulados: p.puntosAcumulados,
      puntosCarrera: p.puntosCarrera,
      velocidadPromedio: p.velocidadPromedio,
      velocidadMaxima: p.velocidadMaxima,
      caloriasQuemadas: p.caloriasQuemadas,
      vatiosGenerados: p.vatiosGenerados,
      distanciaRecorrida: p.distanciaRecorrida,
      duracionTotal: p.duracionTotal,
      posicionRanking: p.posicionRanking,
      respuestasCorrectas: p.respuestasCorrectas,
      respuestasIncorrectas: p.respuestasIncorrectas,
      sexo: p.sexo,
    }));

    const preguntasCorrectas = participantes.reduce(
      (acc, p) => acc + p.respuestasCorrectas,
      0,
    );
    const preguntasIncorrectas = participantes.reduce(
      (acc, p) => acc + p.respuestasIncorrectas,
      0,
    );
    const preguntasTotales = preguntasCorrectas + preguntasIncorrectas;

    return {
      sesion_id: sesionId,
      juego_id: brainBikeId,
      fecha_inicio: this.fechaInicio.toISOString(),
      fecha_fin: fechaFin.toISOString(),
      duracion_minutos: duracionMinutos,
      juego_jugado: 'Brain Bike',
      parametros_utilizados: {
        velocidadMinimaVideo: config?.velocidadMinimaVideo,
        velocidadMinimaTrivia: config?.velocidadMinimaTrivia,
        numeroPreguntas: config?.numeroPreguntas,
        numeroBicicletas: config?.numeroBicicletas,
        contenido_id: config?.contenido_id,
      },
      participantes_data: participantesLimpios,
      ranking_final: rankingLimpio,
      estadisticas_generales: {
        preguntasRespondidas: preguntasTotales,
        preguntasCorrectas,
        preguntasIncorrectas,
        porcentajeAcierto:
          preguntasTotales > 0
            ? ((preguntasCorrectas / preguntasTotales) * 100).toFixed(1)
            : 0,
        participantesTotales: participantes.length,
      },
    };
  }

  resetear(): void {
    this.bonoVelocidadOtorgado = false;
    const participantes = this.participantes$.value.map((p) => ({
      ...p,
      puntosCarrera: 0,
      velocidadActual: 0,
      respuestasCorrectas: 0,
      respuestasIncorrectas: 0,
      tiempoTotalRespuesta: 0,
      distanciaRecorrida: 0,
      lecturaVelocidades: [],
      botonesActivos: false,
      alertaVelocidad: true,
    }));
    this.participantes$.next(participantes);
    this.fechaInicio = new Date();
  }

  limpiar(): void {
    this.bonoVelocidadOtorgado = false;
    this.participantes$.next([]);
  }

  otorgarBonoVelocidadFinal(): {
    bonosPromedio: ParticipanteJuego[];
    masRapido: ParticipanteJuego | null;
  } {
    if (this.bonoVelocidadOtorgado) {
      return { bonosPromedio: [], masRapido: null };
    }

    this.bonoVelocidadOtorgado = true;

    const participantes = this.participantes$.value;
    const velocidadPromedioGeneral =
      participantes.reduce((sum, p) => sum + p.velocidadPromedio, 0) /
      participantes.length;

    const bonosPromedio: ParticipanteJuego[] = [];

    const actualizados = participantes.map((p) => {
      let puntosExtra = 0;

      if (p.velocidadPromedio >= velocidadPromedioGeneral) {
        puntosExtra += 1;
        bonosPromedio.push(p);
        this.registrarEvento(
          'bono_velocidad_promedio',
          `${p.nombreParticipante} ganó 1 punto por mantener velocidad promedio durante la sesión`,
          {
            participante: p.nombreParticipante,
            velocidadPromedio: p.velocidadPromedio,
          },
        );
      }

      return { ...p, puntosCarrera: p.puntosCarrera + puntosExtra };
    });

    const masRapido = [...actualizados].sort(
      (a, b) => b.velocidadPromedio - a.velocidadPromedio,
    )[0];
    if (masRapido) {
      const index = actualizados.findIndex((p) => p.id === masRapido.id);
      if (index !== -1) {
        actualizados[index].puntosCarrera += 2;
      }
      this.registrarEvento(
        'bono_velocidad_maxima_sesion',
        `${masRapido.nombreParticipante} ganó 2 puntos por tener la velocidad promedio más alta de la sesión (${masRapido.velocidadPromedio} km/h)`,
        {
          participante: masRapido.nombreParticipante,
          velocidad: masRapido.velocidadPromedio,
        },
      );
    }

    this.actualizarRankings(actualizados);

    return { bonosPromedio, masRapido };
  }
}
