import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ParticipanteBiciPaseo,
  ParticipanteBiciPaseoService,
} from '../../services/bici-paseo/participante-bici-paseo.service';
import { HistorialService } from '../../services/historial-sesion.service';
import { SesionService } from '../../services/sesion.service';

@Component({
  selector: 'app-bici-paseo-registro',
  templateUrl: './bici-paseo-registro.component.html',
  imports: [CommonModule, FormsModule],
})
export class BiciPaseoRegistroComponent implements OnInit {
  sesion: any = null;
  logoEmpresa: string | null = null;
  parametrosJuego: any = null;

  participantes: ParticipanteBiciPaseo[] = [];
  nuevoParticipante: ParticipanteBiciPaseo = {
    idSesion: 0,
    nombreParticipante: '',
    apellidoParticipante: '',
    sexo: 'M',
    documento: '',
    tipoVehiculo: '',
  };

  vehiculosDisponibles: {
    tipo: string;
    nombre: string;
    cantidad: number;
    disponibles: number;
  }[] = [];
  totalParticipantesRegistrados = 0;
  loading = false;
  errorMessage = '';

  ruta: string = '';
  distancia: string = '';

  constructor(
    private participanteBiciPaseoService: ParticipanteBiciPaseoService,
    private sesionService: SesionService,
    private router: Router,
    private historialService: HistorialService,
  ) {}

  ngOnInit(): void {
    this.sesion = this.sesionService.getSesionSeleccionada();

    if (!this.sesion) {
      this.router.navigate(['/home']);
      return;
    }

    if (this.sesion?.empresa?.logo) {
      this.logoEmpresa = this.sesion.empresa.logo;
    } else if (this.sesion?.logoCliente) {
      this.logoEmpresa = this.sesion.logoCliente;
    }

    this.nuevoParticipante.idSesion = this.sesion.id;

    this.cargarParametrosJuego();
    this.cargarParticipantesExistentes();
  }

  cargarParametrosJuego(): void {
    const parametrosJuego = this.sesion.parametros_juego;

    if (typeof parametrosJuego === 'string') {
      try {
        this.parametrosJuego = JSON.parse(parametrosJuego);
      } catch (e) {
        console.error('Error parseando parametros_juego');
      }
    } else {
      this.parametrosJuego = parametrosJuego;
    }

    if (this.parametrosJuego) {
      this.ruta = this.parametrosJuego.ruta || '';
      this.distancia = this.parametrosJuego.distancia || '';

      if (
        this.parametrosJuego.vehiculos &&
        Array.isArray(this.parametrosJuego.vehiculos)
      ) {
        this.vehiculosDisponibles = this.parametrosJuego.vehiculos.map(
          (v: any) => ({
            tipo: v.tipo,
            nombre: this.getNombreTipoVehiculo(v.tipo),
            cantidad: v.cantidad,
            disponibles: v.cantidad,
          }),
        );
      }
    }
  }

  cargarParticipantesExistentes(): void {
    this.participanteBiciPaseoService.getBySesion(this.sesion.id).subscribe({
      next: (participantes) => {
        this.participantes = participantes;
        this.totalParticipantesRegistrados = participantes.length;
        this.actualizarVehiculosDisponibles();
      },
      error: () => {
        this.totalParticipantesRegistrados = 0;
      },
    });
  }

  actualizarVehiculosDisponibles(): void {
    this.vehiculosDisponibles.forEach((vehiculo) => {
      const usados = this.participantes.filter(
        (p) => p.tipoVehiculo === vehiculo.tipo,
      ).length;
      vehiculo.disponibles = vehiculo.cantidad - usados;
    });
  }

  getNombreTipoVehiculo(tipoId: string): string {
    const tipos: { [key: string]: string } = {
      'patineta-electrica': 'Patineta Eléctrica',
      'bicicleta-mecanica': 'Bicicleta Mecánica',
      'bicicleta-electrica': 'Bicicleta Eléctrica',
    };
    return tipos[tipoId] || tipoId;
  }

  isFormValid(): boolean {
    return (
      this.nuevoParticipante.nombreParticipante.trim() !== '' &&
      this.nuevoParticipante.apellidoParticipante.trim() !== '' &&
      this.nuevoParticipante.tipoVehiculo !== '' &&
      (this.nuevoParticipante.sexo === 'M' ||
        this.nuevoParticipante.sexo === 'F')
    );
  }

  agregarParticipante(): void {
    if (!this.isFormValid()) {
      this.errorMessage = 'Por favor completa todos los campos obligatorios';
      return;
    }

    const vehiculo = this.vehiculosDisponibles.find(
      (v) => v.tipo === this.nuevoParticipante.tipoVehiculo,
    );
    if (vehiculo && vehiculo.disponibles <= 0) {
      this.errorMessage = `No hay ${vehiculo.nombre} disponibles`;
      return;
    }

    this.participantes.push({ ...this.nuevoParticipante });
    this.actualizarVehiculosDisponibles();

    this.nuevoParticipante = {
      idSesion: this.sesion.id,
      nombreParticipante: '',
      apellidoParticipante: '',
      sexo: 'M',
      documento: '',
      tipoVehiculo: '',
    };
    this.errorMessage = '';
  }

  eliminarParticipante(index: number): void {
    this.participantes.splice(index, 1);
    this.actualizarVehiculosDisponibles();
  }

  registrarTodosParticipantes(): void {
    if (this.participantes.length === 0) {
      this.errorMessage = 'Debe agregar al menos un participante';
      return;
    }

    if (
      confirm(
        `¿Registrar ${this.participantes.length} participantes para BiciPaseo?`,
      )
    ) {
      this.loading = true;
      this.errorMessage = '';

      this.participanteBiciPaseoService
        .createBatch(this.participantes)
        .subscribe({
          next: () => {
            this.loading = false;
            this.crearHistorial();
            localStorage.setItem('bici_paseo_iniciado', 'true');
            this.router.navigate(['/bici-paseo/juego']);
          },
          error: (error) => {
            console.error('Error registrando participantes:', error);
            this.loading = false;
            this.errorMessage = 'Error al registrar participantes';
          },
        });
    }
  }

  crearHistorial(): void {
    const fechaInicio = new Date();
    const historial = {
      sesion_id: this.sesion.id,
      juego_jugado: 'BiciPaseo',
      fecha_inicio: fechaInicio.toISOString(),
      fecha_fin: new Date().toISOString(),
      duracion_minutos: 0,
      participantes_data: this.participantes,
      ranking_final: [],
      estadisticas_generales: {
        totalParticipantes: this.participantes.length,
        ruta: this.ruta,
        distancia: this.distancia,
      },
      parametros_utilizados: this.sesion.parametros_juego,
    };

    this.historialService.crearHistorial(historial).subscribe({
      next: (response) => {
        localStorage.setItem('historial_bici_paseo_id', response.id.toString());
      },
      error: (error) => {
        console.error('Error al crear historial:', error);
      },
    });
  }

  confirmarEliminar(index: number, participante: ParticipanteBiciPaseo): void {
    const nombre = `${participante.nombreParticipante} ${participante.apellidoParticipante}`;
    if (confirm(`¿Estás seguro de eliminar a ${nombre} de la lista?`)) {
      this.eliminarParticipante(index);
    }
  }

  editarParticipante(index: number): void {
    const participante = this.participantes[index];
    this.nuevoParticipante = { ...participante };
    this.participantes.splice(index, 1);
    this.actualizarVehiculosDisponibles();
    this.errorMessage = '';
  }

  getIconoVehiculo(tipoId: string): string {
    const iconos: { [key: string]: string } = {
      'patineta-electrica': 'assets/images/icono_scooter.png',
      'bicicleta-mecanica': 'assets/images/icono_bicicleta_mecanica.png',
      'bicicleta-electrica': 'assets/images/icono_bicicleta_electrica.png',
    };
    return iconos[tipoId] || 'assets/images/icono_bicicleta_mecanica.png';
  }

  vehiculoCompleto(vehiculo: any): boolean {
    return vehiculo.disponibles === 0;
  }

  getIconoVehiculoTexto(tipoId: string): string {
    const nombres: { [key: string]: string } = {
      'patineta-electrica': '🛴',
      'bicicleta-mecanica': '🚲',
      'bicicleta-electrica': '🚴‍♂️⚡',
    };
    return nombres[tipoId] || '🚲';
  }

  vehiculoSeleccionadoSinCupos(): boolean {
    if (!this.nuevoParticipante.tipoVehiculo) return false;
    const vehiculo = this.vehiculosDisponibles.find(
      (v) => v.tipo === this.nuevoParticipante.tipoVehiculo,
    );
    return vehiculo ? vehiculo.disponibles === 0 : false;
  }

  volver(): void {
    this.router.navigate(['/home']);
  }
}
