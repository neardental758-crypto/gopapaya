import { DecimalPipe, CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ParticipanteDrBici,
  RepuestoDrBici,
  ParticipanteDrBiciService,
} from '../../services/dr-bici/participante-dr-bici.service';
import { HistorialService } from '../../services/historial-sesion.service';
import { SesionService } from '../../services/sesion.service';
import {
  CategoriaComponente,
  Componente,
  ComponenteService,
} from '../../services/dr-bici/componente.service';

@Component({
  selector: 'app-dr-bici-registro',
  templateUrl: './dr-bici-registro.component.html',
  providers: [DecimalPipe],
  imports: [CommonModule, FormsModule],
})
export class DrBiciRegistroComponent implements OnInit {
  sesion: any = null;
  participanteActual: ParticipanteDrBici = {
    idSesion: 0,
    tipoVehiculo: '',
    tiposTrabajo: [],
    repuestosUtilizados: [],
    nombreParticipante: '',
    apellidoParticipante: '',
    documento: '',
    sexo: 'M',
  };
  totalParticipantesRegistrados = 0;
  logoEmpresa: string | null = null;
  loading = false;
  errorMessage = '';

  componentes: Componente[] = [];
  categoriasComponentes: CategoriaComponente[] = [];
  categoriasExpandidas: Set<number> = new Set();
  pasoActual = 1;

  tiposVehiculo = [
    { id: 'bicicleta-mecanica', nombre: 'Bicicleta Mecánica', icono: '🚴' },
    { id: 'bicicleta-electrica', nombre: 'Bicicleta Eléctrica', icono: '🚴‍♂️⚡' },
    { id: 'patineta-electrica', nombre: 'Patineta Eléctrica', icono: '🛴' },
  ];

  tiposTrabajo = [
    { id: 'alistamiento', nombre: 'Alistamiento', icono: '✅' },
    { id: 'reparacion', nombre: 'Reparación', icono: '🔧' },
    { id: 'ajustes', nombre: 'Ajustes', icono: '⚙️' },
    { id: 'diagnostico', nombre: 'Diagnóstico', icono: '🔍' },
    { id: 'limpieza', nombre: 'Limpieza', icono: '🧹' },
    { id: 'lubricacion', nombre: 'Lubricación', icono: '🛢️' },
  ];

  constructor(
    private participanteDrBiciService: ParticipanteDrBiciService,
    private sesionService: SesionService,
    private router: Router,
    private historialService: HistorialService,
    private componenteService: ComponenteService,
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

    this.participanteActual.idSesion = this.sesion.id;
    this.cargarTotalRegistrados();
    this.cargarComponentes();
  }

  siguientePaso(): void {
    if (this.isPaso1Valid()) {
      this.pasoActual = 2;
    }
  }

  pasoAnterior(): void {
    this.pasoActual = 1;
  }

  isPaso1Valid(): boolean {
    return (
      this.participanteActual.nombreParticipante.trim() !== '' &&
      this.participanteActual.apellidoParticipante.trim() !== '' &&
      (this.participanteActual.sexo === 'M' ||
        this.participanteActual.sexo === 'F') &&
      this.participanteActual.tipoVehiculo !== ''
    );
  }

  getComponentesSeleccionadosPorCategoria(categoriaId: number): number {
    if (!this.participanteActual.repuestosUtilizados) return 0;
    const componentesDeCategoria = this.getComponentesPorCategoria(categoriaId);
    return componentesDeCategoria.filter((c) =>
      this.participanteActual.repuestosUtilizados!.includes(c.id.toString()),
    ).length;
  }

  cargarComponentes(): void {
    this.componenteService.getAll().subscribe({
      next: (data) => {
        this.componentes = data.componentes;
        this.categoriasComponentes = data.categorias;
      },
      error: () => {
        this.componentes = [];
        this.categoriasComponentes = [];
      },
    });
  }

  getComponentesPorCategoria(categoriaId: number): Componente[] {
    return this.componentes.filter((c) => c.categoriaId === categoriaId);
  }

  toggleCategoria(categoriaId: number): void {
    if (this.categoriasExpandidas.has(categoriaId)) {
      this.categoriasExpandidas.delete(categoriaId);
    } else {
      this.categoriasExpandidas.add(categoriaId);
    }
  }

  isCategoriaExpandida(categoriaId: number): boolean {
    return this.categoriasExpandidas.has(categoriaId);
  }

  toggleComponente(componenteId: number): void {
    if (!this.participanteActual.repuestosUtilizados) {
      this.participanteActual.repuestosUtilizados = [];
    }
    const idStr = componenteId.toString();
    const index = this.participanteActual.repuestosUtilizados.indexOf(idStr);
    if (index > -1) {
      this.participanteActual.repuestosUtilizados.splice(index, 1);
    } else {
      this.participanteActual.repuestosUtilizados.push(idStr);
    }
  }

  isComponenteSeleccionado(componenteId: number): boolean {
    if (!this.participanteActual.repuestosUtilizados) return false;
    return this.participanteActual.repuestosUtilizados.includes(
      componenteId.toString(),
    );
  }

  toggleTrabajo(trabajoId: string): void {
    const index = this.participanteActual.tiposTrabajo.indexOf(trabajoId);
    if (index > -1) {
      this.participanteActual.tiposTrabajo.splice(index, 1);
    } else {
      this.participanteActual.tiposTrabajo.push(trabajoId);
    }
  }

  isTrabajoSeleccionado(trabajoId: string): boolean {
    return this.participanteActual.tiposTrabajo.includes(trabajoId);
  }

  cargarTotalRegistrados(): void {
    this.participanteDrBiciService.getBySesion(this.sesion.id).subscribe({
      next: (participantes) => {
        this.totalParticipantesRegistrados = participantes.length;
      },
      error: () => {
        this.totalParticipantesRegistrados = 0;
      },
    });
  }

  isFormValid(): boolean {
    return (
      this.participanteActual.nombreParticipante.trim() !== '' &&
      this.participanteActual.apellidoParticipante.trim() !== '' &&
      (this.participanteActual.sexo === 'M' ||
        this.participanteActual.sexo === 'F') &&
      this.participanteActual.tipoVehiculo !== '' &&
      this.participanteActual.tiposTrabajo.length > 0
    );
  }

  registrarParticipante(): void {
    if (!this.isFormValid()) {
      this.errorMessage = 'Por favor completa todos los campos obligatorios';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.participanteDrBiciService.create(this.participanteActual).subscribe({
      next: (response) => {
        this.loading = false;
        localStorage.setItem(
          'participante_dr_bici_actual',
          JSON.stringify(response),
        );
        this.router.navigate(['/dr-bici/juego']);
      },
      error: (error) => {
        console.error('Error registrando participante:', error);
        this.loading = false;
        this.errorMessage = 'Error al registrar participante';
      },
    });
  }

  finalizarSesionDirecto(): void {
    if (confirm('¿Deseas finalizar la sesión DrBici completa?')) {
      const historialId = localStorage.getItem('historial_dr_bici_id');

      if (!historialId) {
        this.participanteDrBiciService.getBySesion(this.sesion.id).subscribe({
          next: (participantes) => {
            const fechaInicio = new Date();
            fechaInicio.setHours(fechaInicio.getHours() - 2);

            const historial = {
              sesion_id: this.sesion.id,
              juego_jugado: 'DrBici',
              fecha_inicio: fechaInicio.toISOString(),
              fecha_fin: new Date().toISOString(),
              duracion_minutos: 0,
              participantes_data: participantes,
              ranking_final: participantes,
              estadisticas_generales: {
                totalParticipantes: participantes.length,
                tiempoTotal: participantes.reduce(
                  (acc, p) => acc + (p.tiempoParticipacion || 0),
                  0,
                ),
              },
              parametros_utilizados: this.sesion.parametros_juego,
            };

            this.historialService.crearHistorial(historial).subscribe({
              next: () => {
                this.sesionService.finalizarSesion(this.sesion.id).subscribe({
                  next: () => {
                    localStorage.removeItem('participante_dr_bici_actual');
                    localStorage.removeItem('historial_dr_bici_id');
                    this.sesionService.clearSesionSeleccionada();
                    this.router.navigate(['/home']);
                  },
                });
              },
            });
          },
        });
        return;
      }

      this.participanteDrBiciService.getBySesion(this.sesion.id).subscribe({
        next: (participantes) => {
          const historialFinal = {
            fecha_fin: new Date().toISOString(),
            participantes_data: participantes,
            ranking_final: participantes,
            estadisticas_generales: {
              totalParticipantes: participantes.length,
              tiempoTotal: participantes.reduce(
                (acc, p) => acc + (p.tiempoParticipacion || 0),
                0,
              ),
            },
          };

          this.historialService
            .actualizarHistorial(parseInt(historialId), historialFinal)
            .subscribe({
              next: () => {
                this.sesionService.finalizarSesion(this.sesion.id).subscribe({
                  next: () => {
                    localStorage.removeItem('participante_dr_bici_actual');
                    localStorage.removeItem('historial_dr_bici_id');
                    this.sesionService.clearSesionSeleccionada();
                    this.router.navigate(['/home']);
                  },
                });
              },
            });
        },
      });
    }
  }

  volver(): void {
    this.router.navigate(['/home']);
  }
}
