import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-metricas-participante',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="bg-dark-900 border-2 rounded-card p-4"
      [style.border-color]="participante.color"
    >
      <div class="flex items-center gap-3 mb-3">
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
          [style.background-color]="participante.color"
          [style.color]="'#0A0A0A'"
        >
          {{ participante.numeroBicicleta }}
        </div>
        <div class="flex-1">
          <p class="font-bold text-white text-sm">{{ participante.nombre }}</p>
          <p class="text-xs text-gray-500">
            Bicicleta {{ participante.numeroBicicleta }}
          </p>
        </div>
      </div>

      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-400">Puntos:</span>
          <span class="font-bold text-neon-yellow">{{
            participante.puntos
          }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Velocidad:</span>
          <span class="font-bold text-white"
            >{{ participante.velocidad }} km/h</span
          >
        </div>
        <div class="h-2 bg-dark-700 rounded-full overflow-hidden">
          <div
            class="h-full bg-neon-green transition-all"
            [style.width.%]="(participante.velocidad / 30) * 100"
          ></div>
        </div>
      </div>
    </div>
  `,
})
export class MetricasParticipanteComponent {
  @Input() participante: any;
}
