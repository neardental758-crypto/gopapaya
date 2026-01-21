import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SesionService } from '../../services/sesion.service';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { UsuarioService } from '../../../services/usuario.service';
import { AliadosService } from '../../services/aliados.service';
interface EventoCalendario {
  sesion: any;
  inicio: Date;
  fin: Date;
  duracion: number;
}

interface DiaCalendario {
  fecha: Date;
  esHoy: boolean;
  esMesActual: boolean;
  eventos: EventoCalendario[];
}

type VistaCalendario = 'mes' | 'semana' | 'dia';

@Component({
  selector: 'app-brain-bike-countdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendario-sesiones.component.html',
})
export class CalendarioSesionesComponent implements OnInit {
  usuario: any = null;
  vista: VistaCalendario = 'mes';
  fechaActual: Date = new Date();
  sesiones: any[] = [];
  sesionesFiltradas: any[] = [];
  diasCalendario: DiaCalendario[] = [];
  diasSemana: DiaCalendario[] = [];
  eventosDia: EventoCalendario[] = [];
  horasDelDia: number[] = Array.from({ length: 24 }, (_, i) => i);
  cargando = false;

  aliados: any[] = [];
  agrsDisponibles: any[] = [];
  empresasDisponibles: any[] = [];
  adminsDisponibles: any[] = [];

  filtroAliado = '';
  filtroAGR = '';
  filtroEmpresa = '';
  filtroAdmin = '';
  filtroJuego = '';

  constructor(
    private sesionService: SesionService,
    private aliadosService: AliadosService,
    private usuarioService: UsuarioService,
    private authService: AuthService,
    private router: Router,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.usuario = this.authService.getUsuario();
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales(): void {
    forkJoin({
      aliados: this.aliadosService.getAliados(),
      agrs: this.aliadosService.getAGRs(),
      empresas: this.aliadosService.getEmpresas(),
      admins: this.usuarioService.getAdmins(),
    }).subscribe({
      next: (results) => {
        this.aliados = results.aliados;
        this.agrsDisponibles = results.agrs;
        this.empresasDisponibles = results.empresas;
        this.adminsDisponibles = results.admins;
        this.cargarSesiones();
      },
      error: () => {
        this.cargarSesiones();
      },
    });
  }

  aplicarFiltros(): void {
    this.sesionesFiltradas = this.sesiones.filter((sesion) => {
      let cumpleFiltros = true;

      if (this.filtroAliado && sesion.empresa) {
        const agrDeEmpresa = this.agrsDisponibles.find(
          (agr) => agr._id === sesion.empresa.agr_id,
        );
        cumpleFiltros =
          cumpleFiltros && agrDeEmpresa?.aliado_id === this.filtroAliado;
      }

      if (this.filtroAGR && sesion.empresa) {
        cumpleFiltros =
          cumpleFiltros && sesion.empresa.agr_id === this.filtroAGR;
      }

      if (this.filtroEmpresa) {
        cumpleFiltros =
          cumpleFiltros && sesion.empresa_id === this.filtroEmpresa;
      }

      if (this.filtroAdmin) {
        const adminIds = JSON.parse(sesion.admins_asignados || '[]');
        cumpleFiltros = cumpleFiltros && adminIds.includes(this.filtroAdmin);
      }

      if (this.filtroJuego) {
        cumpleFiltros =
          cumpleFiltros && sesion.juego_asignado === this.filtroJuego;
      }

      return cumpleFiltros;
    });

    this.actualizarVista();
  }

  cargarSesiones(): void {
    this.cargando = true;

    if (this.isSuperAdmin()) {
      this.sesionService.getSesiones().subscribe({
        next: (sesiones) => {
          this.sesiones = sesiones;
          this.sesionesFiltradas = [...sesiones];
          this.actualizarVista();
          this.cargando = false;
        },
        error: () => {
          this.cargando = false;
        },
      });
    } else {
      this.sesionService.getMisSesiones().subscribe({
        next: (sesiones) => {
          this.sesiones = sesiones;
          this.sesionesFiltradas = [...sesiones];
          this.actualizarVista();
          this.cargando = false;
        },
        error: () => {
          this.cargando = false;
        },
      });
    }
  }

  actualizarVista(): void {
    if (this.vista === 'mes') {
      this.generarVistaMes();
    } else if (this.vista === 'semana') {
      this.generarVistaSemana();
    } else {
      this.generarVistaDia();
    }
  }

  generarVistaMes(): void {
    const año = this.fechaActual.getFullYear();
    const mes = this.fechaActual.getMonth();
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    const primerDiaSemana = primerDia.getDay();
    const diasEnMes = ultimoDia.getDate();

    this.diasCalendario = [];

    const diasAnteriores = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;
    for (let i = diasAnteriores; i > 0; i--) {
      const fecha = new Date(año, mes, -i + 1);
      this.diasCalendario.push({
        fecha,
        esHoy: this.esHoy(fecha),
        esMesActual: false,
        eventos: this.obtenerEventosDia(fecha),
      });
    }

    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fecha = new Date(año, mes, dia);
      this.diasCalendario.push({
        fecha,
        esHoy: this.esHoy(fecha),
        esMesActual: true,
        eventos: this.obtenerEventosDia(fecha),
      });
    }

    const diasRestantes = 42 - this.diasCalendario.length;
    for (let i = 1; i <= diasRestantes; i++) {
      const fecha = new Date(año, mes + 1, i);
      this.diasCalendario.push({
        fecha,
        esHoy: this.esHoy(fecha),
        esMesActual: false,
        eventos: this.obtenerEventosDia(fecha),
      });
    }
  }

  generarVistaSemana(): void {
    const inicioSemana = this.obtenerInicioSemana(this.fechaActual);
    this.diasSemana = [];

    for (let i = 0; i < 7; i++) {
      const fecha = new Date(inicioSemana);
      fecha.setDate(inicioSemana.getDate() + i);
      this.diasSemana.push({
        fecha,
        esHoy: this.esHoy(fecha),
        esMesActual: true,
        eventos: this.obtenerEventosDia(fecha),
      });
    }
  }

  generarVistaDia(): void {
    this.eventosDia = this.obtenerEventosDia(this.fechaActual);
  }

  obtenerEventosDia(fecha: Date): EventoCalendario[] {
    return this.sesionesFiltradas
      .filter((sesion) => {
        if (!sesion.fecha_sesion) return false;

        const [fechaPart] = sesion.fecha_sesion.split(' ');
        const [año, mes, dia] = fechaPart.split('-').map(Number);

        return (
          dia === fecha.getDate() &&
          mes === fecha.getMonth() + 1 &&
          año === fecha.getFullYear()
        );
      })
      .map((sesion) => {
        const [fechaPart, horaPart] = sesion.fecha_sesion.split(' ');
        const [año, mes, dia] = fechaPart.split('-').map(Number);
        const [hora, minuto] = horaPart.split(':').map(Number);

        const inicio = new Date(año, mes - 1, dia, hora, minuto);
        const fin = new Date(inicio);
        fin.setHours(inicio.getHours() + 2);

        return {
          sesion,
          inicio,
          fin,
          duracion: 2,
        };
      })
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  }

  puedeEditarSesion(sesion: any): boolean {
    if (sesion.estadoSesion === 'finalizada') {
      return false;
    }

    if (!sesion.fecha_sesion) return true;

    const [fechaPart, horaPart] = sesion.fecha_sesion.split(' ');
    const [año, mes, dia] = fechaPart.split('-').map(Number);
    const [hora, minuto] = horaPart.split(':').map(Number);
    const fechaSesion = new Date(año, mes - 1, dia, hora, minuto);

    const ahora = new Date();
    const diferenciaHoras =
      (fechaSesion.getTime() - ahora.getTime()) / (1000 * 60 * 60);
    return diferenciaHoras >= 1;
  }

  editarParametros(sesion: any, event: Event): void {
    event.stopPropagation();

    if (sesion.estadoSesion === 'finalizada') {
      alert('No se puede editar una sesión que ya finalizó');
      return;
    }

    if (!this.puedeEditarSesion(sesion)) {
      alert(
        'No se puede editar la sesión. Falta menos de 1 hora para su inicio.',
      );
      return;
    }

    this.router.navigate(['/sesion/editar-parametros', sesion.id]);
  }

  puedeFinalizarSesion(sesion: any): boolean {
    if (!sesion.fecha_sesion) return false;

    const [fechaPart, horaPart] = sesion.fecha_sesion.split(' ');
    const [año, mes, dia] = fechaPart.split('-').map(Number);
    const [hora, minuto] = horaPart.split(':').map(Number);
    const fechaSesion = new Date(año, mes - 1, dia, hora, minuto);

    const ahora = new Date();
    const diferenciaHoras =
      (fechaSesion.getTime() - ahora.getTime()) / (1000 * 60 * 60);
    return diferenciaHoras < 1;
  }

  finalizarSesion(sesion: any, event: Event): void {
    event.stopPropagation();

    if (!this.puedeFinalizarSesion(sesion)) {
      alert(
        'Solo se puede finalizar la sesión faltando menos de 1 hora para su inicio o después de haber comenzado',
      );
      return;
    }

    if (confirm(`¿Deseas finalizar la sesión "${sesion.nombreCliente}"?`)) {
      this.sesionService.finalizarSesion(sesion.id).subscribe({
        next: () => {
          this.cargarSesiones();
        },
        error: () => {
          alert('Error al finalizar la sesión');
        },
      });
    }
  }

  obtenerHoraFormateada(fecha: Date): string {
    const horas = fecha.getHours().toString().padStart(2, '0');
    const minutos = fecha.getMinutes().toString().padStart(2, '0');
    return `${horas}:${minutos}`;
  }

  obtenerInicioSemana(fecha: Date): Date {
    const dia = fecha.getDay();
    const diff = dia === 0 ? -6 : 1 - dia;
    const inicioSemana = new Date(fecha);
    inicioSemana.setDate(fecha.getDate() + diff);
    inicioSemana.setHours(0, 0, 0, 0);
    return inicioSemana;
  }

  esHoy(fecha: Date): boolean {
    const hoy = new Date();
    return (
      fecha.getDate() === hoy.getDate() &&
      fecha.getMonth() === hoy.getMonth() &&
      fecha.getFullYear() === hoy.getFullYear()
    );
  }

  cambiarVista(vista: VistaCalendario): void {
    this.vista = vista;
    this.actualizarVista();
  }

  mesAnterior(): void {
    if (this.vista === 'mes') {
      this.fechaActual = new Date(
        this.fechaActual.getFullYear(),
        this.fechaActual.getMonth() - 1,
        1,
      );
    } else if (this.vista === 'semana') {
      this.fechaActual = new Date(
        this.fechaActual.getTime() - 7 * 24 * 60 * 60 * 1000,
      );
    } else {
      this.fechaActual = new Date(
        this.fechaActual.getTime() - 24 * 60 * 60 * 1000,
      );
    }
    this.actualizarVista();
  }

  mesSiguiente(): void {
    if (this.vista === 'mes') {
      this.fechaActual = new Date(
        this.fechaActual.getFullYear(),
        this.fechaActual.getMonth() + 1,
        1,
      );
    } else if (this.vista === 'semana') {
      this.fechaActual = new Date(
        this.fechaActual.getTime() + 7 * 24 * 60 * 60 * 1000,
      );
    } else {
      this.fechaActual = new Date(
        this.fechaActual.getTime() + 24 * 60 * 60 * 1000,
      );
    }
    this.actualizarVista();
  }

  irHoy(): void {
    this.fechaActual = new Date();
    this.vista = 'mes';
    this.actualizarVista();
  }

  seleccionarDia(dia: DiaCalendario): void {
    if (!dia.esMesActual) {
      this.fechaActual = new Date(
        dia.fecha.getFullYear(),
        dia.fecha.getMonth(),
        1,
      );
      this.actualizarVista();
    } else {
      this.fechaActual = dia.fecha;
      this.vista = 'dia';
      this.actualizarVista();
    }
  }

  verDetalleSesion(sesion: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (sesion.estadoSesion === 'finalizada') {
      alert('Esta sesión ya finalizó. No se puede editar ni continuar.');
      return;
    }

    if (this.isSuperAdmin()) {
      this.router.navigate(['/sesion/editar-parametros', sesion.id]);
    } else {
      this.sesionService.setSesionSeleccionada(sesion);

      if (sesion.juego_asignado === 'brain-bike') {
        this.router.navigate(['/brain-bike/parametros']);
      } else if (sesion.juego_asignado) {
        this.router.navigate(['/sesion/ejecutar', sesion.id]);
      } else {
        this.router.navigate(['/sesion/seleccionar-juego', sesion.id]);
      }
    }
  }

  crearSesion(): void {
    this.router.navigate(['/sesion/crear']);
  }

  crearSesionEnFecha(dia: DiaCalendario, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.isSuperAdmin()) {
      const ahora = new Date();
      ahora.setHours(0, 0, 0, 0);
      const fechaDia = new Date(dia.fecha);
      fechaDia.setHours(0, 0, 0, 0);

      if (fechaDia < ahora) {
        alert('No se pueden crear sesiones en fechas pasadas');
        return;
      }

      const year = dia.fecha.getFullYear();
      const month = String(dia.fecha.getMonth() + 1).padStart(2, '0');
      const day = String(dia.fecha.getDate()).padStart(2, '0');
      const fechaISO = `${year}-${month}-${day}`;

      localStorage.setItem('fecha_sesion_preseleccionada', fechaISO);
      this.router.navigate(['/sesion/crear']);
    }
  }

  obtenerColorJuego(juego: string | null): string {
    if (juego === 'brain-bike') return 'border-neon-blue';
    return 'border-neon-yellow';
  }

  obtenerNombreMes(): string {
    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    return meses[this.fechaActual.getMonth()];
  }

  obtenerAnio(): number {
    return this.fechaActual.getFullYear();
  }

  isSuperAdmin(): boolean {
    return this.usuario?.rol === 'super_admin';
  }

  isAdmin(): boolean {
    return this.usuario?.rol === 'admin';
  }

  volver(): void {
    this.router.navigate(['/home']);
  }

  obtenerNombreDiaSemana(fecha: Date): string {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dias[fecha.getDay()];
  }

  obtenerFechaCompletaDia(): string {
    const dias = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];
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

    const diaSemana = dias[this.fechaActual.getDay()];
    const dia = this.fechaActual.getDate();
    const mes = meses[this.fechaActual.getMonth()];
    const año = this.fechaActual.getFullYear();

    return `${diaSemana}, ${dia} de ${mes} de ${año}`;
  }
}
