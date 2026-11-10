import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BrainBikeV2Service } from '../../services/brain-bike-v2.service';
import { BrainBikeParticipanteService } from '../../services/brain-bike-participante.service';
import { BrainBikeAudioService } from '../../services/audio/brain-bike-audio.service';

@Component({
  selector: 'app-brain-bike-v2-countdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './countdown.component.html',
})
export class BrainBikeV2CountdownComponent implements OnInit, OnDestroy {
  config: any = null;
  countdown = 5;
  showCountdown = false;
  showRaceAnimation = false;
  participantes: any[] = [];
  private intervalId: any;

  constructor(
    private brainBikeService: BrainBikeV2Service,
    private participanteService: BrainBikeParticipanteService,
    private router: Router,
    private audioService: BrainBikeAudioService,
  ) {}

  ngOnInit(): void {
    this.config = this.brainBikeService.getConfigActual();

    if (!this.config) {
      this.router.navigate(['/brain-bike-v2/parametros']);
      return;
    }

    this.cargarParticipantes();

    setTimeout(() => {
      this.showCountdown = true;
      this.startCountdown();
    }, 2500);
  }

  cargarParticipantes(): void {
    if (!this.config?.id) return;

    this.participanteService.getByBrainBike(this.config.id).subscribe({
      next: (participantes) => {
        this.participantes = participantes || [];
      },
      error: (error) => {
        console.error('Error al cargar participantes', error);
        this.participantes = [];
      },
    });
  }

  startCountdown(): void {
    this.intervalId = setInterval(() => {
      this.audioService.reproducirSonidoCuentaRegresiva();
      this.countdown--;
      if (this.countdown === 0) {
        clearInterval(this.intervalId);
        this.audioService.reproducirSonidoTrompetaInicio();
        setTimeout(() => {
          this.showRaceAnimation = true;
          setTimeout(() => {
            this.router.navigate(['/brain-bike-v2/juego']);
          }, 5000);
        }, 500);
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
