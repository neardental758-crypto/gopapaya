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
  velocidad: number;           // velocidad actual (km/h)
  velocidadMaxima: number;     // 🔥 nueva: máxima alcanzada en el heat
  vueltaActual: number;
  distanciaRecorrida: number;  // porcentaje de la vuelta (para la pista gráfica)
  distanciaReal: number;       // 🔥 nueva: metros recorridos acumulados
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
  styleUrl: './pista-digital-unovsuno.component.css'
})
export class PistaDigital1v1Component implements OnInit, OnDestroy {
  paso = 1; // 1: Conexión BLE, 2: Registro participantes, 3: Carrera, 4: Ranking final
  modalSexoJugadorId: number | null = null;
  participantes: Jugador[] = [];
  jugadores: Jugador[] = [];
  llaves: Llave1v1[] = [];
  llaveActual: Llave1v1 | null = null;
  longitudPistaMetros = 100;
  configuracion: ConfiguracionCarrera = {
    numeroBicicletas: 2,
    numeroParticipantes: 2,
    numeroVueltas: 3,
    tipoCompetencia: '1v1',
    tipoPista: 'digital'
  };
  currentLlaveIndex = 0; // índice de la llave que se está mostrando en el paso 2
  
  // Colores actualizados: amarillo, rojo, verde
  coloresVehiculos = ['#fbbf24', '#ef4444', '#22c55e', '#f97316', '#eab308', '#dc2626', '#10b981', '#fb923c'];
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
  // Estado visual de las dos bicis/ESP32
  bicis: BiciUI[] = [
    { key: 'bici1', label: 'Bici 1', status: 'Desconectado', conectado: false, deviceId: '' },
    { key: 'bici2', label: 'Bici 2', status: 'Desconectado', conectado: false, deviceId: '' },
  ];
  idBiketona: string | null = null;
  constructor(
    private router: Router,
    private ble: BleEsp32Service,
    private biketonaParticipantesService: BiketonaParticipantesService,
    private biketonaService: BiketonaService
  ) {}

  ngOnInit(): void {
    this.cargarConfiguracion();
    this.inicializarParticipantes();

    this.idBiketona = localStorage.getItem('biketonaId');

    if (this.idBiketona) {
      this.cargarProgresoLlaves(this.idBiketona);
    }
  }
  
  finalizarTorneo(): void {
    const idBiketona = this.idBiketona || localStorage.getItem('biketonaId');

    if (!idBiketona) {
      alert('No se encontró el ID de la biketona. No se puede finalizar el torneo.');
      return;
    }

    if (!confirm('¿Deseas finalizar el torneo? No podrás seguir jugando más llaves.')) {
      return;
    }

    this.biketonaService.actualizarEstado(idBiketona, 'finalizada').subscribe({
      next: (biketonaActualizada) => {
        console.log('🏁 Biketona finalizada en BD:', biketonaActualizada);

        // (Opcional) limpiar info en localStorage
        // localStorage.removeItem('biketonaId');
        // localStorage.removeItem('configuracionCarrera');

        alert('Torneo finalizado correctamente.');
        this.router.navigate(['/setup']); // o a donde quieras regresar
      },
      error: (err) => {
        console.error('Error al finalizar la biketona:', err);
        alert('Ocurrió un error al finalizar el torneo. Intenta de nuevo.');
      }
    });
  }


  private cargarProgresoLlaves(idBiketona: string): void {
    this.biketonaParticipantesService.getByBiketona(idBiketona).subscribe({
      next: (participantes) => {
        console.log('👀 Participantes en DB para esta biketona:', participantes);

        if (!participantes || participantes.length === 0) {
          console.log('No hay participantes registrados todavía. Empezamos desde la llave 1.');
          this.currentLlaveIndex = 0;
          return;
        }

        const jugadoresPorLlave = this.configuracion.numeroBicicletas || 2;

        // ⚠️ Cada llave completada genera "jugadoresPorLlave" registros
        const llavesCompletas = Math.floor(participantes.length / jugadoresPorLlave);

        console.log('🔢 jugadoresPorLlave:', jugadoresPorLlave);
        console.log('🔢 participantesGuardados:', participantes.length);
        console.log('🔢 llavesCompletas:', llavesCompletas);

        // Marcar hechas esas llaves
        this.llaves.forEach((llave, idx) => {
          if (idx < llavesCompletas) {
            llave.estado = 'finalizado';
          }
        });

        if (llavesCompletas >= this.llaves.length) {
          // ✅ Todas las llaves están completas → mostrar ranking final
          console.log('✅ Todas las llaves finalizadas. Vamos a ranking.');
          this.currentLlaveIndex = this.llaves.length - 1;
          this.paso = 4;
        } else {
          // ⏭️ Continuar en la siguiente llave pendiente
          this.currentLlaveIndex = llavesCompletas;
          console.log(`➡️ Continuamos desde la llave #${this.llaves[this.currentLlaveIndex].id}`);
          // nos quedamos en paso 2 (registro de participantes) para esa llave
        }
      },
      error: (err) => {
        console.error('Error cargando progreso de llaves:', err);
        this.currentLlaveIndex = 0;
      }
    });
}



  /*
  private registrarParticipantesLlave(llave: Llave1v1): void {
    // Copiamos a una variable local
    const idBiketona = this.idBiketona;

    if (!idBiketona) {
      console.error('No hay idBiketona en localStorage. No se pueden registrar participantes.');
      return;
    }

    llave.jugadores.forEach(jugador => {
      const participante: BiketonaParticipante = {
        id: crypto.randomUUID(),
        idBiketona, 
        nombre: jugador.nombre,
        genero: jugador.genero,
        equipo: '',
        puntos: 0,
        velocidadPromedio: '0',
        velocidadMax: '0',
        calorias: '0',
        vatios: '0',
        posicion: jugador.posicion,
      };

      // 👇👇👇 AGREGAMOS ESTE LOG
      console.log('📤 Enviando participante a la API:', JSON.stringify(participante, null, 2));

      this.biketonaParticipantesService.crearParticipante(participante).subscribe({
        next: (p) => {
          console.log('Participante registrado en DB:', p);
        },
        error: (err) => {
          console.error('Error registrando participante en DB:', err);
        }
      });
    });
  }*/

  private registrarResultadosLlave(llave: Llave1v1): void {
    const idBiketona = this.idBiketona;

    if (!idBiketona) {
      console.error('No hay idBiketona en localStorage. No se pueden registrar participantes.');
      return;
    }

    const numeroLlave = llave.id;
    const tiempoSegundos = this.tiempoTranscurrido;
    const minutos = tiempoSegundos / 60;

    // Parámetros para estimar calorías (aprox)
    const MET = 8;       // ciclismo moderado-intenso
    const pesoKg = 70;   // peso promedio asumido
    const caloriasFactor = 0.0175 * MET * pesoKg; // kcal por minuto

    llave.jugadores.forEach(jugador => {
      const distanciaMetros = jugador.distanciaReal;
      const distanciaKm = distanciaMetros / 1000;

      // Velocidad promedio = distancia / tiempo
      let velocidadPromedioKph = 0;
      if (tiempoSegundos > 0) {
        const velMps = distanciaMetros / tiempoSegundos;
        velocidadPromedioKph = velMps * 3.6;
      }

      const velocidadMaxKph = jugador.velocidadMaxima;

      // Calorías aproximadas
      const calorias = caloriasFactor * minutos; // kcal totales del heat

      // Potencia promedio aprox (ejemplo simple: 10 W por cada km/h de promedio)
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
        llave: numeroLlave,
        estadoLlave: 'finalizada',
      };

      console.log('📤 Enviando resultados de participante:', JSON.stringify(participante, null, 2));

      this.biketonaParticipantesService.crearParticipante(participante).subscribe({
        next: (p) => {
          console.log('✔ Participante de llave registrado en DB:', p);
        },
        error: (err) => {
          console.error('❌ Error registrando participante de llave en DB:', err);
        }
      });
    });
  }

  // ===== CONFIGURACIÓN / PARTICIPANTES =====

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
        velocidadMaxima: 0,     // 👈
        vueltaActual: 1,
        distanciaRecorrida: 0,
        distanciaReal: 0,       // 👈
        posicion: i + 1,
        color: this.coloresVehiculos[i % this.coloresVehiculos.length],
        icono: this.iconosVehiculos[i % this.iconosVehiculos.length],
        mejorTiempo: null
      });
    }

    this.construirLlaves();

    // 👉 empezamos siempre en la primera llave
    this.currentLlaveIndex = 0;

    this.jugadores = [];
    this.llaveActual = null;
    this.tiempoTranscurrido = 0;
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
    this.modalSexoJugadorId = null; // cerrar modal al seleccionar
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
        estado: 'pendiente'
      });
    }
  }

  // ===== HELPERS BICIS =====

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

  // ===== NAVEGACIÓN PASO 1 -> PASO 2 =====

  irARegistroParticipantes(): void {
    if (!this.todasBicisNecesariasConectadas()) {
      alert('Debes conectar las dos bicicletas antes de continuar.');
      return;
    }
    this.paso = 2;
  }

  // ===== VALIDACIÓN LLAVE =====

  puedeIniciarLlave(llave: Llave1v1): boolean {
    if (llave.estado === 'finalizado') return false;
    if (!this.todasBicisNecesariasConectadas()) return false;
    return llave.jugadores.every(j => j.nombre && j.nombre.trim() !== '');
  }

  // ===== INICIAR CARRERA DE UNA LLAVE =====

  

  iniciarCarreraLlave(llave: Llave1v1): void {
    if (!this.todasBicisNecesariasConectadas()) {
      alert('Conecta las dos bicicletas (ESP32) antes de iniciar la carrera.');
      return;
    }

    if (!this.puedeIniciarLlave(llave)) {
      alert('Completa los nombres de los participantes de esta llave para poder iniciar.');
      return;
    }

    if (!this.idBiketona) {
      alert('No se encontró la configuración de la biketona (idBiketona). Vuelve a crear la carrera desde el setup.');
      return;
    }
    // 👉 Registrar participantes de esta llave en la DB
    //this.registrarParticipantesLlave(llave);

    // 👉 sincronizamos el índice de la llave actual
    const index = this.llaves.findIndex(l => l.id === llave.id);
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
      j.velocidadMaxima = 0;   // 👈
      j.vueltaActual = 1;
      j.distanciaRecorrida = 0;
      j.distanciaReal = 0;     // 👈
      j.posicion = idx + 1;
    });

    llave.estado = 'en_curso';
    this.ganadorActual = null;
    this.paso = 3;
    this.abrirModalHeat(
      `Carrera Llave ${llave.id}`,
      'Presiona "Iniciar carrera" para comenzar este enfrentamiento.',
      'inicio'
    );
  }

  private todasLlavesFinalizadas(): boolean {
    return this.llaves.length > 0 && this.llaves.every(l => l.estado === 'finalizado');
  }
  // ===== MODAL HEAT =====

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
    // 👉 Si aún hay más llaves: paso 2 con la siguiente
    if (this.currentLlaveIndex < this.llaves.length - 1) {
      this.currentLlaveIndex++;
      this.paso = 2;
    } else {
      // 👉 Si ya no hay más llaves: mostramos ranking final
      this.paso = 4;
    }
  }

  iniciarHeat(): void {
    this.cerrarModalHeat();
    this.iniciarCuentaRegresiva();
  }

  // ===== BLE: DOS BICIS =====

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

  // ===== CARRERA =====

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
    // Intervalo de 1 segundo, igual que el ESP32
    this.intervaloCarrera = setInterval(() => {
      if (this.carreraPausada) return;

      this.tiempoTranscurrido++; // segundos

     this.jugadores.forEach((jugador) => {
        const velocidadKph = jugador.velocidad || 0;

        // 🔥 actualizar velocidad máxima
        if (velocidadKph > jugador.velocidadMaxima) {
          jugador.velocidadMaxima = velocidadKph;
        }

        const velocidadMps = velocidadKph / 3.6;
        const distanciaMetros = velocidadMps * 1; // Δt = 1s

        // 🔥 acumular distancia real
        jugador.distanciaReal += distanciaMetros;

        // Convertimos distancia a porcentaje de la vuelta (para la UI)
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

    // Guardamos el ganador actual para el modal
    this.ganadorActual = ganador;

    const ganadorGlobal = this.participantes.find(p => p.id === ganador.id);
    if (ganadorGlobal) {
      if (ganadorGlobal.mejorTiempo == null || this.tiempoTranscurrido < ganadorGlobal.mejorTiempo) {
        ganadorGlobal.mejorTiempo = this.tiempoTranscurrido;
      }
    }

    if (this.llaveActual) {
      this.llaveActual.estado = 'finalizado';
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
      j.vueltaActual = 1;
      j.distanciaRecorrida = 0;
    });
    this.actualizarPosiciones();
  }

  // ===== RANKING =====

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

  // ===== NAVEGACIÓN =====

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
      if (confirm('¿Estás seguro de volver? Se perderá el progreso de la carrera actual')) {
        this.paso = 2;
      }
    } else if (this.paso === 4) {
      this.nuevo1v1();
    }
  }

  ngOnDestroy(): void {
    this.detenerCarrera();
    this.ble.disconnectAll();
  }
}