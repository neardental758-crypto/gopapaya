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

    if (params && params.tipo_vr) {
      this.participanteActual.tipoVr = params.tipo_vr;
      this.tipoVrSeleccionado = this.obtenerNombreTipoVR(params.tipo_vr);
    }

    this.participanteActual.idSesion = this.sesion.id;

    this.cargarTotalRegistrados();
  }

  obtenerNombreTipoVR(tipoId: string): string {
    const tiposVR: { [key: string]: string } = {
      'primeros-auxilios-rcp': 'Primeros auxilios y RCP',
      meditacion: 'Meditación',
      'recreativo-synth-riders': 'Recreativo (Synth Riders)',
      'trabajo-equipo-comunicacion':
        'Trabajo en equipo, comunicación asertiva (Collective canvas)',
      'bienestar-emocional': 'Bienestar emocional',
      'uso-epp': 'Uso adecuado de Equipos de Protección Personal (EPP)',
      'riesgo-electrico': 'Riesgo eléctrico',
      'riesgo-mecanico': 'Riesgo mecánico',
      'riesgo-biologico': 'Riesgo Biológico',
      'manejo-sustancias-quimicas': 'Manejo de sustancias químicas',
      'manipulacion-alimentos': 'Manipulación de alimentos',
      'identificacion-prevencion-riesgos':
        'Identificación y prevención de riesgos laborales',
      'trabajo-alturas': 'Trabajo en alturas',
      'espacios-confinados': 'Espacios confinados',
      montacargas: 'Montacargas',
      'conduccion-vehiculo-liviano': 'Conducción Vehículo liviano',
      'conduccion-vehiculo-pesado': 'Conducción Vehículo pesado',
      'conduccion-bicicleta': 'Conducción Bicicleta',
      'izaje-cargas':
        'Izaje de cargas Puente Grúas – Grúas móviles - torres grúa',
      'seguridad-vial': 'Seguridad vial',
      'manejo-extintores': 'Manejo de extintores y prevención de incendios',
      'simulador-parqueo': 'Simulador de parqueo',
      poligono: 'Polígono',
    };

    return tiposVR[tipoId] || tipoId;
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
