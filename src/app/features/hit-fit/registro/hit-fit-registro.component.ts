import { DecimalPipe, CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ParticipanteHitFit,
  ParticipanteHitFitService,
} from '../../services/hit-fit/participante-hit-fit.service';
import { SesionService } from '../../services/sesion.service';
import { HistorialService } from '../../services/historial-sesion.service';

@Component({
  selector: 'app-hit-fit-registro',
  templateUrl: './hit-fit-registro.component.html',
  providers: [DecimalPipe],
  imports: [CommonModule, FormsModule],
})
export class HitFitRegistroComponent implements OnInit {
  sesion: any = null;
  participanteActual: ParticipanteHitFit = {
    idSesion: 0,
    nombreParticipante: '',
    apellidoParticipante: '',
    sexo: 'M',
    documento: '',
  };
  totalParticipantesRegistrados = 0;
  logoEmpresa: string | null = null;
  loading = false;
  errorMessage = '';

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

    this.participanteActual.idSesion = this.sesion.id;

    this.cargarTotalRegistrados();
  }

  cargarTotalRegistrados(): void {
    this.participanteHitFitService.getBySesion(this.sesion.id).subscribe({
      next: (participantes) => {
        this.totalParticipantesRegistrados = participantes.length;
      },
      error: () => {
        this.totalParticipantesRegistrados = 0;
      },
    });
  }

  isFormValid(): boolean {
    return (
      this.participanteActual.nombreParticipante.trim() !== '' &&
      this.participanteActual.apellidoParticipante.trim() !== '' &&
      (this.participanteActual.sexo === 'M' ||
        this.participanteActual.sexo === 'F')
    );
  }

  registrarParticipante(): void {
    if (!this.isFormValid()) {
      this.errorMessage = 'Por favor completa todos los campos';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.participanteHitFitService.create(this.participanteActual).subscribe({
      next: (response) => {
        this.loading = false;
        localStorage.setItem(
          'participante_hit_fit_actual',
          JSON.stringify(response),
        );
        this.router.navigate(['/hit-fit/juego']);
      },
      error: (error) => {
        console.error('Error registrando participante:', error);
        this.loading = false;
        this.errorMessage = 'Error al registrar participante';
      },
    });
  }

  finalizarSesionDirecto(): void {
    if (confirm('¿Deseas finalizar la sesión Hit-Fit completa?')) {
      const historialId = localStorage.getItem('historial_hit_fit_id');

      if (!historialId) {
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
                    localStorage.removeItem('historial_hit_fit_id');
                    this.sesionService.clearSesionSeleccionada();
                    this.router.navigate(['/home']);
                  },
                });
              },
            });
          },
        });
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
                });
              },
            });
        },
      });
    }
  }

  volver(): void {
    this.router.navigate(['/home']);
  }
}
