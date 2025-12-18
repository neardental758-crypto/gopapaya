import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SesionService, Evidencia } from '../../services/sesion.service';

interface EvidenciaAgrupada {
  seccion: string;
  evidencias: Evidencia[];
}

@Component({
  selector: 'app-evidencias-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './evidencias-modal.component.html',
})
export class EvidenciasModalComponent implements OnInit {
  isOpen = false;
  sesionId: number | null = null;
  sesionNombre: string = '';
  evidencias: Evidencia[] = [];
  evidenciasAgrupadas: EvidenciaAgrupada[] = [];
  cargando = false;
  subiendoArchivo = false;

  tipoNueva: 'foto' | 'texto' = 'texto';
  contenidoTexto: string = '';
  archivosSeleccionados: File[] = [];
  previsualizaciones: string[] = [];
  seccionSeleccionada: string = '';

  secciones = [
    { valor: 'resumen', label: 'Resumen de Participación' },
    { valor: 'metricas', label: 'Métricas de la Experiencia' },
    { valor: 'impacto', label: 'Impacto en Bienestar' },
    { valor: 'galeria', label: 'Galería' },
    { valor: 'observaciones', label: 'Notas y Observaciones' },
  ];

  constructor(private sesionService: SesionService) {}

  ngOnInit(): void {}

  open(sesionId: number, sesionNombre: string): void {
    this.sesionId = sesionId;
    this.sesionNombre = sesionNombre;
    this.isOpen = true;
    this.cargarEvidencias();
  }

  close(): void {
    this.isOpen = false;
    this.resetForm();
  }

  cargarEvidencias(): void {
    if (!this.sesionId) return;

    this.cargando = true;
    this.sesionService.getEvidencias(this.sesionId).subscribe({
      next: (evidencias) => {
        this.evidencias = evidencias;
        this.agruparEvidencias();
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      },
    });
  }

  agruparEvidencias(): void {
    const grupos = new Map<string, Evidencia[]>();

    this.evidencias.forEach((evidencia) => {
      const seccion = evidencia.seccion || 'sin_seccion';
      if (!grupos.has(seccion)) {
        grupos.set(seccion, []);
      }
      grupos.get(seccion)!.push(evidencia);
    });

    this.evidenciasAgrupadas = Array.from(grupos.entries()).map(
      ([seccion, evidencias]) => ({
        seccion,
        evidencias,
      })
    );
  }

  obtenerNombreSeccion(valor: string): string {
    const seccion = this.secciones.find((s) => s.valor === valor);
    return seccion ? seccion.label : 'Sin Sección';
  }

  seleccionarTipo(tipo: 'foto' | 'texto'): void {
    this.tipoNueva = tipo;
    this.resetForm();
  }

  onFileSelected(event: any): void {
    const files = Array.from(event.target.files) as File[];

    files.forEach((file) => {
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
      ];
      if (!allowedTypes.includes(file.type)) {
        alert(`${file.name}: Solo se permiten imágenes JPG, PNG o WEBP`);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name}: El archivo no debe superar 5MB`);
        return;
      }

      this.archivosSeleccionados.push(file);

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previsualizaciones.push(e.target.result);
      };
      reader.readAsDataURL(file);
    });
  }

  eliminarPreview(index: number): void {
    this.archivosSeleccionados.splice(index, 1);
    this.previsualizaciones.splice(index, 1);
  }

  guardarEvidencia(): void {
    if (!this.sesionId || !this.seccionSeleccionada) {
      alert('Selecciona una sección');
      return;
    }

    if (this.tipoNueva === 'texto') {
      if (!this.contenidoTexto.trim()) {
        alert('Ingresa un texto');
        return;
      }

      const textoExistente = this.evidencias.find(
        (e) => e.seccion === this.seccionSeleccionada && e.tipo === 'texto'
      );

      if (textoExistente) {
        alert(
          `Ya existe un texto para la sección "${this.obtenerNombreSeccion(
            this.seccionSeleccionada
          )}". Solo puede haber un texto por sección.`
        );
        return;
      }

      this.subiendoArchivo = true;
      this.sesionService
        .crearEvidenciaTexto(
          this.sesionId,
          this.contenidoTexto,
          this.seccionSeleccionada
        )
        .subscribe({
          next: () => {
            this.subiendoArchivo = false;
            this.resetForm();
            this.cargarEvidencias();
          },
          error: () => {
            this.subiendoArchivo = false;
            alert('Error al guardar la evidencia');
          },
        });
    } else {
      if (this.archivosSeleccionados.length === 0) {
        alert('Selecciona al menos una foto');
        return;
      }

      this.subiendoArchivo = true;
      this.subirFotos(0);
    }
  }

  subirFotos(index: number): void {
    if (index >= this.archivosSeleccionados.length) {
      this.subiendoArchivo = false;
      this.resetForm();
      this.cargarEvidencias();
      return;
    }

    this.sesionService
      .crearEvidenciaFoto(
        this.sesionId!,
        this.archivosSeleccionados[index],
        this.seccionSeleccionada,
        index
      )
      .subscribe({
        next: () => {
          this.subirFotos(index + 1);
        },
        error: () => {
          this.subiendoArchivo = false;
          alert(`Error al subir la foto ${index + 1}`);
        },
      });
  }

  eliminarEvidencia(evidencia: Evidencia): void {
    if (!confirm('¿Eliminar esta evidencia?')) return;

    this.sesionService.eliminarEvidencia(evidencia.id).subscribe({
      next: () => {
        this.cargarEvidencias();
      },
      error: () => {
        alert('Error al eliminar la evidencia');
      },
    });
  }

  resetForm(): void {
    this.contenidoTexto = '';
    this.archivosSeleccionados = [];
    this.previsualizaciones = [];
  }
}
