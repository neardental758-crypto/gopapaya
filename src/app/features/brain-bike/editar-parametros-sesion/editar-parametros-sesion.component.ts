import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Sesion, SesionService } from '../../services/sesion.service';
import {
  Tematica,
  Contenido,
  TematicaService,
} from '../../services/tematica.service';

@Component({
  selector: 'app-editar-parametros-sesion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editar-parametros-sesion.component.html',
})
export class EditarParametrosSesionComponent implements OnInit {
  sesion: Sesion | null = null;
  tematicas: Tematica[] = [];
  contenidosDisponibles: Contenido[] = [];

  parametrosBrainBike = {
    tematica_id: '',
    contenido_id: '',
    dificultad: 'media',
  };

  cargando = true;
  errorMensaje = '';

  constructor(
    private sesionService: SesionService,
    private tematicaService: TematicaService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const sesionId = this.route.snapshot.params['id'];
    this.cargarDatos(sesionId);
  }

  cargarDatos(sesionId: number): void {
    this.cargando = true;

    this.tematicaService.getTematicas().subscribe({
      next: (tematicas) => {
        this.tematicas = tematicas;
        this.cargarSesion(sesionId);
      },
      error: () => {
        this.errorMensaje = 'Error al cargar temáticas';
        this.cargando = false;
      },
    });
  }

  cargarSesion(id: number): void {
    this.sesionService.getSesion(id).subscribe({
      next: (sesion) => {
        if (sesion.estadoSesion === 'finalizada') {
          alert('No se puede editar una sesión que ya finalizó.');
          this.router.navigate(['/home']);
          return;
        }

        if (!this.puedeEditar(sesion)) {
          alert(
            'No se puede editar la sesión. Faltan menos de 3 horas para su inicio.'
          );
          this.router.navigate(['/home']);
          return;
        }

        this.sesion = sesion;

        if (sesion.parametros_juego) {
          const parametros =
            typeof sesion.parametros_juego === 'string'
              ? JSON.parse(sesion.parametros_juego)
              : sesion.parametros_juego;

          this.parametrosBrainBike = {
            tematica_id: parametros.tematica_id || '',
            contenido_id: parametros.contenido_id || '',
            dificultad: parametros.dificultad || 'media',
          };

          if (parametros.tematica_id) {
            this.cargarContenidosDeTematica(parametros.tematica_id);
          }
        }

        this.cargando = false;
      },
      error: () => {
        this.router.navigate(['/home']);
      },
    });
  }

  cargarContenidosDeTematica(tematicaId: string): void {
    const tematicaSeleccionada = this.tematicas.find(
      (t) => t._id === tematicaId
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

  guardarCambios(): void {
    if (!this.parametrosBrainBike.tematica_id) {
      this.errorMensaje = 'Debe seleccionar una temática';
      return;
    }
    if (!this.parametrosBrainBike.contenido_id) {
      this.errorMensaje = 'Debe seleccionar un contenido';
      return;
    }

    this.cargando = true;
    this.errorMensaje = '';

    const datosActualizados = {
      parametros_juego: this.parametrosBrainBike,
    };

    this.sesionService
      .actualizarSesion(this.sesion!.id, datosActualizados)
      .subscribe({
        next: () => {
          this.cargando = false;
          this.router.navigate(['/home']);
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
