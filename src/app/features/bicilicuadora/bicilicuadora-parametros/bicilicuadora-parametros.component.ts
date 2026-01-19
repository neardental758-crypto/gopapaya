import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  Bebida,
  BebidasService,
} from '../../services/bicilicuadora/bebidas.service';
import {
  ConfiguracionBicicleta,
  BicilicuadoraConfigService,
  BicilicuadoraConfig,
} from '../../services/bicilicuadora/bicilicuadora-config.service';
import { SesionService } from '../../services/sesion.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ParticipanteBicilicuadoraService } from '../../services/bicilicuadora/participante-bicilicuadora.service';

@Component({
  selector: 'app-bicilicuadora-parametros',
  templateUrl: './bicilicuadora-parametros.component.html',
  imports: [CommonModule, FormsModule],
})
export class BicilicuadoraParametrosComponent implements OnInit {
  numeroBicicletas = 0;
  totalParticipantes = 0;
  bebidasDisponibles: Bebida[] = [];
  loading = false;
  errorMessage = '';

  constructor(
    private sesionService: SesionService,
    private bebidasService: BebidasService,
    private bicilicuadoraConfigService: BicilicuadoraConfigService,
    private router: Router,
    private participanteService: ParticipanteBicilicuadoraService
  ) {}

  ngOnInit(): void {
    const sesion = this.sesionService.getSesionSeleccionada();

    if (!sesion) {
      this.router.navigate(['/home']);
      return;
    }

    const parametrosJuego = sesion.parametros_juego;
    if (parametrosJuego) {
      let params: any;
      if (typeof parametrosJuego === 'string') {
        try {
          params = JSON.parse(parametrosJuego);
        } catch (e) {
          console.error('Error parseando parametros_juego');
        }
      } else {
        params = parametrosJuego;
      }

      if (params) {
        this.numeroBicicletas = params.numero_bicicletas || 0;
        this.totalParticipantes = params.numero_participantes || 0;

        if (
          params.bebidas_disponibles &&
          params.bebidas_disponibles.length > 0
        ) {
          this.cargarBebidas(params.bebidas_disponibles);
        }
      }
    }

    this.verificarSiYaCompletaron();
  }

  verificarSiYaCompletaron(): void {
    const sesion = this.sesionService.getSesionSeleccionada();
    const sesionData = (sesion as any).data || sesion;

    if (!sesionData.id) return;

    this.bicilicuadoraConfigService.getConfigBySesion(sesionData.id).subscribe({
      next: (config: any) => {
        if (config && config.id) {
          this.participanteService.getByBicilicuadora(config.id).subscribe({
            next: (participantes) => {
              if (participantes.length >= this.totalParticipantes) {
                this.bicilicuadoraConfigService.setConfigActual(config);
                this.router.navigate(['/bicilicuadora/juego']);
              }
            },
            error: () => {},
          });
        }
      },
      error: () => {},
    });
  }
  cargarBebidas(bebidaIds: string[]): void {
    this.loading = true;
    this.bebidasService.getAllBebidas().subscribe({
      next: (todasLasBebidas) => {
        this.bebidasDisponibles = todasLasBebidas.filter((b) =>
          bebidaIds.includes(b._id)
        );
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar bebidas:', error);
        this.errorMessage = 'No se pudieron cargar las bebidas';
        this.loading = false;
      },
    });
  }

  continuar(): void {
    const sesion = this.sesionService.getSesionSeleccionada();
    if (!sesion) {
      this.errorMessage = 'No hay sesión activa';
      return;
    }

    const sesionData = (sesion as any).data || sesion;

    if (!sesionData.id) {
      this.errorMessage = 'La sesión no tiene ID';
      return;
    }

    const config: BicilicuadoraConfig = {
      idSesion: sesionData.id,
      numeroBicicletas: this.numeroBicicletas,
      configuracionBicicletas: [],
      estado: 'configurando',
    };

    this.loading = true;
    this.bicilicuadoraConfigService.createConfig(config).subscribe({
      next: (nuevaConfig: any) => {
        this.bicilicuadoraConfigService.setConfigActual(nuevaConfig);
        this.loading = false;
        this.router.navigate(['/bicilicuadora/conexion']);
      },
      error: (error: { error: { message: string } }) => {
        this.loading = false;
        this.errorMessage =
          error.error?.message || 'Error al guardar configuración';
      },
    });
  }

  volver(): void {
    this.router.navigate(['/home']);
  }
}
