import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { BrainBikeAudioService } from '../../services/audio/brain-bike-audio.service';
import { BebidasService } from '../../services/bicilicuadora/bebidas.service';
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

interface Bebida {
  _id: string;
  nombre_bebida: string;
  foto_bebida?: string;
  tiempo_pedaleo: number;
  ingredientes?: any[];
  link_video?: string;
}

interface ParticipanteJuego {
  id: number;
  idBicilicuadora: number;
  nombreParticipante: string;
  numeroBicicleta: number;
  colorBicicleta: string;
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
  imports: [CommonModule, FormsModule],
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

  coloresDisponibles = [
    { nombre: 'Naranja', valor: '#FF6B35' },
    { nombre: 'Amarillo', valor: '#FFF700' },
    { nombre: 'Verde', valor: '#39FF14' },
    { nombre: 'Azul', valor: '#00F0FF' },
    { nombre: 'Rosa', valor: '#FF10F0' },
    { nombre: 'Rojo', valor: '#FF003C' },
  ];

  rankingJuegoActual: ParticipanteJuego[] = [];

  private participantesSubscription?: Subscription;
  private timerSubscription?: Subscription;
  private fechaInicioCarrera = new Date();

  private player: any;
  private playerReady = false;

  constructor(
    private bicilicuadoraConfigService: BicilicuadoraConfigService,
    private participanteService: ParticipanteBicilicuadoraService,
    private sesionService: SesionService,
    private bebidasService: BebidasService,
    private gameService: BicilicuadoraGameService,
    private router: Router,
    public audioService: BrainBikeAudioService,
    private historialService: HistorialService
  ) {}

  ngOnInit(): void {
    this.config = this.bicilicuadoraConfigService.getConfigActual();
    this.sesion = this.sesionService.getSesionSeleccionada();

    if (!this.config || !this.sesion) {
      this.router.navigate(['/bicilicuadora/parametros']);
      return;
    }

    if (this.sesion?.empresa?.logo) {
      this.logoEmpresa = this.sesion.empresa.logo;
    } else if (this.sesion?.logoCliente) {
      this.logoEmpresa = this.sesion.logoCliente;
    }

    this.cargarScriptYouTube();

    if (this.config.id) {
      this.bicilicuadoraConfigService.getConfigById(this.config.id).subscribe({
        next: (configCompleta) => {
          this.config = configCompleta;
          this.bicilicuadoraConfigService.setConfigActual(configCompleta);

          this.cargarBebidas();

          setTimeout(() => {
            this.cargarParticipantesYComenzar();
          }, 500);
        },
        error: (error) => {
          console.error('❌ Error recargando config:', error);
          this.cargarParticipantesYComenzar();
        },
      });
    } else {
      this.cargarBebidas();
      this.cargarParticipantesYComenzar();
    }

    history.pushState(null, '', location.href);
    window.addEventListener('popstate', this.prevenirRetroceso);
  }

  ngOnDestroy(): void {
    window.removeEventListener('popstate', this.prevenirRetroceso);
    this.participantesSubscription?.unsubscribe();
    this.timerSubscription?.unsubscribe();
    this.gameService.detenerSimulacion();

    if (this.player) {
      this.player.destroy();
    }
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
        }
      );
    } catch (error) {
      console.error('Error creando player:', error);
    }
  }

  extractYouTubeId(url: string): string | null {
    const match = url.match(
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    );
    return match && match[2].length === 11 ? match[2] : null;
  }

  cargarBebidas(): void {
    const bebidasIds =
      this.config?.configuracionBicicletas?.flatMap((b: any) =>
        b.bebidasSeleccionadas.map((bs: any) => bs.bebidaId)
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
      console.warn('⚠️ NO HAY configuracionBicicletas, RECONSTRUYENDO...');

      const participantesPorBici: { [key: number]: any } = {};

      this.participantes.forEach((p) => {
        if (!participantesPorBici[p.numeroBicicleta]) {
          participantesPorBici[p.numeroBicicleta] = [];
        }
        participantesPorBici[p.numeroBicicleta].push(p);
      });

      Object.keys(participantesPorBici).forEach((numBici) => {
        const participantesDeBici = participantesPorBici[parseInt(numBici)];

        participantesDeBici.forEach((p: any) => {
          this.participantesPorRegistrar.push({
            numeroBicicleta: p.numeroBicicleta,
            colorBicicleta: p.colorBicicleta,
            nombreParticipante: p.nombreParticipante,
            sexo: p.sexo,
            id: p.id,
            bebidasAsignadas: [],
          });
        });
      });

      return;
    }

    this.config.configuracionBicicletas.forEach((bicicleta: any) => {
      for (let i = 0; i < bicicleta.participantes; i++) {
        this.participantesPorRegistrar.push({
          numeroBicicleta: bicicleta.numeroBicicleta,
          colorBicicleta:
            this.coloresDisponibles[
              this.participantesPorRegistrar.length %
                this.coloresDisponibles.length
            ].valor,
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
          numeroBicicleta: p.numeroBicicleta,
          colorBicicleta: p.colorBicicleta,
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
        }));

        this.prepararRegistroParticipantes();

        this.participantesPorRegistrar.forEach((porRegistrar, index) => {
          const registrado = this.participantes.find(
            (p) => p.numeroBicicleta === porRegistrar.numeroBicicleta
          );
          if (registrado) {
            porRegistrar.nombreParticipante = registrado.nombreParticipante;
            porRegistrar.sexo = registrado.sexo;
            porRegistrar.id = registrado.id;
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
      (p) => p.numeroBicicleta === primerRegistro.numeroBicicleta
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
          (p) => p.id === this.participanteActual?.id
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
      }
    );
  }

  iniciarPedaleoPorParticipante(): void {
    this.etapaJuego = 'pedaleo';
    this.fechaInicioCarrera = new Date();
    this.gameService.iniciarSimulacion();
    this.cargarSiguienteBebida();

    this.participantesSubscription = this.gameService.participantes$.subscribe(
      (participantesActualizados) => {
        const participanteIndex = this.participantes.findIndex(
          (p) => p.id === this.participanteActual?.id
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
      }
    );
  }

  cargarSiguienteBebida(): void {
    const participantePorRegistrar = this.participantesPorRegistrar[0];

    const bebidasParticipante =
      participantePorRegistrar?.bebidasAsignadas || [];

    const totalBebidasParticipante = bebidasParticipante.reduce(
      (sum: any, b: { cantidad: any }) => sum + (b.cantidad || 1),
      0
    );

    if (this.bebidaActualIndex >= totalBebidasParticipante) {
      console.log('❌ NO HAY MÁS BEBIDAS - FINALIZANDO PARTICIPANTE');
      this.finalizarParticipante();
      return;
    }

    let acumulador = 0;
    let bebidaConfig = null;

    for (const bebida of bebidasParticipante) {
      const cantidad = bebida.cantidad || 1;
      if (this.bebidaActualIndex < acumulador + cantidad) {
        bebidaConfig = bebida;
        break;
      }
      acumulador += cantidad;
    }

    if (!bebidaConfig) {
      console.log('❌ NO SE ENCONTRÓ BEBIDA CONFIG - FINALIZANDO');
      this.finalizarParticipante();
      return;
    }

    this.bebidaActual =
      this.bebidas.find((b) => b._id === bebidaConfig.bebidaId) || null;

    if (this.bebidaActual) {
      this.tiempoRestante = this.bebidaActual.tiempo_pedaleo;
      this.progresoPedaleo = 0;

      if (this.bebidaActual.link_video) {
        this.cargarVideoYouTube(this.bebidaActual.link_video);
      }

      this.iniciarTemporizador();
    } else {
      this.finalizarParticipante();
    }
  }

  iniciarTemporizador(): void {
    this.timerSubscription?.unsubscribe();

    const totalTiempo = this.bebidaActual?.tiempo_pedaleo || 60;
    let tiempoTranscurrido = 0;

    this.timerSubscription = interval(1000).subscribe(() => {
      tiempoTranscurrido++;
      this.tiempoRestante = totalTiempo - tiempoTranscurrido;
      this.progresoPedaleo = (tiempoTranscurrido / totalTiempo) * 100;

      if (this.tiempoRestante <= 0) {
        this.completarBebida();
      }
    });
  }

  completarBebida(): void {
    this.timerSubscription?.unsubscribe();
    this.audioService.reproducirSonidoExito();

    if (this.participanteActual) {
      this.participanteActual.bebidasCompletadas++;
    }

    setTimeout(() => {
      this.bebidaActualIndex++;
      this.cargarSiguienteBebida();
    }, 1500);
  }

  finalizarParticipante(): void {
    this.timerSubscription?.unsubscribe();
    this.gameService.detenerSimulacion();

    if (this.participanteActual) {
      this.participantesCompletados.push({ ...this.participanteActual });
      this.actualizarParticipanteBD(this.participanteActual);
    }

    this.participantesPorRegistrar.shift();

    if (this.participantesPorRegistrar.length > 0) {
      this.cargarSiguienteParticipante();
    } else {
      this.finalizarTodosParticipantes();
    }
  }

  cargarSiguienteParticipante(): void {
    const siguienteRegistro = this.participantesPorRegistrar[0];
    const participanteDB = this.participantes.find(
      (p) => p.numeroBicicleta === siguienteRegistro.numeroBicicleta
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

  finalizarTodosParticipantes(): void {
    this.etapaJuego = 'completado';

    if (this.player) {
      this.player.destroy();
      this.player = null;
    }

    this.rankingJuegoActual = [...this.participantesCompletados].sort(
      (a, b) => (b.caloriasQuemadas || 0) - (a.caloriasQuemadas || 0)
    );

    this.guardarHistorial();

    setTimeout(() => {
      this.paso = 'ranking';
    }, 5000);
  }

  async actualizarParticipanteBD(
    participante: ParticipanteJuego
  ): Promise<void> {
    const duracion = Math.floor(
      (new Date().getTime() - this.fechaInicioCarrera.getTime()) / 60000
    );
    const vatiosCalculados = parseFloat(
      (participante.velocidadPromedio * 10).toFixed(1)
    );

    const datosActualizar = {
      caloriasQuemadas: participante.caloriasQuemadas,
      vatiosGenerados: vatiosCalculados,
      duracionTotal: duracion,
      distanciaRecorrida: participante.distanciaRecorrida,
      velocidadPromedio: participante.velocidadPromedio,
      velocidadMaxima: participante.velocidadMaxima,
    };

    try {
      await this.participanteService
        .update(participante.id, datosActualizar)
        .toPromise();
    } catch (error) {
      console.error('Error actualizando participante:', error);
    }
  }

  guardarHistorial(): void {
    if (!this.sesion?.id) return;

    const historial = {
      sesion_id: this.sesion.id,
      fecha_inicio: this.fechaInicioCarrera.toISOString(),
      fecha_fin: new Date().toISOString(),
      duracion_minutos: Math.floor(
        (new Date().getTime() - this.fechaInicioCarrera.getTime()) / 60000
      ),
      juego_jugado: 'Bicilicuadora',
      parametros_utilizados: JSON.stringify({
        numeroBicicletas: this.config.numeroBicicletas,
        totalBebidas: this.bebidas.length,
      }),
      participantes_data: this.participantesCompletados,
      ranking_final: this.rankingJuegoActual,
      estadisticas_generales: {
        totalCalorias: this.calcularTotalCalorias(),
        totalVatios: this.calcularTotalVatios(),
      },
      creado_por: 1,
    };

    this.historialService.crearHistorial(historial).subscribe({
      next: () => console.log('✅ Historial guardado'),
      error: (error) => console.error('❌ Error guardando historial:', error),
    });
  }

  finalizarSesion(): void {
    if (this.sesion?.id) {
      this.sesionService.finalizarSesion(this.sesion.id).subscribe({
        next: () => this.router.navigate(['/home']),
        error: () => this.router.navigate(['/home']),
      });
    } else {
      this.router.navigate(['/home']);
    }
  }

  calcularCalorias(participante: ParticipanteJuego): number {
    return Math.round(participante.caloriasQuemadas || 0);
  }

  calcularVatios(participante: ParticipanteJuego): number {
    const velocidadPromedio = participante.velocidadPromedio || 0;
    return parseFloat((velocidadPromedio * 10).toFixed(1));
  }

  calcularTotalVatios(): number {
    if (this.participantesCompletados.length === 0) return 0;
    const sumaVatios = this.participantesCompletados.reduce(
      (sum, p) => sum + this.calcularVatios(p),
      0
    );
    return parseFloat(
      (sumaVatios / this.participantesCompletados.length).toFixed(1)
    );
  }

  calcularTotalCalorias(): number {
    return this.participantesCompletados.reduce(
      (sum, p) => sum + (p.caloriasQuemadas || 0),
      0
    );
  }

  calcularTotalBebidasRealizadas(): number {
    return this.participantesCompletados.reduce(
      (sum, p) => sum + (p.bebidasCompletadas || 0),
      0
    );
  }
}
