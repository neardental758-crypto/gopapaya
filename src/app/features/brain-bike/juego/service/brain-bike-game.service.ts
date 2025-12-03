import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription, Subject } from 'rxjs';
export type BikeKey = 'bici1' | 'bici2';
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
  bikeKey?: BikeKey;
}

export interface RespuestaParticipante {
  participante: ParticipanteJuego;
  respuesta: any;
  tiempoRespuesta: number;
  esCorrecta: boolean;
}

export interface BonoVelocidad {
  tipo: 'color_video' | 'velocidad_30' | 'velocidad_final';
  colorRequerido?: string;
  velocidadObjetivo?: number;
  puntos: number;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class BrainBikeGameService {
  private participantes$ = new BehaviorSubject<ParticipanteJuego[]>([]);
  private fechaInicio: Date = new Date();
  private simulacionSubscription?: Subscription;
  private velocidadMinimaVideo = 10;
  private velocidadMinimaTrivia = 15;
  private simulacionActiva = false;

  bonoActivo$ = new Subject<BonoVelocidad>();
  ganadorBono$ = new Subject<{
    participante: ParticipanteJuego;
    bono: BonoVelocidad;
  }>();
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
        velocidadActual: this.generarVelocidadInicial(),
        velocidadPromedio: 0,
        velocidadMaxima: 0,
        distanciaRecorrida: 0,
        respuestasCorrectas: 0,
        respuestasIncorrectas: 0,
        tiempoTotalRespuesta: 0,
        posicionRanking: index + 1,
        lecturaVelocidades: [],
        botonesActivos: true,
        alertaVelocidad: false,
      })
    );
    this.participantes$.next(participantes);
  }

  setVelocidadesMinimas(video: number, trivia: number): void {
    this.velocidadMinimaVideo = video;
    this.velocidadMinimaTrivia = trivia;
  }

  iniciarSimulacion(seccion: 'video' | 'trivia'): void {
    this.detenerSimulacion();
    this.simulacionActiva = true;
    const velocidadMinima =
      seccion === 'video'
        ? this.velocidadMinimaVideo
        : this.velocidadMinimaTrivia;

    this.simulacionSubscription = interval(1000).subscribe(() => {
      if (!this.simulacionActiva) return;
      this.actualizarVelocidades(velocidadMinima);
    });
  }

  detenerSimulacion(): void {
    this.simulacionActiva = false;
    this.simulacionSubscription?.unsubscribe();
    this.simulacionSubscription = undefined;
  }

  private generarVelocidadInicial(): number {
    return Math.floor(Math.random() * 15) + 12;
  }

  private actualizarVelocidades(velocidadMinima: number): void {
    const participantes = this.participantes$.value.map((p) => {
      const cambio = (Math.random() - 0.5) * 2.5;
      let nuevaVelocidad = p.velocidadActual + cambio;
      nuevaVelocidad = Math.max(8, Math.min(38, nuevaVelocidad));

      const lecturas = [...p.lecturaVelocidades, nuevaVelocidad].slice(-10);
      const velocidadPromedio =
        lecturas.reduce((a, b) => a + b, 0) / lecturas.length;

      const botonesActivos = nuevaVelocidad >= velocidadMinima;
      const alertaVelocidad = !botonesActivos;

      return {
        ...p,
        velocidadActual: Math.round(nuevaVelocidad * 10) / 10,
        velocidadMaxima: Math.max(p.velocidadMaxima, nuevaVelocidad),
        velocidadPromedio: Math.round(velocidadPromedio * 10) / 10,
        lecturaVelocidades: lecturas,
        botonesActivos,
        alertaVelocidad,
      };
    });

    this.participantes$.next(participantes);
  }

  simularRespuestaAleatoria(
    pregunta: any,
    tiempoMaximo: number
  ): RespuestaParticipante | null {
    const participantes = this.participantes$.value;
    if (participantes.length === 0) return null;

    const participantesActivos = participantes.filter((p) => p.botonesActivos);
    if (participantesActivos.length === 0) return null;

    const tiempoRespuesta = Math.floor(Math.random() * (tiempoMaximo - 3)) + 2;

    const participantesOrdenados = [...participantesActivos].sort(
      (a, b) => b.velocidadActual - a.velocidadActual
    );
    const indexPonderado = Math.floor(
      Math.random() * Math.random() * participantesOrdenados.length
    );
    const participanteAleatorio = participantesOrdenados[indexPonderado];

    const probabilidadAcierto =
      0.55 + participanteAleatorio.velocidadActual / 200;
    const esCorrecta = Math.random() < probabilidadAcierto;

    let respuestaSeleccionada;
    if (esCorrecta) {
      respuestaSeleccionada = pregunta.respuestas.find(
        (r: any) => r.es_correcta
      );
    } else {
      const respuestasIncorrectas = pregunta.respuestas.filter(
        (r: any) => !r.es_correcta
      );
      respuestaSeleccionada =
        respuestasIncorrectas[
          Math.floor(Math.random() * respuestasIncorrectas.length)
        ];
    }

    return {
      participante: participanteAleatorio,
      respuesta: respuestaSeleccionada,
      tiempoRespuesta,
      esCorrecta,
    };
  }

  procesarRespuesta(
    participanteId: number,
    esCorrecta: boolean,
    tiempoUsado: number
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

  // En brain-bike-game.service.ts
  otorgarBonoVelocidadSeccion(seccion: 'video' | 'trivia'): {
    bonosPromedio: ParticipanteJuego[];
    masRapido: ParticipanteJuego | null;
  } {
    const participantes = this.participantes$.value;
    const velocidadMinima =
      seccion === 'video'
        ? this.velocidadMinimaVideo
        : this.velocidadMinimaTrivia;

    const bonosPromedio: ParticipanteJuego[] = [];

    const actualizados = participantes.map((p) => {
      let puntosExtra = 0;

      if (p.velocidadPromedio >= velocidadMinima) {
        puntosExtra += 1;
        bonosPromedio.push(p);
        this.registrarEvento(
          'bono_velocidad_promedio',
          `${p.nombreParticipante} ganó 1 punto por mantener velocidad promedio`,
          { participante: p.nombreParticipante }
        );
      }

      return { ...p, puntosCarrera: p.puntosCarrera + puntosExtra };
    });

    const masRapido = [...actualizados].sort(
      (a, b) => b.velocidadPromedio - a.velocidadPromedio
    )[0];
    if (masRapido) {
      const index = actualizados.findIndex((p) => p.id === masRapido.id);
      if (index !== -1) {
        actualizados[index].puntosCarrera += 2;
      }
      this.registrarEvento(
        'bono_velocidad_maxima',
        `${masRapido.nombreParticipante} ganó 2 puntos por velocidad promedio más alta (${masRapido.velocidadPromedio} km/h)`,
        {
          participante: masRapido.nombreParticipante,
          velocidad: masRapido.velocidadPromedio,
        }
      );
    }

    this.actualizarRankings(actualizados);

    return { bonosPromedio, masRapido };
  }

  simularBonoColorVideo(): { color: string; indiceColor: number } {
    const colores = ['#00F0FF', '#FFF700', '#FF003C', '#39FF14'];
    const indice = Math.floor(Math.random() * colores.length);
    return { color: colores[indice], indiceColor: indice };
  }

  simularGanadorBonoColor(colorCorrecto: string): ParticipanteJuego | null {
    const participantes = this.participantes$.value.filter(
      (p) => p.botonesActivos
    );
    if (participantes.length === 0) return null;

    const ganador =
      participantes[Math.floor(Math.random() * participantes.length)];

    const actualizados = this.participantes$.value.map((p) => {
      if (p.id === ganador.id) {
        return { ...p, puntosCarrera: p.puntosCarrera + 1 };
      }
      return p;
    });

    this.actualizarRankings(actualizados);
    this.registrarEvento(
      'bono_color',
      `${ganador.nombreParticipante} ganó 1 punto por presionar el color correcto`,
      { participante: ganador.nombreParticipante, color: colorCorrecto }
    );

    return ganador;
  }

  simularRetoVelocidad30(): ParticipanteJuego | null {
    const participantes = this.participantes$.value;

    const participantesOrdenados = [...participantes].sort(
      (a, b) => b.velocidadActual - a.velocidadActual
    );
    const ganador =
      participantesOrdenados.find((p) => p.velocidadActual >= 28) ||
      participantesOrdenados[0];

    if (ganador) {
      const actualizados = participantes.map((p) => {
        if (p.id === ganador.id) {
          return { ...p, puntosCarrera: p.puntosCarrera + 1 };
        }
        return p;
      });

      this.actualizarRankings(actualizados);
      this.registrarEvento(
        'reto_velocidad_30',
        `${ganador.nombreParticipante} ganó 1 punto por alcanzar 30 km/h primero`,
        {
          participante: ganador.nombreParticipante,
          velocidad: ganador.velocidadActual,
        }
      );
    }

    return ganador;
  }

  simularRetoVelocidadFinal(): ParticipanteJuego | null {
    const participantes = this.participantes$.value;

    const participantesOrdenados = [...participantes].sort(
      (a, b) => b.velocidadActual - a.velocidadActual
    );
    const ganador = participantesOrdenados[0];

    if (ganador) {
      const actualizados = participantes.map((p) => {
        if (p.id === ganador.id) {
          return { ...p, puntosCarrera: p.puntosCarrera + 2 };
        }
        return p;
      });

      this.actualizarRankings(actualizados);
      this.registrarEvento(
        'reto_velocidad_final',
        `${ganador.nombreParticipante} ganó 2 puntos por alcanzar 30 km/h primero (reto final)`,
        {
          participante: ganador.nombreParticipante,
          velocidad: ganador.velocidadActual,
        }
      );
    }

    return ganador;
  }

  private actualizarRankings(participantes: ParticipanteJuego[]): void {
    const ordenados = [...participantes]
      .sort((a, b) => b.puntosCarrera - a.puntosCarrera)
      .map((p, index) => ({ ...p, posicionRanking: index + 1 }));

    this.participantes$.next(ordenados);
  }

  getRankingCarrera(): ParticipanteJuego[] {
    return [...this.participantes$.value].sort(
      (a, b) => b.puntosCarrera - a.puntosCarrera
    );
  }

  getRankingGeneral(): ParticipanteJuego[] {
    return [...this.participantes$.value].sort(
      (a, b) => b.puntosAcumulados - a.puntosAcumulados
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
    participantesActualizados: ParticipanteJuego[]
  ): void {
    this.participantes$.next(participantesActualizados);
  }

  construirHistorial(sesionId: number, brainBikeId: number, config: any): any {
    const fechaFin = new Date();
    const duracionMinutos = Math.floor(
      (fechaFin.getTime() - this.fechaInicio.getTime()) / 60000
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
      0
    );
    const preguntasIncorrectas = participantes.reduce(
      (acc, p) => acc + p.respuestasIncorrectas,
      0
    );
    const preguntasTotales = preguntasCorrectas + preguntasIncorrectas;

    return {
      sesion_id: sesionId,
      brain_bike_id: brainBikeId,
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
    this.detenerSimulacion();
    this.bonoVelocidadOtorgado = false;
    const participantes = this.participantes$.value.map((p) => ({
      ...p,
      puntosCarrera: 0,
      velocidadActual: this.generarVelocidadInicial(),
      respuestasCorrectas: 0,
      respuestasIncorrectas: 0,
      tiempoTotalRespuesta: 0,
      distanciaRecorrida: 0,
      lecturaVelocidades: [],
      botonesActivos: true,
      alertaVelocidad: false,
    }));
    this.participantes$.next(participantes);
    this.fechaInicio = new Date();
  }

  limpiar(): void {
    this.detenerSimulacion();
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
    const velocidadMinima = this.velocidadMinimaTrivia;

    const bonosPromedio: ParticipanteJuego[] = [];

    const actualizados = participantes.map((p) => {
      let puntosExtra = 0;

      if (p.velocidadPromedio >= velocidadMinima) {
        puntosExtra += 1;
        bonosPromedio.push(p);
        this.registrarEvento(
          'bono_velocidad_promedio',
          `${p.nombreParticipante} ganó 1 punto por mantener velocidad promedio durante la sesión`,
          {
            participante: p.nombreParticipante,
            velocidadPromedio: p.velocidadPromedio,
          }
        );
      }

      return { ...p, puntosCarrera: p.puntosCarrera + puntosExtra };
    });

    const masRapido = [...actualizados].sort(
      (a, b) => b.velocidadPromedio - a.velocidadPromedio
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
        }
      );
    }

    this.actualizarRankings(actualizados);

    return { bonosPromedio, masRapido };
  }
}
