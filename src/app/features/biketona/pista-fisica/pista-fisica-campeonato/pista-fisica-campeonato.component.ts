import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BrainBikeAudioService } from '../../../services/audio/brain-bike-audio.service';
import { BiketonaParticipantesService } from '../../../services/biketona-participantes.service';
import { BiketonaService } from '../../../services/biketona.service';
import { BleEsp32Service } from '../../../services/ble-esp32.service';
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
  rondaMaximaAlcanzada?: number;
  posicion: number;
  color: string;
  icono: string;
  mejorTiempo: number | null;
  video: string;
}
interface ConfiguracionCarrera {
  numeroBicicletas: number;
  numeroParticipantes: number;
  numeroVueltas: number;
  tipoCompetencia: string;
  tipoPista: string;
  numeroLlaves?: number;
}
interface LlaveCampeonato {
  idGlobal: number;
  indexEnRonda: number;
  ronda: number;
  jugadores: Jugador[];
  estado: 'pendiente' | 'en_curso' | 'finalizado';
}
interface RondaCampeonato {
  numero: number;
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
  selector: 'app-pista-fisica-campeonato',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pista-fisica-campeonato.component.html',
  styleUrl: './pista-fisica-campeonato.component.css',
})
export class PistaFisicaCampeonatoComponent implements OnInit, OnDestroy {
  paso = 1;
  Math = Math;
  fondoCarrera = 'assets/images/fondo_carrera_1.jpg';

  participantes: Jugador[] = [];
  jugadores: Jugador[] = [];
  configuracion: ConfiguracionCarrera = {
    numeroBicicletas: 2,
    numeroParticipantes: 4,
    numeroVueltas: 3,
    tipoCompetencia: 'campeonato',
    tipoPista: 'fisica',
    numeroLlaves: 1,
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

  coloresVehiculos = ['#ef4444', '#fbbf24'];

  iconosVehiculos = [
    'assets/images/carro_rojo.png',
    'assets/images/carro_amarillo.png',
  ];

  videosVehiculos = [
    'assets/images/carro_movimiento_rojo.mp4',
    'assets/images/carro_movimiento_amarillo.mp4',
  ];

  fondosCarrera = [
    'assets/images/carro_movimiento_rojo.mp4',
    'assets/images/carro_movimiento_amarillo.mp4',
  ];

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

  participantesRegistrados: any[] = [];
  participantesRecientes: string[] = [];
  tiempoTotalTorneo = 0;

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
    this.generarCuadroCampeonato();

    this.idBiketona = localStorage.getItem('biketonaId') || null;

    const recientes = localStorage.getItem('participantesRecientes');
    if (recientes) {
      this.participantesRecientes = JSON.parse(recientes);
    }

    if (this.idBiketona) {
      this.cargarProgresoLlaves(this.idBiketona);
    }

    this.audioService.iniciarMusicaFondo('juego');
  }
  private cargarProgresoLlaves(idBiketona: string): void {
    this.biketonaParticipantesService.getByBiketona(idBiketona).subscribe({
      next: (participantesDB) => {
        this.participantesRegistrados = participantesDB || [];
      },
    });
  }

  ngOnDestroy(): void {
    this.detenerCarrera();
    this.ble.disconnectAll();
    this.audioService.detenerTodo();
  }

  cargarConfiguracion(): void {
    const config = localStorage.getItem('configuracionCarrera');
    if (config) {
      this.configuracion = JSON.parse(config);
    }

    this.configuracion.numeroBicicletas = 2;

    const potenciasDeDos = [2, 4, 8, 16, 32];
    if (!potenciasDeDos.includes(this.configuracion.numeroParticipantes)) {
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
        color: this.coloresVehiculos[i % 2],
        icono: this.iconosVehiculos[i % 2],
        video: this.videosVehiculos[i % 2],
        mejorTiempo: null,
      });
    }

    this.jugadores = [];
    this.llaveActual = null;
    this.tiempoTranscurrido = 0;
    this.carreraIniciada = false;
    this.carreraPausada = false;
  }

  onInputChange(): void {
    this.audioService.reproducirSonidoHover();
  }

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
          jugadores: [],
          estado: 'pendiente',
        });
      }

      this.rondas.push({ numero: rondaNumero, llaves });

      jugadoresEnRonda = numLlaves;
      rondaNumero++;
    }

    const primeraRonda = this.rondas[0];
    if (primeraRonda) {
      for (let i = 0; i < this.participantes.length; i++) {
        const llaveIndex = Math.floor(i / 2);
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

    if (this.currentLlaveIndex < ronda.llaves.length - 1) {
      return true;
    }

    return this.currentRondaIndex < this.rondas.length - 1;
  }

  siguienteLlave(): void {
    const ronda = this.rondaActual;
    if (!ronda) return;

    if (this.currentLlaveIndex < ronda.llaves.length - 1) {
      this.currentLlaveIndex++;
      this.audioService.reproducirSonidoCambioLlave();
      return;
    }

    if (this.currentRondaIndex < this.rondas.length - 1) {
      this.currentRondaIndex++;
      this.currentLlaveIndex = 0;
      this.audioService.reproducirSonidoCambioLlave();
    }
  }

  abrirSelectSexo(jugadorId: number): void {
    this.modalSexoJugadorId = jugadorId;
    this.audioService.reproducirSonidoAbrirModal();
  }

  cerrarSelectSexo(): void {
    this.modalSexoJugadorId = null;
    this.audioService.reproducirSonidoCerrarModal();
  }

  seleccionarGenero(jugador: Jugador, genero: Jugador['genero']): void {
    jugador.genero = genero;
    this.modalSexoJugadorId = null;
    this.audioService.reproducirSonidoSeleccion();
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
      if (
        confirm(
          '¿Estás seguro de volver? Se perderá el progreso de la carrera actual'
        )
      ) {
        this.paso = 2;
      }
    } else if (this.paso === 4) {
      this.inicializarParticipantes();
      this.generarCuadroCampeonato();
      this.paso = 1;
    }
  }

  puedeIniciarLlave(llave: LlaveCampeonato): boolean {
    if (llave.estado === 'finalizado') return false;
    if (!this.todasBicisNecesariasConectadas()) return false;
    if (llave.jugadores.length !== 2) return false;
    return llave.jugadores.every((j) => j.nombre && j.nombre.trim() !== '');
  }

  iniciarCarreraLlave(llave: LlaveCampeonato): void {
    if (!this.puedeIniciarLlave(llave)) {
      this.audioService.reproducirSonidoError();
      alert(
        'Debes tener las bicis conectadas y los nombres de los dos participantes para iniciar.'
      );
      return;
    }

    const ronda = this.rondaActual;
    if (!ronda) return;

    const idxLlave = ronda.llaves.findIndex(
      (l) => l.idGlobal === llave.idGlobal
    );
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
    this.audioService.reproducirSonidoBanderaCarrera();

    const esUltimaRonda = llave.ronda === this.rondas.length;
    const tituloRonda = esUltimaRonda ? 'Final' : `Ronda ${llave.ronda}`;

    this.abrirModalHeat(
      `${tituloRonda} - Llave ${llave.indexEnRonda + 1}`,
      'Presiona "Iniciar carrera" para comenzar este enfrentamiento.',
      'inicio'
    );
  }

  jugadorYaCorrio(jugador: Jugador): boolean {
    return this.participantesRegistrados.some(
      (p: any) => p.nombre === jugador.nombre && jugador.nombre.trim() !== ''
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
    this.audioService.reproducirSonidoSirenaLargada();
    this.iniciarCuentaRegresiva();
  }

  iniciarCuentaRegresiva(): void {
    this.mostrarCuentaRegresiva = true;
    this.numeroCuentaRegresiva = 3;

    const intervaloCuenta = setInterval(() => {
      this.numeroCuentaRegresiva--;

      if (this.numeroCuentaRegresiva >= 0) {
        this.audioService.reproducirSonidoCuentaRegresiva();
      }

      if (this.numeroCuentaRegresiva < 0) {
        clearInterval(intervaloCuenta);
        this.mostrarCuentaRegresiva = false;
        this.carreraIniciada = true;
        this.audioService.reproducirSonidoMotor();
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
    this.audioService.reproducirSonidoVictoria();

    this.jugadores.forEach((jugador) => {
      const participante = this.participantes.find((p) => p.id === jugador.id);
      if (!participante) return;

      const tiempoEstaCarrera = this.tiempoTranscurrido;

      if (jugador.id === ganador.id) {
        if (
          !participante.mejorTiempo ||
          tiempoEstaCarrera < participante.mejorTiempo
        ) {
          participante.mejorTiempo = tiempoEstaCarrera;
        }
        console.log(
          '✅',
          jugador.nombre,
          '- Tiempo carrera:',
          tiempoEstaCarrera,
          '| Mejor tiempo global:',
          participante.mejorTiempo
        );
      } else {
        const tiempoPerdedor = tiempoEstaCarrera + 10;
        if (
          !participante.mejorTiempo ||
          tiempoPerdedor < participante.mejorTiempo
        ) {
          participante.mejorTiempo = tiempoPerdedor;
        }
        console.log(
          '❌',
          jugador.nombre,
          '- Tiempo carrera (perdedor):',
          tiempoPerdedor,
          '| Mejor tiempo global:',
          participante.mejorTiempo
        );
      }
    });

    if (this.llaveActual) {
      this.llaveActual.estado = 'finalizado';
      this.tiempoTotalTorneo += this.tiempoTranscurrido;
      this.registrarResultadosLlave(this.llaveActual, ganador);
      this.avanzarGanadorASiguienteRonda(this.llaveActual, ganador);
    }

    const torneoTerminado = !this.hayMasHeatsPendientes();

    if (torneoTerminado) {
      this.audioService.reproducirSonidoPodio();
    }

    this.abrirModalHeat(
      'Carrera finalizada',
      torneoTerminado
        ? `Ganador del campeonato: ${ganador.nombre}. Verás el ranking final.`
        : `Ganador de la llave: ${ganador.nombre}. Al cerrar este cuadro seguiremos con las siguientes llaves.`,
      'fin'
    );
  }

  private registrarResultadosLlave(
    llave: LlaveCampeonato,
    ganador: Jugador
  ): void {
    const idBiketona = this.idBiketona;
    if (!idBiketona) {
      console.error('No hay idBiketona');
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
      const esGanador = jugador.id === ganador.id;
      const tiempoEstaCarrera = esGanador
        ? this.tiempoTranscurrido
        : this.tiempoTranscurrido + 10;
      const minutosIndividual = tiempoEstaCarrera / 60;

      const velocidadPromedioKph =
        tiempoEstaCarrera > 0
          ? (jugador.distanciaReal / tiempoEstaCarrera) * 3.6
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
        tiempo: this.formatearTiempo(tiempoEstaCarrera),
        velocidadPromedio: parseFloat(velocidadPromedioKph.toFixed(1)),
        velocidadMax: parseFloat(jugador.velocidadMaxima.toFixed(1)),
        calorias: parseFloat((caloriasFactor * minutosIndividual).toFixed(0)),
        vatios: parseFloat((velocidadPromedioKph * 10).toFixed(0)),
        posicion: esGanador ? 1 : 2,
        llave: llave.idGlobal,
        estadoLlave: 'finalizada',
      };
    });

    participantesAGuardar.forEach((participante) => {
      const yaExiste = this.participantesRegistrados.find(
        (p: any) =>
          p.nombre === participante.nombre && p.llave === participante.llave
      );

      if (yaExiste) {
        this.biketonaParticipantesService
          .actualizarParticipante(yaExiste.id, participante)
          .subscribe({
            next: (p) => {
              const index = this.participantesRegistrados.findIndex(
                (pr: any) => pr.id === yaExiste.id
              );
              if (index !== -1) this.participantesRegistrados[index] = p;
            },
            error: (err) =>
              console.error('Error actualizando participante:', err),
          });
      } else {
        this.biketonaParticipantesService
          .crearParticipante(participante)
          .subscribe({
            next: (p) => this.participantesRegistrados.push(p),
            error: (err) => console.error('Error guardando participante:', err),
          });
      }
    });
  }

  esParticipanteReciente(participante: any): boolean {
    return this.participantesRecientes.includes(participante.nombre);
  }

  obtenerEstadisticasParticipante(jugador: Jugador): any {
    const datosParticipante = this.participantesRegistrados
      .filter((p: any) => p.nombre === jugador.nombre)
      .sort((a: any, b: any) => {
        const tiempoA = this.convertirTiempoASegundos(a.tiempo || '00:00');
        const tiempoB = this.convertirTiempoASegundos(b.tiempo || '00:00');
        return tiempoA - tiempoB;
      });

    if (datosParticipante.length > 0) {
      const mejorRegistro = datosParticipante[0];

      const llavesUnicas = [
        ...new Set(datosParticipante.map((p: any) => p.llave)),
      ];

      const velocidadesPromedio = datosParticipante
        .map((p: any) => parseFloat(p.velocidadPromedio || '0'))
        .filter((v: number) => v > 0);
      const velocidadPromedioGeneral =
        velocidadesPromedio.length > 0
          ? velocidadesPromedio.reduce((a: number, b: number) => a + b, 0) /
            velocidadesPromedio.length
          : 0;

      const velocidadMaxima = Math.max(
        ...datosParticipante.map((p: any) => parseFloat(p.velocidadMax || '0'))
      );

      const caloriasTotal = datosParticipante.reduce(
        (sum: number, p: any) => sum + parseFloat(p.calorias || '0'),
        0
      );

      const vatiosPromedio = datosParticipante
        .map((p: any) => parseFloat(p.vatios || '0'))
        .filter((v: number) => v > 0);
      const vatiosPromedioGeneral =
        vatiosPromedio.length > 0
          ? vatiosPromedio.reduce((a: number, b: number) => a + b, 0) /
            vatiosPromedio.length
          : 0;

      return {
        velocidadPromedio: velocidadPromedioGeneral.toFixed(1),
        velocidadMaxima: velocidadMaxima.toFixed(1),
        calorias: caloriasTotal.toFixed(0),
        vatios: vatiosPromedioGeneral.toFixed(0),
        tiempoIndividual: mejorRegistro.tiempo || '00:00',
        totalCarreras: llavesUnicas.length,
      };
    }

    return {
      velocidadPromedio: '0.0',
      velocidadMaxima: '0.0',
      calorias: '0',
      vatios: '0',
      tiempoIndividual: '00:00',
      totalCarreras: 0,
    };
  }

  getJugadorPorId(id: number): Jugador | undefined {
    for (const ronda of this.rondas) {
      for (const llave of ronda.llaves) {
        const jugador = llave.jugadores.find((j) => j.id === id);
        if (jugador) return jugador;
      }
    }
    return undefined;
  }

  puedeCambiarNombre(llave: LlaveCampeonato): boolean {
    return llave.estado === 'pendiente';
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

  cerrarModalHeatYVolverALlaves(): void {
    this.mostrarModalHeat = false;
    this.detenerCarrera();
    this.tiempoTranscurrido = 0;
    this.jugadores = [];
    this.llaveActual = null;
    this.ganadorActual = null;

    if (this.hayMasHeatsPendientes()) {
      this.paso = 2;
    } else {
      this.guardarHistorialYMostrarRanking();
    }
  }

  private guardarHistorialYMostrarRanking(): void {
    const idBiketona = this.idBiketona || localStorage.getItem('biketonaId');
    const idSesion = localStorage.getItem('sesionId');
    const userId = localStorage.getItem('userId');

    if (!idBiketona || !idSesion || !userId) {
      console.error('Faltan datos para historial:', {
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
        console.error('Error guardando historial:', err);
        this.paso = 4;
      },
    });
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
        const registrosParticipante = this.participantesRegistrados.filter(
          (pDB: any) => pDB.nombre === p.nombre
        );

        let rondaMaximaAlcanzada = 0;
        for (let r = this.rondas.length - 1; r >= 0; r--) {
          const ronda = this.rondas[r];
          const estaEnRonda = ronda.llaves.some((llave) =>
            llave.jugadores.some((j) => j.id === p.id)
          );
          if (estaEnRonda) {
            rondaMaximaAlcanzada = r + 1;
            break;
          }
        }

        if (registrosParticipante.length === 0) {
          return {
            id: p.id,
            nombre: p.nombre,
            genero: p.genero,
            velocidadPromedio: '0.0',
            velocidadMaxima: p.velocidadMaxima.toFixed(1),
            calorias: '0',
            vatios: '0',
            mejorTiempo: p.mejorTiempo || 0,
            totalCarreras: 0,
            rondaMaximaAlcanzada,
          };
        }

        const velocidadesPromedio = registrosParticipante
          .map((r: any) => parseFloat(r.velocidadPromedio || '0'))
          .filter((v: number) => v > 0);
        const velocidadPromedioGeneral =
          velocidadesPromedio.length > 0
            ? velocidadesPromedio.reduce((a: number, b: number) => a + b, 0) /
              velocidadesPromedio.length
            : 0;

        const velocidadMaxima = Math.max(
          ...registrosParticipante.map((r: any) =>
            parseFloat(r.velocidadMax || '0')
          )
        );

        const caloriasTotal = registrosParticipante.reduce(
          (sum: number, r: any) => sum + parseFloat(r.calorias || '0'),
          0
        );

        const vatiosPromedio = registrosParticipante
          .map((r: any) => parseFloat(r.vatios || '0'))
          .filter((v: number) => v > 0);
        const vatiosPromedioGeneral =
          vatiosPromedio.length > 0
            ? vatiosPromedio.reduce((a: number, b: number) => a + b, 0) /
              vatiosPromedio.length
            : 0;

        return {
          id: p.id,
          nombre: p.nombre,
          genero: p.genero,
          velocidadPromedio: velocidadPromedioGeneral.toFixed(1),
          velocidadMaxima: velocidadMaxima.toFixed(1),
          calorias: caloriasTotal.toFixed(0),
          vatios: vatiosPromedioGeneral.toFixed(0),
          mejorTiempo: p.mejorTiempo || 0,
          totalCarreras: registrosParticipante.length,
          rondaMaximaAlcanzada,
        };
      });

    const rankingFinal = ranking.map((p, index) => ({
      posicion: index + 1,
      id: p.id,
      nombre: p.nombre,
      puntos: p.mejorTiempo || 0,
      rondaMaximaAlcanzada: p.rondaMaximaAlcanzada || 0,
    }));

    return {
      sesion_id: parseInt(idSesion),
      juego_id: idBiketona,
      fecha_inicio: new Date(
        Date.now() - this.tiempoTotalTorneo * 1000
      ).toISOString(),
      fecha_fin: new Date().toISOString(),
      duracion_minutos: duracionMinutos,
      juego_jugado: 'Biketona Campeonato',
      parametros_utilizados: JSON.stringify(this.configuracion),
      participantes_data: JSON.stringify(participantesData),
      ranking_final: JSON.stringify(rankingFinal),
      estadisticas_generales: JSON.stringify({
        duracionTotal: this.tiempoTotalTorneo,
        totalParticipantes: participantesData.length,
        totalRondas: this.rondas.length,
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
        '¿Deseas finalizar el campeonato? No podrás seguir jugando más llaves.'
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
                      alert('Campeonato y sesión finalizados correctamente.');
                      this.router.navigate(['/home']);
                    },
                    error: () => {
                      alert(
                        'Campeonato finalizado pero hubo error al cerrar la sesión.'
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

  volverAlInicio(): void {
    this.detenerCarrera();
    this.paso = 1;
    this.inicializarParticipantes();
    this.generarCuadroCampeonato();
  }

  nuevaCarrera(): void {
    this.audioService.reproducirSonidoSeleccion();
    this.router.navigate(['/setup']);
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

  avanzarGanadorASiguienteRonda(
    llave: LlaveCampeonato,
    ganador: Jugador
  ): void {
    const rondaIndex = this.rondas.findIndex((r) => r.numero === llave.ronda);
    if (rondaIndex === -1) return;

    if (rondaIndex >= this.rondas.length - 1) {
      return;
    }

    const siguienteRonda = this.rondas[rondaIndex + 1];
    const destinoIndex = Math.floor(llave.indexEnRonda / 2);
    const destinoLlave = siguienteRonda.llaves[destinoIndex];
    if (!destinoLlave) return;

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

  obtenerRanking(): Jugador[] {
    const participantesConRonda = this.participantes.map((p) => {
      let rondaMaximaAlcanzada = 0;

      for (let r = this.rondas.length - 1; r >= 0; r--) {
        const ronda = this.rondas[r];
        const estaEnRonda = ronda.llaves.some((llave) =>
          llave.jugadores.some((j) => j.id === p.id)
        );

        if (estaEnRonda) {
          rondaMaximaAlcanzada = r + 1;
          break;
        }
      }

      return {
        ...p,
        rondaMaximaAlcanzada,
      };
    });

    return participantesConRonda.sort((a, b) => {
      if (b.rondaMaximaAlcanzada !== a.rondaMaximaAlcanzada) {
        return b.rondaMaximaAlcanzada - a.rondaMaximaAlcanzada;
      }

      if (a.mejorTiempo == null && b.mejorTiempo == null) return 0;
      if (a.mejorTiempo == null) return 1;
      if (b.mejorTiempo == null) return -1;
      return a.mejorTiempo - b.mejorTiempo;
    });
  }

  formatearTiempo(segundos: number): string {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }

  mostrarCelebracionFinal: boolean = false;

  volverInicio(): void {
    this.audioService.reproducirSonidoPodio();
    this.paso = 1;
  }
  seleccionarGeneroModal(genero: 'masculino' | 'femenino'): void {
    if (this.llaveEnPantalla && this.modalSexoJugadorId !== null) {
      const jugador = this.llaveEnPantalla.jugadores.find(
        (j) => j.id === this.modalSexoJugadorId
      );
      if (jugador) {
        this.seleccionarGenero(jugador, genero);
      }
    }
  }

  obtenerParticipanteConMejorTiempo(): Jugador | null {
    const participantesConTiempo = this.participantes.filter(
      (p) => p.mejorTiempo && p.mejorTiempo > 0
    );

    if (participantesConTiempo.length === 0) return null;

    return participantesConTiempo.reduce((mejor, actual) => {
      return actual.mejorTiempo! < mejor.mejorTiempo! ? actual : mejor;
    });
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
      (0.0175 * MET * pesoKg * minutosTranscurridos).toFixed(0)
    );
  }
}
