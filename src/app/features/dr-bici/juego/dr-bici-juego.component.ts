import { DecimalPipe, CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ParticipanteDrBici,
  ParticipanteDrBiciService,
} from '../../services/dr-bici/participante-dr-bici.service';
import { HistorialService } from '../../services/historial-sesion.service';
import { SesionService } from '../../services/sesion.service';

@Component({
  selector: 'app-dr-bici-juego',
  templateUrl: './dr-bici-juego.component.html',
  providers: [DecimalPipe],
  imports: [CommonModule, FormsModule],
})
export class DrBiciJuegoComponent implements OnInit, OnDestroy {
  sesion: any = null;
  participanteActual: ParticipanteDrBici | null = null;
  logoEmpresa: string | null = null;
  tipoVehiculoNombre: string = '';
  trabajosRealizados: string[] = [];
  repuestosUtilizados: string[] = [];
  totalParticipantes = 0;
  tiempoInicio: Date | null = null;
  tiempoTranscurrido = 0;
  intervalTiempo: any;

  tiposVehiculo: { [key: string]: string } = {
    'bicicleta-mecanica': 'Bicicleta Mecánica',
    'bicicleta-electrica': 'Bicicleta Eléctrica',
    'patineta-electrica': 'Patineta Eléctrica',
  };

  tiposTrabajo: { [key: string]: string } = {
    alistamiento: 'Alistamiento',
    reparacion: 'Reparación',
    ajustes: 'Ajustes',
    diagnostico: 'Diagnóstico',
    limpieza: 'Limpieza',
    lubricacion: 'Lubricación',
  };

  constructor(
    private participanteDrBiciService: ParticipanteDrBiciService,
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

    const participanteStr = localStorage.getItem('participante_dr_bici_actual');
    if (!participanteStr) {
      this.router.navigate(['/dr-bici/registro']);
      return;
    }

    this.participanteActual = JSON.parse(participanteStr);
    this.tiempoInicio = new Date();
    this.iniciarContadorTiempo();
    this.verificarOCrearHistorial();

    if (this.participanteActual?.tipoVehiculo) {
      this.tipoVehiculoNombre =
        this.tiposVehiculo[this.participanteActual.tipoVehiculo] ||
        this.participanteActual.tipoVehiculo;
    }

    if (this.participanteActual?.tiposTrabajo) {
      this.trabajosRealizados = this.participanteActual.tiposTrabajo.map(
        (trabajo) => this.tiposTrabajo[trabajo] || trabajo,
      );
    }

    if (
      this.participanteActual?.repuestosUtilizados &&
      this.participanteActual.repuestosUtilizados.length > 0
    ) {
      this.repuestosUtilizados = this.participanteActual.repuestosUtilizados;
    }

    this.cargarTotalParticipantes();

    history.pushState(null, '', location.href);
    window.addEventListener('popstate', this.prevenirRetroceso);
  }

  verificarOCrearHistorial(): void {
    const fechaInicio = new Date();
    const historial = {
      sesion_id: this.sesion.id,
      juego_jugado: 'DrBici',
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
        localStorage.setItem('historial_dr_bici_id', response.id.toString());
      },
      error: (error) => {
        console.error('Error al crear historial:', error);
      },
    });
  }

  actualizarHistorialCompleto(): void {
    const historialId = localStorage.getItem('historial_dr_bici_id');
    if (!historialId) return;

    this.participanteDrBiciService.getBySesion(this.sesion.id).subscribe({
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
    this.participanteDrBiciService.getBySesion(this.sesion.id).subscribe({
      next: (participantes) => {
        this.totalParticipantes = participantes.length;
      },
      error: () => {
        this.totalParticipantes = 0;
      },
    });
  }

  finalizarParticipante(): void {
    if (confirm('¿Finalizar el mantenimiento de este participante?')) {
      this.detenerContadorTiempo();
      this.actualizarTiempoParticipacion();

      setTimeout(() => {
        this.actualizarHistorialCompleto();
        setTimeout(() => {
          localStorage.removeItem('participante_dr_bici_actual');
          this.router.navigate(['/dr-bici/registro']);
        }, 300);
      }, 500);
    }
  }

  registrarNuevoParticipante(): void {
    this.detenerContadorTiempo();
    this.actualizarTiempoParticipacion();

    setTimeout(() => {
      localStorage.removeItem('participante_dr_bici_actual');
      this.router.navigate(['/dr-bici/registro']);
    }, 500);
  }

  finalizarSesion(): void {
    if (confirm('¿Deseas finalizar la sesión DrBici completa?')) {
      const historialId = localStorage.getItem('historial_dr_bici_id');

      if (!historialId) {
        alert('No se encontró el historial de la sesión');
        return;
      }

      this.participanteDrBiciService.getBySesion(this.sesion.id).subscribe({
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
                    localStorage.removeItem('participante_dr_bici_actual');
                    localStorage.removeItem('historial_dr_bici_id');
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

    this.participanteDrBiciService
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
