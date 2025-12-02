import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BrainBikeService } from '../../services/brain-bike.service';
import { SesionService } from '../../services/sesion.service';

@Component({
  selector: 'app-brain-bike-reglas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reglas.component.html',
})
export class BrainBikeReglasComponent implements OnInit {
  config: any = null;
  reglasActuales = 0;
  totalReglas = 5;
  logoEmpresa: string | null = null;
  sesion: any = null;

  constructor(
    private brainBikeService: BrainBikeService,
    private router: Router,
    private sesionService: SesionService
  ) {}

  ngOnInit(): void {
    this.sesion = this.sesionService.getSesionSeleccionada();
    this.config = this.brainBikeService.getConfigActual();
    if (!this.config) {
      this.router.navigate(['/brain-bike/parametros']);
    }

    if (this.sesion?.empresa?.logo) {
      this.logoEmpresa = this.sesion.empresa.logo;
    } else if (this.sesion?.logoCliente) {
      this.logoEmpresa = this.sesion.logoCliente;
    }
  }

  siguiente(): void {
    if (this.reglasActuales < this.totalReglas - 1) {
      this.reglasActuales++;
    }
  }

  anterior(): void {
    if (this.reglasActuales > 0) {
      this.reglasActuales--;
    }
  }

  irARegla(index: number): void {
    this.reglasActuales = index;
  }

  iniciarJuego(): void {
    this.router.navigate(['/brain-bike/countdown']);
  }

  volver(): void {
    this.router.navigate(['/brain-bike/registro']);
  }
}
