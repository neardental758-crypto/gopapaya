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

@Component({
  selector: 'app-bicilicuadora-registro',
  templateUrl: './bicilicuadora-registro.component.html',
  imports: [CommonModule, FormsModule],
})
export class BicilicuadoraRegistroComponent implements OnInit {
  config: BicilicuadoraConfig | null = null;
  sesion: any = null;
  participantes: ParticipanteBicilicuadora[] = [];
  modoEdicion = false;
  participanteSeleccionandoColor: number | null = null;
  participanteSeleccionandoSexo: number | null = null;
  logoEmpresa: string | null = null;

  coloresDisponibles: ColorBicicleta[] = [
    {
      nombre: 'Naranja',
      valor: '#FF6B35',
      sombra: '0 0 15px rgba(255, 107, 53, 0.5)',
    },
    {
      nombre: 'Amarillo',
      valor: '#FFF700',
      sombra: '0 0 15px rgba(255, 247, 0, 0.5)',
    },
    {
      nombre: 'Verde',
      valor: '#39FF14',
      sombra: '0 0 15px rgba(57, 255, 20, 0.5)',
    },
    {
      nombre: 'Azul',
      valor: '#00F0FF',
      sombra: '0 0 15px rgba(0, 240, 255, 0.5)',
    },
    {
      nombre: 'Rosa',
      valor: '#FF10F0',
      sombra: '0 0 15px rgba(255, 16, 240, 0.5)',
    },
    {
      nombre: 'Rojo',
      valor: '#FF003C',
      sombra: '0 0 15px rgba(255, 0, 60, 0.5)',
    },
  ];

  loading = false;
  errorMessage = '';

  constructor(
    private bicilicuadoraConfigService: BicilicuadoraConfigService,
    private participanteService: ParticipanteBicilicuadoraService,
    private sesionService: SesionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.config = this.bicilicuadoraConfigService.getConfigActual();

    const sesionActualStr = localStorage.getItem('sesionActual');
    this.sesion = sesionActualStr ? JSON.parse(sesionActualStr) : null;

    if (!this.sesion) {
      this.sesion = this.sesionService.getSesionSeleccionada();
    }

    if (!this.config) {
      this.router.navigate(['/bicilicuadora/parametros']);
      return;
    }

    if (
      !this.config.configuracionBicicletas ||
      this.config.configuracionBicicletas.length === 0
    ) {
      this.config.configuracionBicicletas = [];
      for (let i = 1; i <= (this.config.numeroBicicletas || 1); i++) {
        this.config.configuracionBicicletas.push({
          numeroBicicleta: i,
          participantes: 1,
          bebidasSeleccionadas: [],
        });
      }
    }

    console.log('📋 CONFIG EN REGISTRO:', this.config);

    if (this.sesion?.empresa?.logo) {
      this.logoEmpresa = this.sesion.empresa.logo;
    } else if (this.sesion?.logoCliente) {
      this.logoEmpresa = this.sesion.logoCliente;
    }

    this.verificarParticipantesExistentes();
  }

  calcularTotalParticipantesEsperados(): number {
    if (!this.config?.configuracionBicicletas) return 0;
    return this.config.configuracionBicicletas.reduce(
      (total, bici) => total + bici.participantes,
      0
    );
  }

  verificarParticipantesExistentes(): void {
    if (!this.config?.id) {
      this.inicializarParticipantes();
      return;
    }

    this.participanteService.getByBicilicuadora(this.config.id).subscribe({
      next: (participantes) => {
        const totalEsperado = this.calcularTotalParticipantesEsperados();

        if (
          participantes &&
          participantes.length > 0 &&
          participantes.length >= totalEsperado
        ) {
          this.participantes = participantes;
          this.modoEdicion = true;
        } else {
          this.inicializarParticipantes();
          this.modoEdicion = false;
        }
      },
      error: () => {
        this.inicializarParticipantes();
        this.modoEdicion = false;
      },
    });
  }

  inicializarParticipantes(): void {
    this.participantes = [];
    this.modoEdicion = false;

    if (!this.config?.configuracionBicicletas) return;

    this.config.configuracionBicicletas.forEach((bicicleta) => {
      for (let i = 0; i < bicicleta.participantes; i++) {
        this.participantes.push({
          idBicilicuadora: this.config!.id!,
          nombreParticipante: '',
          numeroBicicleta: bicicleta.numeroBicicleta,
          colorBicicleta:
            this.coloresDisponibles[
              this.participantes.length % this.coloresDisponibles.length
            ].valor,
          caloriasQuemadas: 0,
          vatiosGenerados: 0,
          duracionTotal: 0,
          distanciaRecorrida: 0,
          velocidadPromedio: 0,
          velocidadMaxima: 0,
        });
      }
    });
  }

  abrirSelectorColor(index: number): void {
    this.participanteSeleccionandoColor =
      this.participanteSeleccionandoColor === index ? null : index;
  }

  abrirSelectorSexo(index: number): void {
    this.participanteSeleccionandoSexo =
      this.participanteSeleccionandoSexo === index ? null : index;
  }

  seleccionarColor(index: number, color: ColorBicicleta): void {
    const colorYaUsado = this.participantes.some(
      (p, i) => i !== index && p.colorBicicleta === color.valor
    );

    if (colorYaUsado) {
      this.errorMessage = `El color ${color.nombre} ya está siendo usado por otro participante`;
      setTimeout(() => {
        this.errorMessage = '';
      }, 3000);
      return;
    }

    this.participantes[index].colorBicicleta = color.valor;
    this.participanteSeleccionandoColor = null;
    this.errorMessage = '';
  }

  seleccionarSexo(index: number, sexo: 'M' | 'F'): void {
    this.participantes[index].sexo = sexo;
    this.participanteSeleccionandoSexo = null;
  }

  isColorDisponible(colorValor: string, indexActual: number): boolean {
    return !this.participantes.some(
      (p, i) => i !== indexActual && p.colorBicicleta === colorValor
    );
  }

  isFormValid(): boolean {
    return this.participantes.every((p) => p.nombreParticipante.trim() !== '');
  }

  comenzarJuego(): void {
    if (!this.isFormValid()) {
      this.errorMessage = 'Todos los participantes deben tener nombre';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    if (this.modoEdicion) {
      this.actualizarParticipantes();
    } else {
      this.crearParticipantes();
    }
  }

  crearParticipantes(): void {
    this.participanteService.createBulk(this.participantes).subscribe({
      next: (response) => {
        this.loading = false;
        this.router.navigate(['/bicilicuadora/juego']);
      },
      error: (error) => {
        console.error('❌ ERROR CREANDO PARTICIPANTES:', error);
        this.loading = false;
        this.errorMessage = 'Error al registrar participantes';
      },
    });
  }

  actualizarParticipantes(): void {
    const updates = this.participantes.map((participante) => {
      if (participante.id) {
        return this.participanteService.update(participante.id, {
          nombreParticipante: participante.nombreParticipante.trim(),
          colorBicicleta: participante.colorBicicleta,
          sexo: participante.sexo,
        });
      } else {
        return this.participanteService.createBulk([participante]);
      }
    });

    forkJoin(updates).subscribe({
      next: (response) => {
        this.loading = false;
        this.router.navigate(['/bicilicuadora/juego']);
      },
      error: (error) => {
        console.error('❌ ERROR ACTUALIZANDO:', error);
        this.loading = false;
        this.errorMessage = 'Error al actualizar participantes';
      },
    });
  }

  continuarConParticipantes(): void {
    this.router.navigate(['/bicilicuadora/juego']);
  }

  volver(): void {
    this.router.navigate(['/bicilicuadora/parametros']);
  }
}
