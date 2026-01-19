import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  BicilicuadoraConfig,
  ParticipanteBicilicuadora,
  ColorBicicleta,
  BicilicuadoraConfigService,
} from '../../services/bicilicuadora/bicilicuadora-config.service';
import { ParticipanteBicilicuadoraService } from '../../services/bicilicuadora/participante-bicilicuadora.service';
import { SesionService } from '../../services/sesion.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Bebida,
  BebidasService,
} from '../../services/bicilicuadora/bebidas.service';

@Component({
  selector: 'app-bicilicuadora-registro',
  templateUrl: './bicilicuadora-registro.component.html',
  imports: [CommonModule, FormsModule],
})
export class BicilicuadoraRegistroComponent implements OnInit {
  config: BicilicuadoraConfig | null = null;
  sesion: any = null;
  participanteActual: ParticipanteBicilicuadora = {
    idBicilicuadora: 0,
    nombreParticipante: '',
    sexo: undefined,
    caloriasQuemadas: 0,
    vatiosGenerados: 0,
    duracionTotal: 0,
    distanciaRecorrida: 0,
    velocidadPromedio: 0,
    velocidadMaxima: 0,
    puntosTotales: 0,
    bebidaSeleccionadaId: '',
    cantidadBebidasSeleccionadas: 1,
    documento: '',
  };
  totalParticipantesRegistrados = 0;
  bebidasDisponibles: Bebida[] = [];
  totalParticipantes = 0;
  logoEmpresa: string | null = null;

  coloresDisponibles: ColorBicicleta[] = [
    {
      nombre: 'Azul',
      valor: '#00F0FF',
      sombra: '0 0 15px rgba(0, 240, 255, 0.5)',
    },
    {
      nombre: 'Rojo',
      valor: '#FF003C',
      sombra: '0 0 15px rgba(255, 0, 60, 0.5)',
    },
    {
      nombre: 'Verde',
      valor: '#39FF14',
      sombra: '0 0 15px rgba(57, 255, 20, 0.5)',
    },
  ];

  loading = false;
  errorMessage = '';

  constructor(
    private bicilicuadoraConfigService: BicilicuadoraConfigService,
    private participanteService: ParticipanteBicilicuadoraService,
    private sesionService: SesionService,
    private bebidasService: BebidasService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.config = this.bicilicuadoraConfigService.getConfigActual();
    this.sesion = this.sesionService.getSesionSeleccionada();

    if (!this.config || !this.sesion) {
      this.router.navigate(['/bicilicuadora/parametros']);
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

    if (params) {
      this.totalParticipantes = params.numero_participantes || 1;

      if (params.bebidas_disponibles && params.bebidas_disponibles.length > 0) {
        this.cargarBebidas(params.bebidas_disponibles);
      }
    }

    this.participanteActual.idBicilicuadora = this.config.id!;

    this.verificarSiYaCompletaron();
  }

  verificarSiYaCompletaron(): void {
    if (!this.config?.id) return;

    this.participanteService.getByBicilicuadora(this.config.id).subscribe({
      next: (participantes) => {
        const participantesJugados = participantes.filter(
          (p: any) => p.puntosTotales > 0 || p.caloriasQuemadas > 0,
        );

        this.totalParticipantesRegistrados = participantesJugados.length;

        if (participantesJugados.length >= this.totalParticipantes) {
          console.log('✅ Todos completaron, redirigiendo a ranking');
          this.router.navigate(['/bicilicuadora/juego']);
        }
      },
      error: () => {
        this.totalParticipantesRegistrados = 0;
      },
    });
  }

  cargarTotalRegistrados(): void {
    if (!this.config?.id) return;

    this.participanteService.getByBicilicuadora(this.config.id).subscribe({
      next: (participantes) => {
        const participantesJugados = participantes.filter(
          (p: any) => p.puntosTotales > 0 || p.caloriasQuemadas > 0,
        );
        this.totalParticipantesRegistrados = participantesJugados.length;
      },
      error: () => {
        this.totalParticipantesRegistrados = 0;
      },
    });
  }

  cargarBebidas(bebidaIds: string[]): void {
    this.bebidasService.getAllBebidas().subscribe({
      next: (todasLasBebidas) => {
        this.bebidasDisponibles = todasLasBebidas.filter((b) =>
          bebidaIds.includes(b._id),
        );

        if (this.bebidasDisponibles.length > 0) {
          this.participanteActual.bebidaSeleccionadaId =
            this.bebidasDisponibles[0]._id;
        }
      },
      error: (error) => {
        console.error('Error al cargar bebidas:', error);
      },
    });
  }

  cambiarCantidadBebidas(cambio: number): void {
    const nuevo =
      this.participanteActual.cantidadBebidasSeleccionadas! + cambio;
    if (nuevo >= 1 && nuevo <= 5) {
      this.participanteActual.cantidadBebidasSeleccionadas = nuevo;
    }
  }

  isFormValid(): boolean {
    return (
      this.participanteActual.nombreParticipante.trim() !== '' &&
      (this.participanteActual.sexo === 'M' ||
        this.participanteActual.sexo === 'F') &&
      this.participanteActual.bebidaSeleccionadaId !== ''
    );
  }

  registrarParticipante(): void {
    if (!this.isFormValid()) {
      this.errorMessage = 'Por favor completa todos los campos';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.participanteService.createBulk([this.participanteActual]).subscribe({
      next: (response) => {
        this.loading = false;
        localStorage.setItem(
          'participante_actual',
          JSON.stringify(response[0]),
        );
        this.router.navigate(['/bicilicuadora/juego']);
      },
      error: (error) => {
        console.error('Error registrando participante:', error);
        this.loading = false;
        this.errorMessage = 'Error al registrar participante';
      },
    });
  }

  volver(): void {
    this.router.navigate(['/bicilicuadora/parametros']);
  }
}
