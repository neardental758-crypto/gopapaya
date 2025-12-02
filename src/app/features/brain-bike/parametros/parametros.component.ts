import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SesionService } from '../../services/sesion.service';
import {
  BrainBikeService,
  BrainBikeConfig,
} from '../../services/brain-bike.service';
import { TematicaService } from '../../services/tematica.service';
import { AuthService } from '../../../core/services/auth.service';
import { BrainBikeAudioService } from '../../services/audio/brain-bike-audio.service';

interface VelocidadPreset {
  nombre: string;
  video: number;
  trivia: number;
}

@Component({
  selector: 'app-brain-bike-parametros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parametros.component.html',
})
export class BrainBikeParametrosComponent implements OnInit {
  paso = 1;
  tematicas: any[] = [];
  tematicaSeleccionada: any = null;
  contenidoSeleccionado: any = null;
  numeroBicicletas = 2;
  velocidadPresetSeleccionado = 1;
  velocidadPresets: VelocidadPreset[] = [
    { nombre: 'Principiante', video: 8, trivia: 12 },
    { nombre: 'Intermedio', video: 10, trivia: 15 },
    { nombre: 'Avanzado', video: 12, trivia: 18 },
  ];
  loading = false;
  errorMessage = '';

  constructor(
    private sesionService: SesionService,
    private brainBikeService: BrainBikeService,
    private tematicaService: TematicaService,
    private router: Router,
    private authService: AuthService,
    private audioService: BrainBikeAudioService
  ) {}

  ngOnInit(): void {
    this.audioService.iniciarMusicaFondo('parametros');

    const sesion = this.sesionService.getSesionSeleccionada();

    if (!sesion) {
      this.router.navigate(['/home']);
      return;
    }

    if (sesion.parametros_juego) {
      const parametros =
        typeof sesion.parametros_juego === 'string'
          ? JSON.parse(sesion.parametros_juego)
          : sesion.parametros_juego;

      if (parametros.tematica_id && parametros.contenido_id) {
        this.cargarParametrosPreconfigurados(parametros);
        return;
      }
    }

    this.cargarTematicas();
  }

  ngOnDestroy(): void {
    this.audioService.detenerMusicaFondo();
  }

  cargarParametrosPreconfigurados(parametros: any): void {
    this.loading = true;

    this.tematicaService.getTematica(parametros.tematica_id).subscribe({
      next: (tematica) => {
        this.tematicaSeleccionada = tematica;

        const contenido = tematica.contenidos?.find(
          (c: any) => c._id === parametros.contenido_id
        );

        if (contenido) {
          this.contenidoSeleccionado = contenido;
          this.paso = 3;
          this.loading = false;
        } else {
          this.router.navigate(['/home']);
        }
      },
      error: () => {
        this.router.navigate(['/home']);
      },
    });
  }

  cargarTematicas(): void {
    this.loading = true;
    this.tematicaService.getTematicas().subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          this.tematicas = data.filter((t: any) => t.tematica_activa);
        } else {
          console.error('La respuesta no es un array:', data);
          this.tematicas = [];
          this.errorMessage = 'Error al cargar temáticas';
        }

        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar temáticas', error);
        this.errorMessage = 'No se pudieron cargar las temáticas';
        this.loading = false;
      },
    });
  }

  seleccionarTematica(tematica: any): void {
    if (!tematica.contenidos || tematica.contenidos.length === 0) {
      this.errorMessage = 'Esta temática no tiene contenidos disponibles';
      return;
    }

    this.tematicaSeleccionada = tematica;
    this.contenidoSeleccionado = null;
    this.paso = 2;
  }

  seleccionarContenido(contenido: any): void {
    this.contenidoSeleccionado = contenido;
    this.paso = 3;
  }

  guardarConfiguracion(): void {
    const sesion = this.sesionService.getSesionSeleccionada();
    if (!sesion) {
      this.errorMessage = 'No hay sesión activa';
      return;
    }

    const sesionData = (sesion as any).data || sesion;

    if (!sesionData.id) {
      this.errorMessage = 'La sesión no tiene ID';
      console.error('❌ [PARAMETROS] Sesión sin ID:', sesionData);
      return;
    }

    const preset = this.velocidadPresets[this.velocidadPresetSeleccionado];

    const config: BrainBikeConfig = {
      idSesion: sesionData.id,
      contenido_id: this.contenidoSeleccionado._id,
      urlVideo: this.contenidoSeleccionado.link_video || '',
      numeroBicicletas: this.numeroBicicletas,
      velocidadMinimaVideo: preset.video,
      velocidadMinimaTrivia: preset.trivia,
      numeroPreguntas: this.contenidoSeleccionado.preguntas?.length || 5,
      tipoCompetencia: 'individual',
    };

    this.loading = true;
    this.brainBikeService.createConfig(config).subscribe({
      next: (nuevaConfig) => {
        this.brainBikeService.setConfigActual(nuevaConfig);
        this.loading = false;
        this.router.navigate(['/brain-bike/registro']);
      },
      error: (error) => {
        this.loading = false;
        console.error('❌ [PARAMETROS] Error creando config:', error);
        this.errorMessage =
          error.error?.message || 'Error al guardar configuración';
      },
    });
  }
  isSuperAdmin(): boolean {
    const usuario = this.authService.getUsuario();
    return usuario?.rol === 'super_admin';
  }

  cambiarPaso(nuevoPaso: number): void {
    this.paso = nuevoPaso;
  }

  getNumeroContenidos(tematica: any): number {
    if (!tematica.contenidos) return 0;
    return Array.isArray(tematica.contenidos) ? tematica.contenidos.length : 0;
  }

  getNumeroPreguntas(tematica: any): number {
    if (!tematica.contenidos || !Array.isArray(tematica.contenidos)) return 0;

    let total = 0;
    tematica.contenidos.forEach((contenido: any) => {
      if (contenido.preguntas && Array.isArray(contenido.preguntas)) {
        total += contenido.preguntas.length;
      }
    });
    return total;
  }

  getNumeroPreguntasContenido(contenido: any): number {
    if (!contenido.preguntas || !Array.isArray(contenido.preguntas)) {
      return contenido.num_preguntas || 0;
    }
    return contenido.preguntas.length;
  }

  volver(): void {
    this.router.navigate(['/sesion/seleccionar-juego']);
  }
}
