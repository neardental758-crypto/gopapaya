import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription, timer, take } from 'rxjs';
import { BrainBikeAudioService } from '../../services/audio/brain-bike-audio.service';
import { BrainBikeParticipanteService } from '../../services/brain-bike-participante.service';
import {
  BrainBikeConfig,
  BrainBikeService,
} from '../../services/brain-bike.service';
import { HistorialService } from '../../services/historial-sesion.service';
import { SesionService } from '../../services/sesion.service';
import { ContenidoService } from '../../tematicas/services/contenido.service';
import {
  ParticipanteJuego,
  BrainBikeGameService,
  RespuestaParticipante,
} from './service/brain-bike-game.service';
import {
  BikeKey,
  BleEsp32BrainBikeService,
} from '../../services/brain-bike/ble-esp32-brain-bike.service';

interface PreguntaBrain {
  _id: string;
  texto_pregunta: string;
  respuestas: any[];
}

@Component({
  selector: 'app-brain-bike-juego',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './juego.component.html',
})
export class BrainBikeJuegoComponent implements OnInit, OnDestroy {
  config: BrainBikeConfig | null = null;
  participantes: ParticipanteJuego[] = [];
  preguntas: PreguntaBrain[] = [];
  sesion: any = null;
  logoEmpresa: string | null = null;

  seccionActual: 'video' | 'trivia' | 'podio' = 'video';
  preguntaActual = 0;
  videoUrl: SafeResourceUrl | null = null;
  esVideoYouTube = false;

  mostrarMensaje = false;
  mensajeTexto = '';
  mensajeTitulo = '';

  notificacionesBonos: {
    texto: string;
    subtexto: string;
    color: string;
    icono: string;
    timestamp: number;
  }[] = [];

  private videoTerminado = false;
  tiempoRestante = 0;
  private timerSubscription?: Subscription;
  private participantesSubscription?: Subscription;
  private respuestaTimeout?: any;
  private bonoColorInterval?: Subscription;

  leyendoPregunta = false;
  mostrandoRespuestas = false;
  mostrandoTransicion = false;
  transicionTexto = '';
  respuestaCorrecta: any = null;
  mostrandoRespuestaCorrecta = false;

  mostrandoCelebracion = false;
  participanteCelebracion: ParticipanteJuego | null = null;
  puntosGanados = 0;

  mostrandoBonoColor = false;
  colorBonoActual = '';
  ganadorBonoColor: ParticipanteJuego | null = null;

  mostrandoRetoVelocidad = false;
  retoVelocidadTexto = '';
  ganadorRetoVelocidad: ParticipanteJuego | null = null;

  mostrandoRespuestaIncorrecta = false;
  participanteIncorrecto: ParticipanteJuego | null = null;

  participantesQueRespondieron: Set<number> = new Set();

  // Propiedades
  mostrandoBonosVelocidad = false;
  bonosVelocidadPromedio: ParticipanteJuego[] = [];
  ganadorVelocidadMaxima: ParticipanteJuego | null = null;

  tiempoDescansoReto = 0;

  tabPodio: 'podio' | 'ranking' | 'estadisticas' | 'participantes' = 'podio';
  participanteSeleccionado: ParticipanteJuego | null = null;
  duracionCarrera = 0;
  private fechaInicioCarrera = new Date();

  rankingGeneralSesion: any[] = [];

  private player: any;
  private playerReady = false;

  private sensorAnterior1 = 0;
  private sensorAnterior2 = 0;
  private estadoESP32: number = 0;

  constructor(
    private brainBikeService: BrainBikeService,
    private participanteService: BrainBikeParticipanteService,
    private contenidoService: ContenidoService,
    private sanitizer: DomSanitizer,
    private router: Router,
    private sesionService: SesionService,
    private historialService: HistorialService,
    private audioService: BrainBikeAudioService,
    private gameService: BrainBikeGameService,
    private ble: BleEsp32BrainBikeService,
  ) {}

  ngOnInit(): void {
    this.config = this.brainBikeService.getConfigActual();
    this.sesion = this.sesionService.getSesionSeleccionada();

    const estadoGuardado = sessionStorage.getItem('brainBikeEstado');
    if (estadoGuardado) {
      const estado = JSON.parse(estadoGuardado);
      if (estado.seccion === 'podio') {
        sessionStorage.removeItem('brainBikeEstado');
        this.router.navigate(['/home']);
        return;
      }
    }

    if (!this.config || !this.sesion) {
      this.router.navigate(['/brain-bike/parametros']);
      return;
    }

    if (this.sesion?.empresa?.logo) {
      this.logoEmpresa = this.sesion.empresa.logo;
    } else if (this.sesion?.logoCliente) {
      this.logoEmpresa = this.sesion.logoCliente;
    }

    this.gameService.setVelocidadesMinimas(
      this.config.velocidadMinimaVideo || 10,
      this.config.velocidadMinimaTrivia || 15,
    );

    this.participantesSubscription = this.gameService.participantes.subscribe(
      (p) => {
        this.participantes = p;
      },
    );

    this.iniciarSesionJuego();
    this.cargarDatos();

    history.pushState(null, '', location.href);
    window.addEventListener('popstate', this.prevenirRetroceso);
    this.cargarRankingGeneral();
  }

  cargarRankingGeneral(): void {
    this.participanteService.getRankingSesion(this.sesion.id).subscribe({
      next: (data) => {
        this.rankingGeneralSesion = data || [];
      },
      error: (error) => {
        console.error('Error top 10:', error);
        this.rankingGeneralSesion = [];
      },
    });
  }

  guardarEstado(): void {
    const estado = {
      seccion: this.seccionActual,
      preguntaActual: this.preguntaActual,
    };
    sessionStorage.setItem('brainBikeEstado', JSON.stringify(estado));
  }

  ngOnDestroy(): void {
    if (this.player) {
      this.player.destroy();
    }
    window.removeEventListener('popstate', this.prevenirRetroceso);
    this.timerSubscription?.unsubscribe();
    this.participantesSubscription?.unsubscribe();
    this.bonoColorInterval?.unsubscribe();
    if (this.respuestaTimeout) clearTimeout(this.respuestaTimeout);
    this.gameService.limpiar();
    this.audioService.detenerTodo();

    this.ble.unsubscribe('bici1', 'vel');
    this.ble.unsubscribe('bici1', 'btns');
  }

  private prevenirRetroceso = (): void => {
    history.pushState(null, '', location.href);
    this.audioService.reproducirSonidoError();
  };

  iniciarSesionJuego(): void {
    if (this.sesion?.id && this.sesion.estadoSesion !== 'en_curso') {
      this.fechaInicioCarrera = new Date();
      this.sesionService.iniciarSesion(this.sesion.id).subscribe({
        next: (sesionActualizada) => {
          this.sesion = sesionActualizada;
          this.sesionService.setSesionSeleccionada(sesionActualizada);
          if (sesionActualizada.empresa?.logo) {
            this.logoEmpresa = sesionActualizada.empresa.logo;
          }
        },
        error: (error) => console.error('Error al iniciar sesión:', error),
      });
    }
  }

  cargarDatos(): void {
    if (!this.config) return;
    this.cargarVideo();
    this.cargarParticipantes();
    this.cargarPreguntas();
  }

  cargarVideo(): void {
    if (this.config?.urlVideo) {
      const videoId = this.extractYouTubeId(this.config.urlVideo);
      if (videoId) {
        this.esVideoYouTube = true;
        this.videoUrl = null;
        this.gameService.registrarEvento(
          'video_iniciado',
          'Video educativo iniciado',
        );

        this.iniciarBonosColorVideo();

        setTimeout(() => {
          const elemento = document.getElementById('youtube-player');
          this.inicializarPlayer(videoId);
        }, 1000);
      } else {
        this.esVideoYouTube = false;

        if (this.player) {
          this.player.destroy();
          this.player = null;
          this.playerReady = false;
        }

        this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
          this.config.urlVideo,
        );

        this.gameService.registrarEvento(
          'video_iniciado',
          'Video educativo iniciado',
        );

        this.iniciarBonosColorVideo();
      }
    } else {
      this.esVideoYouTube = false;
      this.videoUrl = null;
      console.log('No hay config.urlVideo');
    }
  }

  inicializarPlayer(videoId: string): void {
    const initPlayer = () => {
      try {
        this.player = new (window as any).YT.Player('youtube-player', {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            rel: 0,
          },
          events: {
            onReady: (event: any) => {
              this.playerReady = true;
              event.target.playVideo();
            },
            onStateChange: (event: any) => {
              if (event.data === 0) {
                this.onVideoTerminado();
              }
            },
          },
        });
      } catch (error) {
        console.error('Error creando player:', error);
      }
    };

    if (
      typeof (window as any).YT !== 'undefined' &&
      (window as any).YT.Player
    ) {
      initPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }
  }

  crearPlayer(videoId: string): void {
    this.player = new (window as any).YT.Player('youtube-player', {
      height: '100%',
      width: '100%',
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        rel: 0,
      },
      events: {
        onReady: () => {
          this.playerReady = true;
        },
        onStateChange: (event: any) => {
          if (event.data === (window as any).YT.PlayerState.ENDED) {
            this.onVideoTerminado();
          }
        },
      },
    });
  }

  onVideoTerminado(): void {
    this.videoTerminado = true;
    this.bonoColorInterval?.unsubscribe();
    this.gameService.registrarEvento(
      'video_finalizado',
      'Video educativo finalizado',
    );
    this.mostrarMensajeTransicion();
  }

  iniciarBonosColorVideo(): void {
    const intervaloAleatorio = () => Math.floor(Math.random() * 30000) + 30000;

    const ejecutarBono = () => {
      if (this.seccionActual === 'video' && !this.videoTerminado) {
        this.mostrarBonoColor();
        setTimeout(ejecutarBono, intervaloAleatorio());
      }
    };

    setTimeout(ejecutarBono, intervaloAleatorio());
  }

  mostrarBonoColor(): void {
    const colores = ['#FFF700', '#00F0FF', '#FF003C', '#FFFFFF'];
    const colorAleatorio = colores[Math.floor(Math.random() * colores.length)];

    this.colorBonoActual = colorAleatorio;
    this.mostrandoBonoColor = true;
    this.ganadorBonoColor = null;
    this.participantesQueRespondieron.clear();

    setTimeout(() => {
      if (!this.ganadorBonoColor) {
        this.mostrandoBonoColor = false;
        this.participantesQueRespondieron.clear();
      }
    }, 5000);
  }

  extractYouTubeId(url: string): string | null {
    const match = url.match(
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/,
    );
    return match && match[2].length === 11 ? match[2] : null;
  }

  cargarParticipantes(): void {
    if (!this.config?.id) {
      console.error('No hay config.id para cargar participantes');
      return;
    }

    this.participanteService.getByBrainBike(this.config.id).subscribe({
      next: (participantes) => {
        if (participantes.length === 0) {
          console.error('NO SE ENCONTRARON PARTICIPANTES');
          alert('Error: No hay participantes registrados para esta sesión');
          this.router.navigate(['/brain-bike/parametros']);
          return;
        }

        this.gameService.inicializarParticipantes(participantes);
        this.gameService.iniciarCarrera();

        this.ble.unsubscribe('bici1', 'vel');
        this.ble.unsubscribe('bici1', 'btns');

        this.ble.subscribe('bici1', 'vel', (v) => {
          const valorLimpio = v.replace(/^v/, '').trim();
          const velocidades = valorLimpio
            .split(',')
            .map((val) => parseFloat(val) || 0);

          this.participantes.forEach((p) => {
            const indexVelocidad = p.numeroBicicleta - 1;

            if (velocidades[indexVelocidad] !== undefined) {
              const nuevaVelocidad = velocidades[indexVelocidad];
              const lecturas = [
                ...(p.lecturaVelocidades || []),
                nuevaVelocidad,
              ].slice(-10);
              const velocidadPromedio =
                lecturas.reduce((a, b) => a + b, 0) / lecturas.length;

              p.velocidadActual = nuevaVelocidad;
              p.velocidadMaxima = Math.max(p.velocidadMaxima, nuevaVelocidad);
              p.velocidadPromedio = Math.round(velocidadPromedio * 10) / 10;
              p.lecturaVelocidades = lecturas;

              const velMinima =
                this.seccionActual === 'video'
                  ? this.config?.velocidadMinimaVideo || 10
                  : this.config?.velocidadMinimaTrivia || 15;

              p.botonesActivos = nuevaVelocidad >= velMinima;
              p.alertaVelocidad = nuevaVelocidad < velMinima;
            }
          });
        });

        this.ble.subscribe('bici1', 'btns', (btns) => {
          const grupos = btns.split(',');

          if (grupos.length !== 2) return;

          const bici1Btns = grupos[0].trim();
          const bici2Btns = grupos[1].trim();

          if (bici1Btns.length !== 4 || bici2Btns.length !== 4) return;

          this.participantes.forEach((p, indexParticipante) => {
            let botonPresionado = false;
            let colorIndex = -1;

            if (p.numeroBicicleta === 1) {
              for (let i = 0; i < 4; i++) {
                if (bici1Btns[i] === '1') {
                  botonPresionado = true;
                  colorIndex = i;
                  break;
                }
              }
            } else if (p.numeroBicicleta === 2) {
              for (let i = 0; i < 4; i++) {
                if (bici2Btns[i] === '1') {
                  botonPresionado = true;
                  colorIndex = i;
                  break;
                }
              }
            }

            if (botonPresionado && p.botonesActivos) {
              this.manejarBotonPresionado(p, colorIndex);
            }
          });
        });
      },
      error: (error) => {
        console.error('Error cargando participantes:', error);
        alert('Error al cargar participantes');
        this.router.navigate(['/brain-bike/parametros']);
      },
    });
  }

  private manejarBotonPresionado(
    participante: ParticipanteJuego,
    colorIndex: number,
  ): void {
    if (this.seccionActual === 'video' && this.mostrandoBonoColor) {
      if (this.participantesQueRespondieron.has(participante.id)) return;

      this.participantesQueRespondieron.add(participante.id);

      const colores = ['#FFF700', '#00F0FF', '#FF003C', '#FFFFFF'];
      const colorBoton = colores[colorIndex];

      if (colorBoton === this.colorBonoActual) {
        this.ganadorBonoColor = participante;
        participante.puntosCarrera += 1;
        this.audioService.reproducirSonidoExito();
        this.agregarNotificacionBono(
          participante.nombreParticipante,
          '+1 punto por botón de color',
          participante.colorBicicleta,
          '🎯',
        );

        setTimeout(() => {
          this.mostrandoBonoColor = false;
          this.ganadorBonoColor = null;
          this.participantesQueRespondieron.clear();
        }, 2500);
      }
      return;
    }

    if (this.seccionActual === 'trivia' && this.mostrandoRespuestas) {
      if (this.participantesQueRespondieron.has(participante.id)) return;

      if (!participante.botonesActivos) return;

      const pregunta = this.preguntaActualData;
      if (!pregunta) return;

      const coloresRespuestas = ['#FFF700', '#00F0FF', '#FF003C', '#FFFFFF'];
      const colorBoton = coloresRespuestas[colorIndex];

      const respuestaSeleccionada = pregunta.respuestas.find(
        (r: any) => r.color_respuesta === colorBoton,
      );

      if (!respuestaSeleccionada) return;

      const esCorrecta = respuestaSeleccionada.es_correcta;
      const tiempoUsado = 15 - this.tiempoRestante;

      this.procesarRespuestaParticipante({
        participante,
        respuesta: respuestaSeleccionada,
        tiempoRespuesta: tiempoUsado,
        esCorrecta,
      });
    }
  }

  async actualizarParticipantesBD(): Promise<void> {
    this.duracionCarrera = Math.floor(
      (new Date().getTime() - this.fechaInicioCarrera.getTime()) / 60000,
    );

    const ranking = this.rankingCarrera;

    const participantesActualizados = ranking.map((p, index) => {
      const calorias = this.calcularCalorias(p);
      const vatios = this.calcularVatios(p);
      const distancia = this.calcularDistancia(p);

      const datosActualizar = {
        puntosAcumulados: p.puntosCarrera,
        velocidadPromedio: p.velocidadPromedio,
        velocidadMaxima: p.velocidadMaxima,
        caloriasQuemadas: calorias,
        vatiosGenerados: vatios,
        distanciaRecorrida: distancia,
        duracionTotal: this.duracionCarrera,
        posicionRanking: index + 1,
      };

      return {
        participante: {
          ...p,
          ...datosActualizar,
        },
        promise: this.participanteService
          .update(p.id, datosActualizar)
          .toPromise(),
      };
    });

    try {
      await Promise.all(participantesActualizados.map((item) => item.promise));
      this.participantes = participantesActualizados.map(
        (item) => item.participante,
      );
    } catch (error) {
      console.error('❌ [JUEGO] Error actualizando:', error);
    }
  }

  cargarPreguntas(): void {
    if (!this.config?.contenido_id) return;

    this.contenidoService
      .getPreguntasContenido(this.config.contenido_id)
      .subscribe({
        next: (preguntas) => {
          const colores = ['#FFF700', '#00F0FF', '#FF003C', '#FFFFFF'];

          this.preguntas = preguntas
            .slice(0, this.config?.numeroPreguntas || 10)
            .map((p) => {
              const respuestasMezcladas = [...p.respuestas].sort(
                () => Math.random() - 0.5,
              );

              return {
                ...p,
                respuestas: respuestasMezcladas.map(
                  (r: any, index: number) => ({
                    ...r,
                    color_respuesta: colores[index % 4],
                  }),
                ),
              };
            });
        },
        error: (error) => console.error('Error al cargar preguntas:', error),
      });
  }

  cambiarSeccion(seccion: 'video' | 'trivia' | 'podio'): void {
    if (this.seccionActual === seccion) return;
    if (seccion === 'video' && this.seccionActual !== 'video') return;
    if (seccion === 'trivia' && this.seccionActual === 'podio') return;

    this.seccionActual = seccion;
    this.guardarEstado();

    if (seccion === 'trivia') {
      if (this.preguntas.length > 0) {
        this.preguntaActual = 0;
        setTimeout(() => this.iniciarPregunta(), 500);
      }
    }
  }

  async iniciarPregunta(): Promise<void> {
    if (!this.preguntaActualData) return;

    this.gameService.registrarEvento(
      'pregunta_iniciada',
      `Pregunta ${this.preguntaActual + 1} iniciada`,
    );
    this.leyendoPregunta = true;
    this.mostrandoRespuestas = false;
    this.tiempoRestante = 0;
    this.participantesQueRespondieron.clear();

    const textoPregunta = `Pregunta ${this.preguntaActual + 1}. ${
      this.preguntaActualData.texto_pregunta
    }`;

    await this.esperar(500);

    try {
      await this.audioService.leerTexto(textoPregunta);
    } catch (error) {
      console.error('Error leyendo pregunta:', error);
    }

    await this.esperar(1000);

    this.leyendoPregunta = false;
    this.mostrandoRespuestas = true;
    this.iniciarTemporizador(15);
  }

  esperar(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async ejecutarRetoVelocidad30(): Promise<void> {
    return new Promise(async (resolve) => {
      this.mostrandoRetoVelocidad = true;
      this.retoVelocidadTexto = '¡Aumenta la velocidad!';
      this.ganadorRetoVelocidad = null;
      this.tiempoDescansoReto = 0;

      const verificarVelocidad = setInterval(() => {
        const ganador = this.participantes.find((p) => p.velocidadActual >= 30);

        if (ganador && !this.ganadorRetoVelocidad) {
          clearInterval(verificarVelocidad);
          this.ganadorRetoVelocidad = ganador;
          ganador.puntosCarrera += 1;
          this.audioService.reproducirSonidoExito();
          this.agregarNotificacionBono(
            ganador.nombreParticipante,
            '+1 punto por alcanzar 30 km/h',
            ganador.colorBicicleta,
            '🚀',
          );
        }
      }, 200);

      await this.esperar(10000);
      clearInterval(verificarVelocidad);

      for (let i = 10; i >= 0; i--) {
        this.tiempoDescansoReto = i;
        await this.esperar(1000);
      }

      this.mostrandoRetoVelocidad = false;
      this.ganadorRetoVelocidad = null;
      resolve();
    });
  }

  iniciarTemporizador(segundos: number): void {
    this.tiempoRestante = segundos;
    this.timerSubscription?.unsubscribe();

    this.timerSubscription = timer(0, 1000)
      .pipe(take(segundos + 1))
      .subscribe({
        next: (tick) => {
          this.tiempoRestante = segundos - tick;
        },
        complete: () => {
          if (this.mostrandoRespuestas) {
            this.manejarTiempoAgotado();
          }
        },
      });
  }

  simularRespuesta(): void {
    if (!this.preguntaActualData) return;

    const participantesDisponibles = this.participantes.filter(
      (p) => p.botonesActivos && !this.participantesQueRespondieron.has(p.id),
    );

    if (participantesDisponibles.length === 0) return;

    const participante =
      participantesDisponibles[
        Math.floor(Math.random() * participantesDisponibles.length)
      ];

    const probabilidadAcierto = 0.55 + participante.velocidadActual / 200;
    const esCorrecta = Math.random() < probabilidadAcierto;

    let respuestaSeleccionada;
    if (esCorrecta) {
      respuestaSeleccionada = this.preguntaActualData.respuestas.find(
        (r: any) => r.es_correcta,
      );
    } else {
      const respuestasIncorrectas = this.preguntaActualData.respuestas.filter(
        (r: any) => !r.es_correcta,
      );
      respuestaSeleccionada =
        respuestasIncorrectas[
          Math.floor(Math.random() * respuestasIncorrectas.length)
        ];
    }

    this.procesarRespuestaParticipante({
      participante,
      respuesta: respuestaSeleccionada,
      tiempoRespuesta: 15 - this.tiempoRestante,
      esCorrecta,
    });
  }

  procesarRespuestaParticipante(resultado: RespuestaParticipante): void {
    if (this.respuestaTimeout) clearTimeout(this.respuestaTimeout);

    const tiempoUsado = 15 - this.tiempoRestante;

    this.participantesQueRespondieron.add(resultado.participante.id);

    this.gameService.procesarRespuesta(
      resultado.participante.id,
      resultado.esCorrecta,
      tiempoUsado,
    );

    if (resultado.esCorrecta) {
      this.timerSubscription?.unsubscribe();
      this.audioService.reproducirSonidoExito();
      this.gameService.registrarEvento(
        'respuesta_correcta',
        `${resultado.participante.nombreParticipante} respondió correctamente (+2 pts)`,
        {
          tiempoUsado,
          participante: resultado.participante.nombreParticipante,
        },
      );
      this.mostrarCelebracion(resultado.participante, 2);
    } else {
      this.audioService.reproducirSonidoError();
      this.gameService.registrarEvento(
        'respuesta_incorrecta',
        `${resultado.participante.nombreParticipante} respondió incorrectamente`,
        {
          tiempoUsado,
          participante: resultado.participante.nombreParticipante,
        },
      );

      const participantesActivos = this.participantes.filter(
        (p) => p.botonesActivos,
      );
      const todosRespondieron = participantesActivos.every((p) =>
        this.participantesQueRespondieron.has(p.id),
      );

      if (todosRespondieron) {
        this.timerSubscription?.unsubscribe();
        this.manejarTodosRespondieroMal();
      }
    }
  }

  async manejarTodosRespondieroMal(): Promise<void> {
    this.mostrandoRespuestas = false;
    this.mostrandoRespuestaCorrecta = true;
    this.respuestaCorrecta = this.preguntaActualData?.respuestas.find(
      (r) => r.es_correcta,
    );

    this.gameService.registrarEvento(
      'todos_fallaron',
      `Todos respondieron incorrectamente en pregunta ${
        this.preguntaActual + 1
      }`,
    );

    await this.esperar(3000);

    this.mostrandoRespuestaCorrecta = false;
    this.siguientePreguntaConTransicion();
  }

  programarSiguienteRespuestaSimulada(): void {
    const tiempoRestanteMs = this.tiempoRestante * 1000;
    if (tiempoRestanteMs <= 1000) return;

    const tiempoSiguiente =
      Math.floor(Math.random() * (tiempoRestanteMs - 1000)) + 500;

    this.respuestaTimeout = setTimeout(() => {
      if (this.mostrandoRespuestas) {
        this.simularRespuesta();
      }
    }, tiempoSiguiente);
  }

  async mostrarCelebracion(
    participante: ParticipanteJuego,
    puntos: number,
  ): Promise<void> {
    this.mostrandoRespuestas = false;
    this.mostrandoCelebracion = true;
    this.participanteCelebracion = participante;
    this.puntosGanados = puntos;
    this.respuestaCorrecta = this.preguntaActualData?.respuestas.find(
      (r) => r.es_correcta,
    );

    await this.esperar(3500);

    this.mostrandoCelebracion = false;
    this.participanteCelebracion = null;
    this.siguientePreguntaConTransicion();
  }

  mostrarRespuestaIncorrectaParticipante(
    participante: ParticipanteJuego,
  ): void {
    this.participanteIncorrecto = participante;
    this.mostrandoRespuestaIncorrecta = true;

    setTimeout(() => {
      this.mostrandoRespuestaIncorrecta = false;
      this.participanteIncorrecto = null;
    }, 2500);
  }

  async manejarTiempoAgotado(): Promise<void> {
    if (this.respuestaTimeout) clearTimeout(this.respuestaTimeout);

    this.audioService.reproducirSonidoDecepcion();
    this.mostrandoRespuestas = false;
    this.mostrandoRespuestaCorrecta = true;

    this.respuestaCorrecta = this.preguntaActualData?.respuestas.find(
      (r) => r.es_correcta,
    );

    this.gameService.registrarEvento(
      'tiempo_agotado',
      `Tiempo agotado en pregunta ${this.preguntaActual + 1}`,
    );

    await this.esperar(3000);

    this.mostrandoRespuestaCorrecta = false;
    this.siguientePreguntaConTransicion();
  }

  async siguientePreguntaConTransicion(): Promise<void> {
    this.timerSubscription?.unsubscribe();

    if (this.preguntaActual < this.preguntas.length - 1) {
      if (this.preguntaActual === this.preguntas.length - 2) {
        await this.ejecutarRetoVelocidad30();
      }
      this.mostrarTransicion();
    } else {
      await this.finalizarTrivia();
    }
  }

  async ejecutarRetoVelocidadFinal(): Promise<void> {
    return new Promise(async (resolve) => {
      this.mostrandoRetoVelocidad = true;
      this.retoVelocidadTexto = '¡RETO FINAL! ¡LLEGA A 30 KM/H!';
      this.ganadorRetoVelocidad = null;
      this.tiempoDescansoReto = 0;

      const verificarVelocidad = setInterval(() => {
        const ganador = this.participantes.find((p) => p.velocidadActual >= 30);

        if (ganador && !this.ganadorRetoVelocidad) {
          clearInterval(verificarVelocidad);
          this.ganadorRetoVelocidad = ganador;
          ganador.puntosCarrera += 2;
          this.audioService.reproducirSonidoExito();
          this.agregarNotificacionBono(
            ganador.nombreParticipante,
            '+2 puntos por alcanzar 30 km/h (Reto Final)',
            ganador.colorBicicleta,
            '🏆',
          );
        }
      }, 200);

      await this.esperar(10000);
      clearInterval(verificarVelocidad);

      await this.esperar(3000);

      this.mostrandoRetoVelocidad = false;
      this.ganadorRetoVelocidad = null;
      resolve();
    });
  }

  mostrarTransicion(): void {
    this.mostrandoTransicion = true;
    this.transicionTexto = '¡PREPÁRATE PARA LA SIGUIENTE PREGUNTA!';

    setTimeout(() => {
      this.mostrandoTransicion = false;
      this.preguntaActual++;
      setTimeout(() => this.iniciarPregunta(), 300);
    }, 3000);
  }

  mostrarMensajeTransicion(): void {
    if (!this.videoTerminado) return;

    this.mensajeTitulo = '¡PREPÁRATE PARA LA TRIVIA!';
    this.mensajeTexto = '⚡ AUMENTA LA VELOCIDAD ⚡';
    this.mostrarMensaje = true;

    setTimeout(() => {
      this.mostrarMensaje = false;
      setTimeout(() => this.cambiarSeccion('trivia'), 500);
    }, 4000);
  }

  get preguntaActualData(): PreguntaBrain | null {
    return this.preguntas[this.preguntaActual] || null;
  }

  get rankingGeneral(): ParticipanteJuego[] {
    const sorted = [...this.participantes].sort(
      (a, b) =>
        b.puntosAcumulados +
        b.puntosCarrera -
        (a.puntosAcumulados + a.puntosCarrera),
    );
    return sorted;
  }

  get rankingCarrera(): ParticipanteJuego[] {
    return [...this.participantes].sort(
      (a, b) => b.puntosCarrera - a.puntosCarrera,
    );
  }

  get estadisticasGenerales() {
    const correctas = this.participantes.reduce(
      (acc, p) => acc + p.respuestasCorrectas,
      0,
    );
    const incorrectas = this.participantes.reduce(
      (acc, p) => acc + p.respuestasIncorrectas,
      0,
    );
    const total = correctas + incorrectas;
    return {
      porcentajeAcierto: total > 0 ? Math.round((correctas / total) * 100) : 0,
      totalCorrectas: correctas,
      totalIncorrectas: incorrectas,
    };
  }

  calcularVatios(p: ParticipanteJuego): number {
    return Math.round(p.velocidadPromedio * 2.5);
  }

  calcularDistancia(p: ParticipanteJuego): number {
    return parseFloat(
      ((p.velocidadPromedio * this.duracionCarrera) / 60).toFixed(2),
    );
  }

  getMedalEmoji(posicion: number): string {
    const medals: { [key: number]: string } = { 1: '🥇', 2: '🥈', 3: '🥉' };
    return medals[posicion] || `${posicion}º`;
  }

  getColorTimer(): string {
    if (this.tiempoRestante > 10) return '#39FF14';
    if (this.tiempoRestante > 5) return '#FFF700';
    return '#FF003C';
  }

  getColorNombre(color: string): string {
    const nombres: { [key: string]: string } = {
      '#00F0FF': 'AZUL',
      '#FFF700': 'AMARILLO',
      '#FF003C': 'ROJO',
      '#39FF14': 'VERDE',
    };
    return nombres[color] || 'COLOR';
  }

  trackByParticipante(index: number, participante: ParticipanteJuego): number {
    return participante.id;
  }

  resetearParaNuevaCarrera(): void {
    this.gameService.resetear();
    this.brainBikeService.clearConfigActual();
    this.router.navigate(['/brain-bike/parametros']);
  }

  get participantesConVelocidadBaja(): ParticipanteJuego[] {
    return this.participantes.filter((p) => p.alertaVelocidad);
  }

  agregarNotificacionBono(
    texto: string,
    subtexto: string,
    color: string,
    icono: string,
  ): void {
    const notif = { texto, subtexto, color, icono, timestamp: Date.now() };
    this.notificacionesBonos.push(notif);

    setTimeout(() => {
      this.notificacionesBonos = this.notificacionesBonos.filter(
        (n) => n.timestamp !== notif.timestamp,
      );
    }, 5000);
  }

  async finalizarTrivia(): Promise<void> {
    this.ble.unsubscribe('bici1', 'vel');
    this.ble.unsubscribe('bici1', 'btns');

    await this.mostrarBonosVelocidadFinal();

    this.gameService.finalizarCarrera();

    await this.actualizarParticipantesBD();

    this.gameService.actualizarParticipantesEnMemoria(this.participantes);

    this.cargarRankingGeneral();

    this.cambiarSeccion('podio');
  }

  calcularDuracion(): void {
    this.duracionCarrera = Math.floor(
      (new Date().getTime() - this.fechaInicioCarrera.getTime()) / 60000,
    );
  }

  async guardarPuntosParticipantes(): Promise<void> {
    const participantes = this.participantes;

    const updates = participantes.map((p) =>
      this.participanteService
        .update(p.id, {
          puntosAcumulados: p.puntosAcumulados + p.puntosCarrera,
          velocidadPromedio: p.velocidadPromedio,
          velocidadMaxima: p.velocidadMaxima,
          posicionRanking: p.posicionRanking,
        })
        .toPromise(),
    );

    try {
      await Promise.all(updates);
    } catch (error) {
      console.error('Error guardando puntos:', error);
    }
  }

  nuevaCarrera(): void {
    sessionStorage.removeItem('brainBikeEstado');
    if (!confirm('¿Deseas iniciar una nueva carrera?')) return;

    this.ble.unsubscribe('bici1', 'vel');
    this.ble.unsubscribe('bici1', 'btns');

    this.audioService.detenerTodo();
    this.timerSubscription?.unsubscribe();
    this.bonoColorInterval?.unsubscribe();

    const historial = this.gameService.construirHistorial(
      this.sesion.id,
      this.config?.id || 0,
      this.config,
    );

    this.historialService.crearHistorial(historial).subscribe({
      next: () => {
        this.gameService.resetear();
        this.brainBikeService.clearConfigActual();
        this.router.navigate(['/brain-bike/parametros']);
      },
      error: (error) => {
        console.error('Error al guardar historial:', error);
        this.audioService.reproducirSonidoError();
      },
    });
  }

  finalizarJuego(): void {
    sessionStorage.removeItem('brainBikeEstado');
    if (!confirm('¿Deseas finalizar el juego y la sesión?')) return;

    this.ble.unsubscribe('bici1', 'vel');
    this.ble.unsubscribe('bici1', 'btns');

    this.audioService.detenerTodo();
    this.timerSubscription?.unsubscribe();
    this.bonoColorInterval?.unsubscribe();

    const historial = this.gameService.construirHistorial(
      this.sesion.id,
      this.config?.id || 0,
      this.config,
    );

    this.audioService.reproducirSonidoExito();

    this.historialService.crearHistorial(historial).subscribe({
      next: () => {
        this.sesionService.finalizarSesion(this.sesion.id).subscribe({
          next: () => {
            this.gameService.limpiar();
            this.brainBikeService.clearConfigActual();
            this.sesionService.clearSesionSeleccionada();
            this.router.navigate(['/home']);
          },
          error: (error) => console.error('Error al finalizar sesión:', error),
        });
      },
      error: (error) => {
        console.error('Error al guardar historial:', error);
        this.audioService.reproducirSonidoError();
      },
    });
  }

  async mostrarBonosVelocidadFinal(): Promise<void> {
    const velocidadPromedioGeneral =
      this.participantes.reduce((sum, p) => sum + p.velocidadPromedio, 0) /
      this.participantes.length;

    const bonosPromedio = this.participantes.filter(
      (p) => p.velocidadPromedio >= velocidadPromedioGeneral,
    );

    const masRapido = this.participantes.reduce((max, p) =>
      p.velocidadPromedio > max.velocidadPromedio ? p : max,
    );

    if (bonosPromedio.length === 0 && !masRapido) {
      return;
    }

    bonosPromedio.forEach((p) => {
      p.puntosCarrera += 1;
    });

    if (masRapido) {
      masRapido.puntosCarrera += 2;
    }

    this.bonosVelocidadPromedio = bonosPromedio;
    this.ganadorVelocidadMaxima = masRapido;
    this.mostrandoBonosVelocidad = true;

    bonosPromedio.forEach((p) => {
      this.agregarNotificacionBono(
        p.nombreParticipante,
        '+1 punto por velocidad promedio (sesión)',
        p.colorBicicleta,
        '🚴',
      );
    });

    if (masRapido) {
      setTimeout(() => {
        this.agregarNotificacionBono(
          masRapido.nombreParticipante,
          '+2 puntos velocidad más alta (sesión)',
          masRapido.colorBicicleta,
          '🏆',
        );
      }, 1000);
    }

    await this.esperar(5000);
    this.mostrandoBonosVelocidad = false;
  }

  formatearDuracion(minutos: number): string {
    if (minutos < 60) return `${minutos} min`;
    return `${Math.floor(minutos / 60)}h ${minutos % 60}m`;
  }

  getPodioParticipante(posicion: number): ParticipanteJuego | null {
    return this.rankingCarrera[posicion - 1] || null;
  }

  formatearDecimal(valor: number): string {
    return valor?.toFixed(2) || '0.00';
  }

  calcularCalorias(p: ParticipanteJuego): number {
    return Math.round(p.velocidadPromedio * this.duracionCarrera * 0.5);
  }
  esParticipanteActual(nombre: string): boolean {
    return this.participantes.some((p) => p.nombreParticipante === nombre);
  }

  getVelocidadPromedioSesion(): number {
    if (this.participantes.length === 0) return 0;
    const total = this.participantes.reduce(
      (acc, p) => acc + p.velocidadPromedio,
      0,
    );
    return total / this.participantes.length;
  }

  getVelocidadMaximaSesion(): number {
    if (this.participantes.length === 0) return 0;
    return Math.max(...this.participantes.map((p) => p.velocidadMaxima));
  }

  getParticipanteVelocidadMaxima(): ParticipanteJuego | null {
    if (this.participantes.length === 0) return null;
    return this.participantes.reduce((max, p) =>
      p.velocidadMaxima > max.velocidadMaxima ? p : max,
    );
  }

  getPorcentajeCorrectas(): number {
    const total =
      this.estadisticasGenerales.totalCorrectas +
      this.estadisticasGenerales.totalIncorrectas;
    if (total === 0) return 0;
    return Math.round(
      (this.estadisticasGenerales.totalCorrectas / total) * 100,
    );
  }

  getPorcentajeIncorrectas(): number {
    const total =
      this.estadisticasGenerales.totalCorrectas +
      this.estadisticasGenerales.totalIncorrectas;
    if (total === 0) return 0;
    return Math.round(
      (this.estadisticasGenerales.totalIncorrectas / total) * 100,
    );
  }
}
