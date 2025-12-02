import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BleEsp32Service } from '../../services/ble-esp32.service';
import { BiketonaParticipantesService, BiketonaParticipante } from '../../services/biketona-participantes.service';
import { BiketonaService } from '../../services/biketona.service';

type BikeKey = 'bici1' | 'bici2';

interface Jugador {
  id: number;
  nombre: string;
  genero: 'masculino' | 'femenino' | 'otro';
  velocidad: number;          // velocidad actual km/h
  velocidadMaxima: number;    // máxima del heat
  vueltaActual: number;
  distanciaRecorrida: number; // % de la vuelta para la UI
  distanciaReal: number;      // metros reales recorridos
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
}

interface LlaveCampeonato {
  idGlobal: number; // id único de heat en TODO el cuadro
  indexEnRonda: number; // índice dentro de su ronda
  ronda: number;
  jugadores: Jugador[];
  estado: 'pendiente' | 'en_curso' | 'finalizado';
}

interface RondaCampeonato {
  numero: number;            // 1 = primera ronda, 2 = cuartos, etc
  llaves: LlaveCampeonato[];
}

interface BiciUI {
  key: BikeKey;
  label: string;
  status: string;
  conectado: boolean;
  deviceId: string;
}

@Component({
  selector: 'app-pista-digital-campeonato',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pista-digital-campeonato.component.html',
  styleUrl: './pista-digital-campeonato.component.css'
})
export class PistaDigitalCampeonatoComponent implements OnInit, OnDestroy {
  paso = 1; // 1: BLE, 2: registro primera ronda, 3: carrera, 4: ranking final

  participantes: Jugador[] = [];
  jugadores: Jugador[] = []; // jugadores de la llave actual
  configuracion: ConfiguracionCarrera = {
    numeroBicicletas: 2,
    numeroParticipantes: 4,
    numeroVueltas: 3,
    tipoCompetencia: 'campeonato',
    tipoPista: 'digital'
  };

  rondas: RondaCampeonato[] = [];
  currentRondaIndex = 0;
  currentLlaveIndex = 0;
  llaveActual: LlaveCampeonato | null = null;

  longitudPistaMetros = 100;
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

  modalSexoJugadorId: number | null = null;

  idBiketona: string | null = null;

  coloresVehiculos = ['#fbbf24', '#ef4444', '#22c55e', '#f97316', '#eab308', '#dc2626', '#10b981', '#fb923c'];
  iconosVehiculos = ['🏎️', '🚗', '🚙', '🚕', '🏁', '🚓', '🚑', '🚐'];

  bicis: BiciUI[] = [
    { key: 'bici1', label: 'Bici 1', status: 'Desconectado', conectado: false, deviceId: '' },
    { key: 'bici2', label: 'Bici 2', status: 'Desconectado', conectado: false, deviceId: '' },
  ];

  constructor(
    private router: Router,
    private ble: BleEsp32Service,
    private biketonaParticipantesService: BiketonaParticipantesService,
    private biketonaService: BiketonaService
  ) {}

  // ================== INIT ==================

  ngOnInit(): void {
    this.cargarConfiguracion();
    this.inicializarParticipantes();
    this.generarCuadroCampeonato();

    this.idBiketona = localStorage.getItem('biketonaId') || null;

    if (this.idBiketona) {
      // Aquí podrías cargar progreso desde DB como hicimos con 1vs1
      // this.cargarProgresoCampeonato(this.idBiketona);
    }
  }

  ngOnDestroy(): void {
    this.detenerCarrera();
    this.ble.disconnectAll();
  }

  cargarConfiguracion(): void {
    const config = localStorage.getItem('configuracionCarrera');
    if (config) {
      this.configuracion = JSON.parse(config);
    }

    // Forzar 2 bicis para campeonato (llaves de 1 vs 1)
    this.configuracion.numeroBicicletas = 2;

    if (this.configuracion.numeroParticipantes < 4) {
      this.configuracion.numeroParticipantes = 4;
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
        mejorTiempo: null
      });
    }

    this.jugadores = [];
    this.llaveActual = null;
    this.tiempoTranscurrido = 0;
    this.carreraIniciada = false;
    this.carreraPausada = false;
  }

  // ================== CUADRO / RONDAS ==================

  generarCuadroCampeonato(): void {
    this.rondas = [];
    let jugadoresEnRonda = this.participantes.length;
    let rondaNumero = 1;
    let globalId = 1;

    while (jugadoresEnRonda > 1) {
      const numLlaves = Math.ceil(jugadoresEnRonda / 2);
      const llaves: LlaveCampeonato[] = [];
      for (let i = 0; i < numLlaves; i++) {
        llaves.push({
          idGlobal: globalId++,
          indexEnRonda: i,
          ronda: rondaNumero,
          jugadores: [], // se llenan abajo para la primera ronda o con ganadores luego
          estado: 'pendiente'
        });
      }

      this.rondas.push({ numero: rondaNumero, llaves });

      jugadoresEnRonda = numLlaves;
      rondaNumero++;
    }

    // Llenar la primera ronda con los participantes iniciales
    const primeraRonda = this.rondas[0];
    if (primeraRonda) {
      for (let i = 0; i < this.participantes.length; i++) {
        const llaveIndex = Math.floor(i / 2); // 2 por llave
        const llave = primeraRonda.llaves[llaveIndex];
        if (llave) {
          llave.jugadores.push(this.participantes[i]);
        }
      }
    }

    this.currentRondaIndex = 0;
    this.currentLlaveIndex = 0;
  }

  get rondaActual(): RondaCampeonato | null {
    return this.rondas[this.currentRondaIndex] ?? null;
  }

  get llaveEnPantalla(): LlaveCampeonato | null {
    const ronda = this.rondaActual;
    if (!ronda) return null;
    return ronda.llaves[this.currentLlaveIndex] ?? null;
  }

  puedePasarASiguienteLlave(): boolean {
    const ronda = this.rondaActual;
    if (!ronda) return false;

    const llave = ronda.llaves[this.currentLlaveIndex];
    if (!llave || llave.estado !== 'finalizado') return false;

    // si hay otra llave en esta ronda pendiente
    if (this.currentLlaveIndex < ronda.llaves.length - 1) {
      return true;
    }

    // si no hay más llaves en esta ronda, pero sí otra ronda
    return this.currentRondaIndex < this.rondas.length - 1;
  }

  siguienteLlave(): void {
    const ronda = this.rondaActual;
    if (!ronda) return;

    // ¿queda otra llave en esta misma ronda?
    if (this.currentLlaveIndex < ronda.llaves.length - 1) {
      this.currentLlaveIndex++;
      return;
    }

    // si no, pasamos a la siguiente ronda
    if (this.currentRondaIndex < this.rondas.length - 1) {
      this.currentRondaIndex++;
      this.currentLlaveIndex = 0;
    }
  }

  // ================== MODAL GÉNERO ==================

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

  // ================== BLE ==================

  private getBiciUI(key: BikeKey): BiciUI {
    const b = this.bicis.find(x => x.key === key)!;
    return b;
  }

  estaBiciConectada(key: BikeKey): boolean {
    return this.getBiciUI(key).conectado;
  }

  todasBicisNecesariasConectadas(): boolean {
    return this.bicis.every(b => b.conectado);
  }

  async buscarBici(key: BikeKey) {
    const biciUI = this.getBiciUI(key);
    try {
      const device = await this.ble.requestDevice(key);
      biciUI.status = `Dispositivo seleccionado: ${device.name ?? 'sin nombre'}`;
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

      this.ble.readValue(key, 'id')
        .then(id => biciUI.deviceId = id)
        .catch(() => {});

      const indexJugador = key === 'bici1' ? 0 : 1;
      await this.ble.subscribe(key, 'vel', v => {
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

  // ================== NAVEGACIÓN PASOS ==================

  irARegistroParticipantes(): void {
    if (!this.todasBicisNecesariasConectadas()) {
      alert('Debes conectar las dos bicicletas antes de continuar.');
      return;
    }
    this.paso = 2;
  }

  volver(): void {
    if (this.paso === 1) {
      this.router.navigate(['/setup']);
    } else if (this.paso === 2) {
      this.paso = 1;
    } else if (this.paso === 3) {
      if (confirm('¿Estás seguro de volver? Se perderá el progreso de la carrera actual')) {
        this.paso = 2;
      }
    } else if (this.paso === 4) {
      this.router.navigate(['/setup']);
    }
  }

  // ================== VALIDACIÓN / INICIO HEAT ==================

  puedeIniciarLlave(llave: LlaveCampeonato): boolean {
    if (llave.estado === 'finalizado') return false;
    if (!this.todasBicisNecesariasConectadas()) return false;
    if (llave.jugadores.length !== 2) return false;
    return llave.jugadores.every(j => j.nombre && j.nombre.trim() !== '');
  }

  iniciarCarreraLlave(llave: LlaveCampeonato): void {
    if (!this.puedeIniciarLlave(llave)) {
      alert('Debes tener las bicis conectadas y los nombres de los dos participantes para iniciar.');
      return;
    }

    // sincronizar índices actuales
    const ronda = this.rondaActual;
    if (!ronda) return;

    const idxLlave = ronda.llaves.findIndex(l => l.idGlobal === llave.idGlobal);
    if (idxLlave !== -1) {
      this.currentLlaveIndex = idxLlave;
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

    this.abrirModalHeat(
      `Ronda ${llave.ronda} - Llave ${llave.indexEnRonda + 1}`,
      'Presiona "Iniciar carrera" para comenzar este enfrentamiento.',
      'inicio'
    );
  }

  // ================== MODAL HEAT ==================

  abrirModalHeat(titulo: string, texto: string, modo: 'inicio' | 'fin' = 'inicio'): void {
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

    // ¿Quedan más llaves o rondas?
    if (this.hayMasHeatsPendientes()) {
      this.paso = 2;
    } else {
      this.paso = 4; // ranking final / fin de torneo
    }
  }

  hayMasHeatsPendientes(): boolean {
    for (let r = 0; r < this.rondas.length; r++) {
      const ronda = this.rondas[r];
      for (let l = 0; l < ronda.llaves.length; l++) {
        if (ronda.llaves[l].estado !== 'finalizado') {
          this.currentRondaIndex = r;
          this.currentLlaveIndex = l;
          return true;
        }
      }
    }
    return false;
  }

  iniciarHeat(): void {
    this.cerrarModalHeat();
    this.iniciarCuentaRegresiva();
  }

  // ================== CARRERA / SIMULACIÓN ==================

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

        const porcentajeVuelta = (distanciaMetros / this.longitudPistaMetros) * 100;
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
    this.jugadores.forEach(j => {
      j.velocidad = 0;
      j.velocidadMaxima = 0;
      j.vueltaActual = 1;
      j.distanciaRecorrida = 0;
      j.distanciaReal = 0;
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
      const original = this.jugadores.find(j => j.id === jugador.id);
      if (original) {
        original.posicion = index + 1;
      }
    });
  }

  verificarFinCarrera(): void {
    const ganador = this.jugadores.find(j => j.vueltaActual > this.configuracion.numeroVueltas);
    if (!ganador) return;

    this.detenerCarrera();
    this.ganadorActual = ganador;

    // actualizar mejor tiempo global
    const global = this.participantes.find(p => p.id === ganador.id);
    if (global) {
      if (global.mejorTiempo == null || this.tiempoTranscurrido < global.mejorTiempo) {
        global.mejorTiempo = this.tiempoTranscurrido;
      }
    }

    if (this.llaveActual) {
      this.llaveActual.estado = 'finalizado';
      this.registrarResultadosLlave(this.llaveActual, ganador);
      this.avanzarGanadorASiguienteRonda(this.llaveActual, ganador);
    }

    const torneoTerminado = !this.hayMasHeatsPendientes();

    this.abrirModalHeat(
      'Carrera finalizada',
      torneoTerminado
        ? `Ganador del campeonato: ${ganador.nombre}. Verás el ranking final.`
        : `Ganador de la llave: ${ganador.nombre}. Al cerrar este cuadro seguiremos con las siguientes llaves.`,
      'fin'
    );
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

  // ================== AVANCE DE RONDAS ==================

  avanzarGanadorASiguienteRonda(llave: LlaveCampeonato, ganador: Jugador): void {
    const rondaIndex = this.rondas.findIndex(r => r.numero === llave.ronda);
    if (rondaIndex === -1) return;

    // si esta es la última ronda, no hay a dónde avanzar
    if (rondaIndex >= this.rondas.length - 1) {
      return;
    }

    const siguienteRonda = this.rondas[rondaIndex + 1];
    const destinoIndex = Math.floor(llave.indexEnRonda / 2);
    const destinoLlave = siguienteRonda.llaves[destinoIndex];
    if (!destinoLlave) return;

    // clon "ligero" del ganador para siguiente ronda
    const nuevoJugador: Jugador = {
      ...ganador,
      velocidad: 0,
      velocidadMaxima: 0,
      vueltaActual: 1,
      distanciaRecorrida: 0,
      distanciaReal: 0,
      posicion: destinoLlave.jugadores.length + 1,
    };

    destinoLlave.jugadores.push(nuevoJugador);
  }

  // ================== REGISTRO EN DB ==================

  private registrarResultadosLlave(llave: LlaveCampeonato, ganador: Jugador): void {
    const idBiketona = this.idBiketona;
    if (!idBiketona) {
      console.error('No hay idBiketona. No se pueden registrar resultados.');
      return;
    }

    const numeroLlaveGlobal = llave.idGlobal;
    const tiempoSegundos = this.tiempoTranscurrido;
    const minutos = tiempoSegundos / 60;

    const MET = 8;
    const pesoKg = 70;
    const caloriasFactor = 0.0175 * MET * pesoKg;

    this.jugadores.forEach(jugador => {
      const distanciaMetros = jugador.distanciaReal;
      const distanciaKm = distanciaMetros / 1000;

      let velocidadPromedioKph = 0;
      if (tiempoSegundos > 0) {
        const velMps = distanciaMetros / tiempoSegundos;
        velocidadPromedioKph = velMps * 3.6;
      }

      const velocidadMaxKph = jugador.velocidadMaxima;
      const calorias = caloriasFactor * minutos;
      const vatios = velocidadPromedioKph * 10;

      const participante: BiketonaParticipante = {
        id: crypto.randomUUID(),
        idBiketona,
        nombre: jugador.nombre,
        genero: jugador.genero,
        equipo: '',
        puntos: 0,
        velocidadPromedio: velocidadPromedioKph.toFixed(1),
        velocidadMax: velocidadMaxKph.toFixed(1),
        calorias: calorias.toFixed(0),
        vatios: vatios.toFixed(0),
        distanciaReal: distanciaKm.toFixed(2),
        tiempo: this.formatearTiempo(tiempoSegundos),
        posicion: jugador.posicion,
        llave: numeroLlaveGlobal,
        estadoLlave: 'finalizada',
      };

      console.log('📤 Enviando resultados de participante (campeonato):', JSON.stringify(participante, null, 2));

      this.biketonaParticipantesService.crearParticipante(participante).subscribe({
        next: (p) => console.log('✔ Participante registrado en DB (campeonato):', p),
        error: (err) => console.error('❌ Error registrando participante (campeonato):', err),
      });
    });
  }

  // ================== RANKING ==================

  obtenerRanking(): Jugador[] {
    return [...this.participantes].sort((a, b) => {
      if (a.mejorTiempo == null && b.mejorTiempo == null) return 0;
      if (a.mejorTiempo == null) return 1;
      if (b.mejorTiempo == null) return -1;
      return a.mejorTiempo - b.mejorTiempo;
    });
  }

  formatearTiempo(segundos: number): string {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // ================== FINALIZAR TORNEO ==================

  finalizarTorneo(): void {
    const idBiketona = this.idBiketona || localStorage.getItem('biketonaId');
    if (!idBiketona) {
      alert('No se encontró el ID de la biketona. No se puede finalizar el torneo.');
      return;
    }

    if (!confirm('¿Deseas finalizar el campeonato?')) return;

    this.biketonaService.actualizarEstado(idBiketona, 'finalizada').subscribe({
      next: (biketona) => {
        console.log('🏁 Campeonato finalizado en BD:', biketona);
        alert('Campeonato finalizado correctamente.');
        this.router.navigate(['/setup']);
      },
      error: (err) => {
        console.error('Error al finalizar campeonato:', err);
        alert('Ocurrió un error al finalizar el campeonato.');
      }
    });
  }
}
