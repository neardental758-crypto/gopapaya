import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BrainBikeService } from '../../services/brain-bike.service';
import {
  BrainBikeParticipanteService,
  BrainBikeParticipante,
} from '../../services/brain-bike-participante.service';
import { SesionService } from '../../services/sesion.service';
import { forkJoin } from 'rxjs';
import { BrainBikeAudioService } from '../../services/audio/brain-bike-audio.service';

interface ColorBicicleta {
  nombre: string;
  valor: string;
  sombra: string;
}

@Component({
  selector: 'app-brain-bike-registro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registro.component.html',
})
export class BrainBikeRegistroComponent implements OnInit {
  config: any = null;
  sesion: any = null;
  participantes: BrainBikeParticipante[] = [];
  rankingSesion: BrainBikeParticipante[] = [];
  modoEdicion = false;
  participanteSeleccionandoColor: number | null = null;
  participanteSeleccionandoSexo: number | null = null;
  logoEmpresa: string | null = null;

  coloresDisponibles: ColorBicicleta[] = [
    {
      nombre: 'Amarillo',
      valor: '#FFF700',
      sombra: '0 0 15px rgba(255, 247, 0, 0.5)',
    },
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
    {
      nombre: 'Plateado',
      valor: '#C0C0C0',
      sombra: '0 0 15px rgba(192, 192, 192, 0.5)',
    },
    {
      nombre: 'Negro',
      valor: '#1A1A1A',
      sombra: '0 0 15px rgba(255, 255, 255, 0.3)',
    },
    {
      nombre: 'Blanco',
      valor: '#FFFFFF',
      sombra: '0 0 15px rgba(255, 255, 255, 0.5)',
    },
  ];

  loading = false;
  errorMessage = '';

  constructor(
    private brainBikeService: BrainBikeService,
    private participanteService: BrainBikeParticipanteService,
    private sesionService: SesionService,
    private router: Router,
    public audioService: BrainBikeAudioService
  ) {}

  ngOnInit(): void {
    this.config = this.brainBikeService.getConfigActual();

    const sesionActualStr = localStorage.getItem('sesionActual');
    this.sesion = sesionActualStr ? JSON.parse(sesionActualStr) : null;

    if (!this.sesion) {
      this.sesion = this.sesionService.getSesionSeleccionada();
    }

    if (!this.config) {
      this.router.navigate(['/brain-bike/parametros']);
      return;
    }

    if (this.sesion?.empresa?.logo) {
      this.logoEmpresa = this.sesion.empresa.logo;
    } else if (this.sesion?.logoCliente) {
      this.logoEmpresa = this.sesion.logoCliente;
    }

    this.verificarParticipantesExistentes();
    this.cargarRankingSesion();
  }

  seleccionarSexo(index: number, sexo: 'M' | 'F'): void {
    this.audioService.reproducirSonidoCambioColor();
    this.participantes[index].sexo = sexo;
    this.participanteSeleccionandoSexo = null;
  }

  abrirSelectorSexo(index: number): void {
    if (this.participanteSeleccionandoSexo === index) {
      this.audioService.reproducirSonidoCerrarModal();
    } else {
      this.audioService.reproducirSonidoAbrirModal();
    }
    this.participanteSeleccionandoSexo =
      this.participanteSeleccionandoSexo === index ? null : index;
  }

  cargarRankingSesion(): void {
    if (!this.config?.idSesion) {
      this.rankingSesion = [];
      return;
    }

    this.participanteService.getRankingSesion(this.config.idSesion).subscribe({
      next: (data) => {
        this.rankingSesion = data || [];
      },
      error: (error) => {
        console.error('Error ranking sesión:', error);
        this.rankingSesion = [];
      },
    });
  }

  verificarParticipantesExistentes(): void {
    if (!this.config?.id) {
      this.inicializarParticipantes();
      return;
    }

    this.participanteService.getByBrainBike(this.config.id).subscribe({
      next: (participantes) => {
        if (participantes && participantes.length > 0) {
          this.participantes = participantes;
          this.modoEdicion = true;
        } else {
          this.inicializarParticipantes();
        }
      },
      error: () => {
        this.inicializarParticipantes();
      },
    });
  }

  inicializarParticipantes(): void {
    this.participantes = [];
    for (let i = 0; i < this.config.numeroBicicletas; i++) {
      this.participantes.push({
        idBrainBike: this.config.id!,
        nombreParticipante: '',
        numeroBicicleta: i + 1,
        colorBicicleta:
          this.coloresDisponibles[i % this.coloresDisponibles.length].valor,
        puntosAcumulados: 0,
      });
    }
  }

  abrirSelectorColor(index: number): void {
    if (this.participanteSeleccionandoColor === index) {
      this.audioService.reproducirSonidoCerrarModal();
    } else {
      this.audioService.reproducirSonidoAbrirModal();
    }
    this.participanteSeleccionandoColor =
      this.participanteSeleccionandoColor === index ? null : index;
  }

  seleccionarColor(index: number, color: ColorBicicleta): void {
    const colorYaUsado = this.participantes.some(
      (p, i) => i !== index && p.colorBicicleta === color.valor
    );

    if (colorYaUsado) {
      this.audioService.reproducirSonidoError();
      this.errorMessage = `El color ${color.nombre} ya está siendo usado por otro participante`;
      setTimeout(() => {
        this.errorMessage = '';
      }, 3000);
      return;
    }

    this.audioService.reproducirSonidoCambioColor();
    this.participantes[index].colorBicicleta = color.valor;
    this.participanteSeleccionandoColor = null;
    this.errorMessage = '';
  }

  comenzarJuego(): void {
    if (!this.isFormValid()) {
      this.audioService.reproducirSonidoError();
      this.errorMessage = 'Todos los participantes deben tener nombre';
      return;
    }

    this.audioService.reproducirSonidoExito();
    this.loading = true;
    this.errorMessage = '';

    if (this.modoEdicion) {
      this.actualizarParticipantes();
    } else {
      this.crearParticipantes();
    }
  }

  volver(): void {
    this.audioService.reproducirSonidoClick();
    this.router.navigate(['/brain-bike/parametros']);
  }

  isColorDisponible(colorValor: string, indexActual: number): boolean {
    return !this.participantes.some(
      (p, i) => i !== indexActual && p.colorBicicleta === colorValor
    );
  }

  getColorNombre(valorColor: string): string {
    const color = this.coloresDisponibles.find((c) => c.valor === valorColor);
    return color?.nombre || 'Color';
  }

  isFormValid(): boolean {
    return this.participantes.every((p) => p.nombreParticipante.trim() !== '');
  }

  crearParticipantes(): void {
    this.participanteService.createBulk(this.participantes).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/brain-bike/reglas']);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = 'Error al registrar participantes';
        console.error(error);
      },
    });
  }

  actualizarParticipantes(): void {
    const updates = this.participantes.map((participante) => {
      if (participante.id) {
        return this.participanteService.update(participante.id, {
          nombreParticipante: participante.nombreParticipante.trim(),
          colorBicicleta: participante.colorBicicleta,
        });
      } else {
        return this.participanteService.create(participante);
      }
    });

    forkJoin(updates).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/brain-bike/reglas']);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = 'Error al actualizar participantes';
        console.error(error);
      },
    });
  }

  continuarConParticipantes(): void {
    this.router.navigate(['/brain-bike/reglas']);
  }
}
