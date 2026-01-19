import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { ParticipanteBicilicuadora } from './bicilicuadora-config.service';
interface ParticipanteJuego extends ParticipanteBicilicuadora {
  velocidadActual: number;
  tiempoTranscurrido: number;
  bebidaActualIndex: number;
  bebidasCompletadas: number;
}

@Injectable({
  providedIn: 'root',
})
export class BicilicuadoraGameService {
  private participantesSubject = new BehaviorSubject<ParticipanteJuego[]>([]);
  public participantes$ = this.participantesSubject.asObservable();

  private simulacionSubscription?: Subscription;

  inicializarParticipantes(participantes: ParticipanteBicilicuadora[]): void {
    const participantesJuego: ParticipanteJuego[] = participantes.map((p) => ({
      ...p,
      velocidadActual: 0,
      tiempoTranscurrido: 0,
      bebidaActualIndex: 0,
      bebidasCompletadas: 0,
      caloriasQuemadas: parseFloat(p.caloriasQuemadas?.toString() || '0'),
      vatiosGenerados: parseFloat(p.vatiosGenerados?.toString() || '0'),
      duracionTotal: p.duracionTotal || 0,
      distanciaRecorrida: parseFloat(p.distanciaRecorrida?.toString() || '0'),
      velocidadPromedio: parseFloat(p.velocidadPromedio?.toString() || '0'),
      velocidadMaxima: parseFloat(p.velocidadMaxima?.toString() || '0'),
    }));

    this.participantesSubject.next(participantesJuego);
  }

  iniciarSimulacion(): void {
    this.detenerSimulacion();
  }

  detenerSimulacion(): void {
    this.simulacionSubscription?.unsubscribe();
  }

  actualizarVelocidad(numeroBicicleta: number, velocidad: number): void {
    const participantes = this.participantesSubject.value.map((p) => {
      if (p.id === numeroBicicleta) {
        const muestras = (p.duracionTotal || 0) + 1;
        const sumaVelocidades =
          (p.velocidadPromedio || 0) * (p.duracionTotal || 0) + velocidad;
        const nuevaVelocidadPromedio = sumaVelocidades / muestras;
        const nuevaVelocidadMaxima = Math.max(
          p.velocidadMaxima || 0,
          velocidad,
        );

        const MET =
          velocidad < 16 ? 4 : velocidad < 20 ? 6.8 : velocidad < 25 ? 8 : 10;

        const pesoKg = 70;
        const minutosIncremento = 1 / 60;
        const caloriasIncremento = 0.0175 * MET * pesoKg * minutosIncremento;
        const nuevasCalorias = (p.caloriasQuemadas || 0) + caloriasIncremento;

        const vatiosIncremento = velocidad * 0.25;
        const nuevosVatios = (p.vatiosGenerados || 0) + vatiosIncremento;

        const distanciaIncremento = velocidad / 3600;
        const nuevaDistancia =
          (p.distanciaRecorrida || 0) + distanciaIncremento;

        return {
          ...p,
          velocidadActual: velocidad,
          velocidadMaxima: parseFloat(nuevaVelocidadMaxima.toFixed(1)),
          velocidadPromedio: parseFloat(nuevaVelocidadPromedio.toFixed(1)),
          caloriasQuemadas: parseFloat(nuevasCalorias.toFixed(2)),
          vatiosGenerados: parseFloat(nuevosVatios.toFixed(2)),
          distanciaRecorrida: parseFloat(nuevaDistancia.toFixed(3)),
          duracionTotal: muestras,
        };
      }
      return p;
    });

    this.participantesSubject.next(participantes);
  }

  actualizarMetricas(
    numeroBicicleta: number,
    metricas: {
      calorias?: number;
      vatios?: number;
      distancia?: number;
      velocidadPromedio?: number;
    },
  ): void {
    const participantes = this.participantesSubject.value.map((p) => {
      if (p.id === numeroBicicleta) {
        return {
          ...p,
          caloriasQuemadas:
            metricas.calorias !== undefined
              ? metricas.calorias
              : p.caloriasQuemadas,
          vatiosGenerados:
            metricas.vatios !== undefined ? metricas.vatios : p.vatiosGenerados,
          distanciaRecorrida:
            metricas.distancia !== undefined
              ? metricas.distancia
              : p.distanciaRecorrida,
          velocidadPromedio:
            metricas.velocidadPromedio !== undefined
              ? metricas.velocidadPromedio
              : p.velocidadPromedio,
        };
      }
      return p;
    });

    this.participantesSubject.next(participantes);
  }

  completarBebida(numeroBicicleta: number): void {
    const participantes = this.participantesSubject.value.map((p) => {
      if (p.id === numeroBicicleta) {
        return {
          ...p,
          bebidasCompletadas: p.bebidasCompletadas + 1,
          bebidaActualIndex: p.bebidaActualIndex + 1,
        };
      }
      return p;
    });

    this.participantesSubject.next(participantes);
  }

  getParticipantes(): ParticipanteJuego[] {
    return this.participantesSubject.value;
  }
}
