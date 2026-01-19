import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { BicilicuadoraPlanoService } from '../services/bicilicuadora-plano.service';

@Component({
  selector: 'app-bicilicuadora-plano',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col">
      <p class="text-gray-400 text-xs mb-2 text-center font-semibold">
        📊 Seguimiento de Velocidad
      </p>

      <div class="flex-1 min-h-0">
        <svg
          class="w-full h-full"
          viewBox="0 0 400 280"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="gridGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#1F2937;stop-opacity:0.8" />
              <stop offset="100%" style="stop-color:#111827;stop-opacity:0.4" />
            </linearGradient>
          </defs>

          <rect
            x="0"
            y="0"
            width="400"
            height="280"
            fill="url(#gridGradient)"
            rx="8"
          />

          <line
            *ngFor="let y of [50, 100, 150, 200, 250]"
            [attr.x1]="50"
            [attr.y1]="y"
            [attr.x2]="380"
            [attr.y2]="y"
            stroke="#374151"
            stroke-width="1"
            opacity="0.3"
          />

          <line
            *ngFor="let x of [100, 150, 200, 250, 300, 350]"
            [attr.x1]="x"
            [attr.y1]="20"
            [attr.x2]="x"
            [attr.y2]="250"
            stroke="#374151"
            stroke-width="1"
            opacity="0.3"
          />

          <line
            x1="50"
            y1="20"
            x2="50"
            y2="250"
            stroke="#6B7280"
            stroke-width="2.5"
          />
          <line
            x1="50"
            y1="250"
            x2="380"
            y2="250"
            stroke="#6B7280"
            stroke-width="2.5"
          />

          <text
            x="40"
            y="25"
            fill="#9CA3AF"
            font-size="11"
            text-anchor="end"
            font-weight="600"
          >
            {{ rangoVelocidad.max }}
          </text>
          <text
            x="40"
            y="140"
            fill="#9CA3AF"
            font-size="11"
            text-anchor="end"
            font-weight="600"
          >
            {{
              (rangoVelocidad.max + rangoVelocidad.min) / 2 | number : '1.0-0'
            }}
          </text>
          <text
            x="40"
            y="255"
            fill="#9CA3AF"
            font-size="11"
            text-anchor="end"
            font-weight="600"
          >
            {{ rangoVelocidad.min }}
          </text>

          <text
            x="200"
            y="275"
            fill="#9CA3AF"
            font-size="11"
            text-anchor="middle"
            font-weight="600"
          >
            Tiempo (s)
          </text>
          <text
            x="12"
            y="140"
            fill="#9CA3AF"
            font-size="11"
            text-anchor="middle"
            font-weight="600"
            transform="rotate(-90 12 140)"
          >
            Velocidad (km/h)
          </text>

          <polyline
            [attr.points]="lineaObjetivo"
            fill="none"
            stroke="#00F0FF"
            stroke-width="3"
            opacity="0.9"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <polyline
            [attr.points]="lineaActual"
            fill="none"
            [attr.stroke]="colorLineaActual"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <circle
            *ngIf="puntoActualX > 0"
            [attr.cx]="puntoActualX"
            [attr.cy]="puntoActualY"
            r="5"
            [attr.fill]="colorLineaActual"
            [attr.stroke]="colorLineaActual"
            stroke-width="3"
          >
            <animate
              attributeName="r"
              values="5;8;5"
              dur="1s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="1;0.6;1"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
      </div>

      <div class="flex justify-center gap-4 mt-2">
        <div class="flex items-center gap-1.5">
          <div class="w-5 h-0.5 bg-neon-blue rounded-full"></div>
          <span class="text-xs text-gray-300 font-semibold">Objetivo</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div
            class="w-5 h-0.5 rounded-full"
            [class.bg-neon-green]="estaEnRango"
            [class.bg-neon-red]="!estaEnRango"
          ></div>
          <span class="text-xs text-gray-300 font-semibold">Actual</span>
        </div>
      </div>
    </div>
  `,
})
export class BicilicuadoraPlanoComponent implements OnInit, OnDestroy {
  lineaObjetivo = '';
  lineaActual = '';
  rangoVelocidad = { min: 0, max: 30 };
  puntoActualX = 0;
  puntoActualY = 0;
  estaEnRango = false;
  colorLineaActual = '#FF003C';

  private subscription?: Subscription;

  constructor(private planoService: BicilicuadoraPlanoService) {}

  ngOnInit(): void {
    this.subscription = this.planoService.planoData$.subscribe((puntos) => {
      if (puntos.length === 0) {
        this.lineaObjetivo = '';
        this.lineaActual = '';
        this.puntoActualX = 0;
        this.puntoActualY = 0;
        return;
      }

      this.rangoVelocidad = this.planoService.calcularRangoVelocidad();
      const { objetivos, actuales } =
        this.planoService.obtenerPuntosParaGrafico();

      this.lineaObjetivo = this.generarPolyline(objetivos);
      this.lineaActual = this.generarPolyline(actuales);

      if (actuales.length > 0) {
        const ultimoPunto = actuales[actuales.length - 1];
        const ultimoObjetivo = objetivos[objetivos.length - 1];

        this.puntoActualX = this.escalarX(ultimoPunto.x, actuales.length);
        this.puntoActualY = this.escalarY(ultimoPunto.y);

        this.estaEnRango = this.planoService.estaEnRango(
          ultimoPunto.y,
          ultimoObjetivo.y
        );
        this.colorLineaActual = this.estaEnRango ? '#39FF14' : '#FF003C';
      }
    });
  }

  private generarPolyline(puntos: { x: number; y: number }[]): string {
    if (puntos.length === 0) return '';

    return puntos
      .map((p) => {
        const x = this.escalarX(p.x, puntos.length);
        const y = this.escalarY(p.y);
        return `${x},${y}`;
      })
      .join(' ');
  }

  private escalarX(valor: number, totalPuntos: number): number {
    const ancho = 330;
    const offset = 50;
    return offset + (valor / Math.max(totalPuntos - 1, 1)) * ancho;
  }

  private escalarY(velocidad: number): number {
    const alto = 230;
    const offset = 20;
    const rango = this.rangoVelocidad.max - this.rangoVelocidad.min;

    if (rango === 0) return offset + alto / 2;

    const porcentaje = (this.rangoVelocidad.max - velocidad) / rango;
    return offset + porcentaje * alto;
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
