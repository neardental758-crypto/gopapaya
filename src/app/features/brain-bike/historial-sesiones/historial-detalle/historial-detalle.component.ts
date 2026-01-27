import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  HistorialSesion,
  HistorialService,
  SesionAgrupada,
} from '../../../services/historial-sesion.service';
import { FormsModule } from '@angular/forms';
import { HistorialJuegoAdapter } from '../adapter/historial-juego.adapter';

type TabHistorial =
  | 'resumen'
  | 'preguntas'
  | 'participantes'
  | 'estadisticas'
  | 'equipos';
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
  mostrarInfoPodio = false;
  mostrarInfoParticipantes = false;

  constructor(
    private historialService: HistorialService,
    private route: ActivatedRoute,
    private router: Router,
    private juegoAdapter: HistorialJuegoAdapter,
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
          data.juego_jugado,
        );
        this.participantesAdaptados =
          this.juegoAdapter.adaptarParticipantesBiketona(data);

        if (data.juego_jugado === 'VR') {
          this.participantesAdaptados = this.participantesAdaptados.map(
            (p: any, index: number) => ({
              ...p,
              posicionGeneral: index + 1,
              totalParticipantesGeneral: this.participantesAdaptados.length,
            }),
          );
        } else if (data.juego_jugado === 'Hit-Fit') {
          this.participantesAdaptados = this.participantesAdaptados
            .sort(
              (a: any, b: any) =>
                (b.puntosObtenidos || 0) - (a.puntosObtenidos || 0),
            )
            .map((p: any, index: number) => ({
              ...p,
              posicionGeneral: index + 1,
              totalParticipantesGeneral: this.participantesAdaptados.length,
            }));
        } else if (data.juego_jugado === 'Bicilicuadora') {
          this.participantesAdaptados = this.participantesAdaptados
            .sort((a: any, b: any) => {
              return (b.puntosCarrera || 0) - (a.puntosCarrera || 0);
            })
            .map((p: any, index: number) => ({
              ...p,
              posicionGeneral: index + 1,
              totalParticipantesGeneral: this.participantesAdaptados.length,
            }));
        } else if (data.juego_jugado === 'Biketona Campeonato') {
          this.participantesAdaptados = this.participantesAdaptados
            .sort((a: any, b: any) => {
              if (b.rondaMaximaAlcanzada !== a.rondaMaximaAlcanzada) {
                return b.rondaMaximaAlcanzada - a.rondaMaximaAlcanzada;
              }
              const tiempoA = a.mejorTiempo || 0;
              const tiempoB = b.mejorTiempo || 0;
              return tiempoA - tiempoB;
            })
            .map((p: any, index: number) => ({
              ...p,
              posicionGeneral: index + 1,
              totalParticipantesGeneral: this.participantesAdaptados.length,
            }));
        } else if (data.juego_jugado.includes('Biketona')) {
          this.participantesAdaptados = this.participantesAdaptados
            .sort((a: any, b: any) => {
              return (a.mejorTiempo || 0) - (b.mejorTiempo || 0);
            })
            .map((p: any, index: number) => ({
              ...p,
              posicionGeneral: index + 1,
              totalParticipantesGeneral: this.participantesAdaptados.length,
            }));
        } else {
          this.participantesAdaptados = this.participantesAdaptados
            .sort((a: any, b: any) => {
              return (b.puntosCarrera || 0) - (a.puntosCarrera || 0);
            })
            .map((p: any, index: number) => ({
              ...p,
              posicionGeneral: index + 1,
              totalParticipantesGeneral: this.participantesAdaptados.length,
            }));
        }

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
      this.historial?.juego_jugado || '',
    );
  }

  formatearPuntos(puntos: number): string {
    if (this.historial?.juego_jugado === 'VR') {
      return this.formatearTiempo(puntos);
    }

    if (
      this.historial?.juego_jugado === 'Hit-Fit' ||
      this.historial?.juego_jugado === 'Bicilicuadora'
    ) {
      return puntos ? puntos.toString() + ' pts' : '0 pts';
    }

    if (puntos >= 3600) {
      const horas = Math.floor(puntos / 3600);
      const minutos = Math.floor((puntos % 3600) / 60);
      const segundos = Math.floor(puntos % 60);
      return `${horas}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
    } else if (puntos >= 60) {
      const minutos = Math.floor(puntos / 60);
      const segundos = Math.floor(puntos % 60);
      return `${minutos}:${segundos.toString().padStart(2, '0')}`;
    }
    return `${puntos.toFixed(2)}s`;
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

  formatearTiempoTorneo(segundos: number): string {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  esBiketonaCampeonato(): boolean {
    return this.historial?.juego_jugado === 'Biketona Campeonato';
  }
  esBiketonaEquipos(): boolean {
    return this.historial?.juego_jugado === 'Biketona Equipos';
  }

  getEquiposRanking(): any[] {
    if (!this.historial) return [];
    return this.juegoAdapter.getEquiposRanking(this.historial);
  }

  getColorEquipo(equipoId: number): string {
    if (!this.historial) return '#22c55e';
    return this.juegoAdapter.getColorEquipo(equipoId, this.historial);
  }

  volver(): void {
    this.router.navigate(['/historial']);
  }

  getRankingParaPodio(): any[] {
    if (
      !this.participantesAdaptados ||
      this.participantesAdaptados.length === 0
    ) {
      return [];
    }

    return this.participantesAdaptados.map((p: any) => {
      let puntosParaMostrar = 0;

      if (this.historial?.juego_jugado === 'VR') {
        puntosParaMostrar = p.tiempoParticipacion || 0;
      } else if (this.historial?.juego_jugado === 'Hit-Fit') {
        puntosParaMostrar = p.puntosObtenidos || 0;
      } else if (this.historial?.juego_jugado === 'Bicilicuadora') {
        puntosParaMostrar = p.puntosTotales || 0;
      } else {
        puntosParaMostrar = p.puntosCarrera || p.mejorTiempo || 0;
      }

      return {
        ...p,
        puntosCarrera: puntosParaMostrar,
        puntos: puntosParaMostrar,
      };
    });
  }

  toggleInfoPodio(): void {
    this.mostrarInfoPodio = !this.mostrarInfoPodio;
  }

  toggleInfoParticipantes(): void {
    this.mostrarInfoParticipantes = !this.mostrarInfoParticipantes;
  }

  esjuegosinEstadisticas(): boolean {
    return (
      this.historial?.juego_jugado === 'VR' ||
      this.historial?.juego_jugado === 'Hit-Fit' ||
      this.historial?.juego_jugado === 'BiciPaseo'
    );
  }

  esBiciPaseo(): boolean {
    return this.historial?.juego_jugado === 'BiciPaseo';
  }

  formatearTipoVehiculo(tipo: string): string {
    const tipos: any = {
      patineta: '🛹 Patineta',
      'patineta-electrica': '🛹 Patineta',
      bicicletaMecanica: '🚲 Bici Mecánica',
      'bicicleta-mecanica': '🚲 Bici Mecánica',
      bicicletaElectrica: '🚴 Bici Eléctrica',
      'bicicleta-electrica': '🚴 Bici Eléctrica',
    };
    return tipos[tipo] || '🚲 ' + tipo;
  }

  getParticipantesPorEquipo(equipoId: number): any[] {
    return this.participantesAdaptados.filter((p) => p.equipoId === equipoId);
  }
}
