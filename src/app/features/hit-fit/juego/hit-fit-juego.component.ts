import { DecimalPipe, CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ParticipanteHitFit,
  ParticipanteHitFitService,
} from '../../services/hit-fit/participante-hit-fit.service';
import { SesionService } from '../../services/sesion.service';
import { HistorialService } from '../../services/historial-sesion.service';

@Component({
  selector: 'app-hit-fit-juego',
  templateUrl: './hit-fit-juego.component.html',
  providers: [DecimalPipe],
  imports: [CommonModule, FormsModule],
})
export class HitFitJuegoComponent implements OnInit, OnDestroy {
  sesion: any = null;
  participanteActual: ParticipanteHitFit | null = null;
  logoEmpresa: string | null = null;
  totalParticipantes = 0;
  tiempoInicio: Date | null = null;
  tiempoTranscurrido = 0;
  intervalTiempo: any;
  puntosActuales = 0;

  mostrarRanking = false;
  rankingParticipantes: ParticipanteHitFit[] = [];

  constructor(
    private participanteHitFitService: ParticipanteHitFitService,
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

    const participanteStr = localStorage.getItem('participante_hit_fit_actual');
    if (!participanteStr) {
      this.router.navigate(['/hit-fit/registro']);
      return;
    }

    this.participanteActual = JSON.parse(participanteStr);
    this.tiempoInicio = new Date();
    this.iniciarContadorTiempo();
    this.verificarOCrearHistorial();
    this.cargarTotalParticipantes();

    history.pushState(null, '', location.href);
    window.addEventListener('popstate', this.prevenirRetroceso);
  }

  verificarOCrearHistorial(): void {
    const fechaInicio = new Date();
    const historial = {
      sesion_id: this.sesion.id,
      juego_jugado: 'Hit-Fit',
      fecha_inicio: fechaInicio.toISOString(),
      fecha_fin: new Date().toISOString(),
      duracion_minutos: 0,
      participantes_data: [],
      ranking_final: [],
      estadisticas_generales: {
        totalParticipantes: 0,
        puntosTotal: 0,
        tiempoTotal: 0,
      },
      parametros_utilizados: this.sesion.parametros_juego,
    };

    this.historialService.crearHistorial(historial).subscribe({
      next: (response) => {
        localStorage.setItem('historial_hit_fit_id', response.id.toString());
      },
      error: (error) => {
        console.error('Error al crear historial:', error);
      },
    });
  }

  actualizarHistorialCompleto(): void {
    const historialId = localStorage.getItem('historial_hit_fit_id');
    if (!historialId) return;

    this.participanteHitFitService.getBySesion(this.sesion.id).subscribe({
      next: (participantes) => {
        const participantesOrdenados = [...participantes].sort(
          (a, b) => (b.puntosObtenidos || 0) - (a.puntosObtenidos || 0),
        );

        const historialActualizado = {
          fecha_fin: new Date().toISOString(),
          participantes_data: participantesOrdenados,
          ranking_final: participantesOrdenados,
          estadisticas_generales: {
            totalParticipantes: participantes.length,
            puntosTotal: participantes.reduce(
              (acc, p) => acc + (p.puntosObtenidos || 0),
              0,
            ),
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

  ajustarPuntos(cantidad: number): void {
    this.puntosActuales += cantidad;
    if (this.puntosActuales < 0) {
      this.puntosActuales = 0;
    }
  }

  cargarTotalParticipantes(): void {
    this.participanteHitFitService.getBySesion(this.sesion.id).subscribe({
      next: (participantes) => {
        this.totalParticipantes = participantes.length;
      },
      error: () => {
        this.totalParticipantes = 0;
      },
    });
  }

  actualizarParticipante(): void {
    if (!this.participanteActual?.id) return;

    this.participanteHitFitService
      .update(this.participanteActual.id, {
        tiempoParticipacion: this.tiempoTranscurrido,
        puntosObtenidos: this.puntosActuales,
      })
      .subscribe({
        next: () => {
          console.log('Datos actualizados');
        },
        error: (error) => {
          console.error('Error actualizando participante:', error);
        },
      });
  }
  finalizarParticipante(): void {
    if (confirm('¿Finalizar la sesión de este participante?')) {
      this.detenerContadorTiempo();
      this.actualizarParticipante();

      setTimeout(() => {
        this.actualizarHistorialCompleto();
        setTimeout(() => {
          this.cargarRanking();
        }, 300);
      }, 500);
    }
  }

  cargarRanking(): void {
    this.participanteHitFitService.getBySesion(this.sesion.id).subscribe({
      next: (participantes) => {
        this.rankingParticipantes = participantes.sort(
          (a, b) => (b.puntosObtenidos || 0) - (a.puntosObtenidos || 0),
        );
        this.mostrarRanking = true;
      },
      error: (error) => {
        console.error('Error cargando ranking:', error);
      },
    });
  }

  nuevoParticipante(): void {
    localStorage.removeItem('participante_hit_fit_actual');
    this.router.navigate(['/hit-fit/registro']);
  }

  finalizarSesion(): void {
    if (confirm('¿Deseas finalizar la sesión Hit-Fit completa?')) {
      const historialId = localStorage.getItem('historial_hit_fit_id');

      if (!historialId) {
        alert('No se encontró el historial de la sesión');
        return;
      }

      this.participanteHitFitService.getBySesion(this.sesion.id).subscribe({
        next: (participantes) => {
          const participantesOrdenados = [...participantes].sort(
            (a, b) => (b.puntosObtenidos || 0) - (a.puntosObtenidos || 0),
          );

          const historialFinal = {
            fecha_fin: new Date().toISOString(),
            participantes_data: participantesOrdenados,
            ranking_final: participantesOrdenados,
            estadisticas_generales: {
              totalParticipantes: participantes.length,
              puntosTotal: participantes.reduce(
                (acc, p) => acc + (p.puntosObtenidos || 0),
                0,
              ),
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
                    localStorage.removeItem('participante_hit_fit_actual');
                    localStorage.removeItem('historial_hit_fit_id');
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

  registrarHistorial(): void {
    this.participanteHitFitService.getBySesion(this.sesion.id).subscribe({
      next: (participantes) => {
        const participantesOrdenados = [...participantes].sort(
          (a, b) => (b.puntosObtenidos || 0) - (a.puntosObtenidos || 0),
        );

        const fechaInicio = new Date();
        fechaInicio.setHours(fechaInicio.getHours() - 2);

        const historial = {
          sesion_id: this.sesion.id,
          juego_jugado: 'Hit-Fit',
          fecha_inicio: fechaInicio.toISOString(),
          fecha_fin: new Date().toISOString(),
          duracion_minutos: 0,
          participantes_data: participantesOrdenados,
          ranking_final: participantesOrdenados,
          estadisticas_generales: {
            totalParticipantes: participantes.length,
            puntosTotal: participantes.reduce(
              (acc, p) => acc + (p.puntosObtenidos || 0),
              0,
            ),
            tiempoTotal: participantes.reduce(
              (acc, p) => acc + (p.tiempoParticipacion || 0),
              0,
            ),
          },
          parametros_utilizados: this.sesion.parametros_juego,
        };

        this.historialService.crearHistorial(historial).subscribe({
          next: () => {
            this.sesionService.finalizarSesion(this.sesion.id).subscribe({
              next: () => {
                localStorage.removeItem('participante_hit_fit_actual');
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
            console.error('Error al registrar historial:', error);
            alert('Error al registrar historial');
          },
        });
      },
      error: (error) => {
        console.error('Error al cargar participantes:', error);
      },
    });
  }

  esPuntoValido(): boolean {
    return Number.isInteger(this.puntosActuales) && this.puntosActuales >= 0;
  }

  validarPuntos(): void {
    if (this.puntosActuales < 0 || isNaN(this.puntosActuales)) {
      this.puntosActuales = 0;
    }
    this.puntosActuales = Math.floor(this.puntosActuales);
  }

  ngOnDestroy(): void {
    this.detenerContadorTiempo();
    window.removeEventListener('popstate', this.prevenirRetroceso);
  }
}
