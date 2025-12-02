/*import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BleEsp32Service } from '../../services/ble-esp32.service';

interface Jugador {
  id: number;
  nombre: string;
  genero: 'masculino' | 'femenino' | 'otro';
  velocidad: number;
  vueltaActual: number;
  distanciaRecorrida: number;
  posicion: number;
  color: string;
  icono: string;
  llaveId?: number;
  mejorTiempo?: number | null;
}

interface Llave {
  id: number;
  nombre: string;
  jugadores: Jugador[];
  ganadorId?: number;
  finalizada: boolean;
}

interface ConfiguracionCarrera {
  numeroBicicletas: number;
  numeroParticipantes: number;
  numeroVueltas: number;
  tipoCompetencia: string;
  tipoPista: string;
}

@Component({
  selector: 'app-pista-digital',
  imports: [CommonModule, FormsModule],
  templateUrl: './pista-digital.component.html',
  styleUrl: './pista-digital.component.css'
})
export class PistaDigitalComponent implements OnInit, OnDestroy {
  paso = 1;
  jugadores: Jugador[] = [];
  llaves: Llave[] = [];
  llaveActualIndex = 0;
  esCampeonato = false;
  esFinal = false;
  modo1v1 = false;
  todosJugadores: Jugador[] = []; 
  indiceSiguiente = 0;  

  configuracion: ConfiguracionCarrera = {
    numeroBicicletas: 2,
    numeroParticipantes:2, 
    numeroVueltas: 3,
    tipoCompetencia: '1v1',
    tipoPista: 'digital'
  };

  coloresVehiculos = ['#00d9ff', '#00ff88', '#ffdd00', '#ff6b00', '#ff0099', '#9d00ff', '#00ffff', '#ff3366'];
  iconosVehiculos = ['🏎️', '🚗', '🚙', '🚕', '🏁', '🚓', '🚑', '🚐'];

  carreraIniciada = false;
  carreraPausada = false;
  tiempoTranscurrido = 0;
  intervaloCarrera: any;
  
  // Control de cuenta regresiva
  mostrarCuentaRegresiva = false;
  numeroCuentaRegresiva = 3;
  
  // Modal siguiente llave
  mostrarModalSiguienteLlave = false;
  datosModalLlave: any = null;

  constructor(private router: Router, private ble: BleEsp32Service) {}

  ngOnInit(): void {
    this.cargarConfiguracion();

    this.modo1v1 = this.configuracion.tipoCompetencia === '1v1';
    this.esCampeonato = 
      this.configuracion.tipoCompetencia === 'campeonato' || 
      this.configuracion.tipoCompetencia === 'campeonato-equipos';
    
    if (this.esCampeonato) {
      this.inicializarCampeonato();
    } else if (this.modo1v1) {
      this.inicializarModo1v1();
    } else {
      // carrera "todos al tiempo", por si luego tienes otro modo
      this.inicializarJugadores();
    }
  }

  prepararHeat1v1(): void {
    const total = this.todosJugadores.length;
    if (this.indiceSiguiente >= total) {
      // Ya corrieron todos
      this.paso = 3;
      return;
    }

    const heatSize = Math.min(this.configuracion.numeroBicicletas, total - this.indiceSiguiente);
    this.jugadores = this.todosJugadores.slice(this.indiceSiguiente, this.indiceSiguiente + heatSize);

    // Reset estado de carrera para este heat
    this.tiempoTranscurrido = 0;
    this.jugadores.forEach((j, idx) => {
      j.velocidad = 0;
      j.vueltaActual = 1;
      j.distanciaRecorrida = 0;
      j.posicion = idx + 1;
    });
  }

  inicializarModo1v1(): void {
    this.todosJugadores = [];
    for (let i = 0; i < this.configuracion.numeroParticipantes; i++) {
      this.todosJugadores.push({
        id: i + 1,
        nombre: '',
        genero: 'masculino',
        velocidad: 0,
        vueltaActual: 1,
        distanciaRecorrida: 0,
        posicion: i + 1,
        color: this.coloresVehiculos[i % this.coloresVehiculos.length],
        icono: this.iconosVehiculos[i % this.iconosVehiculos.length],
        mejorTiempo: null
      });
    }

    this.indiceSiguiente = 0;
    // 👀 OJO: en PASO 1 solo registramos nombres, así que
    // todavía NO llamamos prepararHeat1v1 aquí.
    // prepararHeat1v1 se llama justo antes de pasar al paso 2.
  }


  cargarConfiguracion(): void {
    const config = localStorage.getItem('configuracionCarrera');
    if (config) {
      this.configuracion = JSON.parse(config);
    }
  }

  inicializarJugadores(): void {
    this.jugadores = [];
    for (let i = 0; i < this.configuracion.numeroParticipantes; i++) {
      this.jugadores.push({
        id: i + 1,
        nombre: '',
        genero: 'masculino',
        velocidad: 0,
        vueltaActual: 1,
        distanciaRecorrida: 0,
        posicion: i + 1,
        color: this.coloresVehiculos[i % this.coloresVehiculos.length],
        icono: this.iconosVehiculos[i % this.iconosVehiculos.length]
      });
    }
  }

  inicializarCampeonato(): void {
    this.llaves = [];
    const numLlaves = Math.ceil(this.configuracion.numeroParticipantes / 2);
    let jugadorId = 1;

    for (let i = 0; i < numLlaves; i++) {
      const jugadoresLlave: Jugador[] = [];
      
      for (let j = 0; j < 2 && jugadorId <= this.configuracion.numeroParticipantes; j++) {
        jugadoresLlave.push({
          id: jugadorId,
          nombre: '',
          genero: 'masculino',
          velocidad: 0,
          vueltaActual: 1,
          distanciaRecorrida: 0,
          posicion: j + 1,
          color: this.coloresVehiculos[(jugadorId - 1) % this.coloresVehiculos.length],
          icono: this.iconosVehiculos[(jugadorId - 1) % this.iconosVehiculos.length],
          llaveId: i + 1
        });
        jugadorId++;
      }

      this.llaves.push({
        id: i + 1,
        nombre: `Llave ${i + 1}`,
        jugadores: jugadoresLlave,
        finalizada: false
      });
    }

    this.jugadores = [...this.llaves[0].jugadores];
  }

  obtenerLlaveActual(): Llave | null {
    if (this.esFinal) return null;
    return this.llaves[this.llaveActualIndex] || null;
  }

  todosJugadoresCompletos(): boolean {
    if (this.esCampeonato) {
      return this.llaves.every(llave => 
        llave.jugadores.every(j => j.nombre.trim() !== '')
      );
    }

    if (this.modo1v1) {
      return this.todosJugadores.every(j => j.nombre.trim() !== '');
    }

    return this.jugadores.every(j => j.nombre.trim() !== '');
  }

  // ====== CONEXIÓN BLE / ESP32 ======

  async buscarBici() {
    try {
      await this.ble.requestDevice();
      this.bleStatus = 'Dispositivo encontrado. Presiona conectar.';
    } catch (e: any) {
      console.error('Error buscando dispositivo BLE', e);
      this.bleStatus = 'Error buscando dispositivo: ' + (e?.message ?? e);
    }
  }

  async conectarBici() {
    try {
      await this.ble.connect();
      this.bleStatus = 'Conectado a ESP32';
      this.bleConectado = true;

      // Leer ID de la bici
      this.ble.readValue('id')
        .then(id => this.bleId = id)
        .catch(() => {});

      // Suscribirse a la velocidad y asignarla al Jugador 1
      this.ble.subscribe('vel', v => {
        const velNum = parseFloat(v);
        const vel = isNaN(velNum) ? 0 : velNum;

        const jugadorHardware = this.jugadores[0]; // bici 1
        if (jugadorHardware) {
          jugadorHardware.velocidad = vel;
        }
      });

    } catch (e: any) {
      console.error('Error al conectar BLE', e);
      this.bleStatus = 'Error al conectar: ' + (e?.message ?? e);
      this.bleConectado = false;
    }
  }

  desconectarBici() {
    this.ble.disconnect();
    this.bleConectado = false;
    this.bleStatus = 'Desconectado';
    this.bleId = '';
  }

  iniciarCarrera(): void {
    if (!this.todosJugadoresCompletos()) {
      alert('Por favor, completa los nombres de todos los jugadores');
      return;
    }

    if (!this.bleConectado) {
      alert('Primero conecta la bicicleta (ESP32 BLE) antes de iniciar la carrera.');
      return;
    }
    
    if (this.esCampeonato) {
      this.jugadores = [...this.llaves[this.llaveActualIndex].jugadores];
    } else if (this.modo1v1) {
      // ✅ Para 1v1 armamos el primer heat
      this.prepararHeat1v1();
    }

    this.paso = 2;
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

  /*iniciarSimulacion(): void {
    this.intervaloCarrera = setInterval(() => {
      if (!this.carreraPausada) {
        this.tiempoTranscurrido++;
        
        this.jugadores.forEach(jugador => {
          jugador.velocidad = Math.random() * 20 + 15;
          const incremento = (jugador.velocidad / 30) * 2;
          jugador.distanciaRecorrida += incremento;

          if (jugador.distanciaRecorrida >= 100) {
            jugador.distanciaRecorrida = jugador.distanciaRecorrida - 100;
            jugador.vueltaActual++;
          }
        });

        this.actualizarPosiciones();
        this.verificarFinCarrera();
      }
    }, 100);
  }*/

    /*getCarStyle(jugador: Jugador) {
      // Progreso en la vuelta: 0–1
      const progress = jugador.distanciaRecorrida / 100; 

      // Convertimos progreso a ángulo (0–2π)
      // Ajuste -Math.PI/2 para que empiece “arriba” del óvalo
      const angle = progress * 2 * Math.PI - Math.PI / 2;

      // Radio del óvalo (porcentaje dentro del contenedor 100x100)
      const rx = 42; // radio horizontal
      const ry = 30; // radio vertical

      // Centro del óvalo en % dentro del contenedor
      const cx = 50;
      const cy = 50;

      const x = cx + rx * Math.cos(angle);
      const y = cy + ry * Math.sin(angle);

      return {
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        filter: `drop-shadow(0 0 8px ${jugador.color})`,
      } as any;
    }


  iniciarSimulacion(): void {
  this.intervaloCarrera = setInterval(() => {
    if (!this.carreraPausada) {
      this.tiempoTranscurrido++;

      this.jugadores.forEach((jugador, index) => {
        const esHardware = this.bleConectado && index === 0; // Jugador 1 = bici real

        if (!esHardware) {
          // Jugadores simulados
          jugador.velocidad = Math.random() * 20 + 15;
        }
        // Si esHardware, la velocidad ya viene del ESP32

        const incremento = (jugador.velocidad / 30) * 2; // escala distancia
        jugador.distanciaRecorrida += incremento;

        if (jugador.distanciaRecorrida >= 100) {
          jugador.distanciaRecorrida = jugador.distanciaRecorrida - 100;
          jugador.vueltaActual++;
        }
      });

      this.actualizarPosiciones();
      this.verificarFinCarrera();
    }
  }, 100);
}


  actualizarPosiciones(): void {
    const jugadoresOrdenados = [...this.jugadores].sort((a, b) => {
      if (b.vueltaActual !== a.vueltaActual) {
        return b.vueltaActual - a.vueltaActual;
      }
      return b.distanciaRecorrida - a.distanciaRecorrida;
    });

    jugadoresOrdenados.forEach((jugador, index) => {
      const jugadorOriginal = this.jugadores.find(j => j.id === jugador.id);
      if (jugadorOriginal) {
        jugadorOriginal.posicion = index + 1;
      }
    });
  }

  verificarFinCarrera(): void {
    const ganador = this.jugadores.find(j => j.vueltaActual > this.configuracion.numeroVueltas);
    if (!ganador) return;

    this.detenerCarrera();

    // ✅ Lógica 1v1 por tiempos (no eliminación)
    if (this.modo1v1 && !this.esCampeonato) {
      this.procesarFinHeat1v1(ganador);
      return;
    }

    // ✅ Lógica de campeonato por llaves, manual
    if (this.esCampeonato) {
      this.finalizarLlaveManual(ganador);
      return;
    }

    // Otros modos (si los hubiera)
    this.mostrarGanadorFinal(ganador);
  }

  finalizarLlaveManual(ganador: Jugador): void {
    const llaveActual = this.llaves[this.llaveActualIndex];
    llaveActual.ganadorId = ganador.id;
    llaveActual.finalizada = true;

    // Mensaje simple de ganador de la llave
    alert(`🏆 ${ganador.nombre} ha ganado la ${llaveActual.nombre}`);

    // Reset estado de carrera
    this.tiempoTranscurrido = 0;
    this.carreraPausada = false;

    // Si todas las llaves ya se jugaron, puedes mandar a la pantalla final
    const todasFinalizadas = this.llaves.every(l => l.finalizada);

    if (todasFinalizadas) {
      // Pantalla final de resumen de llaves
      this.paso = 3;
    } else {
      // Volver a la pantalla de registro para que el admin elija la próxima llave
      this.paso = 1;
    }
  }


  procesarFinHeat1v1(ganador: Jugador): void {
    // Guardar mejor tiempo del ganador (tiempo de este heat)
    if (ganador.mejorTiempo == null || this.tiempoTranscurrido < ganador.mejorTiempo) {
      ganador.mejorTiempo = this.tiempoTranscurrido;
    }

    // Avanzar al siguiente grupo de participantes (2 en 2 o tantas bicis haya)
    this.indiceSiguiente += this.jugadores.length;

    // Si ya todos corrieron al menos una vez → vamos a la pantalla final
    if (this.indiceSiguiente >= this.todosJugadores.length) {
      this.paso = 3;
      return;
    }

    // Preparar siguiente heat (NO iniciamos aún la cuenta regresiva)
    this.prepararHeat1v1();

    // Mostrar modal estilo "siguiente llave" pero para 1vs1
    this.datosModalLlave = {
      tipo: 'siguiente-1v1',
      jugadores: this.jugadores
    };
    this.mostrarModalSiguienteLlave = true;
  }

  iniciarLlave(llaveIndex: number): void {
    // Guardamos cuál llave se va a correr
    this.llaveActualIndex = llaveIndex;

    const llave = this.llaves[llaveIndex];

    if (llave.finalizada) {
      alert('Esta llave ya fue jugada.');
      return;
    }

    // Validar que todos los jugadores de la llave tengan nombre
    const incompletos = llave.jugadores.some(j => !j.nombre || j.nombre.trim() === '');
    if (incompletos) {
      alert('Por favor completa los nombres de todos los jugadores de esta llave.');
      return;
    }

    // Validar BLE
    if (!this.bleConectado) {
      alert('Primero conecta la bicicleta (ESP32 BLE) antes de iniciar la carrera.');
      return;
    }

    // Cargar jugadores de esta llave
    this.jugadores = [...llave.jugadores];

    // Reset de estado de carrera
    this.tiempoTranscurrido = 0;
    this.jugadores.forEach((j, idx) => {
      j.velocidad = 0;
      j.vueltaActual = 1;
      j.distanciaRecorrida = 0;
      j.posicion = idx + 1;
    });

    // Ir a la vista de carrera y lanzar cuenta regresiva
    this.paso = 2;
    this.iniciarCuentaRegresiva();
  }

  finalizarLlave(ganador: Jugador): void {
    const llaveActual = this.llaves[this.llaveActualIndex];
    llaveActual.ganadorId = ganador.id;
    llaveActual.finalizada = true;

    setTimeout(() => {
      if (this.llaveActualIndex < this.llaves.length - 1) {
        const siguienteLlave = this.llaves[this.llaveActualIndex + 1];
        this.datosModalLlave = {
          ganadorActual: ganador,
          llaveActual: llaveActual,
          siguienteLlave: siguienteLlave,
          tipo: 'siguiente'
        };
        this.mostrarModalSiguienteLlave = true;
      } else {
        this.datosModalLlave = {
          ganadorActual: ganador,
          llaveActual: llaveActual,
          ganadores: this.llaves.map(l => {
            const g = l.jugadores.find(j => j.id === l.ganadorId);
            return g;
          }).filter(g => g !== undefined),
          tipo: 'final'
        };
        this.mostrarModalSiguienteLlave = true;
      }
    }, 500);
  }

  cerrarModalYContinuar(): void {
    this.mostrarModalSiguienteLlave = false;

    if (this.datosModalLlave.tipo === 'siguiente') {
      this.siguienteLlave();
    } else if (this.datosModalLlave.tipo === 'final') {
      this.prepararFinal();
    } else if (this.datosModalLlave.tipo === 'siguiente-1v1') {
      // 👉 Para 1vs1: simplemente iniciamos la cuenta regresiva
      this.paso = 2;
      this.iniciarCuentaRegresiva();
    }

    this.datosModalLlave = null;
  }

  cerrarModal(): void {
    this.mostrarModalSiguienteLlave = false;
    this.datosModalLlave = null;
  }

  siguienteLlave(): void {
    this.llaveActualIndex++;
    this.tiempoTranscurrido = 0;
    this.jugadores = [...this.llaves[this.llaveActualIndex].jugadores];
    
    this.jugadores.forEach(j => {
      j.velocidad = 0;
      j.vueltaActual = 1;
      j.distanciaRecorrida = 0;
    });
    
    this.paso = 2;
    this.iniciarCuentaRegresiva();
  }

  prepararFinal(): void {
    this.esFinal = true;
    this.tiempoTranscurrido = 0;
    
    const ganadores: Jugador[] = [];
    this.llaves.forEach(llave => {
      const ganador = llave.jugadores.find(j => j.id === llave.ganadorId);
      if (ganador) {
        ganadores.push({...ganador});
      }
    });

    this.jugadores = ganadores.map((g, index) => ({
      ...g,
      velocidad: 0,
      vueltaActual: 1,
      distanciaRecorrida: 0,
      posicion: index + 1
    }));

    this.paso = 2;
    this.iniciarCuentaRegresiva();
  }

  mostrarGanadorFinal(ganador: Jugador): void {
    setTimeout(() => {
      const titulo = this.esFinal ? '👑 ¡CAMPEÓN DEL TORNEO!' : '🏆 ¡GANADOR!';
      alert(`${titulo}\n\n${ganador.nombre} ha ganado la carrera!`);
      this.paso = 3;
    }, 500);
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
    this.jugadores.forEach(jugador => {
      jugador.velocidad = 0;
      jugador.vueltaActual = 1;
      jugador.distanciaRecorrida = 0;
    });
    this.actualizarPosiciones();
  }

  volverAlInicio(): void {
    this.detenerCarrera();
    this.paso = 1;
    this.llaveActualIndex = 0;
    this.esFinal = false;

    if (this.esCampeonato) {
      this.inicializarCampeonato();
    } else if (this.modo1v1) {
      this.inicializarModo1v1();
    } else {
      this.inicializarJugadores();
    }
  }

  nuevoCampeonato(): void {
    this.router.navigate(['/setup']);
  }

  volver(): void {
    if (this.paso === 2) {
      if (confirm('¿Estás seguro de volver? Se perderá el progreso de la carrera')) {
        this.volverAlInicio();
      }
    } else if (this.paso === 3) {
      this.nuevoCampeonato();
    } else {
      this.router.navigate(['/setup']);
    }
  }

  obtenerJugadoresOrdenados(): Jugador[] {
    // Ranking global por mejor tiempo (1v1)
    if (this.modo1v1 && !this.esCampeonato) {
      return [...this.todosJugadores].sort((a, b) => {
        if (a.mejorTiempo == null && b.mejorTiempo == null) return 0;
        if (a.mejorTiempo == null) return 1;  // sin tiempo va abajo
        if (b.mejorTiempo == null) return -1;
        return a.mejorTiempo - b.mejorTiempo; // menor tiempo = mejor puesto
      });
    }

    // Comportamiento original: posición en la carrera actual
    return [...this.jugadores].sort((a, b) => a.posicion - b.posicion);
  }


  formatearTiempo(segundos: number): string {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  obtenerLlavesFinalizadas(): Llave[] {
    return this.llaves.filter(l => l.finalizada);
  }

  obtenerGanadorLlave(llave: Llave): Jugador | undefined {
    return llave.jugadores.find(j => j.id === llave.ganadorId);
  }

    // --- BLE / ESP32 ---
  bleStatus = 'Desconectado';
  bleConectado = false;
  bleId = '';
  // --------------------

  ngOnDestroy(): void {
    this.detenerCarrera();
  }
}*/