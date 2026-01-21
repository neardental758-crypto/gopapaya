import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Empresa, Sesion, SesionService } from '../../services/sesion.service';
import {
  Tematica,
  Contenido,
  TematicaService,
} from '../../services/tematica.service';
import { forkJoin } from 'rxjs';
import { Usuario } from '../../../core/interfaces/usuario.interface';
import { UsuarioService } from '../../../services/usuario.service';
import {
  Bebida,
  BebidasService,
} from '../../services/bicilicuadora/bebidas.service';
import { EmpresaService } from '../../services/empresa.service';

@Component({
  selector: 'app-editar-parametros-sesion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editar-parametros-sesion.component.html',
})
export class EditarParametrosSesionComponent implements OnInit {
  sesion: Sesion | null = null;
  empresas: Empresa[] = [];
  admins: Usuario[] = [];
  tematicas: Tematica[] = [];
  contenidosDisponibles: Contenido[] = [];
  bebidasDisponibles: Bebida[] = [];
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

  lugarEjecucion: string = '';
  fechaHoraSesion: string = '';
  horaSesion: string = '';
  fechaSesion: string = '';
  adminsSeleccionados: string[] = [];
  nota: string = '';
  cronograma: string = '';
  secuencia: string = '';

  parametrosBrainBike = {
    tematica_id: '',
    contenido_id: '',
    dificultad: 'media',
  };

  parametrosBicilicuadora = {
    numero_bicicletas: 1,
    numero_participantes: 1,
    bebidas_disponibles: [] as string[],
  };

  bebidasSeleccionadas: string[] = [];

  parametrosVR = {
    tipo_vr: '',
  };

  tipoVRSeleccionado: string = '';

  cargando = true;
  errorMensaje = '';

  constructor(
    private sesionService: SesionService,
    private empresaService: EmpresaService,
    private usuarioService: UsuarioService,
    private tematicaService: TematicaService,
    private bebidasService: BebidasService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const sesionId = this.route.snapshot.params['id'];
    this.cargarDatos(sesionId);
  }

  cargarDatos(sesionId: number): void {
    this.cargando = true;

    forkJoin({
      sesion: this.sesionService.getSesion(sesionId),
      empresas: this.empresaService.getEmpresas(),
      admins: this.usuarioService.getAdmins(),
      tematicas: this.tematicaService.getTematicas(),
      bebidas: this.bebidasService.getAllBebidasActivas(),
    }).subscribe({
      next: (results) => {
        this.empresas = results.empresas;
        this.admins = results.admins;
        this.tematicas = results.tematicas;
        this.bebidasDisponibles = results.bebidas;
        this.cargarSesion(results.sesion);
      },
      error: () => {
        this.errorMensaje = 'Error al cargar datos';
        this.cargando = false;
      },
    });
  }

  cargarSesion(sesion: Sesion): void {
    if (sesion.estadoSesion === 'finalizada') {
      alert('No se puede editar una sesión que ya finalizó.');
      this.router.navigate(['/calendario']);
      return;
    }

    if (!this.puedeEditar(sesion)) {
      alert(
        'No se puede editar la sesión. Faltan menos de 3 horas para su inicio.',
      );
      this.router.navigate(['/calendario']);
      return;
    }

    this.sesion = sesion;
    this.lugarEjecucion = sesion.lugarEjecucion || '';
    this.nota = sesion.nota || '';
    this.cronograma = sesion.cronograma || '';
    this.secuencia = sesion.secuencia || '';

    if (sesion.admins_asignados) {
      this.adminsSeleccionados = JSON.parse(sesion.admins_asignados);
    }

    if (sesion.fecha_sesion) {
      const [fechaPart, horaPart] = sesion.fecha_sesion.split(' ');
      this.fechaSesion = fechaPart;
      this.horaSesion = horaPart.substring(0, 5);
      this.fechaHoraSesion = `${fechaPart}T${this.horaSesion}`;
    }

    if (sesion.parametros_juego) {
      const parametros =
        typeof sesion.parametros_juego === 'string'
          ? JSON.parse(sesion.parametros_juego)
          : sesion.parametros_juego;

      if (sesion.juego_asignado === 'brain-bike') {
        this.parametrosBrainBike = {
          tematica_id: parametros.tematica_id || '',
          contenido_id: parametros.contenido_id || '',
          dificultad: parametros.dificultad || 'media',
        };

        if (parametros.tematica_id) {
          this.cargarContenidosDeTematica(parametros.tematica_id);
        }
      } else if (sesion.juego_asignado === 'bicilicuadora') {
        this.parametrosBicilicuadora = {
          numero_bicicletas: parametros.numero_bicicletas || 1,
          numero_participantes: parametros.numero_participantes || 1,
          bebidas_disponibles: parametros.bebidas_disponibles || [],
        };
        this.bebidasSeleccionadas = parametros.bebidas_disponibles || [];
      } else if (sesion.juego_asignado === 'vr') {
        this.tipoVRSeleccionado = parametros.tipo_vr || '';
      }
    }

    this.cargando = false;
  }

  cargarContenidosDeTematica(tematicaId: string): void {
    const tematicaSeleccionada = this.tematicas.find(
      (t) => t._id === tematicaId,
    );
    if (tematicaSeleccionada?.contenidos) {
      this.contenidosDisponibles = tematicaSeleccionada.contenidos;
    }
  }

  puedeEditar(sesion: Sesion): boolean {
    if (!sesion.fecha_sesion) return true;

    const fechaSesion = new Date(sesion.fecha_sesion);
    const ahora = new Date();
    const diferenciaHoras =
      (fechaSesion.getTime() - ahora.getTime()) / (1000 * 60 * 60);

    return diferenciaHoras >= 3;
  }

  onTematicaChange(): void {
    this.parametrosBrainBike.contenido_id = '';
    this.contenidosDisponibles = [];

    if (this.parametrosBrainBike.tematica_id) {
      this.cargarContenidosDeTematica(this.parametrosBrainBike.tematica_id);
    }
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

  guardarCambios(): void {
    this.errorMensaje = '';

    if (this.adminsSeleccionados.length === 0) {
      this.errorMensaje = 'Debe asignar al menos un admin';
      return;
    }

    if (this.sesion!.juego_asignado === 'brain-bike') {
      if (!this.parametrosBrainBike.tematica_id) {
        this.errorMensaje = 'Debe seleccionar una temática';
        return;
      }
      if (!this.parametrosBrainBike.contenido_id) {
        this.errorMensaje = 'Debe seleccionar un contenido';
        return;
      }
    }

    if (this.sesion!.juego_asignado === 'bicilicuadora') {
      if (this.bebidasSeleccionadas.length === 0) {
        this.errorMensaje = 'Debe seleccionar al menos una bebida';
        return;
      }
    }

    if (this.sesion!.juego_asignado === 'vr') {
      if (!this.tipoVRSeleccionado) {
        this.errorMensaje = 'Debe seleccionar un tipo de VR';
        return;
      }
    }

    this.cargando = true;

    let fechaSesionFinal: string | undefined = undefined;
    if (this.fechaHoraSesion) {
      const fechaLocal = new Date(this.fechaHoraSesion);
      const año = fechaLocal.getFullYear();
      const mes = String(fechaLocal.getMonth() + 1).padStart(2, '0');
      const dia = String(fechaLocal.getDate()).padStart(2, '0');
      const horas = String(fechaLocal.getHours()).padStart(2, '0');
      const minutos = String(fechaLocal.getMinutes()).padStart(2, '0');
      fechaSesionFinal = `${año}-${mes}-${dia} ${horas}:${minutos}:00`;
    }

    let parametrosJuego = null;

    if (this.sesion!.juego_asignado === 'brain-bike') {
      parametrosJuego = this.parametrosBrainBike;
    } else if (this.sesion!.juego_asignado === 'bicilicuadora') {
      parametrosJuego = {
        numero_bicicletas: this.parametrosBicilicuadora.numero_bicicletas,
        numero_participantes: this.parametrosBicilicuadora.numero_participantes,
        bebidas_disponibles: this.bebidasSeleccionadas,
      };
    } else if (this.sesion!.juego_asignado === 'vr') {
      parametrosJuego = {
        tipo_vr: this.tipoVRSeleccionado,
      };
    }

    const datosActualizados: any = {
      lugarEjecucion: this.lugarEjecucion,
      admins_asignados: this.adminsSeleccionados,
      nota: this.nota,
      cronograma: this.cronograma,
      secuencia: this.secuencia,
      parametros_juego: parametrosJuego,
    };

    if (fechaSesionFinal) {
      datosActualizados.fecha_sesion = fechaSesionFinal;
    }

    this.sesionService
      .actualizarSesion(this.sesion!.id, datosActualizados)
      .subscribe({
        next: () => {
          this.cargando = false;
          this.router.navigate(['/calendario']);
        },
        error: (error) => {
          this.cargando = false;
          this.errorMensaje =
            error.error?.message || 'Error al actualizar la sesión';
        },
      });
  }

  cancelar(): void {
    this.router.navigate(['/calendario']);
  }
}
