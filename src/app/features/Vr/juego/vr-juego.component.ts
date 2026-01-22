import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SesionService } from '../../services/sesion.service';
import {
  ParticipanteVR,
  ParticipanteVRService,
} from '../../services/Vr/participante-vr.service';
import { HistorialService } from '../../services/historial-sesion.service';

@Component({
  selector: 'app-vr-juego',
  templateUrl: './vr-juego.component.html',
  imports: [CommonModule, FormsModule],
})
export class VrJuegoComponent implements OnInit {
  sesion: any = null;
  participanteActual: ParticipanteVR | null = null;
  logoEmpresa: string | null = null;
  tipoVrSeleccionado: string = '';
  totalParticipantes = 0;
  tiempoInicio: Date | null = null;
  tiempoTranscurrido = 0;
  intervalTiempo: any;

  constructor(
    private participanteVRService: ParticipanteVRService,
    private sesionService: SesionService,
    private router: Router,
    private historialService: HistorialService,
  ) {}

  ngOnInit(): void {
    this.sesion = this.sesionService.getSesionSeleccionada();

    if (!this.sesion) {
      this.router.navigate(['/home']);
      return;
    }

    if (this.sesion?.empresa?.logo) {
      this.logoEmpresa = this.sesion.empresa.logo;
    } else if (this.sesion?.logoCliente) {
      this.logoEmpresa = this.sesion.logoCliente;
    }

    const participanteStr = localStorage.getItem('participante_vr_actual');
    if (!participanteStr) {
      this.router.navigate(['/vr/registro']);
      return;
    }

    this.participanteActual = JSON.parse(participanteStr);
    this.tiempoInicio = new Date();
    this.iniciarContadorTiempo();
    this.verificarOCrearHistorial();

    const parametrosJuego = this.sesion.parametros_juego;
    let params: any;

    if (typeof parametrosJuego === 'string') {
      try {
        params = JSON.parse(parametrosJuego);
      } catch (e) {
        console.error('Error parseando parametros_juego');
      }
    } else {
      params = parametrosJuego;
    }

    if (params && params.tipos_vr && params.tipos_vr.length > 0) {
      this.tipoVrSeleccionado = params.tipos_vr[0] === 'vr-1' ? 'VR 1' : 'VR 2';
    }

    this.cargarTotalParticipantes();

    history.pushState(null, '', location.href);
    window.addEventListener('popstate', this.prevenirRetroceso);
  }

  verificarOCrearHistorial(): void {
    const fechaInicio = new Date();
    const historial = {
      sesion_id: this.sesion.id,
      juego_jugado: 'VR',
      fecha_inicio: fechaInicio.toISOString(),
      fecha_fin: new Date().toISOString(),
      duracion_minutos: 0,
      participantes_data: [],
      ranking_final: [],
      estadisticas_generales: {
        totalParticipantes: 0,
        tiempoTotal: 0,
      },
      parametros_utilizados: this.sesion.parametros_juego,
    };

    this.historialService.crearHistorial(historial).subscribe({
      next: (response) => {
        localStorage.setItem('historial_vr_id', response.id.toString());
      },
      error: (error) => {
        console.error('Error al crear historial:', error);
      },
    });
  }

  actualizarHistorialCompleto(): void {
    const historialId = localStorage.getItem('historial_vr_id');
    if (!historialId) return;

    this.participanteVRService.getBySesion(this.sesion.id).subscribe({
      next: (participantes) => {
        const historialActualizado = {
          fecha_fin: new Date().toISOString(),
          participantes_data: participantes,
          ranking_final: participantes,
          estadisticas_generales: {
            totalParticipantes: participantes.length,
            tiempoTotal: participantes.reduce(
              (acc, p) => acc + (p.tiempoParticipacion || 0),
              0,
            ),
          },
        };

        this.historialService
          .actualizarHistorial(parseInt(historialId), historialActualizado)
          .subscribe({
            next: () => {
              console.log('Historial actualizado');
            },
            error: (error) => {
              console.error('Error al actualizar historial:', error);
            },
          });
      },
    });
  }

  prevenirRetroceso = (): void => {
    history.pushState(null, '', location.href);
  };

  cargarTotalParticipantes(): void {
    this.participanteVRService.getBySesion(this.sesion.id).subscribe({
      next: (participantes) => {
        this.totalParticipantes = participantes.length;
      },
      error: () => {
        this.totalParticipantes = 0;
      },
    });
  }

  finalizarParticipante(): void {
    if (confirm('¿Finalizar la experiencia de este participante?')) {
      this.detenerContadorTiempo();
      this.actualizarTiempoParticipacion();

      setTimeout(() => {
        this.actualizarHistorialCompleto();
        setTimeout(() => {
          localStorage.removeItem('participante_vr_actual');
          this.router.navigate(['/vr/registro']);
        }, 300);
      }, 500);
    }
  }

  registrarNuevoParticipante(): void {
    this.detenerContadorTiempo();
    this.actualizarTiempoParticipacion();

    setTimeout(() => {
      localStorage.removeItem('participante_vr_actual');
      this.router.navigate(['/vr/registro']);
    }, 500);
  }

  finalizarSesion(): void {
    if (confirm('¿Deseas finalizar la sesión VR completa?')) {
      const historialId = localStorage.getItem('historial_vr_id');

      if (!historialId) {
        alert('No se encontró el historial de la sesión');
        return;
      }

      this.participanteVRService.getBySesion(this.sesion.id).subscribe({
        next: (participantes) => {
          const historialFinal = {
            fecha_fin: new Date().toISOString(),
            participantes_data: participantes,
            ranking_final: participantes,
            estadisticas_generales: {
              totalParticipantes: participantes.length,
              tiempoTotal: participantes.reduce(
                (acc, p) => acc + (p.tiempoParticipacion || 0),
                0,
              ),
            },
          };

          this.historialService
            .actualizarHistorial(parseInt(historialId), historialFinal)
            .subscribe({
              next: () => {
                this.sesionService.finalizarSesion(this.sesion.id).subscribe({
                  next: () => {
                    localStorage.removeItem('participante_vr_actual');
                    localStorage.removeItem('historial_vr_id');
                    this.sesionService.clearSesionSeleccionada();
                    this.router.navigate(['/home']);
                  },
                  error: (error) => {
                    console.error('Error al finalizar sesión:', error);
                    alert('Error al finalizar la sesión');
                  },
                });
              },
              error: (error) => {
                console.error('Error al actualizar historial:', error);
                alert('Error al actualizar historial');
              },
            });
        },
      });
    }
  }

  iniciarContadorTiempo(): void {
    this.intervalTiempo = setInterval(() => {
      if (this.tiempoInicio) {
        const ahora = new Date();
        this.tiempoTranscurrido = Math.floor(
          (ahora.getTime() - this.tiempoInicio.getTime()) / 1000,
        );
      }
    }, 1000);
  }

  detenerContadorTiempo(): void {
    if (this.intervalTiempo) {
      clearInterval(this.intervalTiempo);
    }
  }

  formatearTiempo(segundos: number): string {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;

    if (horas > 0) {
      return `${horas}h ${minutos}m ${segs}s`;
    } else if (minutos > 0) {
      return `${minutos}m ${segs}s`;
    } else {
      return `${segs}s`;
    }
  }

  actualizarTiempoParticipacion(): void {
    if (!this.participanteActual?.id) return;

    this.participanteVRService
      .update(this.participanteActual.id, {
        tiempoParticipacion: this.tiempoTranscurrido,
      })
      .subscribe({
        next: () => {
          console.log('Tiempo actualizado');
        },
        error: (error) => {
          console.error('Error actualizando tiempo:', error);
        },
      });
  }

  ngOnDestroy(): void {
    this.detenerContadorTiempo();
    window.removeEventListener('popstate', this.prevenirRetroceso);
  }
}
