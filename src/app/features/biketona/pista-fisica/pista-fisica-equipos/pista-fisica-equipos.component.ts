import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BrainBikeAudioService } from '../../../services/audio/brain-bike-audio.service';
import { BiketonaParticipantesService } from '../../../services/biketona-participantes.service';
import { BiketonaService } from '../../../services/biketona.service';
import { BleEsp32Service } from '../../../services/ble-esp32.service';
import { BleEsp32PistaFisicaService } from '../../../services/pista-fisica/ble-esp32-pista-fisica.service';
import { SesionService } from '../../../services/sesion.service';

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
  equipoId: number | null;
  equipoNombre?: string;
  video: string;
  velocidadAcumulada?: number;
  muestrasVelocidad?: number;
}

interface ConfiguracionCarrera {
  numeroBicicletas: number;
  numeroParticipantes: number;
  numeroVueltas: number;
  tipoCompetencia: string;
  tipoPista: string;
}

interface EquipoCampeonato {
  id: number; // 1, 2
  nombre: string;
  color: string;
  llavesGanadas: number;
}

interface LlaveEquipos {
  id: number;
  ronda: number;
  indexEnRonda: number;
  jugadores: Jugador[];
  estado: 'pendiente' | 'en_curso' | 'finalizado';
  equipoGanadorId?: number | null;
}

interface BiciUI {
  key: BikeKey;
  label: string;
  status: string;
  conectado: boolean;
  deviceId: string;
}

@Component({
  selector: 'app-pista-fisica-equipos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pista-fisica-equipos.component.html',
  styleUrl: './pista-fisica-equipos.component.css',
})
export class PistaFisicaEquiposComponent implements OnInit, OnDestroy {
  paso = 1;

  modalSexoJugadorId: number | null = null;
  modalEquipoJugadorId: number | null = null;
  Math = Math;

  fondoCarrera = 'assets/images/fondo_carrera_1.jpg';

  participantes: Jugador[] = [];
  jugadores: Jugador[] = [];
  llaves: LlaveEquipos[] = [];
  rondaActual: { numero: number; llaves: LlaveEquipos[] } | null = null;
  currentLlaveIndex = 0;
  llaveActual: LlaveEquipos | null = null;

  longitudPistaMetros = 100;

  configuracion: ConfiguracionCarrera = {
    numeroBicicletas: 2,
    numeroParticipantes: 4,
    numeroVueltas: 3,
    tipoCompetencia: 'campeonato-equipos',
    tipoPista: 'digital',
  };

  estadoESP32: number = 0;
  mostrarModalCalibracion = false;
  private sensorAnterior1 = 0;
  private sensorAnterior2 = 0;

  participantesRegistrados: any[] = [];
  participantesRecientes: string[] = [];
  tiempoTotalTorneo = 0;

  equipos: EquipoCampeonato[] = [
    { id: 1, nombre: '', color: '#38bdf8', llavesGanadas: 0 },
    { id: 2, nombre: '', color: '#f97316', llavesGanadas: 0 },
  ];

  coloresVehiculos = ['#ffffff', '#3b82f6'];

  iconosVehiculos = [
    'assets/images/carro_blanco.png',
    'assets/images/carro_azul.png',
  ];

  videosVehiculos = [
    'assets/images/carro_movimiento_blanco.mp4',
    'assets/images/carro_movimiento_azul.mp4',
  ];

  fondosCarrera = [
    'assets/images/carro_movimiento_blanco.mp4',
    'assets/images/carro_movimiento_azul.mp4',
  ];

  coloresVehiculosFisicos = ['#ffffff', '#3b82f6'];

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
  cuentaRegresivaIniciada = false;

  teamColors = [
    { name: 'Rojo', value: '#ef4444' },
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Verde', value: '#22c55e' },
    { name: 'Amarillo', value: '#eab308' },
  ];

  getIndiceColorEquipo(equipoId: number | null | undefined): number {
    if (!equipoId) return 0;
    const indice = this.jugadores.findIndex((j) => j.equipoId === equipoId);
    return indice !== -1 ? indice : 0;
  }
  getColorEquipo(equipoId: number | null | undefined): string {
    if (!equipoId) return '#22c55e';
    const equipo = this.equipos.find((e) => e.id === equipoId);
    return equipo?.color || '#22c55e';
  }

  constructor(
    private router: Router,
    private ble: BleEsp32PistaFisicaService,
    private biketonaService: BiketonaService,
    private participantesService: BiketonaParticipantesService,
    public audioService: BrainBikeAudioService,
    private sesionService: SesionService,
  ) {}

  ngOnInit(): void {
    this.cargarConfiguracion();
    this.inicializarParticipantes();

    this.idBiketona = localStorage.getItem('biketonaId') || null;

    const recientes = localStorage.getItem('participantesRecientes');
    if (recientes) {
      this.participantesRecientes = JSON.parse(recientes);
    }

    if (this.idBiketona) {
      this.cargarProgresoLlaves(this.idBiketona);
    }
  }

  cargarConfiguracion(): void {
    const config = localStorage.getItem('configuracionCarrera');
    if (config) {
      this.configuracion = JSON.parse(config);
    }
  }

  volverAlInicio(): void {
    this.detenerCarrera();
    this.paso = 1;
    this.inicializarParticipantes();
  }

  getJugadorPorId(id: number): Jugador | undefined {
    const llave = this.llaveEnPantalla;
    if (!llave) return undefined;
    const jugador = llave.jugadores.find((j) => j.id === id);
    return jugador;
  }

  ngOnDestroy(): void {
    this.detenerCarrera();
    this.ble.disconnectAll();
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
        color: this.coloresVehiculos[i % 2],
        icono: this.iconosVehiculos[i % 2],
        video: this.videosVehiculos[i % 2],
        mejorTiempo: null,
        equipoId: null,
        equipoNombre: '',
      });
    }
    this.llaves = [];
    this.rondaActual = null;
    this.currentLlaveIndex = 0;
    this.jugadores = [];
    this.llaveActual = null;
    this.tiempoTranscurrido = 0;
    this.carreraIniciada = false;
    this.carreraPausada = false;
  }

  puedeAvanzarRegistroEquipos(): boolean {
    return (
      this.equipos[0].nombre.trim().length > 0 &&
      this.equipos[1].nombre.trim().length > 0
    );
  }

  irARegistroEquipos(): void {
    if (!this.todasBicisNecesariasConectadas()) {
      alert('Debes conectar las dos bicicletas antes de registrar equipos.');
      return;
    }
    this.paso = 2;
  }

  irARegistroParticipantes(): void {
    if (!this.puedeAvanzarRegistroEquipos()) {
      alert('Debes asignar un nombre a los dos equipos antes de continuar.');
      return;
    }

    this.construirLlavesPrimeraRonda();
    this.paso = 3;
  }

  abrirSelectEquipo(jugadorId: number): void {
    this.modalEquipoJugadorId = jugadorId;
  }

  cerrarSelectEquipo(): void {
    this.modalEquipoJugadorId = null;
  }

  seleccionarEquipo(jugador: Jugador, equipoId: number): void {
    const equipo = this.equipos.find((e) => e.id === equipoId);
    jugador.equipoId = equipoId;
    jugador.equipoNombre = equipo?.nombre || '';
    this.modalEquipoJugadorId = null;
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

  get llaveEnPantalla(): LlaveEquipos | null {
    if (!this.rondaActual) return null;
    return this.rondaActual.llaves[this.currentLlaveIndex] || null;
  }

  construirLlavesPrimeraRonda(): void {
    this.llaves = [];
    let contadorLlaves = 0;
    const step = this.configuracion.numeroBicicletas;

    for (let i = 0; i < this.participantes.length; i += step) {
      const grupo = this.participantes.slice(i, i + step);
      this.llaves.push({
        id: ++contadorLlaves,
        ronda: 1,
        indexEnRonda: contadorLlaves - 1,
        jugadores: grupo,
        estado: 'pendiente',
        equipoGanadorId: null,
      });
    }

    this.rondaActual = {
      numero: 1,
      llaves: this.llaves.filter((l) => l.ronda === 1),
    };
    this.currentLlaveIndex = 0;
  }

  puedePasarASiguienteLlave(): boolean {
    if (!this.rondaActual) return false;
    const llave = this.rondaActual.llaves[this.currentLlaveIndex];
    if (!llave) return false;
    if (llave.estado !== 'finalizado') return false;
    return this.currentLlaveIndex < this.rondaActual.llaves.length - 1;
  }

  siguienteLlave(): void {
    if (!this.puedePasarASiguienteLlave()) return;
    this.currentLlaveIndex++;
  }

  todasLlavesFinalizadas(): boolean {
    return (
      this.llaves.length > 0 &&
      this.llaves.every((l) => l.estado === 'finalizado')
    );
  }

  private getBiciUI(key: BikeKey): BiciUI {
    const b = this.bicis.find((x) => x.key === key)!;
    return b;
  }

  estaBiciConectada(key: BikeKey): boolean {
    return this.getBiciUI(key).conectado;
  }

  todasBicisNecesariasConectadas(): boolean {
    return this.bicis.every((b) => b.conectado);
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

      await this.ble.subscribeSensores(key, (sensor1, sensor2, estadoID) => {
        this.estadoESP32 = estadoID;
        this.procesarSensores(sensor1, sensor2, estadoID);
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

  private procesarSensores(
    sensor1: number,
    sensor2: number,
    estadoID: number,
  ): void {
    if (estadoID === 1 || estadoID === 2) {
      this.mostrarModalCalibracion = true;
      this.sensorAnterior1 = sensor1;
      this.sensorAnterior2 = sensor2;
      return;
    }

    if (estadoID === 3) {
      this.mostrarModalCalibracion = false;
      if (!this.cuentaRegresivaIniciada) {
        this.cuentaRegresivaIniciada = true;
        this.iniciarCuentaRegresiva();
      }
      return;
    }

    if (!this.carreraIniciada || this.carreraPausada) {
      this.sensorAnterior1 = sensor1;
      this.sensorAnterior2 = sensor2;
      return;
    }

    const distanciaPorVuelta = 100;

    if (sensor1 === 1 && this.sensorAnterior1 === 0) {
      if (this.jugadores[0]) {
        this.jugadores[0].vueltaActual++;
        this.jugadores[0].distanciaRecorrida += distanciaPorVuelta;
        this.jugadores[0].distanciaReal += distanciaPorVuelta;
      }
    }

    if (sensor2 === 1 && this.sensorAnterior2 === 0) {
      if (this.jugadores[1]) {
        this.jugadores[1].vueltaActual++;
        this.jugadores[1].distanciaRecorrida += distanciaPorVuelta;
        this.jugadores[1].distanciaReal += distanciaPorVuelta;
      }
    }

    this.sensorAnterior1 = sensor1;
    this.sensorAnterior2 = sensor2;

    this.actualizarPosiciones();
  }

  desconectarBici(key: BikeKey) {
    const biciUI = this.getBiciUI(key);
    this.ble.disconnect(key);
    biciUI.conectado = false;
    biciUI.status = 'Desconectado';
    biciUI.deviceId = '';
  }

  volver(): void {
    if (this.paso === 1) {
      this.router.navigate(['/setup']);
    } else if (this.paso === 2) {
      this.paso = 1;
    } else if (this.paso === 3) {
      this.paso = 2;
    } else if (this.paso === 4) {
      if (
        confirm(
          '¿Estás seguro de volver? Se perderá el progreso de la carrera actual',
        )
      ) {
        this.paso = 3;
      }
    } else if (this.paso === 5) {
      this.router.navigate(['/setup']);
    }
  }

  irARegistroParticipantesDesdePaso2(): void {
    this.irARegistroParticipantes();
  }

  puedeIniciarLlave(llave: LlaveEquipos): boolean {
    if (llave.estado === 'finalizado') return false;
    if (!this.todasBicisNecesariasConectadas()) return false;
    return llave.jugadores.every(
      (j) => j.nombre && j.nombre.trim() !== '' && j.equipoId !== null,
    );
  }

  equiposCompletos(): boolean {
    if (!this.equipos || this.equipos.length < 2) return false;

    return this.equipos.every((e) => e.nombre && e.nombre.trim().length > 0);
  }

  getNombreEquipo(equipoId: number | null | undefined): string {
    if (!equipoId) return '';
    const equipo = this.equipos.find((e) => e.id === equipoId);
    return equipo ? equipo.nombre : '';
  }

  iniciarCarreraLlave(llave: LlaveEquipos): void {
    if (!this.todasBicisNecesariasConectadas()) {
      alert('Conecta las dos bicicletas (ESP32) antes de iniciar la carrera.');
      return;
    }

    if (!this.puedeIniciarLlave(llave)) {
      alert(
        'Completa los nombres y equipos de los participantes para iniciar la llave.',
      );
      return;
    }

    if (this.rondaActual) {
      const idx = this.rondaActual.llaves.findIndex((l) => l.id === llave.id);
      if (idx !== -1) {
        this.currentLlaveIndex = idx;
      }
    }

    this.detenerCarrera();

    this.jugadores = llave.jugadores;
    this.llaveActual = llave;

    this.tiempoTranscurrido = 0;
    this.carreraPausada = false;
    this.carreraIniciada = false;
    this.cuentaRegresivaIniciada = false;
    this.mostrarCuentaRegresiva = false;
    this.mostrarModalCalibracion = false;
    this.estadoESP32 = 0;
    this.ganadorActual = null;

    this.jugadores.forEach((j, idx) => {
      j.velocidad = 0;
      j.velocidadMaxima = 0;
      j.velocidadAcumulada = 0;
      j.muestrasVelocidad = 0;
      j.vueltaActual = 1;
      j.distanciaRecorrida = 0;
      j.distanciaReal = 0;
      j.posicion = idx + 1;
    });

    this.sensorAnterior1 = 0;
    this.sensorAnterior2 = 0;

    llave.estado = 'en_curso';
    this.paso = 4;

    this.iniciarHeat();
  }

  async iniciarHeat(): Promise<void> {
    try {
      await this.ble.enviarComando('bici1', '01AA');
      this.mostrarModalCalibracion = true;
    } catch (error) {
      console.error('Error enviando comando 01AA:', error);
      alert('Error al iniciar calibración de los autos');
    }
  }

  iniciarCuentaRegresiva(): void {
    this.mostrarCuentaRegresiva = true;
    this.numeroCuentaRegresiva = 3;

    this.audioService.reproducirMusicaCarrera();

    const intervaloCuenta = setInterval(() => {
      if (this.numeroCuentaRegresiva > 0) {
        this.audioService.reproducirSonidoCuentaRegresiva();
      }

      this.numeroCuentaRegresiva--;

      if (this.numeroCuentaRegresiva < 0) {
        clearInterval(intervaloCuenta);
        this.audioService.reproducirSonidoMotorAcelerando();
        setTimeout(() => {
          this.audioService.reproducirSonidoBocinaCarrera();
          this.mostrarCuentaRegresiva = false;
          this.carreraIniciada = true;
          this.iniciarSimulacion();
        }, 500);
      }
    }, 1000);
  }

  iniciarSimulacion(): void {
    this.intervaloCarrera = setInterval(() => {
      if (this.carreraPausada) return;

      this.tiempoTranscurrido++;

      this.jugadores.forEach((jugador) => {
        const velocidadKph = jugador.velocidad || 0;

        if (velocidadKph > jugador.velocidadMaxima) {
          jugador.velocidadMaxima = velocidadKph;
        }

        if (velocidadKph > 0) {
          jugador.velocidadAcumulada =
            (jugador.velocidadAcumulada || 0) + velocidadKph;
          jugador.muestrasVelocidad = (jugador.muestrasVelocidad || 0) + 1;
        }
      });

      this.actualizarPosiciones();
      this.verificarFinCarrera();
    }, 1000);
  }

  getIndiceColorJugador(jugador: Jugador): number {
    const indice = this.jugadores.findIndex((j) => j.id === jugador.id);
    return indice !== -1 ? indice : 0;
  }

  detenerCarrera(): void {
    if (this.intervaloCarrera) {
      clearInterval(this.intervaloCarrera);
      this.intervaloCarrera = null;
    }
    this.carreraIniciada = false;
  }

  async reiniciarCarrera(): Promise<void> {
    if (
      !confirm(
        '¿Seguro que deseas reiniciar la carrera? Se perderá el progreso actual.',
      )
    ) {
      return;
    }

    this.detenerCarrera();

    try {
      await this.ble.enviarComando('bici1', '10AA');
    } catch (error) {
      console.error('Error enviando comando 10AA:', error);
    }

    this.tiempoTranscurrido = 0;
    this.estadoESP32 = 0;
    this.cuentaRegresivaIniciada = false;
    this.mostrarModalCalibracion = false;
    this.mostrarCuentaRegresiva = false;

    this.jugadores.forEach((j) => {
      j.velocidad = 0;
      j.velocidadMaxima = 0;
      j.velocidadAcumulada = 0;
      j.muestrasVelocidad = 0;
      j.vueltaActual = 1;
      j.distanciaRecorrida = 0;
      j.distanciaReal = 0;
    });

    this.actualizarPosiciones();

    this.paso = 3;
  }

  actualizarPosiciones(): void {
    const ordenados = [...this.jugadores].sort((a, b) => {
      if (a.vueltaActual !== b.vueltaActual) {
        return b.vueltaActual - a.vueltaActual;
      }
      return b.distanciaReal - a.distanciaReal;
    });

    ordenados.forEach((jugador, index) => {
      jugador.posicion = index + 1;
    });
  }
  async verificarFinCarrera(): Promise<void> {
    const distanciaTotal = this.configuracion.numeroVueltas * 100;

    this.jugadores.forEach((jugador) => {
      if (jugador.distanciaReal >= distanciaTotal) {
        jugador.distanciaReal = distanciaTotal;
        jugador.vueltaActual = this.configuracion.numeroVueltas + 1;

        if (!jugador.mejorTiempo) {
          jugador.mejorTiempo = this.tiempoTranscurrido;
        }
      }
    });

    const jugador1Termino = this.jugadores[0]?.distanciaReal >= distanciaTotal;
    const jugador2Termino = this.jugadores[1]?.distanciaReal >= distanciaTotal;

    if (jugador1Termino && !jugador2Termino && this.estadoESP32 === 4) {
      try {
        await this.ble.enviarComando('bici1', '01AF');
      } catch (error) {
        console.error('Error enviando comando 01AF:', error);
      }
    }

    if (jugador2Termino && !jugador1Termino && this.estadoESP32 === 4) {
      try {
        await this.ble.enviarComando('bici1', '01FA');
      } catch (error) {
        console.error('Error enviando comando 01FA:', error);
      }
    }

    if (!jugador1Termino && !jugador2Termino) return;

    const todosTerminaron = jugador1Termino && jugador2Termino;

    if (!todosTerminaron) return;

    this.detenerCarrera();

    const ganador = this.jugadores
      .filter((j) => j.mejorTiempo != null)
      .sort((a, b) => a.mejorTiempo! - b.mejorTiempo!)[0];

    if (!ganador) return;

    this.ganadorActual = ganador;
    this.audioService.reproducirSonidoLlegadaMeta();

    try {
      await this.ble.enviarComando('bici1', '01FF');
    } catch (error) {
      console.error('Error enviando comando 01FF:', error);
    }

    this.participantes.forEach((p) => {
      const jugadorEnCarrera = this.jugadores.find((j) => j.id === p.id);
      if (!jugadorEnCarrera) return;

      if (
        p.mejorTiempo == null ||
        jugadorEnCarrera.mejorTiempo! < p.mejorTiempo
      ) {
        p.mejorTiempo = jugadorEnCarrera.mejorTiempo;
      }
    });

    if (ganador.equipoId != null) {
      const equipo = this.equipos.find((e) => e.id === ganador.equipoId);
      if (equipo) {
        equipo.llavesGanadas++;
      }
    }

    if (this.llaveActual) {
      this.llaveActual.estado = 'finalizado';
      this.llaveActual.equipoGanadorId = ganador.equipoId ?? null;
      this.tiempoTotalTorneo += this.tiempoTranscurrido;
      this.registrarResultadosLlave(this.llaveActual);
    }

    const quedanLlaves = !this.todasLlavesFinalizadas();

    this.abrirModalHeat(
      'Llave finalizada',
      quedanLlaves
        ? `Ganador: ${ganador.nombre}. Al cerrar este cuadro pasaremos a la siguiente llave.`
        : `Ganador: ${ganador.nombre}. Todas las llaves han finalizado, al cerrar este cuadro verás el ranking de equipos.`,
      'fin',
    );
  }

  private registrarResultadosLlave(llave: LlaveEquipos): void {
    const idBiketona = this.idBiketona;
    if (!idBiketona) {
      console.error('No hay idBiketona');
      return;
    }

    this.participantesRecientes = llave.jugadores.map((j) => j.nombre);
    localStorage.setItem(
      'participantesRecientes',
      JSON.stringify(this.participantesRecientes),
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

      const equipo = this.equipos.find((e) => e.id === jugador.equipoId);

      return {
        idBiketona,
        nombre: jugador.nombre,
        genero:
          jugador.genero === 'masculino'
            ? 'M'
            : jugador.genero === 'femenino'
              ? 'F'
              : 'O',
        equipo: equipo?.nombre || '',
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
      this.participantesService.crearParticipante(participante).subscribe({
        next: (p) => this.participantesRegistrados.push(p),
        error: (err) => console.error('Error guardando participante:', err),
      });
    });
  }

  esParticipanteReciente(participante: any): boolean {
    return this.participantesRecientes.includes(participante.nombre);
  }

  obtenerEstadisticasParticipante(jugador: Jugador): any {
    const datosDB = this.participantesRegistrados.find(
      (p: any) => p.nombre === jugador.nombre,
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
    this.participantesService.getByBiketona(idBiketona).subscribe({
      next: (participantesDB) => {
        this.participantesRegistrados = participantesDB || [];
      },
    });
  }

  abrirModalHeat(
    titulo: string,
    texto: string,
    modo: 'inicio' | 'fin' = 'inicio',
  ): void {
    this.tituloModalHeat = titulo;
    this.textoModalHeat = texto;
    this.modoModalHeat = modo;
    this.mostrarModalHeat = true;
  }

  cerrarModalHeat(): void {
    this.mostrarModalHeat = false;
  }

  cerrarModalHeatYVolverALlaves(): void {
    this.mostrarModalHeat = false;
    this.detenerCarrera();
    this.tiempoTranscurrido = 0;
    this.jugadores = [];
    this.llaveActual = null;
    this.ganadorActual = null;

    if (this.todasLlavesFinalizadas()) {
      this.guardarHistorialYMostrarRanking();
    } else {
      this.paso = 3;
      if (this.currentLlaveIndex < (this.rondaActual?.llaves.length || 1) - 1) {
        this.currentLlaveIndex++;
      }
    }
  }

  private guardarHistorialYMostrarRanking(): void {
    const idBiketona = this.idBiketona || localStorage.getItem('biketonaId');
    const idSesion = localStorage.getItem('sesionId');
    const userId = localStorage.getItem('userId');

    if (!idBiketona) {
      console.error('No hay idBiketona');
      this.paso = 5;
      return;
    }

    if (!idSesion || !userId) {
      console.warn(
        'Sin sesión activa, mostrando ranking sin guardar historial',
      );
      this.paso = 5;
      return;
    }

    const historial = this.construirHistorialSesion(
      idSesion,
      idBiketona,
      userId,
    );

    this.biketonaService.guardarHistorialSesion(historial).subscribe({
      next: () => {
        this.paso = 5;
      },
      error: (err) => {
        console.error('Error guardando historial:', err);
        this.paso = 5;
      },
    });
  }

  private construirHistorialSesion(
    idSesion: string,
    idBiketona: string,
    userId: string,
  ): any {
    const ranking = this.obtenerRanking();
    const duracionMinutos = Math.floor(this.tiempoTotalTorneo / 60);

    const participantesData = this.participantes
      .filter((p) => p.nombre?.trim())
      .map((p) => {
        const datosDB = this.participantesRegistrados.find(
          (pDB: any) => pDB.nombre === p.nombre,
        );
        return {
          id: p.id,
          nombre: p.nombre,
          genero: p.genero,
          equipoId: p.equipoId,
          equipoNombre: p.equipoNombre,
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
      equipoId: p.equipoId,
      equipoNombre: p.equipoNombre,
    }));

    const rankingEquipos = this.obtenerRankingEquipos().map((e, index) => ({
      posicion: index + 1,
      id: e.id,
      nombre: e.nombre,
      llavesGanadas: e.llavesGanadas,
      color: e.color,
    }));

    return {
      sesion_id: parseInt(idSesion),
      juego_id: idBiketona,
      fecha_inicio: new Date(
        Date.now() - this.tiempoTotalTorneo * 1000,
      ).toISOString(),
      fecha_fin: new Date().toISOString(),
      duracion_minutos: duracionMinutos,
      juego_jugado: 'Biketona Equipos',
      parametros_utilizados: JSON.stringify(this.configuracion),
      participantes_data: JSON.stringify(participantesData),
      ranking_final: JSON.stringify(rankingFinal),
      estadisticas_generales: JSON.stringify({
        duracionTotal: this.tiempoTotalTorneo,
        totalParticipantes: participantesData.length,
        totalLlaves: this.llaves.length,
        velocidadPromedioGeneral: this.calcularVelocidadPromedioGeneral(),
        distanciaPromedioGeneral: this.calcularDistanciaPromedioGeneral(),
        equipos: rankingEquipos,
      }),
      creado_por: parseInt(userId),
    };
  }

  private calcularVelocidadPromedioGeneral(): number {
    const participantesConDatos = this.participantesRegistrados.filter(
      (p: any) => p.velocidadPromedio && parseFloat(p.velocidadPromedio) > 0,
    );

    if (participantesConDatos.length === 0) return 0;

    const sumaVelocidades = participantesConDatos.reduce(
      (sum: number, p: any) => sum + parseFloat(p.velocidadPromedio || '0'),
      0,
    );

    return parseFloat(
      (sumaVelocidades / participantesConDatos.length).toFixed(1),
    );
  }

  private calcularDistanciaPromedioGeneral(): number {
    const participantesConDatos = this.participantesRegistrados.filter(
      (p: any) => p.distanciaReal && parseFloat(p.distanciaReal) > 0,
    );

    if (participantesConDatos.length === 0) return 0;

    const sumaDistancias = participantesConDatos.reduce(
      (sum: number, p: any) => sum + parseFloat(p.distanciaReal || '0'),
      0,
    );

    return parseFloat(
      (sumaDistancias / participantesConDatos.length).toFixed(2),
    );
  }

  obtenerRanking(): Jugador[] {
    return [...this.participantes].sort((a, b) => {
      if (a.mejorTiempo == null && b.mejorTiempo == null) return 0;
      if (a.mejorTiempo == null) return 1;
      if (b.mejorTiempo == null) return -1;
      return a.mejorTiempo - b.mejorTiempo;
    });
  }

  getCarStyle(jugador: Jugador) {
    const progress = jugador.distanciaRecorrida / 100;
    const angle = progress * 2 * Math.PI - Math.PI / 2;
    const r = 38; // radio del circuito
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

  obtenerRankingEquipos(): EquipoCampeonato[] {
    return [...this.equipos].sort((a, b) => b.llavesGanadas - a.llavesGanadas);
  }

  formatearTiempo(segundos: number): string {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }

  finalizarTorneo(): void {
    const idBiketona = this.idBiketona || localStorage.getItem('biketonaId');
    const idSesion = localStorage.getItem('sesionId');
    const userId = localStorage.getItem('userId');

    if (!idBiketona) {
      alert(
        'No se encontró el ID de la biketona. No se puede finalizar el torneo.',
      );
      return;
    }

    if (
      !confirm(
        '¿Deseas finalizar el campeonato? No podrás seguir jugando más llaves.',
      )
    ) {
      return;
    }

    localStorage.removeItem('participantesRecientes');

    if (idSesion && userId) {
      const historial = this.construirHistorialSesion(
        idSesion,
        idBiketona,
        userId,
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
                      alert('Campeonato y sesión finalizados correctamente.');
                      this.router.navigate(['/home']);
                    },
                    error: () => {
                      alert(
                        'Campeonato finalizado pero hubo error al cerrar la sesión.',
                      );
                      this.router.navigate(['/home']);
                    },
                  });
              },
              error: () =>
                alert('Ocurrió un error al finalizar el campeonato.'),
            });
        },
        error: () => alert('Error al guardar el historial de la sesión.'),
      });
    } else {
      this.biketonaService
        .actualizarEstado(idBiketona, 'finalizada')
        .subscribe({
          next: () => {
            alert('Campeonato finalizado correctamente.');
            this.router.navigate(['/home']);
          },
          error: () => alert('Ocurrió un error al finalizar el campeonato.'),
        });
    }
  }
  calcularProgresoBarra(jugador: Jugador): number {
    const distanciaTotal = this.configuracion.numeroVueltas * 100;
    const progreso = (jugador.distanciaReal / distanciaTotal) * 100;
    return Math.min(Math.max(progreso, 0), 100);
  }
  calcularVatios(jugador: Jugador): number {
    return parseFloat((jugador.velocidad * 10).toFixed(0));
  }

  calcularCalorias(jugador: Jugador): number {
    const MET = 8;
    const pesoKg = 70;
    const minutosTranscurridos = this.tiempoTranscurrido / 60;
    return parseFloat(
      (0.0175 * MET * pesoKg * minutosTranscurridos).toFixed(0),
    );
  }
}
