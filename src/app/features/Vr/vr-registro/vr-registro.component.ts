import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SesionService } from '../../services/sesion.service';
import {
  ParticipanteVR,
  ParticipanteVRService,
} from '../../services/Vr/participante-vr.service';

@Component({
  selector: 'app-vr-registro',
  templateUrl: './vr-registro.component.html',
  imports: [CommonModule, FormsModule],
})
export class VrRegistroComponent implements OnInit {
  sesion: any = null;
  participanteActual: ParticipanteVR = {
    idSesion: 0,
    tipoVr: '',
    nombreParticipante: '',
    apellidoParticipante: '',
    documento: '',
    sexo: 'M',
  };
  totalParticipantesRegistrados = 0;
  logoEmpresa: string | null = null;
  tipoVrSeleccionado: string = '';
  loading = false;
  errorMessage = '';

  constructor(
    private participanteVRService: ParticipanteVRService,
    private sesionService: SesionService,
    private router: Router,
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
      this.participanteActual.tipoVr = params.tipos_vr[0];
    }

    this.participanteActual.idSesion = this.sesion.id;

    this.cargarTotalRegistrados();
  }

  cargarTotalRegistrados(): void {
    this.participanteVRService.getBySesion(this.sesion.id).subscribe({
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

    this.participanteVRService.create(this.participanteActual).subscribe({
      next: (response) => {
        this.loading = false;
        localStorage.setItem(
          'participante_vr_actual',
          JSON.stringify(response),
        );
        this.router.navigate(['/vr/juego']);
      },
      error: (error) => {
        console.error('Error registrando participante:', error);
        this.loading = false;
        this.errorMessage = 'Error al registrar participante';
      },
    });
  }

  volver(): void {
    this.router.navigate(['/home']);
  }
}
