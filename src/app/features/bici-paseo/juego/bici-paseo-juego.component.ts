import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ParticipanteBiciPaseo,
  ParticipanteBiciPaseoService,
} from '../../services/bici-paseo/participante-bici-paseo.service';
import { HistorialService } from '../../services/historial-sesion.service';
import { SesionService } from '../../services/sesion.service';

@Component({
  selector: 'app-bici-paseo-juego',
  templateUrl: './bici-paseo-juego.component.html',
  imports: [CommonModule, FormsModule],
})
export class BiciPaseoJuegoComponent implements OnInit {
  sesion: any = null;
  logoEmpresa: string | null = null;
  totalParticipantes = 0;
  ruta: string = '';
  distancia: string = '';
  participantes: ParticipanteBiciPaseo[] = [];

  constructor(
    private participanteBiciPaseoService: ParticipanteBiciPaseoService,
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

    const iniciado = localStorage.getItem('bici_paseo_iniciado');
    if (!iniciado) {
      this.router.navigate(['/bici-paseo/registro']);
      return;
    }

    if (this.sesion?.empresa?.logo) {
      this.logoEmpresa = this.sesion.empresa.logo;
    } else if (this.sesion?.logoCliente) {
      this.logoEmpresa = this.sesion.logoCliente;
    }

    this.cargarParametrosJuego();
    this.cargarParticipantes();

    history.pushState(null, '', location.href);
    window.addEventListener('popstate', this.prevenirRetroceso);
  }

  cargarParametrosJuego(): void {
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

    if (params) {
      this.ruta = params.ruta || '';
      this.distancia = params.distancia || '';
    }
  }

  cargarParticipantes(): void {
    this.participanteBiciPaseoService.getBySesion(this.sesion.id).subscribe({
      next: (participantes) => {
        this.participantes = participantes;
        this.totalParticipantes = participantes.length;
      },
      error: () => {
        this.totalParticipantes = 0;
      },
    });
  }

  prevenirRetroceso = (): void => {
    history.pushState(null, '', location.href);
  };

  finalizarSesion(): void {
    if (confirm('¿Deseas finalizar la sesión BiciPaseo completa?')) {
      const historialId = localStorage.getItem('historial_bici_paseo_id');

      if (!historialId) {
        alert('No se encontró el historial de la sesión');
        return;
      }

      const historialFinal = {
        fecha_fin: new Date().toISOString(),
        duracion_minutos: 0,
        participantes_data: this.participantes,
        ranking_final: this.participantes,
        estadisticas_generales: {
          totalParticipantes: this.participantes.length,
          ruta: this.ruta,
          distancia: this.distancia,
        },
      };

      this.historialService
        .actualizarHistorial(parseInt(historialId), historialFinal)
        .subscribe({
          next: () => {
            this.sesionService.finalizarSesion(this.sesion.id).subscribe({
              next: () => {
                localStorage.removeItem('bici_paseo_iniciado');
                localStorage.removeItem('historial_bici_paseo_id');
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
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('popstate', this.prevenirRetroceso);
  }
}
