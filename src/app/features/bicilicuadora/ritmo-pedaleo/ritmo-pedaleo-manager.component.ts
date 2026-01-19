import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface RitmoSegmento {
  id: string;
  segundo_inicio: number;
  segundo_fin: number;
  velocidad_objetivo: number;
  porcentaje: number;
}

@Component({
  selector: 'app-ritmo-pedaleo-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ritmo-pedaleo-manager.component.html',
})
export class RitmoPedaleoManagerComponent implements OnInit, OnChanges {
  @Input() tiempoPedaleo: number = 0;
  @Input() ritmosExistentes: any[] = [];
  @Output() onSaveRitmos = new EventEmitter<any[]>();
  @Output() onCancel = new EventEmitter<void>();

  segmentos: RitmoSegmento[] = [];
  segmentoSeleccionado: RitmoSegmento | null = null;
  duracionTemporal: number = 30;
  velocidadTemporal: number = 15;

  ngOnInit(): void {
    this.inicializarSegmentos();
  }

  ngOnChanges(): void {
    this.inicializarSegmentos();
  }

  inicializarSegmentos(): void {
    if (this.ritmosExistentes && this.ritmosExistentes.length > 0) {
      this.segmentos = this.ritmosExistentes
        .sort((a, b) => a.segundo_inicio - b.segundo_inicio)
        .map((ritmo) => ({
          id: ritmo._id || this.generarId(),
          segundo_inicio: ritmo.segundo_inicio,
          segundo_fin: ritmo.segundo_fin,
          velocidad_objetivo: ritmo.velocidad_objetivo,
          porcentaje:
            ((ritmo.segundo_fin - ritmo.segundo_inicio) / this.tiempoPedaleo) *
            100,
        }));
    } else {
      this.segmentos = [];
    }
  }

  generarId(): string {
    return 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  get tiempoRestante(): number {
    const tiempoUsado = this.segmentos.reduce(
      (acc, seg) => acc + (seg.segundo_fin - seg.segundo_inicio),
      0
    );
    return this.tiempoPedaleo - tiempoUsado;
  }

  get porcentajeRestante(): number {
    return (this.tiempoRestante / this.tiempoPedaleo) * 100;
  }

  agregarSegmento(): void {
    if (this.tiempoRestante <= 0) return;

    const ultimoSegmento = this.segmentos[this.segmentos.length - 1];
    const segundoInicio = ultimoSegmento ? ultimoSegmento.segundo_fin : 0;

    const duracion = Math.min(this.duracionTemporal, this.tiempoRestante);
    const segundoFin = segundoInicio + duracion;

    const nuevoSegmento: RitmoSegmento = {
      id: this.generarId(),
      segundo_inicio: segundoInicio,
      segundo_fin: segundoFin,
      velocidad_objetivo: this.velocidadTemporal,
      porcentaje: (duracion / this.tiempoPedaleo) * 100,
    };

    this.segmentos.push(nuevoSegmento);
    this.ajustarDuracionTemporal();
  }

  ajustarDuracionTemporal(): void {
    if (this.tiempoRestante < this.duracionTemporal) {
      this.duracionTemporal = Math.max(10, this.tiempoRestante);
    }
  }

  seleccionarSegmento(segmento: RitmoSegmento): void {
    this.segmentoSeleccionado = segmento;
  }

  actualizarDuracionSegmento(
    segmento: RitmoSegmento,
    nuevaDuracion: number
  ): void {
    const index = this.segmentos.indexOf(segmento);
    if (index === -1) return;

    const maxDuracion =
      this.tiempoRestante + (segmento.segundo_fin - segmento.segundo_inicio);
    nuevaDuracion = Math.min(nuevaDuracion, maxDuracion);
    nuevaDuracion = Math.max(5, nuevaDuracion);

    segmento.segundo_fin = segmento.segundo_inicio + nuevaDuracion;
    segmento.porcentaje = (nuevaDuracion / this.tiempoPedaleo) * 100;

    this.reajustarSegmentosSiguientes(index);
  }

  actualizarVelocidadSegmento(
    segmento: RitmoSegmento,
    nuevaVelocidad: number
  ): void {
    segmento.velocidad_objetivo = Math.max(1, Math.min(50, nuevaVelocidad));
  }

  reajustarSegmentosSiguientes(indexInicio: number): void {
    for (let i = indexInicio + 1; i < this.segmentos.length; i++) {
      const segmentoAnterior = this.segmentos[i - 1];
      const segmentoActual = this.segmentos[i];
      const duracion =
        segmentoActual.segundo_fin - segmentoActual.segundo_inicio;

      segmentoActual.segundo_inicio = segmentoAnterior.segundo_fin;
      segmentoActual.segundo_fin = segmentoActual.segundo_inicio + duracion;
    }
  }

  eliminarSegmento(segmento: RitmoSegmento): void {
    const index = this.segmentos.indexOf(segmento);
    if (index > -1) {
      this.segmentos.splice(index, 1);
      this.reajustarSegmentosSiguientes(index - 1);
      if (this.segmentoSeleccionado?.id === segmento.id) {
        this.segmentoSeleccionado = null;
      }
    }
  }

  distribuirUniformemente(): void {
    const numSegmentos = this.segmentos.length;
    if (numSegmentos === 0) return;

    const duracionPorSegmento = Math.floor(this.tiempoPedaleo / numSegmentos);
    let segundoActual = 0;

    this.segmentos.forEach((segmento, index) => {
      segmento.segundo_inicio = segundoActual;
      if (index === numSegmentos - 1) {
        segmento.segundo_fin = this.tiempoPedaleo;
      } else {
        segmento.segundo_fin = segundoActual + duracionPorSegmento;
      }
      segmento.porcentaje =
        ((segmento.segundo_fin - segmento.segundo_inicio) /
          this.tiempoPedaleo) *
        100;
      segundoActual = segmento.segundo_fin;
    });
  }

  crearSegmentosRapidos(cantidad: number): void {
    this.segmentos = [];
    const duracionPorSegmento = Math.floor(this.tiempoPedaleo / cantidad);
    let segundoActual = 0;

    for (let i = 0; i < cantidad; i++) {
      const segundoFin =
        i === cantidad - 1
          ? this.tiempoPedaleo
          : segundoActual + duracionPorSegmento;
      this.segmentos.push({
        id: this.generarId(),
        segundo_inicio: segundoActual,
        segundo_fin: segundoFin,
        velocidad_objetivo: 15 + i * 3,
        porcentaje: ((segundoFin - segundoActual) / this.tiempoPedaleo) * 100,
      });
      segundoActual = segundoFin;
    }
  }

  limpiarTodo(): void {
    if (confirm('¿Eliminar todos los ritmos?')) {
      this.segmentos = [];
      this.segmentoSeleccionado = null;
    }
  }

  guardar(): void {
    if (this.tiempoRestante > 0) {
      if (
        !confirm(
          `Aún quedan ${this.tiempoRestante} segundos sin configurar. ¿Deseas guardar de todas formas?`
        )
      ) {
        return;
      }
    }

    const ritmosParaGuardar = this.segmentos.map((seg) => ({
      _id: seg.id.startsWith('temp_') ? undefined : seg.id,
      segundo_inicio: seg.segundo_inicio,
      segundo_fin: seg.segundo_fin,
      velocidad_objetivo: seg.velocidad_objetivo,
    }));

    this.onSaveRitmos.emit(ritmosParaGuardar);
  }

  cancelar(): void {
    this.onCancel.emit();
  }

  getColorVelocidad(velocidad: number): string {
    if (velocidad < 12) return '#39FF14';
    if (velocidad < 20) return '#FFF700';
    if (velocidad < 28) return '#FF6B00';
    return '#FF003C';
  }

  formatearTiempo(segundos: number): string {
    const mins = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${mins}:${segs.toString().padStart(2, '0')}`;
  }
}
