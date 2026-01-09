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

@Component({
  selector: 'app-bicilicuadora-parametros',
  templateUrl: './bicilicuadora-parametros.component.html',
  imports: [CommonModule, FormsModule],
})
export class BicilicuadoraParametrosComponent implements OnInit {
  numeroBicicletas = 1;
  configuracionBicicletas: ConfiguracionBicicleta[] = [];
  bebidasDisponibles: Bebida[] = [];
  loading = false;
  errorMessage = '';
  bicicletaExpandida: number | null = 0;

  constructor(
    private sesionService: SesionService,
    private bebidasService: BebidasService,
    private bicilicuadoraConfigService: BicilicuadoraConfigService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const sesion = this.sesionService.getSesionSeleccionada();

    if (!sesion) {
      this.router.navigate(['/home']);
      return;
    }

    this.cargarBebidas();
    this.inicializarBicicletas();
  }

  cargarBebidas(): void {
    this.loading = true;
    this.bebidasService.getAllBebidas().subscribe({
      next: (bebidas) => {
        this.bebidasDisponibles = bebidas;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar bebidas:', error);
        this.errorMessage = 'No se pudieron cargar las bebidas';
        this.loading = false;
      },
    });
  }

  cambiarNumeroBicicletas(cambio: number): void {
    const nuevo = this.numeroBicicletas + cambio;
    if (nuevo >= 1 && nuevo <= 4) {
      this.numeroBicicletas = nuevo;
      this.inicializarBicicletas();
    }
  }

  inicializarBicicletas(): void {
    const bicicletasAnteriores = this.configuracionBicicletas.length;
    this.configuracionBicicletas = [];
    for (let i = 1; i <= this.numeroBicicletas; i++) {
      this.configuracionBicicletas.push({
        numeroBicicleta: i,
        participantes: 1,
        bebidasSeleccionadas: [],
      });
    }
    if (this.numeroBicicletas > 0) {
      this.bicicletaExpandida = 0;
    }

    this.configuracionBicicletas = [];
    for (let i = 1; i <= this.numeroBicicletas; i++) {
      this.configuracionBicicletas.push({
        numeroBicicleta: i,
        participantes: 1,
        bebidasSeleccionadas: [],
      });
    }
  }

  cambiarParticipantes(indiceBicicleta: number, cambio: number): void {
    const bicicleta = this.configuracionBicicletas[indiceBicicleta];
    const nuevo = bicicleta.participantes + cambio;
    if (nuevo >= 1 && nuevo <= 4) {
      bicicleta.participantes = nuevo;
    }
  }

  agregarBebidaABicicleta(indiceBicicleta: number, bebida: Bebida): void {
    const bicicleta = this.configuracionBicicletas[indiceBicicleta];

    const bebidaExistente = bicicleta.bebidasSeleccionadas.find(
      (b) => b.bebidaId === bebida._id
    );

    if (bebidaExistente) {
      bebidaExistente.cantidad++;
    } else {
      bicicleta.bebidasSeleccionadas.push({
        bebidaId: bebida._id,
        nombreBebida: bebida.nombre_bebida,
        cantidad: 1,
      });
    }
  }

  eliminarBebidaDeBicicleta(
    indiceBicicleta: number,
    indiceBebida: number
  ): void {
    this.configuracionBicicletas[indiceBicicleta].bebidasSeleccionadas.splice(
      indiceBebida,
      1
    );
  }

  cambiarCantidadBebida(
    indiceBicicleta: number,
    indiceBebida: number,
    cambio: number
  ): void {
    const bebida =
      this.configuracionBicicletas[indiceBicicleta].bebidasSeleccionadas[
        indiceBebida
      ];
    const nuevo = bebida.cantidad + cambio;
    if (nuevo >= 1) {
      bebida.cantidad = nuevo;
    }
  }

  calcularIngredientesNecesarios(): any[] {
    const ingredientesTotales: {
      [key: string]: { nombre: string; cantidad_total: number; unidad: string };
    } = {};

    this.configuracionBicicletas.forEach((bicicleta) => {
      bicicleta.bebidasSeleccionadas.forEach((bebidaSeleccionada) => {
        const bebida = this.bebidasDisponibles.find(
          (b) => b._id === bebidaSeleccionada.bebidaId
        );
        if (bebida && bebida.ingredientes) {
          const cantidadTotal =
            bebidaSeleccionada.cantidad * bicicleta.participantes;

          bebida.ingredientes.forEach((ingrediente) => {
            const key = ingrediente.nombre_ingrediente;

            if (!ingredientesTotales[key]) {
              ingredientesTotales[key] = {
                nombre: ingrediente.nombre_ingrediente,
                cantidad_total: 0,
                unidad: ingrediente.cantidad,
              };
            }

            ingredientesTotales[key].cantidad_total += cantidadTotal;
          });
        }
      });
    });

    return Object.values(ingredientesTotales);
  }

  calcularTotales(): any {
    const totalParticipantes = this.configuracionBicicletas.reduce(
      (sum, b) => sum + b.participantes,
      0
    );
    const bebidasUnicas = new Set(
      this.configuracionBicicletas.flatMap((b) =>
        b.bebidasSeleccionadas.map((bs) => bs.bebidaId)
      )
    );
    const totalBebidas = this.configuracionBicicletas.reduce(
      (sum, b) =>
        sum +
        b.bebidasSeleccionadas.reduce(
          (s, bs) => s + bs.cantidad * b.participantes,
          0
        ),
      0
    );

    return {
      participantes: totalParticipantes,
      bebidasUnicas: bebidasUnicas.size,
      totalBebidas: totalBebidas,
    };
  }

  isFormValid(): boolean {
    if (this.numeroBicicletas < 1) return false;

    for (const bici of this.configuracionBicicletas) {
      if (bici.bebidasSeleccionadas.length === 0) {
        return false;
      }
    }

    return true;
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
      return;
    }

    const bicicletasSinBebidas = this.configuracionBicicletas.filter(
      (b) => b.bebidasSeleccionadas.length === 0
    );

    if (bicicletasSinBebidas.length > 0) {
      this.errorMessage = `Falta asignar bebidas a la(s) bicicleta(s): ${bicicletasSinBebidas
        .map((b) => b.numeroBicicleta)
        .join(', ')}`;
      return;
    }

    const config: BicilicuadoraConfig = {
      idSesion: sesionData.id,
      numeroBicicletas: this.numeroBicicletas,
      configuracionBicicletas: this.configuracionBicicletas,
      estado: 'configurando',
    };

    this.loading = true;
    this.bicilicuadoraConfigService.createConfig(config).subscribe({
      next: (nuevaConfig: any) => {
        this.bicilicuadoraConfigService.setConfigActual(nuevaConfig);
        this.loading = false;
        this.router.navigate(['/bicilicuadora/registro']);
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
  onBebidaSeleccionada(indiceBicicleta: number, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const bebidaId = select.value;

    if (bebidaId) {
      const bebida = this.bebidasDisponibles.find((b) => b._id === bebidaId);
      if (bebida) {
        this.agregarBebidaABicicleta(indiceBicicleta, bebida);
      }
      select.value = '';
    }
  }
  calcularTotalBebidasBicicleta(bicicleta: ConfiguracionBicicleta): number {
    return bicicleta.bebidasSeleccionadas.reduce(
      (acc, b) => acc + b.cantidad * bicicleta.participantes,
      0
    );
  }

  toggleBicicleta(index: number): void {
    this.bicicletaExpandida = this.bicicletaExpandida === index ? null : index;
  }

  isBicicletaExpandida(index: number): boolean {
    return this.bicicletaExpandida === index;
  }
  getBebidaCompleta(bebidaId: string): Bebida | undefined {
    return this.bebidasDisponibles.find((b) => b._id === bebidaId);
  }
}
