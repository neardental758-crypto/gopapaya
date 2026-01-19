import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface PuntoPlano {
  tiempo: number;
  velocidadObjetivo: number;
  velocidadActual: number;
}

@Injectable({
  providedIn: 'root',
})
export class BicilicuadoraPlanoService {
  private puntosHistorial: PuntoPlano[] = [];
  private maxPuntos = 30;

  planoData$ = new BehaviorSubject<PuntoPlano[]>([]);

  agregarPunto(
    tiempo: number,
    velocidadObjetivo: number,
    velocidadActual: number
  ): void {
    this.puntosHistorial.push({ tiempo, velocidadObjetivo, velocidadActual });

    if (this.puntosHistorial.length > this.maxPuntos) {
      this.puntosHistorial.shift();
    }

    this.planoData$.next([...this.puntosHistorial]);
  }

  limpiar(): void {
    this.puntosHistorial = [];
    this.planoData$.next([]);
  }

  calcularRangoVelocidad(): { min: number; max: number } {
    if (this.puntosHistorial.length === 0) {
      return { min: 0, max: 30 };
    }

    const velocidades = this.puntosHistorial.flatMap((p) => [
      p.velocidadObjetivo,
      p.velocidadActual,
    ]);
    const min = Math.floor(Math.min(...velocidades) - 5);
    const max = Math.ceil(Math.max(...velocidades) + 5);

    return { min: Math.max(0, min), max };
  }

  obtenerPuntosParaGrafico(): {
    objetivos: { x: number; y: number }[];
    actuales: { x: number; y: number }[];
  } {
    const objetivos = this.puntosHistorial.map((p, i) => ({
      x: i,
      y: p.velocidadObjetivo,
    }));
    const actuales = this.puntosHistorial.map((p, i) => ({
      x: i,
      y: p.velocidadActual,
    }));

    return { objetivos, actuales };
  }

  estaEnRango(velocidadActual: number, velocidadObjetivo: number): boolean {
    return Math.abs(velocidadActual - velocidadObjetivo) <= 1;
  }
}
