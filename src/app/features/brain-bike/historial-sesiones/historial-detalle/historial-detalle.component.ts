import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  HistorialSesion,
  HistorialService,
} from '../../../services/historial-sesion.service';
import { FormsModule } from '@angular/forms';
import { HistorialJuegoAdapter } from '../adapter/historial-juego.adapter';

type TabHistorial = 'resumen' | 'preguntas' | 'participantes' | 'estadisticas';
@Component({
  selector: 'app-historial-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historial-detalle.component.html',
})
export class HistorialDetalleComponent implements OnInit {
  historial: HistorialSesion | null = null;
  cargando = true;
  tabActiva: TabHistorial = 'resumen';
  configuracionJuego: any;
  estadisticasResumen: any;
  participantesAdaptados: any[] = [];

  Math = Math;
  Number = Number;

  constructor(
    private historialService: HistorialService,
    private route: ActivatedRoute,
    private router: Router,
    private juegoAdapter: HistorialJuegoAdapter
  ) {
    this.tabActiva = 'resumen';
  }

  ngOnInit(): void {
    this.tabActiva = 'resumen';
    const id = this.route.snapshot.params['id'];
    this.cargarDetalle(id);
  }

  cargarDetalle(id: number): void {
    this.cargando = true;
    this.historialService.getHistorialDetalle(id).subscribe({
      next: (data) => {
        this.historial = data;
        this.configuracionJuego = this.juegoAdapter.getConfiguracionJuego(
          data.juego_jugado
        );
        this.participantesAdaptados =
          this.juegoAdapter.adaptarParticipantesBiketona(data);
        this.estadisticasResumen =
          this.juegoAdapter.getEstadisticasResumen(data);

        if (!this.configuracionJuego.tabs.includes(this.tabActiva)) {
          this.tabActiva = 'resumen';
        }

        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar detalle:', error);
        this.cargando = false;
        this.router.navigate(['/historial']);
      },
    });
  }
  cambiarTab(tab: TabHistorial): void {
    this.tabActiva = tab;
  }

  tieneTab(tab: string): boolean {
    return this.configuracionJuego?.tabs.includes(tab);
  }

  getRankingLabel(): string {
    return this.juegoAdapter.getRankingLabel(
      this.historial?.juego_jugado || ''
    );
  }

  formatearPuntos(puntos: number): string {
    return this.juegoAdapter.formatearPuntos(
      puntos,
      this.historial?.juego_jugado || ''
    );
  }

  formatearDuracion(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return horas > 0 ? `${horas}h ${mins}m` : `${mins}m`;
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatearTiempo(segundos: number): string {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatearHora(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  getIconoEvento(tipo: string): string {
    const iconos: { [key: string]: string } = {
      carrera_iniciada: '🏁',
      video_iniciado: '📺',
      video_finalizado: '✅',
      pregunta_iniciada: '❓',
      respuesta_correcta: '✅',
      respuesta_incorrecta: '❌',
      tiempo_agotado: '⏰',
      bono_velocidad_promedio: '🚴',
      bono_velocidad_maxima_sesion: '🏆',
      reto_velocidad_30: '🚀',
      bono_color: '🎯',
      carrera_finalizada: '🏆',
    };
    return iconos[tipo] || '📌';
  }

  getColorEvento(tipo: string): string {
    const colores: { [key: string]: string } = {
      carrera_iniciada: 'border-neon-blue',
      video_iniciado: 'border-neon-yellow',
      video_finalizado: 'border-neon-green',
      pregunta_iniciada: 'border-white',
      respuesta_correcta: 'border-neon-green',
      respuesta_incorrecta: 'border-neon-red',
      tiempo_agotado: 'border-neon-orange',
      carrera_finalizada: 'border-neon-yellow',
    };
    return colores[tipo] || 'border-gray-500';
  }

  formatearDecimal(valor: number | string): string {
    return Number(valor || 0).toFixed(2);
  }

  getMedalEmoji(posicion: number): string {
    const medals: { [key: number]: string } = { 1: '🥇', 2: '🥈', 3: '🥉' };
    return medals[posicion] || `${posicion}º`;
  }

  getPorcentajeAcierto(): number {
    if (!this.historial?.estadisticas_generales) return 0;
    const correctas =
      this.historial.estadisticas_generales.preguntasCorrectas || 0;
    const total =
      this.historial.estadisticas_generales.preguntasRespondidas || 0;
    if (total === 0) return 0;
    return Math.round((correctas / total) * 100);
  }

  getDistribucionSexo(): {
    hombres: number;
    mujeres: number;
    sinEspecificar: number;
  } {
    if (!this.participantesAdaptados?.length) {
      return { hombres: 0, mujeres: 0, sinEspecificar: 0 };
    }

    let hombres = 0;
    let mujeres = 0;
    let sinEspecificar = 0;

    this.participantesAdaptados.forEach((p) => {
      const sexo = p.sexo || p.genero;
      if (sexo === 'M' || sexo === 'masculino') {
        hombres++;
      } else if (sexo === 'F' || sexo === 'femenino') {
        mujeres++;
      } else {
        sinEspecificar++;
      }
    });

    return { hombres, mujeres, sinEspecificar };
  }

  getPorcentajeCorrectas(): number {
    const correctas = this.estadisticasResumen.respuestasCorrectas || 0;
    const incorrectas = this.estadisticasResumen.respuestasIncorrectas || 0;
    const total = correctas + incorrectas;
    if (total === 0) return 0;
    return Math.round((correctas / total) * 100);
  }

  getPorcentajeIncorrectas(): number {
    const correctas = this.estadisticasResumen.respuestasCorrectas || 0;
    const incorrectas = this.estadisticasResumen.respuestasIncorrectas || 0;
    const total = correctas + incorrectas;
    if (total === 0) return 0;
    return Math.round((incorrectas / total) * 100);
  }

  volver(): void {
    this.router.navigate(['/historial']);
  }
}
