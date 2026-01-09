import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Bebida,
  Ingrediente,
  RitmoPedaleo,
  BebidasService,
} from '../services/bicilicuadora/bebidas.service';
import {
  DynamicFormComponent,
  FormField,
} from '../../shared/components/dynamic-form/dynamic-form.component';
import { RouterModule } from '@angular/router';
import { SafePipe } from './safeUrl/safe.pipe';

@Component({
  selector: 'app-bicilicuadora',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    SafePipe,
    DynamicFormComponent,
  ],
  templateUrl: './bicilicuadora.component.html',
})
export class BicilicuadoraComponent implements OnInit {
  bebidas: Bebida[] = [];
  selectedBebida: Bebida | null = null;
  showFormBebida = false;
  showFormIngrediente = false;
  showFormRitmo = false;
  editMode = false;

  formDataBebida: any = {
    nombre_bebida: '',
    descripcion: '',
    tiempo_pedaleo: null,
    calorias_bebida: null,
    calorias_quemar: null,
    watts_aproximados: null,
    link_video: '',
  };

  fotoSeleccionada: File | null = null;
  previewFoto: string | null = null;

  ingredienteFields: FormField[] = [
    {
      name: 'nombre_ingrediente',
      label: 'Nombre del Ingrediente',
      type: 'text' as const,
      required: true,
    },
    {
      name: 'cantidad',
      label: 'Cantidad',
      type: 'text' as const,
      required: true,
    },
    {
      name: 'orden',
      label: 'Orden',
      type: 'number' as const,
      required: false,
    },
  ];

  ritmoFields: FormField[] = [
    {
      name: 'duracion',
      label: 'Duración (segundos)',
      type: 'number' as const,
      required: true,
    },
    {
      name: 'velocidad_min',
      label: 'Velocidad Mínima (km/h)',
      type: 'number' as const,
      required: true,
    },
    {
      name: 'velocidad_max',
      label: 'Velocidad Máxima (km/h)',
      type: 'number' as const,
      required: true,
    },
    {
      name: 'orden',
      label: 'Orden',
      type: 'number' as const,
      required: false,
    },
  ];

  editModeIngrediente = false;
  editModeRitmo = false;
  ingredienteParaEditar: Ingrediente | null = null;
  ritmoParaEditar: RitmoPedaleo | null = null;
  showModalDetalle = false;
  bebidaDetalle: Bebida | null = null;

  constructor(private bebidasService: BebidasService) {}

  ngOnInit(): void {
    this.cargarBebidas();
  }

  cargarBebidas(): void {
    this.bebidasService.getAllBebidas().subscribe({
      next: (bebidas) => {
        this.bebidas = bebidas;
        if (this.selectedBebida) {
          this.selectedBebida =
            bebidas.find((b) => b._id === this.selectedBebida?._id) || null;
        }
      },
      error: (error) => {
        console.error('Error al cargar bebidas:', error);
      },
    });
  }

  selectBebida(bebida: Bebida): void {
    this.selectedBebida = bebida;
    this.showFormBebida = false;
    this.showFormIngrediente = false;
    this.showFormRitmo = false;
  }

  toggleFormBebida(bebida?: Bebida): void {
    if (bebida) {
      this.editMode = true;
      this.selectedBebida = bebida;
      this.formDataBebida = {
        nombre_bebida: bebida.nombre_bebida,
        descripcion: bebida.descripcion || '',
        tiempo_pedaleo: bebida.tiempo_pedaleo,
        calorias_bebida: bebida.calorias_bebida || null,
        calorias_quemar: bebida.calorias_quemar || null,
        watts_aproximados: bebida.watts_aproximados || null,
        link_video: bebida.link_video || '',
      };
      this.previewFoto = bebida.foto_bebida || null;
    } else {
      this.editMode = false;
      this.selectedBebida = null;
      this.formDataBebida = {
        nombre_bebida: '',
        descripcion: '',
        tiempo_pedaleo: null,
        calorias_bebida: null,
        calorias_quemar: null,
        watts_aproximados: null,
        link_video: '',
      };
      this.previewFoto = null;
    }
    this.fotoSeleccionada = null;
    this.showFormBebida = !this.showFormBebida;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.fotoSeleccionada = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewFoto = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  getVideoId(url: string): string | null {
    if (!url) return null;
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  }

  onSubmitBebida(): void {
    const bebidaData = {
      ...this.formDataBebida,
      bebida_activa: true,
    };

    if (this.editMode && this.selectedBebida) {
      this.bebidasService
        .updateBebida(
          this.selectedBebida._id,
          bebidaData,
          this.fotoSeleccionada || undefined
        )
        .subscribe({
          next: () => {
            this.cargarBebidas();
            this.cancelFormBebida();
          },
          error: (error) => {
            console.error('Error al actualizar bebida:', error);
          },
        });
    } else {
      this.bebidasService
        .createBebida(bebidaData, this.fotoSeleccionada || undefined)
        .subscribe({
          next: () => {
            this.cargarBebidas();
            this.cancelFormBebida();
          },
          error: (error) => {
            console.error('Error al crear bebida:', error);
          },
        });
    }
  }

  isFormBebidaValid(): boolean {
    return !!(
      this.formDataBebida.nombre_bebida && this.formDataBebida.tiempo_pedaleo
    );
  }

  cancelFormBebida(): void {
    this.showFormBebida = false;
    this.editMode = false;
    this.fotoSeleccionada = null;
    this.previewFoto = null;
    this.formDataBebida = {
      nombre_bebida: '',
      descripcion: '',
      tiempo_pedaleo: null,
      calorias_bebida: null,
      calorias_quemar: null,
      watts_aproximados: null,
      link_video: '',
    };
  }

  toggleFormIngrediente(ingrediente?: Ingrediente): void {
    if (ingrediente) {
      this.editModeIngrediente = true;
      this.ingredienteParaEditar = ingrediente;
      this.ingredienteFields = this.ingredienteFields.map((field) => ({
        ...field,
        value: (ingrediente as any)[field.name],
      }));
    } else {
      this.editModeIngrediente = false;
      this.ingredienteParaEditar = null;
      this.ingredienteFields = this.ingredienteFields.map((field) => ({
        ...field,
        value: undefined,
      }));
    }
    this.showFormIngrediente = !this.showFormIngrediente;
  }

  toggleFormRitmo(ritmo?: RitmoPedaleo): void {
    if (ritmo) {
      this.editModeRitmo = true;
      this.ritmoParaEditar = ritmo;
      this.ritmoFields = this.ritmoFields.map((field) => ({
        ...field,
        value: (ritmo as any)[field.name],
      }));
    } else {
      this.editModeRitmo = false;
      this.ritmoParaEditar = null;
      this.ritmoFields = this.ritmoFields.map((field) => ({
        ...field,
        value: undefined,
      }));
    }
    this.showFormRitmo = !this.showFormRitmo;
  }

  onSubmitIngrediente(data: any): void {
    if (!this.selectedBebida) return;

    if (this.editModeIngrediente && this.ingredienteParaEditar) {
      this.bebidasService
        .updateIngrediente(
          this.selectedBebida._id,
          this.ingredienteParaEditar._id,
          data
        )
        .subscribe({
          next: () => {
            this.cargarBebidas();
            this.cancelFormIngrediente();
          },
          error: (error) => {
            console.error('Error al actualizar ingrediente:', error);
          },
        });
    } else {
      this.bebidasService
        .createIngrediente(this.selectedBebida._id, data)
        .subscribe({
          next: (response: any) => {
            if (this.selectedBebida) {
              if (!this.selectedBebida.ingredientes) {
                this.selectedBebida.ingredientes = [];
              }
              this.selectedBebida.ingredientes.push(response.data);
            }
            this.cargarBebidas();
            this.cancelFormIngrediente();
          },
          error: (error) => {
            console.error('Error al crear ingrediente:', error);
          },
        });
    }
  }

  onSubmitRitmo(data: any): void {
    if (!this.selectedBebida) return;

    if (this.editModeRitmo && this.ritmoParaEditar) {
      this.bebidasService
        .updateRitmo(this.selectedBebida._id, this.ritmoParaEditar._id, data)
        .subscribe({
          next: () => {
            this.cargarBebidas();
            this.cancelFormRitmo();
          },
          error: (error) => {
            console.error('Error al actualizar ritmo:', error);
          },
        });
    } else {
      this.bebidasService.createRitmo(this.selectedBebida._id, data).subscribe({
        next: (response: any) => {
          if (this.selectedBebida) {
            if (!this.selectedBebida.ritmos) {
              this.selectedBebida.ritmos = [];
            }
            this.selectedBebida.ritmos.push(response.data);
          }
          this.cargarBebidas();
          this.cancelFormRitmo();
        },
        error: (error) => {
          console.error('Error al crear ritmo:', error);
        },
      });
    }
  }
  cancelFormIngrediente(): void {
    this.showFormIngrediente = false;
    this.editModeIngrediente = false;
    this.ingredienteParaEditar = null;
  }

  cancelFormRitmo(): void {
    this.showFormRitmo = false;
    this.editModeRitmo = false;
    this.ritmoParaEditar = null;
  }

  deleteBebida(bebida: Bebida): void {
    if (confirm(`¿Eliminar bebida "${bebida.nombre_bebida}"?`)) {
      this.bebidasService.deleteBebida(bebida._id).subscribe({
        next: () => {
          this.bebidas = this.bebidas.filter((b) => b._id !== bebida._id);

          if (this.selectedBebida?._id === bebida._id) {
            this.selectedBebida = null;
          }
        },
        error: (error) => {
          console.error('Error al eliminar bebida:', error);
        },
      });
    }
  }
  deleteIngrediente(ingrediente: Ingrediente): void {
    if (!this.selectedBebida) return;

    if (confirm(`¿Eliminar ingrediente "${ingrediente.nombre_ingrediente}"?`)) {
      this.bebidasService
        .deleteIngrediente(this.selectedBebida._id, ingrediente._id)
        .subscribe({
          next: () => {
            this.cargarBebidas();
          },
          error: (error) => {
            console.error('Error al eliminar ingrediente:', error);
          },
        });
    }
  }

  deleteRitmo(ritmo: RitmoPedaleo): void {
    if (!this.selectedBebida) return;

    if (
      confirm(
        `¿Eliminar ritmo de ${ritmo.duracion}s (${ritmo.velocidad_min}-${ritmo.velocidad_max} km/h)?`
      )
    ) {
      this.bebidasService
        .deleteRitmo(this.selectedBebida._id, ritmo._id)
        .subscribe({
          next: () => {
            this.cargarBebidas();
          },
          error: (error) => {
            console.error('Error al eliminar ritmo:', error);
          },
        });
    }
  }

  verDetalleBebida(bebida: Bebida): void {
    this.bebidaDetalle = bebida;
    this.showModalDetalle = true;
  }

  cerrarModal(): void {
    this.showModalDetalle = false;
    this.bebidaDetalle = null;
  }
}
