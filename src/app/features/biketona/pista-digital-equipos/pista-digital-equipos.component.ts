import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BleEsp32Service } from '../../services/ble-esp32.service';
import { BiketonaService } from '../../services/biketona.service';
import {
  BiketonaParticipantesService,
  BiketonaParticipante,
} from '../../services/biketona-participantes.service';
import { BrainBikeAudioService } from '../../services/audio/brain-bike-audio.service';

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
  selector: 'app-pista-digital-equipos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pista-digital-equipos.component.html',
  styleUrl: './pista-digital-equipos.component.css',
})
export class PistaDigitalEquiposComponent implements OnInit, OnDestroy {
  paso = 1;

  modalSexoJugadorId: number | null = null;
  modalEquipoJugadorId: number | null = null;

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

  equipos: EquipoCampeonato[] = [
    { id: 1, nombre: '', color: '#38bdf8', llavesGanadas: 0 },
    { id: 2, nombre: '', color: '#f97316', llavesGanadas: 0 },
  ];

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

  teamColors = [
    { name: 'Rojo', value: '#ef4444' },
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Verde', value: '#22c55e' },
    { name: 'Amarillo', value: '#eab308' },
    { name: 'Violeta', value: '#8b5cf6' },
  ];

  getColorEquipo(equipoId: number | null | undefined): string {
    if (!equipoId) return '#22c55e';
    const equipo = this.equipos.find((e) => e.id === equipoId);
    return equipo?.color || '#22c55e';
  }

  constructor(
    private router: Router,
    private ble: BleEsp32Service,
    private biketonaService: BiketonaService,
    private participantesService: BiketonaParticipantesService,
    public audioService: BrainBikeAudioService
  ) {}

  ngOnInit(): void {
    this.cargarConfiguracion();
    this.inicializarParticipantes();

    this.idBiketona = localStorage.getItem('biketonaId') || null;
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
        color: this.coloresVehiculos[i % this.coloresVehiculos.length],
        icono: this.iconosVehiculos[i % this.iconosVehiculos.length],
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
    try {
      await this.ble.connect(key);
      biciUI.status = 'Conectado a ESP32';
      biciUI.conectado = true;

      this.ble
        .readValue(key, 'id')
        .then((id) => (biciUI.deviceId = id))
        .catch(() => {});

      const indexJugador = key === 'bici1' ? 0 : 1;
      await this.ble.subscribe(key, 'vel', (v) => {
        const velNum = parseFloat(v);
        const vel = isNaN(velNum) ? 0 : velNum;
        const jugadorHardware = this.jugadores[indexJugador];
        if (jugadorHardware) {
          jugadorHardware.velocidad = vel;
        }
      });
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
          '¿Estás seguro de volver? Se perderá el progreso de la carrera actual'
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
      (j) => j.nombre && j.nombre.trim() !== '' && j.equipoId !== null
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
        'Completa los nombres y equipos de los participantes para iniciar la llave.'
      );
      return;
    }

    if (this.rondaActual) {
      const idx = this.rondaActual.llaves.findIndex((l) => l.id === llave.id);
      if (idx !== -1) {
        this.currentLlaveIndex = idx;
      }
    }

    this.jugadores = llave.jugadores;
    this.llaveActual = llave;

    this.tiempoTranscurrido = 0;
    this.carreraPausada = false;
    this.carreraIniciada = false;

    this.jugadores.forEach((j, idx) => {
      j.velocidad = 0;
      j.velocidadMaxima = 0; // 👈
      j.vueltaActual = 1;
      j.distanciaRecorrida = 0;
      j.distanciaReal = 0; // 👈
      j.posicion = idx + 1;
    });

    llave.estado = 'en_curso';
    this.ganadorActual = null;
    this.paso = 4;

    this.abrirModalHeat(
      `Llave R${llave.ronda} · #${llave.indexEnRonda + 1}`,
      'Presiona "Iniciar carrera" para comenzar este enfrentamiento por equipos.',
      'inicio'
    );
  }

  iniciarHeat(): void {
    this.cerrarModalHeat();
    this.iniciarCuentaRegresiva();
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
    this.intervaloCarrera = setInterval(() => {
      if (this.carreraPausada) return;

      this.tiempoTranscurrido++;

      this.jugadores.forEach((jugador) => {
        const velocidadKph = jugador.velocidad || 0;

        if (velocidadKph > jugador.velocidadMaxima) {
          jugador.velocidadMaxima = velocidadKph;
        }

        const velocidadMps = velocidadKph / 3.6;
        const distanciaMetros = velocidadMps * 1;

        jugador.distanciaReal += distanciaMetros;

        const porcentajeVuelta =
          (distanciaMetros / this.longitudPistaMetros) * 100;
        jugador.distanciaRecorrida += porcentajeVuelta;

        if (jugador.distanciaRecorrida >= 100) {
          jugador.distanciaRecorrida -= 100;
          jugador.vueltaActual++;
        }
      });

      this.actualizarPosiciones();
      this.verificarFinCarrera();
    }, 1000);
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

  verificarFinCarrera(): void {
    const ganador = this.jugadores.find(
      (j) => j.vueltaActual > this.configuracion.numeroVueltas
    );
    if (!ganador) return;

    this.detenerCarrera();
    this.ganadorActual = ganador;

    const jugadorGlobal = this.participantes.find((p) => p.id === ganador.id);
    if (jugadorGlobal) {
      if (
        jugadorGlobal.mejorTiempo == null ||
        this.tiempoTranscurrido < jugadorGlobal.mejorTiempo
      ) {
        jugadorGlobal.mejorTiempo = this.tiempoTranscurrido;
      }
    }

    if (ganador.equipoId != null) {
      const equipo = this.equipos.find((e) => e.id === ganador.equipoId);
      if (equipo) {
        equipo.llavesGanadas++;
      }
    }

    if (this.llaveActual) {
      this.llaveActual.estado = 'finalizado';
      this.llaveActual.equipoGanadorId = ganador.equipoId ?? null;
      this.registrarResultadosLlave(this.llaveActual);
    }

    const quedanLlaves = !this.todasLlavesFinalizadas();

    this.abrirModalHeat(
      'Llave finalizada',
      quedanLlaves
        ? `Ganador: ${ganador.nombre}. Al cerrar este cuadro pasaremos a la siguiente llave.`
        : `Ganador: ${ganador.nombre}. Todas las llaves han finalizado, al cerrar este cuadro verás el ranking de equipos.`,
      'fin'
    );
  }

  private registrarResultadosLlave(llave: LlaveEquipos): void {
    const idBiketona = this.idBiketona;

    if (!idBiketona || !llave) {
      console.error(
        'No hay idBiketona o llave inválida. No se pueden registrar resultados.'
      );
      return;
    }

    const numeroLlave = llave.id;
    const tiempoSegundos = this.tiempoTranscurrido;
    const minutos = tiempoSegundos / 60;

    const MET = 8;
    const pesoKg = 70;
    const caloriasFactor = 0.0175 * MET * pesoKg;

    llave.jugadores.forEach((jugador) => {
      const distanciaMetros = jugador.distanciaReal;
      const distanciaKm = distanciaMetros / 1000;

      // Velocidad promedio
      let velocidadPromedioKph = 0;
      if (tiempoSegundos > 0) {
        const velMps = distanciaMetros / tiempoSegundos;
        velocidadPromedioKph = velMps * 3.6;
      }

      const velocidadMaxKph = jugador.velocidadMaxima;

      const calorias = caloriasFactor * minutos;

      // Vatios aprox
      const vatios = velocidadPromedioKph * 10;

      const equipo = this.equipos.find((e) => e.id === jugador.equipoId);

      const participante: BiketonaParticipante = {
        id: crypto.randomUUID(),
        idBiketona,
        nombre: jugador.nombre,
        genero: jugador.genero,
        equipo: equipo?.nombre || '',
        puntos: 0,

        velocidadPromedio: velocidadPromedioKph.toFixed(1),
        velocidadMax: velocidadMaxKph.toFixed(1),
        calorias: calorias.toFixed(0),
        vatios: vatios.toFixed(0),

        distanciaReal: distanciaKm.toFixed(2),
        tiempo: this.formatearTiempo(tiempoSegundos),

        posicion: jugador.posicion,
        llave: numeroLlave,
        estadoLlave: 'finalizada',
      };

      this.participantesService.crearParticipante(participante).subscribe({
        next: (p) =>
          console.log(`✔ Resultado registrado en BD: ${jugador.nombre}`, p),
        error: (err) =>
          console.error(
            '❌ Error registrando participante equipos:',
            jugador.nombre,
            err
          ),
      });
    });
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

  cerrarModalHeatYVolverALlaves(): void {
    this.mostrarModalHeat = false;
    this.detenerCarrera();
    this.tiempoTranscurrido = 0;
    this.jugadores = [];
    this.llaveActual = null;
    this.ganadorActual = null;

    if (this.todasLlavesFinalizadas()) {
      this.paso = 5;
    } else {
      this.paso = 3;
      if (this.currentLlaveIndex < (this.rondaActual?.llaves.length || 1) - 1) {
        this.currentLlaveIndex++;
      }
    }
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
    if (!idBiketona) {
      alert(
        'No se encontró el ID de la biketona. No se puede finalizar el torneo.'
      );
      return;
    }

    if (!confirm('¿Deseas finalizar el campeonato?')) return;

    this.biketonaService.actualizarEstado(idBiketona, 'finalizada').subscribe({
      next: (biketona) => {
        alert('Campeonato finalizado correctamente.');
        this.router.navigate(['/setup']);
      },
      error: (err) => {
        console.error('Error al finalizar campeonato:', err);
        alert('Ocurrió un error al finalizar el campeonato.');
      },
    });
  }
}
