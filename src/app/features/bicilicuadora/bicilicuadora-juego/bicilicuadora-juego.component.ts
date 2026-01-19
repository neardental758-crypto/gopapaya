import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { BrainBikeAudioService } from '../../services/audio/brain-bike-audio.service';
import {
  BebidasService,
  RitmoPedaleo,
} from '../../services/bicilicuadora/bebidas.service';
import {
  BicilicuadoraConfigService,
  ConfiguracionBicicleta,
} from '../../services/bicilicuadora/bicilicuadora-config.service';
import { BicilicuadoraGameService } from '../../services/bicilicuadora/bicilicuadora-game.service';
import { ParticipanteBicilicuadoraService } from '../../services/bicilicuadora/participante-bicilicuadora.service';
import { BleEsp32Service } from '../../services/ble-esp32.service';
import { HistorialService } from '../../services/historial-sesion.service';
import { SesionService } from '../../services/sesion.service';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BicilicuadoraPlanoService } from '../services/bicilicuadora-plano.service';
import { BicilicuadoraPlanoComponent } from '../bicilicuadora-plano/bicilicuadora-plano.component';

interface Bebida {
  _id: string;
  nombre_bebida: string;
  foto_bebida?: string;
  tiempo_pedaleo: number;
  ingredientes?: any[];
  link_video?: string;
  ritmos?: RitmoPedaleo[];
}

interface ParticipanteJuego {
  id: number;
  idBicilicuadora: number;
  nombreParticipante: string;
  sexo?: 'M' | 'F';
  caloriasQuemadas: number;
  vatiosGenerados: number;
  duracionTotal: number;
  distanciaRecorrida: number;
  velocidadPromedio: number;
  velocidadMaxima: number;
  velocidadActual: number;
  bebidasCompletadas: number;
  posicionActual: number;
  tiempoAcumulado: number;
  puntosTotales: number;
  bebidaSeleccionadaId: string;
  cantidadBebidasSeleccionadas: number;
  documento?: string;
}

interface BiciConexion {
  key: string;
  label: string;
  status: string;
  conectado: boolean;
  deviceId?: string;
}
@Component({
  selector: 'app-bicilicuadora-juego',
  templateUrl: './bicilicuadora-juego.component.html',
  providers: [DecimalPipe],
  imports: [CommonModule, FormsModule, BicilicuadoraPlanoComponent],
})
export class BicilicuadoraJuegoComponent implements OnInit, OnDestroy {
  config: any = null;
  sesion: any = null;
  logoEmpresa: string | null = null;
  participantes: ParticipanteJuego[] = [];
  participanteActual: ParticipanteJuego | null = null;
  participantesCompletados: ParticipanteJuego[] = [];
  bebidas: Bebida[] = [];

  paso: 'juego' | 'ranking' = 'juego';
  etapaJuego: 'preparacion' | 'pedaleo' | 'completado' = 'preparacion';

  bebidaActual: Bebida | null = null;
  bebidaActualIndex = 0;
  tiempoRestante = 0;
  progresoPedaleo = 0;

  participantesPorRegistrar: any[] = [];

  rankingJuegoActual: ParticipanteJuego[] = [];

  private participantesSubscription?: Subscription;
  private timerSubscription?: Subscription;
  private fechaInicioCarrera = new Date();

  private player: any;
  private playerReady = false;

  private historialId: number | null = null;
  private fechaInicioSesion = new Date();

  puntosActuales = 0;
  intervaloPuntos: any;
  totalParticipantes = 0;
  totalParticipantesJugados = 0;

  constructor(
    private bicilicuadoraConfigService: BicilicuadoraConfigService,
    private participanteService: ParticipanteBicilicuadoraService,
    private sesionService: SesionService,
    private bebidasService: BebidasService,
    private gameService: BicilicuadoraGameService,
    private router: Router,
    public audioService: BrainBikeAudioService,
    private historialService: HistorialService,
    private ble: BleEsp32Service,
    private planoService: BicilicuadoraPlanoService,
  ) {}

  ngOnInit(): void {
    this.config = this.bicilicuadoraConfigService.getConfigActual();
    this.sesion = this.sesionService.getSesionSeleccionada();

    if (!this.config || !this.sesion) {
      this.router.navigate(['/bicilicuadora/parametros']);
      return;
    }

    const historialIdGuardado = localStorage.getItem(
      'historialIdBicilicuadora',
    );
    if (historialIdGuardado) {
      this.historialId = parseInt(historialIdGuardado);
    }

    const fechaGuardada = localStorage.getItem(
      'fechaInicioSesionBicilicuadora',
    );
    if (fechaGuardada) {
      this.fechaInicioSesion = new Date(fechaGuardada);
    } else {
      this.fechaInicioSesion = new Date();
      localStorage.setItem(
        'fechaInicioSesionBicilicuadora',
        this.fechaInicioSesion.toISOString(),
      );
    }

    if (this.sesion?.empresa?.logo) {
      this.logoEmpresa = this.sesion.empresa.logo;
    } else if (this.sesion?.logoCliente) {
      this.logoEmpresa = this.sesion.logoCliente;
    }

    const parametrosJuego = this.sesion.parametros_juego;
    let params: any;

    if (typeof parametrosJuego === 'string') {
      try {
        params = JSON.parse(parametrosJuego);
      } catch (e) {
        console.error('Error parseando parametros_juego');
      }
    } else {
      params = parametrosJuego;
    }

    if (params) {
      this.totalParticipantes = params.numero_participantes || 1;
    }

    this.cargarTotalRegistrados().then(() => {
      if (this.totalParticipantesJugados >= this.totalParticipantes) {
        localStorage.removeItem('participante_actual');
        localStorage.removeItem('bici1Conectada');
        this.paso = 'ranking';
        this.cargarRankingFinal();
        return;
      }

      const participanteActualStr = localStorage.getItem('participante_actual');

      if (!participanteActualStr) {
        this.router.navigate(['/bicilicuadora/conexion']);
        return;
      }

      const participanteActual = JSON.parse(participanteActualStr);

      this.participanteService.getByBicilicuadora(this.config!.id!).subscribe({
        next: (participantes) => {
          const participanteEnBD = participantes.find(
            (p: any) => p.id === participanteActual.id,
          );

          if (participanteEnBD && participanteEnBD.bebidasCompletadas! > 0) {
            localStorage.removeItem('participante_actual');
            localStorage.removeItem('bici1Conectada');
            this.router.navigate(['/bicilicuadora/conexion']);
            return;
          }

          this.participanteActual = participanteActual;

          this.cargarBebidaDelParticipante();
          this.cargarScriptYouTube();

          this.verificarYReconectarBicicleta()
            .then(() => {
              this.paso = 'juego';
              this.etapaJuego = 'pedaleo';

              setTimeout(() => {
                this.iniciarPedaleoPorParticipante();
              }, 500);
            })
            .catch(() => {});
        },
        error: () => {
          this.router.navigate(['/bicilicuadora/conexion']);
        },
      });
    });

    history.pushState(null, '', location.href);
    window.addEventListener('popstate', this.prevenirRetroceso);
  }

  async verificarYReconectarBicicleta(): Promise<void> {
    try {
      const estaConectado = this.ble.isConnected('bici1');

      if (!estaConectado) {
        await this.ble.connect('bici1');
      }
    } catch (error) {
      console.error('❌ Error reconectando bicicleta:', error);

      this.cargarTotalRegistrados().then(() => {
        if (this.totalParticipantesJugados >= this.totalParticipantes) {
          this.paso = 'ranking';
          this.cargarRankingFinal();
        } else {
          alert(
            'No se pudo conectar con la bicicleta. Redirigiendo a conexión...',
          );
          localStorage.removeItem('participante_actual');
          localStorage.removeItem('bici1Conectada');
          this.router.navigate(['/bicilicuadora/conexion']);
        }
      });

      throw error;
    }
  }

  verificarSiParticipanteYaJugo(participanteId: number): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.config?.id || !participanteId) {
        resolve(false);
        return;
      }

      this.participanteService.getByBicilicuadora(this.config.id).subscribe({
        next: (participantes) => {
          const participante = participantes.find(
            (p: any) => p.id === participanteId,
          );

          if (participante && participante.bebidasCompletadas! > 0) {
            resolve(true);
          } else {
            resolve(false);
          }
        },
        error: () => {
          resolve(false);
        },
      });
    });
  }

  cargarSiguienteBebida(): void {
    const cantidadTotal =
      this.participanteActual?.cantidadBebidasSeleccionadas || 1;

    if (this.bebidaActualIndex >= cantidadTotal) {
      this.finalizarParticipante();
      return;
    }

    if (this.bebidaActual) {
      this.tiempoRestante = this.bebidaActual.tiempo_pedaleo;
      this.progresoPedaleo = 0;
      this.puntosActuales = 0;

      if (this.bebidaActual.link_video) {
        this.cargarVideoYouTube(this.bebidaActual.link_video);
      }

      this.iniciarTemporizador();
      this.iniciarCalculoPuntos();
    } else {
      this.finalizarParticipante();
    }
  }

  iniciarTemporizador(): void {
    this.timerSubscription?.unsubscribe();

    const tiempoTotal = this.bebidaActual?.tiempo_pedaleo || 0;

    this.timerSubscription = interval(1000).subscribe(() => {
      this.tiempoRestante--;
      this.progresoPedaleo =
        ((tiempoTotal - this.tiempoRestante) / tiempoTotal) * 100;

      if (this.tiempoRestante <= 0) {
        this.completarBebida();
      }
    });
  }

  completarBebida(): void {
    this.timerSubscription?.unsubscribe();
    if (this.intervaloPuntos) {
      clearInterval(this.intervaloPuntos);
    }
    this.audioService.reproducirSonidoExito();

    setTimeout(() => {
      this.finalizarParticipante();
    }, 1500);
  }

  iniciarPedaleoPorParticipante(): void {
    this.planoService.limpiar();
    this.fechaInicioCarrera = new Date();
    this.bebidaActualIndex = 0;
    this.puntosActuales = 0;

    if (this.participanteActual) {
      this.participanteActual.caloriasQuemadas = 0;
      this.participanteActual.vatiosGenerados = 0;
      this.participanteActual.distanciaRecorrida = 0;
      this.participanteActual.velocidadPromedio = 0;
      this.participanteActual.velocidadMaxima = 0;
      this.participanteActual.duracionTotal = 0;

      this.gameService.inicializarParticipantes([this.participanteActual]);

      this.ble.unsubscribe('bici1', 'vel');

      this.ble.subscribe('bici1', 'vel', (velocidadStr) => {
        const velocidad = parseFloat(velocidadStr);
        this.gameService.actualizarVelocidad(
          this.participanteActual!.id!,
          velocidad,
        );
      });
    }

    this.gameService.iniciarSimulacion();
    this.cargarSiguienteBebida();

    this.participantesSubscription?.unsubscribe();

    this.participantesSubscription = this.gameService.participantes$.subscribe(
      (participantesActualizados) => {
        if (
          participantesActualizados.length > 0 &&
          this.participanteActual &&
          this.etapaJuego === 'pedaleo'
        ) {
          const actualizado = participantesActualizados[0];

          this.participanteActual.velocidadActual =
            actualizado.velocidadActual || 0;
          this.participanteActual.caloriasQuemadas =
            actualizado.caloriasQuemadas || 0;
          this.participanteActual.vatiosGenerados =
            actualizado.vatiosGenerados || 0;
          this.participanteActual.distanciaRecorrida =
            actualizado.distanciaRecorrida || 0;
          this.participanteActual.velocidadPromedio =
            actualizado.velocidadPromedio || 0;
          this.participanteActual.velocidadMaxima =
            actualizado.velocidadMaxima || 0;
        }
      },
    );
  }

  async actualizarParticipanteBD(
    participante: ParticipanteJuego,
  ): Promise<void> {
    const duracion = Math.floor(
      (new Date().getTime() - this.fechaInicioCarrera.getTime()) / 60000,
    );
    const vatiosCalculados = parseFloat(
      (participante.velocidadPromedio * 10).toFixed(1),
    );

    const datosActualizar = {
      caloriasQuemadas: participante.caloriasQuemadas,
      vatiosGenerados: vatiosCalculados,
      duracionTotal: duracion,
      distanciaRecorrida: participante.distanciaRecorrida,
      velocidadPromedio: participante.velocidadPromedio,
      velocidadMaxima: participante.velocidadMaxima,
      puntosTotales: participante.puntosTotales || 0,
    };
    try {
      await this.participanteService
        .update(participante.id!, datosActualizar)
        .toPromise();
    } catch (error) {
      console.error('Error actualizando participante:', error);
    }
  }

  cargarTotalRegistrados(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.config?.id) {
        resolve();
        return;
      }

      this.participanteService.getByBicilicuadora(this.config.id).subscribe({
        next: (participantes) => {
          this.totalParticipantesJugados = participantes.filter(
            (p: any) => p.puntosTotales > 0 || p.caloriasQuemadas > 0,
          ).length;
          resolve();
        },
        error: () => {
          this.totalParticipantesJugados = 0;
          resolve();
        },
      });
    });
  }

  cargarRankingFinal(): void {
    if (!this.config?.id) return;

    this.participanteService.getByBicilicuadora(this.config.id).subscribe({
      next: (participantes) => {
        this.participantesCompletados = participantes
          .filter((p: any) => p.puntosTotales > 0 || p.caloriasQuemadas > 0)
          .map((p: any) => ({
            ...p,
            puntosTotales: p.puntosTotales || 0,
            caloriasQuemadas: parseFloat(p.caloriasQuemadas || 0),
            vatiosGenerados: parseFloat(p.vatiosGenerados || 0),
            velocidadPromedio: parseFloat(p.velocidadPromedio || 0),
            velocidadMaxima: parseFloat(p.velocidadMaxima || 0),
          }))
          .sort((a: any, b: any) => b.puntosTotales - a.puntosTotales);

        this.rankingJuegoActual = [...this.participantesCompletados];

        this.cargarTotalRegistrados();
      },
      error: (error) => {
        console.error('Error cargando ranking:', error);
      },
    });
  }

  calcularTotalBebidasRealizadas(): number {
    return this.participantesCompletados.reduce(
      (total, p) => total + (p.cantidadBebidasSeleccionadas || 1),
      0,
    );
  }

  finalizarParticipante(): void {
    this.timerSubscription?.unsubscribe();
    if (this.intervaloPuntos) {
      clearInterval(this.intervaloPuntos);
    }
    this.planoService.limpiar();
    this.gameService.detenerSimulacion();
    this.ble.unsubscribe('bici1', 'vel');

    if (this.participanteActual) {
      this.actualizarParticipanteBD(this.participanteActual).then(() => {
        this.guardarHistorial().then(() => {
          this.etapaJuego = 'completado';

          this.cargarTotalRegistrados().then(() => {
            setTimeout(() => {
              this.paso = 'ranking';
              this.cargarRankingFinal();
            }, 5000);
          });
        });
      });
    }
  }

  async guardarHistorial(): Promise<void> {
    if (!this.config?.id || !this.sesion?.id) {
      console.log('❌ No hay config o sesion');
      return;
    }

    try {
      const participantes = await this.participanteService
        .getByBicilicuadora(this.config.id)
        .toPromise();

      const participantesData = participantes!
        .filter((p: any) => p.puntosTotales > 0 || p.caloriasQuemadas > 0)
        .map((p: any) => ({
          nombreParticipante: p.nombreParticipante,
          documento: p.documento,
          sexo: p.sexo,
          caloriasQuemadas: p.caloriasQuemadas,
          vatiosGenerados: p.vatiosGenerados,
          duracionTotal: p.duracionTotal,
          distanciaRecorrida: p.distanciaRecorrida,
          velocidadPromedio: p.velocidadPromedio,
          velocidadMaxima: p.velocidadMaxima,
          puntosTotales: p.puntosTotales,
          cantidadBebidasSeleccionadas: p.cantidadBebidasSeleccionadas,
        }));
      if (participantesData.length === 0) {
        return;
      }

      const rankingFinal = participantesData
        .sort((a: any, b: any) => b.puntosTotales - a.puntosTotales)
        .map((p: any, index: number) => ({
          nombre: p.nombreParticipante,
          puntos: p.puntosTotales,
          posicion: index + 1,
        }));

      const duracionMinutos = Math.floor(
        (new Date().getTime() - this.fechaInicioSesion.getTime()) / 60000,
      );

      const duracionSegundos = Math.floor(
        (new Date().getTime() - this.fechaInicioSesion.getTime()) / 1000,
      );

      const totalBebidas = participantesData.reduce(
        (sum, p) => sum + (p.cantidadBebidasSeleccionadas || 0),
        0,
      );

      const historialData = {
        sesion_id: this.sesion.id,
        juego_id: this.config.id.toString(),
        juego_jugado: 'Bicilicuadora',
        fecha_inicio: this.fechaInicioSesion.toISOString(),
        fecha_fin: new Date().toISOString(),
        duracion_minutos: duracionMinutos,
        parametros_utilizados: {
          totalParticipantes: this.totalParticipantes,
          totalBebidas: totalBebidas,
        },
        participantes_data: participantesData,
        ranking_final: rankingFinal,
        estadisticas_generales: {
          totalParticipantes: participantesData.length,
          participantesCompletados: participantesData.length,
          duracionTotal: duracionSegundos,
          bebidasRealizadas: totalBebidas,
          totalCalorias: participantesData.reduce(
            (sum, p) => sum + parseFloat(p.caloriasQuemadas || 0),
            0,
          ),
          totalVatios: participantesData.reduce(
            (sum, p) => sum + parseFloat(p.vatiosGenerados || 0),
            0,
          ),
          velocidadPromedioGeneral:
            participantesData.length > 0
              ? (
                  participantesData.reduce(
                    (sum, p) => sum + parseFloat(p.velocidadPromedio || 0),
                    0,
                  ) / participantesData.length
                ).toFixed(1)
              : 0,
        },
      };

      if (this.historialId) {
        const response = await this.historialService
          .actualizarHistorial(this.historialId, historialData)
          .toPromise();
      } else {
        const response = await this.historialService
          .crearHistorial(historialData)
          .toPromise();
        this.historialId = response!.id;
        localStorage.setItem(
          'historialIdBicilicuadora',
          this.historialId.toString(),
        );
      }
    } catch (error) {
      console.error('❌ Error guardando historial:', error);
    }
  }

  finalizarSesion(): void {
    localStorage.removeItem('participante_actual');
    localStorage.removeItem('bici1Conectada');
    localStorage.removeItem('historialIdBicilicuadora');
    localStorage.removeItem('fechaInicioSesionBicilicuadora');

    this.sesionService.finalizarSesion(this.sesion.id).subscribe({
      next: () => this.router.navigate(['/home']),
      error: () => this.router.navigate(['/home']),
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('popstate', this.prevenirRetroceso);
    this.participantesSubscription?.unsubscribe();
    this.timerSubscription?.unsubscribe();
    this.gameService.detenerSimulacion();
    this.ble.unsubscribe('bici1', 'vel');

    if (this.player) {
      this.player.destroy();
    }
  }

  irASiguienteParticipante(): void {
    localStorage.removeItem('participante_actual');
    this.router.navigate(['/bicilicuadora/conexion']);
  }

  calcularVatios(participante: any): number {
    return participante.velocidadPromedio * 10;
  }

  iniciarCalculoPuntos(): void {
    if (this.intervaloPuntos) {
      clearInterval(this.intervaloPuntos);
    }

    let segundoActual = 0;

    this.intervaloPuntos = setInterval(() => {
      if (!this.bebidaActual || !this.participanteActual) return;

      const velocidadActual = this.participanteActual.velocidadActual || 0;

      const ritmoActivo = this.bebidaActual.ritmos?.find(
        (r) =>
          segundoActual >= r.segundo_inicio && segundoActual <= r.segundo_fin,
      );

      if (ritmoActivo) {
        const velocidadObjetivo = ritmoActivo.velocidad_objetivo;
        const margenError = 1;
        const diferencia = Math.abs(velocidadActual - velocidadObjetivo);

        this.planoService.agregarPunto(
          segundoActual,
          velocidadObjetivo,
          velocidadActual,
        );

        if (diferencia <= margenError) {
          this.puntosActuales += 1;
          if (this.participanteActual) {
            this.participanteActual.puntosTotales =
              (this.participanteActual.puntosTotales || 0) + 1;
          }
        }
      }

      segundoActual++;
    }, 1000);
  }

  estaEnVelocidadCorrecta(): boolean {
    const ritmo = this.obtenerRitmoActual();
    if (!ritmo || !this.participanteActual) return false;

    const velocidadActual = this.participanteActual.velocidadActual || 0;
    const margenError = 1;

    return Math.abs(velocidadActual - ritmo.velocidad_objetivo) <= margenError;
  }
  obtenerRitmoActual(): any {
    if (!this.bebidaActual || !this.participanteActual) return null;

    const tiempoTranscurrido =
      (this.bebidaActual.tiempo_pedaleo || 0) - this.tiempoRestante;

    const ritmo = this.bebidaActual.ritmos?.find(
      (r) =>
        tiempoTranscurrido >= r.segundo_inicio &&
        tiempoTranscurrido <= r.segundo_fin,
    );
    return ritmo;
  }

  cargarBebidaDelParticipante(): void {
    if (!this.participanteActual?.bebidaSeleccionadaId) return;

    this.bebidasService.getAllBebidas().subscribe({
      next: (todasLasBebidas) => {
        this.bebidaActual =
          todasLasBebidas.find(
            (b) => b._id === this.participanteActual!.bebidaSeleccionadaId,
          ) || null;
      },
      error: (error) => console.error('Error cargando bebida:', error),
    });
  }

  private prevenirRetroceso = (): void => {
    history.pushState(null, '', location.href);
    this.audioService.reproducirSonidoError();
  };

  cargarScriptYouTube(): void {
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }

  cargarVideoYouTube(url: string): void {
    const videoId = this.extractYouTubeId(url);
    if (!videoId) return;

    const esperarYT = () => {
      if (
        typeof (window as any).YT !== 'undefined' &&
        (window as any).YT.Player
      ) {
        setTimeout(() => this.inicializarPlayer(videoId), 300);
      } else {
        setTimeout(esperarYT, 100);
      }
    };

    esperarYT();
  }

  inicializarPlayer(videoId: string): void {
    try {
      const elemento = document.getElementById('youtube-player-bicilicuadora');
      if (!elemento) return;

      if (this.player) {
        this.player.destroy();
      }

      this.player = new (window as any).YT.Player(
        'youtube-player-bicilicuadora',
        {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: { autoplay: 1, rel: 0, controls: 1, modestbranding: 1 },
          events: {
            onReady: (event: any) => {
              this.playerReady = true;
              event.target.playVideo();
            },
          },
        },
      );
    } catch (error) {
      console.error('Error creando player:', error);
    }
  }

  extractYouTubeId(url: string): string | null {
    const match = url.match(
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/,
    );
    return match && match[2].length === 11 ? match[2] : null;
  }

  cargarBebidas(): void {
    const bebidasIds =
      this.config?.configuracionBicicletas?.flatMap((b: any) =>
        b.bebidasSeleccionadas.map((bs: any) => bs.bebidaId),
      ) || [];

    const idsUnicos = [...new Set(bebidasIds)];

    this.bebidasService.getAllBebidas().subscribe({
      next: (todasLasBebidas) => {
        this.bebidas = todasLasBebidas.filter((b) => idsUnicos.includes(b._id));
      },
      error: (error) => console.error('❌ Error cargando bebidas:', error),
    });
  }

  prepararRegistroParticipantes(): void {
    this.participantesPorRegistrar = [];
    if (
      !this.config?.configuracionBicicletas ||
      this.config.configuracionBicicletas.length === 0
    ) {
      const participantesPorBici: { [key: number]: any } = {};

      this.participantes.forEach((p) => {
        if (!participantesPorBici[p.id]) {
          participantesPorBici[p.id] = [];
        }
        participantesPorBici[p.id].push(p);
      });

      Object.keys(participantesPorBici).forEach((participanteId) => {
        const participante = participantesPorBici[parseInt(participanteId)][0];

        this.participantesPorRegistrar.push({
          nombreParticipante: participante.nombreParticipante,
          documento: participante.documento,
          sexo: participante.sexo,
          id: participante.id,
          bebidasAsignadas: [],
        });
      });

      return;
    }

    this.config.configuracionBicicletas.forEach((bicicleta: any) => {
      for (let i = 0; i < bicicleta.participantes; i++) {
        this.participantesPorRegistrar.push({
          bebidasAsignadas: bicicleta.bebidasSeleccionadas.map((b: any) => ({
            bebidaId: b.bebidaId,
            nombreBebida: b.nombreBebida,
            cantidad: b.cantidad,
          })),
        });
      }
    });
  }

  cargarParticipantesYComenzar(): void {
    this.participanteService.getByBicilicuadora(this.config.id).subscribe({
      next: (participantes) => {
        this.participantes = participantes.map((p: any) => ({
          id: p.id,
          idBicilicuadora: p.idBicilicuadora,
          nombreParticipante: p.nombreParticipante,
          documento: p.documento,
          sexo: p.sexo,
          caloriasQuemadas: 0,
          vatiosGenerados: 0,
          duracionTotal: 0,
          distanciaRecorrida: 0,
          velocidadPromedio: 0,
          velocidadMaxima: 0,
          velocidadActual: 0,
          bebidasCompletadas: 0,
          posicionActual: 0,
          tiempoAcumulado: 0,
          puntosTotales: p.puntosTotales || 0,
          bebidaSeleccionadaId: p.bebidaSeleccionadaId || '',
          cantidadBebidasSeleccionadas: p.cantidadBebidasSeleccionadas || 1,
        }));

        this.prepararRegistroParticipantes();

        this.participantesPorRegistrar.forEach((porRegistrar, index) => {
          const registrado = this.participantes.find(
            (p) => p.id === porRegistrar.id,
          );
          if (registrado) {
            porRegistrar.nombreParticipante = registrado.nombreParticipante;
            porRegistrar.documento = registrado.documento;
            porRegistrar.sexo = registrado.sexo;
          }
        });

        this.cargarPrimerParticipante();
      },
      error: (error) => {
        console.error('❌ Error cargando participantes:', error);
      },
    });
  }

  cargarPrimerParticipante(): void {
    if (this.participantesPorRegistrar.length === 0) {
      console.error('❌ NO HAY PARTICIPANTES POR REGISTRAR');
      return;
    }

    const primerRegistro = this.participantesPorRegistrar[0];

    const participanteDB = this.participantes.find(
      (p) => p.id === primerRegistro.id,
    );

    if (!participanteDB) {
      console.error('❌ NO SE ENCONTRÓ PARTICIPANTE EN DB');
      return;
    }

    this.participanteActual = { ...participanteDB, bebidasCompletadas: 0 };
    this.bebidaActualIndex = 0;
    this.paso = 'juego';
    this.etapaJuego = 'pedaleo';
    this.fechaInicioCarrera = new Date();
    this.gameService.iniciarSimulacion();
    this.cargarSiguienteBebida();

    this.participantesSubscription = this.gameService.participantes$.subscribe(
      (participantesActualizados) => {
        const participanteIndex = this.participantes.findIndex(
          (p) => p.id === this.participanteActual?.id,
        );
        if (
          participanteIndex !== -1 &&
          participantesActualizados[participanteIndex]
        ) {
          const actualizado = participantesActualizados[participanteIndex];
          Object.assign(this.participantes[participanteIndex], {
            velocidadActual: actualizado.velocidadActual || 0,
            caloriasQuemadas: actualizado.caloriasQuemadas || 0,
            vatiosGenerados: actualizado.vatiosGenerados || 0,
            distanciaRecorrida: actualizado.distanciaRecorrida || 0,
            velocidadPromedio: actualizado.velocidadPromedio || 0,
            velocidadMaxima: actualizado.velocidadMaxima || 0,
          });
          this.participanteActual = this.participantes[participanteIndex];
        }
      },
    );
  }

  cargarSiguienteParticipante(): void {
    const siguienteRegistro = this.participantesPorRegistrar[0];
    const participanteDB = this.participantes.find(
      (p) => p.id === siguienteRegistro.id,
    );

    if (!participanteDB) return;

    this.participanteActual = {
      ...participanteDB,
      bebidasCompletadas: 0,
      caloriasQuemadas: 0,
      vatiosGenerados: 0,
      distanciaRecorrida: 0,
      velocidadActual: 0,
      velocidadPromedio: 0,
      velocidadMaxima: 0,
    };

    this.bebidaActualIndex = 0;
    this.etapaJuego = 'preparacion';

    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
  }

  calcularTotalVatios(): number {
    if (this.participantesCompletados.length === 0) return 0;
    const sumaVatios = this.participantesCompletados.reduce(
      (sum, p) => sum + this.calcularVatios(p),
      0,
    );
    return parseFloat(
      (sumaVatios / this.participantesCompletados.length).toFixed(1),
    );
  }

  calcularTotalCalorias(): number {
    return this.participantesCompletados.reduce(
      (sum, p) => sum + (p.caloriasQuemadas || 0),
      0,
    );
  }

  finalizarTodosParticipantes(): void {
    this.etapaJuego = 'completado';

    if (this.player) {
      this.player.destroy();
      this.player = null;
    }

    this.rankingJuegoActual = [...this.participantesCompletados].sort(
      (a, b) => (b.puntosTotales || 0) - (a.puntosTotales || 0),
    );

    this.guardarHistorial();

    setTimeout(() => {
      this.paso = 'ranking';
    }, 5000);
  }

  verificarSiYaCompletaron(): Promise<void> {
    return new Promise((resolve) => {
      const sesion = this.sesionService.getSesionSeleccionada();
      const sesionData = (sesion as any).data || sesion;

      if (!sesionData.id) {
        resolve();
        return;
      }

      this.bicilicuadoraConfigService
        .getConfigBySesion(sesionData.id)
        .subscribe({
          next: (config: any) => {
            if (config && config.id) {
              this.participanteService.getByBicilicuadora(config.id).subscribe({
                next: (participantes) => {
                  this.totalParticipantesJugados = participantes.length;

                  if (
                    this.totalParticipantesJugados >= this.totalParticipantes
                  ) {
                    this.bicilicuadoraConfigService.setConfigActual(config);
                    this.mostrarRankingFinal();
                  }
                  resolve();
                },
                error: () => {
                  this.totalParticipantesJugados = 0;
                  resolve();
                },
              });
            } else {
              resolve();
            }
          },
          error: () => {
            resolve();
          },
        });
    });
  }

  guardarOActualizarHistorial(): void {
    if (!this.sesion?.id || !this.participanteActual) return;

    this.participanteService.getByBicilicuadora(this.config.id).subscribe({
      next: (participantes) => {
        const participantesData = participantes.map((p: any) => ({
          id: p.id,
          nombreParticipante: p.nombreParticipante,
          colorBicicleta: p.colorBicicleta,
          caloriasQuemadas: p.caloriasQuemadas || 0,
          vatiosGenerados: p.vatiosGenerados || 0,
          velocidadPromedio: p.velocidadPromedio || 0,
          velocidadMaxima: p.velocidadMaxima || 0,
          puntosTotales: p.puntosTotales || 0,
          cantidadBebidasSeleccionadas: p.cantidadBebidasSeleccionadas || 0,
        }));

        const rankingFinal = [...participantesData].sort(
          (a, b) => (b.puntosTotales || 0) - (a.puntosTotales || 0),
        );

        const totalBebidas = participantesData.reduce(
          (sum, p) => sum + (p.cantidadBebidasSeleccionadas || 0),
          0,
        );

        const duracion = Math.floor(
          (new Date().getTime() - this.fechaInicioCarrera.getTime()) / 60000,
        );

        const historialData = {
          sesion_id: this.sesion.id,
          fecha_inicio: this.fechaInicioCarrera.toISOString(),
          fecha_fin: new Date().toISOString(),
          duracion_minutos: duracion,
          juego_jugado: 'Bicilicuadora',
          parametros_utilizados: JSON.stringify({
            totalParticipantes: this.totalParticipantes,
            totalBebidas: totalBebidas,
          }),
          participantes_data: participantesData,
          ranking_final: rankingFinal,
          estadisticas_generales: {
            totalParticipantes: participantesData.length,
            totalBebidas: totalBebidas,
            totalCalorias: participantesData.reduce(
              (sum, p) => sum + (p.caloriasQuemadas || 0),
              0,
            ),
            totalVatios: participantesData.reduce(
              (sum, p) => sum + (p.vatiosGenerados || 0),
              0,
            ),
          },
          creado_por: 1,
        };

        if (!this.historialId) {
          this.historialService.crearHistorial(historialData).subscribe({
            next: (response) => {
              this.historialId = response.id;
            },
            error: (error) =>
              console.error('❌ Error creando historial:', error),
          });
        }
      },
      error: (error) =>
        console.error('❌ Error obteniendo participantes:', error),
    });
  }

  mostrarRankingFinal(): void {
    this.participanteService.getByBicilicuadora(this.config.id).subscribe({
      next: (participantes) => {
        this.participantesCompletados = participantes.map((p: any) => ({
          id: p.id,
          idBicilicuadora: p.idBicilicuadora,
          nombreParticipante: p.nombreParticipante,
          documento: p.documento,
          sexo: p.sexo,
          caloriasQuemadas: p.caloriasQuemadas || 0,
          vatiosGenerados: p.vatiosGenerados || 0,
          duracionTotal: p.duracionTotal || 0,
          distanciaRecorrida: p.distanciaRecorrida || 0,
          velocidadPromedio: p.velocidadPromedio || 0,
          velocidadMaxima: p.velocidadMaxima || 0,
          velocidadActual: 0,
          bebidasCompletadas: p.cantidadBebidasSeleccionadas || 0,
          posicionActual: 0,
          tiempoAcumulado: 0,
          puntosTotales: p.puntosTotales || 0,
          bebidaSeleccionadaId: p.bebidaSeleccionadaId || '',
          cantidadBebidasSeleccionadas: p.cantidadBebidasSeleccionadas || 1,
        }));

        this.rankingJuegoActual = [...this.participantesCompletados].sort(
          (a, b) => (b.puntosTotales || 0) - (a.puntosTotales || 0),
        );

        this.paso = 'ranking';
      },
      error: (error) => {
        console.error('❌ Error cargando ranking:', error);
        this.router.navigate(['/home']);
      },
    });
  }
}
