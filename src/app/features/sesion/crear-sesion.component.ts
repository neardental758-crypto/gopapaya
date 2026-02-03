import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Usuario } from '../../core/interfaces/usuario.interface';
import { UsuarioService } from '../../services/usuario.service';
import { EmpresaService } from '../services/empresa.service';
import { Empresa, SesionService } from '../services/sesion.service';
import {
  Contenido,
  Tematica,
  TematicaService,
} from '../services/tematica.service';

import { Location } from '@angular/common';
import {
  Bebida,
  BebidasService,
} from '../services/bicilicuadora/bebidas.service';

@Component({
  selector: 'app-crear-sesion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-sesion.component.html',
})
export class CrearSesionComponent implements OnInit {
  empresas: Empresa[] = [];
  admins: Usuario[] = [];
  paso = 1;

  empresaSeleccionada: string = '';
  lugarEjecucion: string = '';
  fechaHoraSesion: string = '';
  fechaSesionPreseleccionada: string = '';
  horaSesion: string = '09:00';
  horaFinSesion: string = '11:00';
  horaMinFin: string = '';
  fechaPreseleccionada: boolean = false;
  fechaHoraMinima: string = '';
  horaMinima: string = '';
  adminsSeleccionados: string[] = [];
  nota: string = '';
  juegoAsignado: string = '';

  parametrosBrainBike = {
    tematica_id: '',
    contenido_id: '',
    dificultad: 'media',
  };

  tematicas: Tematica[] = [];
  contenidosDisponibles: Contenido[] = [];
  cargando = false;
  errorMensaje = '';

  cronograma: string = '';
  secuencia: string = '';

  parametrosBicilicuadora = {
    numero_bicicletas: 1,
    numero_participantes: 1,
    bebidas_disponibles: [] as string[],
  };

  bebidasDisponibles: Bebida[] = [];
  bebidasSeleccionadas: string[] = [];

  parametrosVR = {
    tipos_vr: [] as string[],
  };

  parametrosBiciPaseo = {
    vehiculos: [] as { tipo: string; cantidad: number }[],
    ruta: '',
    distancia: '',
  };

  tiposVehiculo = [
    { id: 'patineta-electrica', nombre: 'Patineta Eléctrica' },
    { id: 'bicicleta-mecanica', nombre: 'Bicicleta Mecánica' },
    { id: 'bicicleta-electrica', nombre: 'Bicicleta Eléctrica' },
  ];

  tiposVR = [
    { id: 'primeros-auxilios-rcp', nombre: 'Primeros auxilios y RCP' },
    { id: 'meditacion', nombre: 'Meditación' },
    { id: 'recreativo-synth-riders', nombre: 'Recreativo (Synth Riders)' },
    {
      id: 'trabajo-equipo-comunicacion',
      nombre: 'Trabajo en equipo, comunicación asertiva (Collective canvas)',
    },
    { id: 'bienestar-emocional', nombre: 'Bienestar emocional' },
    {
      id: 'uso-epp',
      nombre: 'Uso adecuado de Equipos de Protección Personal (EPP)',
    },
    { id: 'riesgo-electrico', nombre: 'Riesgo eléctrico' },
    { id: 'riesgo-mecanico', nombre: 'Riesgo mecánico' },
    { id: 'riesgo-biologico', nombre: 'Riesgo Biológico' },
    {
      id: 'manejo-sustancias-quimicas',
      nombre: 'Manejo de sustancias químicas',
    },
    { id: 'manipulacion-alimentos', nombre: 'Manipulación de alimentos' },
    {
      id: 'identificacion-prevencion-riesgos',
      nombre: 'Identificación y prevención de riesgos laborales',
    },
    { id: 'trabajo-alturas', nombre: 'Trabajo en alturas' },
    { id: 'espacios-confinados', nombre: 'Espacios confinados' },
    { id: 'montacargas', nombre: 'Montacargas' },
    {
      id: 'conduccion-vehiculo-liviano',
      nombre: 'Conducción Vehículo liviano',
    },
    { id: 'conduccion-vehiculo-pesado', nombre: 'Conducción Vehículo pesado' },
    { id: 'conduccion-bicicleta', nombre: 'Conducción Bicicleta' },
    {
      id: 'izaje-cargas',
      nombre: 'Izaje de cargas Puente Grúas – Grúas móviles - torres grúa',
    },
    { id: 'seguridad-vial', nombre: 'Seguridad vial' },
    {
      id: 'manejo-extintores',
      nombre: 'Manejo de extintores y prevención de incendios',
    },
    { id: 'simulador-parqueo', nombre: 'Simulador de parqueo' },
    { id: 'poligono', nombre: 'Polígono' },
  ];

  tipoVRSeleccionado: string = '';
  fechaHoraFinSesion: string = '';
  fechaHoraFinMinima: string = '';
  constructor(
    private sesionService: SesionService,
    private empresaService: EmpresaService,
    private usuarioService: UsuarioService,
    private tematicaService: TematicaService,
    private bebidasService: BebidasService,
    private router: Router,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.establecerFechaHoraMinima();

    const fechaPreseleccionada = localStorage.getItem(
      'fecha_sesion_preseleccionada',
    );
    if (fechaPreseleccionada) {
      this.fechaSesionPreseleccionada = fechaPreseleccionada;
      this.fechaPreseleccionada = true;
      this.establecerHoraMinima();
      localStorage.removeItem('fecha_sesion_preseleccionada');
    }
    this.cargarDatos();
  }

  establecerFechaHoraMinima(): void {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    this.fechaHoraMinima = `${año}-${mes}-${dia}T${horas}:${minutos}`;
    this.fechaHoraFinMinima = this.fechaHoraMinima;
  }

  establecerHoraMinima(): void {
    const ahora = new Date();
    const fechaPresel = new Date(this.fechaSesionPreseleccionada + 'T00:00:00');
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaPresel.getTime() === hoy.getTime()) {
      const horas = String(ahora.getHours()).padStart(2, '0');
      const minutos = String(ahora.getMinutes()).padStart(2, '0');
      this.horaMinima = `${horas}:${minutos}`;
    } else {
      this.horaMinima = '00:00';
    }
  }

  cargarDatos(): void {
    this.empresaService.getEmpresas().subscribe({
      next: (empresas) => {
        this.empresas = empresas;
      },
      error: (error) => {
        console.error('Error al cargar empresas:', error);
      },
    });

    this.usuarioService.getAdmins().subscribe({
      next: (admins) => {
        this.admins = admins;
      },
      error: (error) => {
        console.error('Error al cargar admins:', error);
      },
    });

    this.tematicaService.getTematicas().subscribe({
      next: (tematicas) => {
        this.tematicas = tematicas;
      },
      error: (error) => {
        console.error('Error al cargar temáticas:', error);
      },
    });

    this.bebidasService.getAllBebidasActivas().subscribe({
      next: (bebidas) => {
        this.bebidasDisponibles = bebidas;
      },
      error: (error) => {
        console.error('Error al cargar bebidas:', error);
      },
    });
  }

  seleccionarJuego(juego: string): void {
    this.juegoAsignado = juego;

    if (juego !== 'brain-bike') {
      this.parametrosBrainBike = {
        tematica_id: '',
        contenido_id: '',
        dificultad: 'media',
      };
    }

    if (juego !== 'bicilicuadora') {
      this.parametrosBicilicuadora = {
        numero_bicicletas: 1,
        numero_participantes: 1,
        bebidas_disponibles: [],
      };
      this.bebidasSeleccionadas = [];
    }

    if (juego !== 'vr') {
      this.parametrosVR = {
        tipos_vr: [],
      };
      this.tipoVRSeleccionado = '';
    }

    if (juego !== 'bici-paseo') {
      this.parametrosBiciPaseo = {
        vehiculos: [],
        ruta: '',
        distancia: '',
      };
    }
    if (juego !== 'dr-bici') {
    }
  }

  validarPaso(): boolean {
    this.errorMensaje = '';

    if (this.paso === 1) {
      if (!this.empresaSeleccionada) {
        this.errorMensaje = 'Debe seleccionar una empresa';
        return false;
      }

      if (this.fechaPreseleccionada) {
        if (!this.horaSesion) {
          this.errorMensaje = 'Debe seleccionar una hora';
          return false;
        }

        if (this.fechaPreseleccionada) {
          if (!this.horaFinSesion || this.horaFinSesion <= this.horaSesion) {
            this.errorMensaje =
              'La hora de fin debe ser posterior a la hora de inicio';
            return false;
          }
        } else {
          if (!this.fechaHoraFinSesion) {
            this.errorMensaje = 'Debe seleccionar hora de finalización';
            return false;
          }
          if (this.fechaHoraFinSesion <= this.fechaHoraSesion) {
            this.errorMensaje =
              'La hora de fin debe ser posterior a la hora de inicio';
            return false;
          }
        }

        const fechaHoraCompleta = new Date(
          `${this.fechaSesionPreseleccionada}T${this.horaSesion}:00`,
        );
        const ahora = new Date();

        if (fechaHoraCompleta < ahora) {
          this.errorMensaje =
            'No se puede crear una sesión en una fecha y hora pasada';
          return false;
        }
      } else {
        if (!this.fechaHoraSesion) {
          this.errorMensaje = 'Debe seleccionar fecha y hora';
          return false;
        }

        const fechaSeleccionada = new Date(this.fechaHoraSesion);
        const ahora = new Date();

        if (fechaSeleccionada < ahora) {
          this.errorMensaje =
            'No se puede crear una sesión en una fecha y hora pasada';
          return false;
        }
      }

      if (this.adminsSeleccionados.length === 0) {
        this.errorMensaje = 'Debe asignar al menos un admin';
        return false;
      }
    }

    if (this.paso === 2) {
      if (!this.juegoAsignado) {
        this.errorMensaje = 'Debe seleccionar un juego';
        return false;
      }
    }

    if (this.paso === 3 && this.juegoAsignado === 'brain-bike') {
      if (!this.parametrosBrainBike.tematica_id) {
        this.errorMensaje = 'Debe seleccionar una temática';
        return false;
      }
      if (!this.parametrosBrainBike.contenido_id) {
        this.errorMensaje = 'Debe seleccionar un contenido';
        return false;
      }
    }

    if (this.paso === 3 && this.juegoAsignado === 'bicilicuadora') {
      if (this.parametrosBicilicuadora.numero_bicicletas < 1) {
        this.errorMensaje = 'Debe haber al menos 1 bicicleta';
        return false;
      }
      if (this.parametrosBicilicuadora.numero_participantes < 1) {
        this.errorMensaje = 'Debe haber al menos 1 participante';
        return false;
      }
      if (this.bebidasSeleccionadas.length === 0) {
        this.errorMensaje = 'Debe seleccionar al menos una bebida';
        return false;
      }
    }

    if (this.paso === 3 && this.juegoAsignado === 'vr') {
      if (!this.tipoVRSeleccionado) {
        this.errorMensaje = 'Debe seleccionar un tipo de VR';
        return false;
      }
    }

    if (this.paso === 3 && this.juegoAsignado === 'bici-paseo') {
      if (this.parametrosBiciPaseo.vehiculos.length === 0) {
        this.errorMensaje = 'Debe agregar al menos un tipo de vehículo';
        return false;
      }
      if (!this.parametrosBiciPaseo.ruta.trim()) {
        this.errorMensaje = 'Debe especificar la ruta';
        return false;
      }
      if (!this.parametrosBiciPaseo.distancia.trim()) {
        this.errorMensaje = 'Debe especificar la distancia';
        return false;
      }
    }

    if (this.paso === 3 && this.juegoAsignado === 'dr-bici') {
      return true;
    }

    return true;
  }

  crearSesion(): void {
    if (!this.validarPaso()) {
      return;
    }

    this.cargando = true;
    this.errorMensaje = '';

    let fechaSesionFinal: string;

    if (this.fechaPreseleccionada) {
      fechaSesionFinal = `${this.fechaSesionPreseleccionada} ${this.horaSesion}:00`;
    } else {
      const fechaLocal = new Date(this.fechaHoraSesion);
      const año = fechaLocal.getFullYear();
      const mes = String(fechaLocal.getMonth() + 1).padStart(2, '0');
      const dia = String(fechaLocal.getDate()).padStart(2, '0');
      const horas = String(fechaLocal.getHours()).padStart(2, '0');
      const minutos = String(fechaLocal.getMinutes()).padStart(2, '0');
      fechaSesionFinal = `${año}-${mes}-${dia} ${horas}:${minutos}:00`;
    }

    let fechaFinFinal: string;

    if (this.fechaPreseleccionada) {
      fechaFinFinal = `${this.fechaSesionPreseleccionada} ${this.horaFinSesion}:00`;
    } else {
      const fechaFin = new Date(this.fechaHoraFinSesion);
      const año2 = fechaFin.getFullYear();
      const mes2 = String(fechaFin.getMonth() + 1).padStart(2, '0');
      const dia2 = String(fechaFin.getDate()).padStart(2, '0');
      const horas2 = String(fechaFin.getHours()).padStart(2, '0');
      const minutos2 = String(fechaFin.getMinutes()).padStart(2, '0');
      fechaFinFinal = `${año2}-${mes2}-${dia2} ${horas2}:${minutos2}:00`;
    }

    let parametrosJuego = null;

    if (this.juegoAsignado === 'brain-bike') {
      parametrosJuego = this.parametrosBrainBike;
    } else if (this.juegoAsignado === 'bicilicuadora') {
      parametrosJuego = {
        numero_bicicletas: this.parametrosBicilicuadora.numero_bicicletas,
        numero_participantes: this.parametrosBicilicuadora.numero_participantes,
        bebidas_disponibles: this.bebidasSeleccionadas,
      };
    } else if (this.juegoAsignado === 'vr') {
      parametrosJuego = {
        tipo_vr: this.tipoVRSeleccionado,
      };
    } else if (this.juegoAsignado === 'bici-paseo') {
      parametrosJuego = {
        vehiculos: this.parametrosBiciPaseo.vehiculos,
        ruta: this.parametrosBiciPaseo.ruta,
        distancia: this.parametrosBiciPaseo.distancia,
      };
    } else if (this.juegoAsignado === 'hit-fit') {
      parametrosJuego = {};
    } else if (this.juegoAsignado === 'dr-bici') {
      parametrosJuego = {};
    }

    const nuevaSesion: any = {
      empresa_id: this.empresaSeleccionada,
      lugarEjecucion: this.lugarEjecucion,
      fecha_sesion: fechaSesionFinal,
      hora_fin: fechaFinFinal,
      admins_asignados: this.adminsSeleccionados,
      nota: this.nota,
      cronograma: this.cronograma,
      secuencia: this.secuencia,
      juego_asignado: this.juegoAsignado,
      parametros_juego: parametrosJuego,
    };

    this.sesionService.crearSesion(nuevaSesion).subscribe({
      next: () => {
        this.cargando = false;
        this.router.navigate(['/calendario']);
      },
      error: (error) => {
        this.cargando = false;
        const mensajeRaw = error.error?.error || error.error?.message || '';
        this.errorMensaje =
          mensajeRaw.replace('ERROR_CREATE_SESION ', '') ||
          'Error al crear la sesión';
      },
    });
  }

  agregarVehiculo(tipoVehiculoId: string): void {
    const yaExiste = this.parametrosBiciPaseo.vehiculos.find(
      (v) => v.tipo === tipoVehiculoId,
    );
    if (yaExiste) {
      yaExiste.cantidad++;
    } else {
      this.parametrosBiciPaseo.vehiculos.push({
        tipo: tipoVehiculoId,
        cantidad: 1,
      });
    }
  }

  eliminarVehiculo(tipoVehiculoId: string): void {
    const index = this.parametrosBiciPaseo.vehiculos.findIndex(
      (v) => v.tipo === tipoVehiculoId,
    );
    if (index > -1) {
      this.parametrosBiciPaseo.vehiculos.splice(index, 1);
    }
  }

  actualizarCantidadVehiculo(tipoVehiculoId: string, cantidad: number): void {
    const vehiculo = this.parametrosBiciPaseo.vehiculos.find(
      (v) => v.tipo === tipoVehiculoId,
    );
    if (vehiculo && cantidad > 0) {
      vehiculo.cantidad = cantidad;
    } else if (vehiculo && cantidad <= 0) {
      this.eliminarVehiculo(tipoVehiculoId);
    }
  }

  getVehiculoCantidad(tipoVehiculoId: string): number {
    const vehiculo = this.parametrosBiciPaseo.vehiculos.find(
      (v) => v.tipo === tipoVehiculoId,
    );
    return vehiculo ? vehiculo.cantidad : 0;
  }

  getNombreTipoVehiculo(tipoId: string): string {
    const tipo = this.tiposVehiculo.find((t) => t.id === tipoId);
    return tipo ? tipo.nombre : tipoId;
  }

  toggleBebida(bebidaId: string): void {
    const index = this.bebidasSeleccionadas.indexOf(bebidaId);
    if (index > -1) {
      this.bebidasSeleccionadas.splice(index, 1);
    } else {
      this.bebidasSeleccionadas.push(bebidaId);
    }
  }

  isBebidaSeleccionada(bebidaId: string): boolean {
    return this.bebidasSeleccionadas.includes(bebidaId);
  }

  formatearFechaPreseleccionada(): string {
    if (!this.fechaSesionPreseleccionada) return '';
    const [año, mes, dia] = this.fechaSesionPreseleccionada.split('-');
    const meses = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    return `${dia} de ${meses[parseInt(mes) - 1]} de ${año}`;
  }

  onTematicaChange(): void {
    this.parametrosBrainBike.contenido_id = '';
    this.contenidosDisponibles = [];

    if (this.parametrosBrainBike.tematica_id) {
      const tematicaSeleccionada = this.tematicas.find(
        (t) => t._id === this.parametrosBrainBike.tematica_id,
      );

      if (tematicaSeleccionada?.contenidos) {
        this.contenidosDisponibles = tematicaSeleccionada.contenidos;
      }
    }
  }

  siguientePaso(): void {
    if (this.validarPaso()) {
      this.paso++;
    }
  }
  pasoAnterior(): void {
    this.paso--;
  }

  toggleAdmin(adminId: string): void {
    const index = this.adminsSeleccionados.indexOf(adminId);
    if (index > -1) {
      this.adminsSeleccionados.splice(index, 1);
    } else {
      this.adminsSeleccionados.push(adminId);
    }
  }

  isAdminSeleccionado(adminId: string): boolean {
    return this.adminsSeleccionados.includes(adminId);
  }

  actualizarHoraMinFin(): void {
    if (this.fechaPreseleccionada && this.horaSesion) {
      const [h, m] = this.horaSesion.split(':').map(Number);
      const min = new Date(2000, 0, 1, h, m);
      min.setMinutes(min.getMinutes() + 30);
      this.horaMinFin = `${String(min.getHours()).padStart(2, '0')}:${String(min.getMinutes()).padStart(2, '0')}`;

      if (this.horaFinSesion <= this.horaSesion) {
        this.horaFinSesion = this.horaMinFin;
      }
    }
  }

  get nombreEmpresaSeleccionada(): string {
    const empresa = this.empresas.find(
      (e) => e._id === this.empresaSeleccionada,
    );
    return empresa ? empresa.nombre : 'Sin nombre';
  }

  cancelar(): void {
    this.location.back();
  }
}
