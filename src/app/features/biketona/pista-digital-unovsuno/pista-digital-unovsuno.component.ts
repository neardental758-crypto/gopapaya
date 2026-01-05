import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BleEsp32Service } from '../../services/ble-esp32.service';
import { BiketonaParticipantesService } from '../../services/biketona-participantes.service';
import { BiketonaService } from '../../services/biketona.service';
import { BrainBikeAudioService } from '../../services/audio/brain-bike-audio.service';
import { SesionService } from '../../services/sesion.service';

type BikeKey = 'bici1' | 'bici2';

interface Jugador {
  id: number;
  nombre: string;
  genero: 'masculino' | 'femenino' | 'otro';
  velocidad: number;
  velocidadMaxima: number;
  vueltaActual: number;
  distanciaRecorrida: number;
  distanciaReal: number;
  posicion: number;
  color: string;
  icono: string;
  mejorTiempo: number | null;
}

interface ConfiguracionCarrera {
  numeroBicicletas: number;
  numeroParticipantes: number;
  numeroVueltas: number;
  tipoCompetencia: string;
  tipoPista: string;
  numeroLlaves?: number;
}

interface Llave1v1 {
  id: number;
  jugadores: Jugador[];
  estado: 'pendiente' | 'en_curso' | 'finalizado';
}

interface BiciUI {
  key: BikeKey;
  label: string;
  status: string;
  conectado: boolean;
  deviceId: string;
}

@Component({
  selector: 'app-pista-digital-unovsuno',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pista-digital-unovsuno.component.html',
  styleUrl: './pista-digital-unovsuno.component.css',
})
export class PistaDigital1v1Component implements OnInit, OnDestroy {
  paso = 1;
  modalSexoJugadorId: number | null = null;
  participantes: Jugador[] = [];
  jugadores: Jugador[] = [];
  llaves: Llave1v1[] = [];
  llaveActual: Llave1v1 | null = null;
  configuracion: ConfiguracionCarrera = {
    numeroBicicletas: 2,
    numeroParticipantes: 2,
    numeroVueltas: 3,
    tipoCompetencia: '1v1',
    tipoPista: 'digital',
    numeroLlaves: 1,
  };
  currentLlaveIndex = 0;

  coloresVehiculos = [
    '#fbbf24',
    '#ef4444',
    '#22c55e',
    '#f97316',
    '#eab308',
    '#dc2626',
    '#10b981',
    '#fb923c',
  ];
  iconosVehiculos = ['🏎️', '🚗', '🚙', '🚕', '🏁', '🚓', '🚑', '🚐'];

  carreraIniciada = false;
  carreraPausada = false;
  tiempoTranscurrido = 0;
  intervaloCarrera: any;

  mostrarCuentaRegresiva = false;
  numeroCuentaRegresiva = 3;

  mostrarModalHeat = false;
  tituloModalHeat = '';
  textoModalHeat = '';
  modoModalHeat: 'inicio' | 'fin' = 'inicio';
  ganadorActual: Jugador | null = null;
  bicis: BiciUI[] = [
    {
      key: 'bici1',
      label: 'Bici 1',
      status: 'Desconectado',
      conectado: false,
      deviceId: '',
    },
    {
      key: 'bici2',
      label: 'Bici 2',
      status: 'Desconectado',
      conectado: false,
      deviceId: '',
    },
  ];
  idBiketona: string | null = null;
  participantesRegistrados: any[] = [];
  participantesRecientes: string[] = [];
  tiempoTotalTorneo = 0;
  Math = Math;

  constructor(
    private router: Router,
    private ble: BleEsp32Service,
    private biketonaParticipantesService: BiketonaParticipantesService,
    private biketonaService: BiketonaService,
    public audioService: BrainBikeAudioService,
    private sesionService: SesionService
  ) {}

  ngOnInit(): void {
    this.cargarConfiguracion();
    this.inicializarParticipantes();

    this.idBiketona = localStorage.getItem('biketonaId');

    const recientes = localStorage.getItem('participantesRecientes');
    if (recientes) {
      this.participantesRecientes = JSON.parse(recientes);
    }

    if (this.idBiketona) {
      this.cargarProgresoLlaves(this.idBiketona);
    }
  }

  private registrarResultadosLlave(llave: Llave1v1): void {
    const idBiketona = this.idBiketona;
    if (!idBiketona) {
      console.error('⌂ No hay idBiketona');
      return;
    }

    this.participantesRecientes = llave.jugadores.map((j) => j.nombre);
    localStorage.setItem(
      'participantesRecientes',
      JSON.stringify(this.participantesRecientes)
    );

    const MET = 8;
    const pesoKg = 70;
    const caloriasFactor = 0.0175 * MET * pesoKg;

    const participantesAGuardar: any[] = llave.jugadores.map((jugador) => {
      const tiempoIndividualSegundos =
        jugador.mejorTiempo || this.tiempoTranscurrido;
      const minutosIndividual = tiempoIndividualSegundos / 60;
      const velocidadPromedioKph =
        tiempoIndividualSegundos > 0
          ? (jugador.distanciaReal / tiempoIndividualSegundos) * 3.6
          : 0;

      return {
        idBiketona,
        nombre: jugador.nombre,
        genero:
          jugador.genero === 'masculino'
            ? 'M'
            : jugador.genero === 'femenino'
            ? 'F'
            : 'O',
        equipo: '',
        puntos: 0,
        tiempo: this.formatearTiempo(tiempoIndividualSegundos),
        velocidadPromedio: parseFloat(velocidadPromedioKph.toFixed(1)),
        velocidadMax: parseFloat(jugador.velocidadMaxima.toFixed(1)),
        calorias: parseFloat((caloriasFactor * minutosIndividual).toFixed(0)),
        vatios: parseFloat((velocidadPromedioKph * 10).toFixed(0)),
        posicion: jugador.posicion,
        llave: llave.id,
        estadoLlave: 'finalizada',
      };
    });

    participantesAGuardar.forEach((participante) => {
      this.biketonaParticipantesService
        .crearParticipante(participante)
        .subscribe({
          next: (p) => this.participantesRegistrados.push(p),
          error: (err) => console.error('⌂ Error guardando participante:', err),
        });
    });
  }

  esParticipanteReciente(participante: any): boolean {
    return this.participantesRecientes.includes(participante.nombre);
  }

  verificarFinCarrera(): void {
    const ganador = this.jugadores.find(
      (j) => j.vueltaActual > this.configuracion.numeroVueltas
    );
    if (!ganador) return;

    this.detenerCarrera();
    this.audioService.detenerMusicaFondo();
    this.audioService.reproducirSonidoLlegadaMeta();

    this.ganadorActual = ganador;

    this.participantes.forEach((p) => {
      const jugadorEnCarrera = this.jugadores.find((j) => j.id === p.id);
      if (!jugadorEnCarrera) return;

      if (p.id === ganador.id) {
        if (!p.mejorTiempo || this.tiempoTranscurrido < p.mejorTiempo) {
          p.mejorTiempo = this.tiempoTranscurrido;
        }
      } else if (!p.mejorTiempo) {
        p.mejorTiempo = this.tiempoTranscurrido + 5;
      }
    });

    if (this.llaveActual) {
      this.llaveActual.estado = 'finalizado';
      this.tiempoTotalTorneo += this.tiempoTranscurrido;
      this.registrarResultadosLlave(this.llaveActual);
    }

    const quedanMasLlaves = this.currentLlaveIndex < this.llaves.length - 1;

    this.abrirModalHeat(
      'Carrera finalizada',
      quedanMasLlaves
        ? `Ganador: ${ganador.nombre}. Al cerrar este cuadro pasaremos a la siguiente llave.`
        : `Ganador: ${ganador.nombre}. Todas las llaves han finalizado, al cerrar este cuadro verás el ranking final.`,
      'fin'
    );
  }

  obtenerEstadisticasParticipante(jugador: Jugador): any {
    const datosDB = this.participantesRegistrados.find(
      (p: any) => p.nombre === jugador.nombre
    );

    if (datosDB) {
      return {
        velocidadPromedio: datosDB.velocidadPromedio || '0.0',
        velocidadMaxima: datosDB.velocidadMax || '0.0',
        calorias: datosDB.calorias || '0',
        vatios: datosDB.vatios || '0',
        tiempoIndividual: datosDB.tiempo || '00:00',
      };
    }

    return {
      velocidadPromedio: '0.0',
      velocidadMaxima: '0.0',
      calorias: '0',
      vatios: '0',
      tiempoIndividual: '00:00',
    };
  }

  obtenerRanking(): Jugador[] {
    return this.participantes
      .filter((p) => p.nombre?.trim())
      .sort((a, b) => {
        if (a.mejorTiempo == null) return 1;
        if (b.mejorTiempo == null) return -1;
        return a.mejorTiempo - b.mejorTiempo;
      });
  }

  finalizarTorneo(): void {
    const idBiketona = this.idBiketona || localStorage.getItem('biketonaId');
    const idSesion = localStorage.getItem('sesionId');
    const userId = localStorage.getItem('userId');

    if (!idBiketona) {
      alert(
        'No se encontró el ID de la biketona. No se puede finalizar el torneo.'
      );
      return;
    }

    if (
      !confirm(
        '¿Deseas finalizar el torneo? No podrás seguir jugando más llaves.'
      )
    ) {
      return;
    }

    localStorage.removeItem('participantesRecientes');

    if (idSesion && userId) {
      const historial = this.construirHistorialSesion(
        idSesion,
        idBiketona,
        userId
      );

      this.biketonaService.guardarHistorialSesion(historial).subscribe({
        next: () => {
          this.biketonaService
            .actualizarEstado(idBiketona, 'finalizada')
            .subscribe({
              next: () => {
                this.sesionService
                  .finalizarSesion(parseInt(idSesion))
                  .subscribe({
                    next: () => {
                      alert('Torneo y sesión finalizados correctamente.');
                      this.router.navigate(['/home']);
                    },
                    error: () => {
                      alert(
                        'Torneo finalizado pero hubo error al cerrar la sesión.'
                      );
                      this.router.navigate(['/home']);
                    },
                  });
              },
              error: () => alert('Ocurrió un error al finalizar el torneo.'),
            });
        },
        error: () => alert('Error al guardar el historial de la sesión.'),
      });
    } else {
      this.biketonaService
        .actualizarEstado(idBiketona, 'finalizada')
        .subscribe({
          next: () => {
            alert('Torneo finalizado correctamente.');
            this.router.navigate(['/home']);
          },
          error: () => alert('Ocurrió un error al finalizar el torneo.'),
        });
    }
  }

  obtenerRankingSesion(): any[] {
    return this.participantesRegistrados.slice().sort((a: any, b: any) => {
      const tiempoA = this.convertirTiempoASegundos(a.tiempo || '00:00');
      const tiempoB = this.convertirTiempoASegundos(b.tiempo || '00:00');
      return tiempoA - tiempoB;
    });
  }

  private convertirTiempoASegundos(tiempo: string): number {
    const [mins, secs] = tiempo.split(':').map(Number);
    return mins * 60 + (secs || 0);
  }

  private cargarProgresoLlaves(idBiketona: string): void {
    this.biketonaParticipantesService.getByBiketona(idBiketona).subscribe({
      next: (participantesDB) => {
        this.participantesRegistrados = participantesDB || [];

        if (participantesDB.length === 0) {
          this.currentLlaveIndex = 0;
          return;
        }

        const jugadoresPorLlave = this.configuracion.numeroBicicletas || 2;
        const ultimosParticipantes = participantesDB.slice(-jugadoresPorLlave);
      },
    });
  }

  cargarConfiguracion(): void {
    const config = localStorage.getItem('configuracionCarrera');
    if (config) {
      this.configuracion = JSON.parse(config);
    }
  }

  inicializarParticipantes(): void {
    this.participantes = [];
    for (let i = 0; i < this.configuracion.numeroParticipantes; i++) {
      this.participantes.push({
        id: i + 1,
        nombre: '',
        genero: 'masculino',
        velocidad: 0,
        velocidadMaxima: 0,
        vueltaActual: 1,
        distanciaRecorrida: 0,
        distanciaReal: 0,
        posicion: i + 1,
        color: this.coloresVehiculos[i % this.coloresVehiculos.length],
        icono: this.iconosVehiculos[i % this.iconosVehiculos.length],
        mejorTiempo: null,
      });
    }

    this.construirLlaves();

    this.currentLlaveIndex = 0;

    this.jugadores = [];
    this.llaveActual = null;
    this.tiempoTranscurrido = 0;
    this.tiempoTotalTorneo = 0;
    this.carreraIniciada = false;
    this.carreraPausada = false;
  }

  abrirSelectSexo(jugadorId: number): void {
    this.modalSexoJugadorId = jugadorId;
  }

  cerrarSelectSexo(): void {
    this.modalSexoJugadorId = null;
  }

  seleccionarGenero(jugador: Jugador, genero: Jugador['genero']): void {
    jugador.genero = genero;
    this.modalSexoJugadorId = null;
  }

  get llaveEnPantalla(): Llave1v1 | null {
    if (!this.llaves.length) return null;
    return this.llaves[this.currentLlaveIndex] ?? null;
  }

  puedePasarASiguienteLlave(): boolean {
    const llave = this.llaveEnPantalla;
    if (!llave) return false;
    if (llave.estado !== 'finalizado') return false;
    return this.currentLlaveIndex < this.llaves.length - 1;
  }

  siguienteLlave(): void {
    if (!this.puedePasarASiguienteLlave()) return;
    this.currentLlaveIndex++;
  }

  construirLlaves(): void {
    this.llaves = [];
    const step = this.configuracion.numeroBicicletas;

    for (let i = 0; i < this.participantes.length; i += step) {
      const grupo = this.participantes.slice(i, i + step);
      this.llaves.push({
        id: this.llaves.length + 1,
        jugadores: grupo,
        estado: 'pendiente',
      });
    }
  }

  private getBiciUI(key: BikeKey): BiciUI {
    const b = this.bicis.find((x) => x.key === key)!;
    return b;
  }

  estaBiciConectada(key: BikeKey): boolean {
    return this.bicis.find((x) => x.key === key)!.conectado;
  }

  todasBicisNecesariasConectadas(): boolean {
    return this.bicis.every((b) => b.conectado);
  }

  irARegistroParticipantes(): void {
    if (!this.todasBicisNecesariasConectadas()) {
      alert('Debes conectar las dos bicicletas antes de continuar.');
      return;
    }
    this.paso = 2;
  }

  puedeIniciarLlave(llave: Llave1v1): boolean {
    if (llave.estado === 'finalizado') return false;
    if (!this.todasBicisNecesariasConectadas()) return false;
    return llave.jugadores.every((j) => j.nombre && j.nombre.trim() !== '');
  }

  iniciarCarreraLlave(llave: Llave1v1): void {
    if (!this.todasBicisNecesariasConectadas()) {
      alert('Conecta las dos bicicletas (ESP32) antes de iniciar la carrera.');
      return;
    }

    if (!this.puedeIniciarLlave(llave)) {
      alert(
        'Completa los nombres de los participantes de esta llave para poder iniciar.'
      );
      return;
    }

    if (!this.idBiketona) {
      alert(
        'No se encontró la configuración de la biketona (idBiketona). Vuelve a crear la carrera desde el setup.'
      );
      return;
    }

    const index = this.llaves.findIndex((l) => l.id === llave.id);
    if (index !== -1) {
      this.currentLlaveIndex = index;
    }

    this.jugadores = llave.jugadores;
    this.llaveActual = llave;

    this.tiempoTranscurrido = 0;
    this.carreraPausada = false;
    this.carreraIniciada = false;

    this.jugadores.forEach((j, idx) => {
      j.velocidad = 0;
      j.velocidadMaxima = 0;
      j.vueltaActual = 1;
      j.distanciaRecorrida = 0;
      j.distanciaReal = 0;
      j.posicion = idx + 1;
    });

    llave.estado = 'en_curso';
    this.ganadorActual = null;
    this.paso = 3;

    this.audioService.reproducirSonidoTrompetaInicio();

    this.abrirModalHeat(
      `Carrera Llave ${llave.id}`,
      'Presiona "Iniciar carrera" para comenzar este enfrentamiento.',
      'inicio'
    );
  }

  abrirModalHeat(
    titulo: string,
    texto: string,
    modo: 'inicio' | 'fin' = 'inicio'
  ): void {
    this.tituloModalHeat = titulo;
    this.textoModalHeat = texto;
    this.modoModalHeat = modo;
    this.mostrarModalHeat = true;
  }

  cerrarModalHeat(): void {
    this.mostrarModalHeat = false;
  }

  iniciarHeat(): void {
    this.cerrarModalHeat();
    this.iniciarCuentaRegresiva();
  }

  async buscarBici(key: BikeKey) {
    if (key === 'bici2') {
      const bici2UI = this.getBiciUI('bici2');
      bici2UI.status = 'Comparte ESP32 con Bici 1';
      bici2UI.deviceId = '3';
      return;
    }

    const biciUI = this.getBiciUI(key);
    try {
      const device = await this.ble.requestDevice(key);
      biciUI.status = `Dispositivo seleccionado: ${
        device.name ?? 'sin nombre'
      }`;
      biciUI.deviceId = device.id;
    } catch (e: any) {
      console.error(`Error buscando dispositivo para ${key}`, e);
      biciUI.status = 'Error buscando dispositivo';
      biciUI.conectado = false;
      biciUI.deviceId = '';
    }
  }

  async conectarBici(key: BikeKey) {
    const biciUI = this.getBiciUI(key);

    if (key === 'bici2') {
      biciUI.status = 'Conectado (usa datos de Bici 1)';
      biciUI.conectado = true;
      biciUI.deviceId = '3';
      return;
    }

    try {
      await this.ble.connect(key);
      biciUI.status = 'Conectado a ESP32';
      biciUI.conectado = true;

      this.ble
        .readValue(key, 'id')
        .then((id) => (biciUI.deviceId = id))
        .catch(() => {});

      await this.ble.subscribe(key, 'vel', (v) => {
        const [vel1, vel2] = v.split(',').map((val) => parseFloat(val) || 0);
        if (this.jugadores[0]) this.jugadores[0].velocidad = vel1;
        if (this.jugadores[1]) this.jugadores[1].velocidad = vel2;
      });

      const bici2UI = this.getBiciUI('bici2');
      bici2UI.status = 'Conectado (usa datos de Bici 1)';
      bici2UI.conectado = true;
      bici2UI.deviceId = '3';
    } catch (e: any) {
      console.error(`Error al conectar BLE (${key})`, e);
      biciUI.status = 'Error al conectar';
      biciUI.conectado = false;
    }
  }

  desconectarBici(key: BikeKey) {
    const biciUI = this.getBiciUI(key);
    this.ble.disconnect(key);
    biciUI.conectado = false;
    biciUI.status = 'Desconectado';
    biciUI.deviceId = '';
  }

  iniciarCuentaRegresiva(): void {
    this.mostrarCuentaRegresiva = true;
    this.numeroCuentaRegresiva = 3;

    const intervaloCuenta = setInterval(() => {
      this.numeroCuentaRegresiva--;

      if (this.numeroCuentaRegresiva < 0) {
        clearInterval(intervaloCuenta);
        this.mostrarCuentaRegresiva = false;
        this.carreraIniciada = true;
        this.iniciarSimulacion();
      }
    }, 1000);
  }

  iniciarSimulacion(): void {
    this.audioService.reproducirMusicaCarrera();

    this.intervaloCarrera = setInterval(() => {
      if (this.carreraPausada) return;

      this.tiempoTranscurrido++;

      this.jugadores.forEach((jugador) => {
        const velocidadKph = jugador.velocidad || 0;

        if (velocidadKph > jugador.velocidadMaxima) {
          jugador.velocidadMaxima = velocidadKph;
        }

        const velocidadMps = velocidadKph / 3.6;
        const distanciaMetros = velocidadMps;

        jugador.distanciaReal += distanciaMetros;
        jugador.distanciaRecorrida += distanciaMetros;

        if (jugador.distanciaRecorrida >= 100) {
          jugador.distanciaRecorrida -= 100;
          jugador.vueltaActual++;
        }
      });

      this.actualizarPosiciones();
      this.verificarFinCarrera();
    }, 1000);
  }

  getCarStyle(jugador: Jugador) {
    const progress = jugador.distanciaRecorrida / 100;
    const angle = progress * 2 * Math.PI - Math.PI / 2;
    const r = 38;
    const cx = 50;
    const cy = 50;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);

    return {
      left: `${x}%`,
      top: `${y}%`,
      filter: `drop-shadow(0 0 8px ${jugador.color})`,
    } as any;
  }

  actualizarPosiciones(): void {
    const ordenados = [...this.jugadores].sort((a, b) => {
      if (b.vueltaActual !== a.vueltaActual) {
        return b.vueltaActual - a.vueltaActual;
      }
      return b.distanciaRecorrida - a.distanciaRecorrida;
    });

    ordenados.forEach((jugador, index) => {
      const original = this.jugadores.find((j) => j.id === jugador.id);
      if (original) {
        original.posicion = index + 1;
      }
    });
  }

  pausarReanudarCarrera(): void {
    this.carreraPausada = !this.carreraPausada;
  }

  detenerCarrera(): void {
    if (this.intervaloCarrera) {
      clearInterval(this.intervaloCarrera);
      this.intervaloCarrera = null;
    }
    this.carreraIniciada = false;
  }

  reiniciarCarrera(): void {
    this.detenerCarrera();
    this.tiempoTranscurrido = 0;
    this.jugadores.forEach((j) => {
      j.velocidad = 0;
      j.vueltaActual = 1;
      j.distanciaRecorrida = 0;
    });
    this.actualizarPosiciones();
  }

  formatearTiempo(segundos: number): string {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }

  volverAlInicio(): void {
    this.detenerCarrera();
    this.paso = 1;
    this.inicializarParticipantes();
  }

  nuevo1v1(): void {
    this.router.navigate(['/setup']);
  }

  volver(): void {
    if (this.paso === 1) {
      this.router.navigate(['/setup']);
    } else if (this.paso === 2) {
      this.paso = 1;
    } else if (this.paso === 3) {
      if (
        confirm(
          '¿Estás seguro de volver? Se perderá el progreso de la carrera actual'
        )
      ) {
        this.paso = 2;
      }
    } else if (this.paso === 4) {
      this.inicializarParticipantes();
      this.paso = 1;
    }
  }

  private guardarHistorialYMostrarRanking(): void {
    const idBiketona = this.idBiketona || localStorage.getItem('biketonaId');
    const idSesion = localStorage.getItem('sesionId');
    const userId = localStorage.getItem('userId');

    if (!idBiketona || !idSesion || !userId) {
      console.error('❌ Faltan datos para historial:', {
        idBiketona,
        idSesion,
        userId,
      });
      this.paso = 4;
      return;
    }

    const historial = this.construirHistorialSesion(
      idSesion,
      idBiketona,
      userId
    );

    this.biketonaService.guardarHistorialSesion(historial).subscribe({
      next: () => {
        this.paso = 4;
      },
      error: (err) => {
        console.error('❌ Error guardando historial:', err);
        this.paso = 4;
      },
    });
  }

  cerrarModalHeatYVolverALlaves(): void {
    this.mostrarModalHeat = false;
    this.detenerCarrera();
    this.tiempoTranscurrido = 0;
    this.jugadores = [];
    this.llaveActual = null;
    this.ganadorActual = null;

    if (this.currentLlaveIndex < this.llaves.length - 1) {
      this.currentLlaveIndex++;
      this.paso = 2;
    } else {
      this.guardarHistorialYMostrarRanking();
    }
  }
  private construirHistorialSesion(
    idSesion: string,
    idBiketona: string,
    userId: string
  ): any {
    const ranking = this.obtenerRanking();
    const duracionMinutos = Math.floor(this.tiempoTotalTorneo / 60);

    const participantesData = this.participantes
      .filter((p) => p.nombre?.trim())
      .map((p) => {
        const datosDB = this.participantesRegistrados.find(
          (pDB: any) => pDB.nombre === p.nombre
        );
        return {
          id: p.id,
          nombre: p.nombre,
          genero: p.genero,
          velocidadPromedio: datosDB?.velocidadPromedio || '0.0',
          velocidadMaxima:
            datosDB?.velocidadMax || p.velocidadMaxima.toFixed(1),
          calorias: datosDB?.calorias || '0',
          vatios: datosDB?.vatios || '0',
          mejorTiempo: p.mejorTiempo || 0,
        };
      });

    const rankingFinal = ranking.map((p, index) => ({
      posicion: index + 1,
      id: p.id,
      nombre: p.nombre,
      puntos: p.mejorTiempo || 0,
    }));

    return {
      sesion_id: parseInt(idSesion),
      juego_id: idBiketona,
      fecha_inicio: new Date(
        Date.now() - this.tiempoTotalTorneo * 1000
      ).toISOString(),
      fecha_fin: new Date().toISOString(),
      duracion_minutos: duracionMinutos,
      juego_jugado: 'Biketona',
      parametros_utilizados: JSON.stringify(this.configuracion),
      participantes_data: JSON.stringify(participantesData),
      ranking_final: JSON.stringify(rankingFinal),
      estadisticas_generales: JSON.stringify({
        duracionTotal: this.tiempoTotalTorneo,
        totalParticipantes: participantesData.length,
        totalLlaves: this.llaves.length,
        velocidadPromedioGeneral: this.calcularVelocidadPromedioGeneral(),
        distanciaPromedioGeneral: this.calcularDistanciaPromedioGeneral(),
      }),
      creado_por: parseInt(userId),
    };
  }

  private calcularVelocidadPromedioGeneral(): number {
    const participantesConDatos = this.participantesRegistrados.filter(
      (p: any) => p.velocidadPromedio && parseFloat(p.velocidadPromedio) > 0
    );

    if (participantesConDatos.length === 0) return 0;

    const sumaVelocidades = participantesConDatos.reduce(
      (sum: number, p: any) => sum + parseFloat(p.velocidadPromedio || '0'),
      0
    );

    return parseFloat(
      (sumaVelocidades / participantesConDatos.length).toFixed(1)
    );
  }

  private calcularDistanciaPromedioGeneral(): number {
    const participantesConDatos = this.participantesRegistrados.filter(
      (p: any) => p.distanciaReal && parseFloat(p.distanciaReal) > 0
    );

    if (participantesConDatos.length === 0) return 0;

    const sumaDistancias = participantesConDatos.reduce(
      (sum: number, p: any) => sum + parseFloat(p.distanciaReal || '0'),
      0
    );

    return parseFloat(
      (sumaDistancias / participantesConDatos.length).toFixed(2)
    );
  }

  ngOnDestroy(): void {
    this.detenerCarrera();
    this.ble.disconnectAll();
  }
  getJugadorPorId(id: number): Jugador | undefined {
    return this.llaveEnPantalla?.jugadores.find((j) => j.id === id);
  }
  getCarPosition(jugador: Jugador): { x: number; y: number } {
    const progress = jugador.distanciaRecorrida / 100;
    const angle = progress * 2 * Math.PI - Math.PI / 2;
    const rx = 350;
    const ry = 145;
    const cx = 500;
    const cy = 225;
    return {
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    };
  }

  getCarRotation(jugador: Jugador): number {
    const progress = jugador.distanciaRecorrida / 100;
    const angle = progress * 2 * Math.PI - Math.PI / 2;
    return (angle * 180) / Math.PI + 90;
  }
}
