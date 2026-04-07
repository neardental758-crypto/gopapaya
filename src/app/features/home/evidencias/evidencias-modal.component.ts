import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SesionService, Evidencia } from '../../services/sesion.service';
import { environment } from '../../../../environments/environment';

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
    {
      valor: 'resumen',
      label: 'Resumen de Participación',
      maxFotos: 2,
      minFotos: 2,
      permiteFotos: true,
      permiteTexto: false,
    },
    {
      valor: 'informe',
      label: 'Síntesis de la Experiencia',
      maxFotos: 2,
      minFotos: 2,
      permiteFotos: true,
      permiteTexto: true,
      maxPalabras: 150,
    },
    {
      valor: 'impacto',
      label: 'Impacto en Bienestar',
      maxFotos: 2,
      minFotos: 2,
      permiteFotos: true,
      permiteTexto: false,
    },
    {
      valor: 'galeria',
      label: 'Galería',
      maxFotos: 6,
      minFotos: 1,
      permiteFotos: true,
      permiteTexto: false,
    },
    {
      valor: 'observaciones',
      label: 'Comentarios de Participantes',
      maxFotos: 0,
      minFotos: 0,
      permiteFotos: false,
      permiteTexto: true,
      maxComentarios: 3,
      maxCaracteresPorComentario: 100,
    },
  ];

  comentarioTexto: string = '';
  comentarioAutor: string = '';
  comentariosActuales: Array<{ texto: string; autor: string }> = [];

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

        try {
          const fotos = (evidencias || [])
            .filter((e) => e?.tipo === 'foto' && !!e?.url_archivo)
            .map((e) => e.url_archivo);
          console.log('EVIDENCIAS_FETCH_OK:', {
            apiUrl: environment.apiUrl,
            sesionId: this.sesionId,
            total: (evidencias || []).length,
            fotos: fotos.slice(0, 10),
            fotosTotal: fotos.length,
          });
        } catch (e) {
          console.log('EVIDENCIAS_FETCH_LOG_ERROR');
        }

        this.agruparEvidencias();
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      },
    });
  }

  onEvidenciaImgError(url?: string | null): void {
    console.log('EVIDENCIA_IMG_ERROR:', url || '(sin url)');
  }

  onEvidenciaImgLoad(url?: string | null): void {
    console.log('EVIDENCIA_IMG_LOAD:', url || '(sin url)');
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
      }),
    );
  }

  obtenerNombreSeccion(valor: string): string {
    const seccion = this.secciones.find((s) => s.valor === valor);
    return seccion ? seccion.label : 'Sin Sección';
  }

  seleccionarTipo(tipo: 'foto' | 'texto'): void {
    const seccion = this.secciones.find(
      (s) => s.valor === this.seccionSeleccionada,
    );

    if (!seccion) {
      alert('Selecciona una sección primero');
      return;
    }

    if (tipo === 'texto' && !seccion.permiteTexto) {
      alert(`No se pueden agregar textos en "${seccion.label}"`);
      return;
    }

    if (tipo === 'foto' && !seccion.permiteFotos) {
      alert(`No se pueden agregar fotos en "${seccion.label}"`);
      return;
    }

    this.tipoNueva = tipo;
    this.resetForm();
  }

  onFileSelected(event: any): void {
    const files = Array.from(event.target.files) as File[];
    const seccion = this.secciones.find(
      (s) => s.valor === this.seccionSeleccionada,
    );

    if (!seccion) return;

    const fotosActuales = this.evidencias.filter(
      (e) => e.seccion === this.seccionSeleccionada && e.tipo === 'foto',
    ).length;

    const espacioDisponible =
      seccion.maxFotos - fotosActuales - this.archivosSeleccionados.length;

    if (espacioDisponible <= 0) {
      alert(
        `Ya tienes el máximo de ${seccion.maxFotos} foto(s) permitidas en "${seccion.label}"`,
      );
      return;
    }

    files.forEach((file, index) => {
      if (index >= espacioDisponible) {
        alert(
          `Solo se permiten ${seccion.maxFotos} foto(s) en "${
            seccion.label
          }". Ya tienes ${fotosActuales + this.archivosSeleccionados.length}`,
        );
        return;
      }

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

  contarPalabras(): number {
    return this.contenidoTexto
      .trim()
      .split(/\s+/)
      .filter((p) => p.length > 0).length;
  }

  eliminarPreview(index: number): void {
    this.archivosSeleccionados.splice(index, 1);
    this.previsualizaciones.splice(index, 1);
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
        index,
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

  permiteTextoSeccionActual(): boolean {
    if (!this.seccionSeleccionada) return false;
    const seccion = this.secciones.find(
      (s) => s.valor === this.seccionSeleccionada,
    );
    return seccion?.permiteTexto || false;
  }

  permiteFotoSeccionActual(): boolean {
    if (!this.seccionSeleccionada) return false;
    const seccion = this.secciones.find(
      (s) => s.valor === this.seccionSeleccionada,
    );
    return seccion?.permiteFotos || false;
  }

  obtenerMaxPalabrasSeccionActual(): number {
    if (!this.seccionSeleccionada) return 0;
    const seccion = this.secciones.find(
      (s) => s.valor === this.seccionSeleccionada,
    );
    return seccion?.maxPalabras || 0;
  }

  obtenerMinFotos(): number {
    if (!this.seccionSeleccionada) return 0;
    const seccion = this.secciones.find(
      (s) => s.valor === this.seccionSeleccionada,
    );
    return seccion?.minFotos || 0;
  }

  obtenerMaxFotos(): number {
    if (!this.seccionSeleccionada) return 0;
    const seccion = this.secciones.find(
      (s) => s.valor === this.seccionSeleccionada,
    );
    return seccion?.maxFotos || 0;
  }

  obtenerFotosActuales(): number {
    return this.evidencias.filter(
      (e) => e.seccion === this.seccionSeleccionada && e.tipo === 'foto',
    ).length;
  }

  contarFotosSeccion(seccion: string): number {
    return this.evidencias.filter(
      (e) => e.seccion === seccion && e.tipo === 'foto',
    ).length;
  }

  contarTextosSeccion(seccion: string): number {
    return this.evidencias.filter(
      (e) => e.seccion === seccion && e.tipo === 'texto',
    ).length;
  }

  obtenerComentariosActuales(): Array<{ texto: string; autor: string }> {
    const evidencia = this.evidencias.find(
      (e) => e.seccion === 'observaciones' && e.tipo === 'texto',
    );

    if (!evidencia || !evidencia.contenido) return [];

    try {
      return JSON.parse(evidencia.contenido);
    } catch {
      return [];
    }
  }

  contarCaracteresComentario(): number {
    return this.comentarioTexto.length;
  }

  puedeAgregarComentario(): boolean {
    if (this.seccionSeleccionada !== 'observaciones') return true;

    const comentarios = this.obtenerComentariosActuales();
    const seccion = this.secciones.find((s) => s.valor === 'observaciones');

    return comentarios.length < (seccion?.maxComentarios || 3);
  }

  guardarEvidencia(): void {
    if (!this.sesionId || !this.seccionSeleccionada) {
      alert('Selecciona una sección');
      return;
    }

    const seccion = this.secciones.find(
      (s) => s.valor === this.seccionSeleccionada,
    );
    if (!seccion) return;

    if (this.tipoNueva === 'texto') {
      if (!seccion.permiteTexto) {
        alert(`No se pueden agregar textos en "${seccion.label}"`);
        return;
      }

      if (this.seccionSeleccionada === 'observaciones') {
        if (!this.comentarioTexto.trim() || !this.comentarioAutor.trim()) {
          alert('Ingresa el comentario y el nombre del participante');
          return;
        }

        if (
          this.comentarioTexto.length >
          (seccion.maxCaracteresPorComentario || 150)
        ) {
          alert(
            `El comentario no debe superar ${seccion.maxCaracteresPorComentario} caracteres`,
          );
          return;
        }

        const comentariosExistentes = this.obtenerComentariosActuales();

        if (comentariosExistentes.length >= (seccion.maxComentarios || 3)) {
          alert(
            `Solo se permiten ${seccion.maxComentarios} comentarios máximo`,
          );
          return;
        }

        comentariosExistentes.push({
          texto: this.comentarioTexto.trim(),
          autor: this.comentarioAutor.trim(),
        });

        const evidenciaExistente = this.evidencias.find(
          (e) => e.seccion === 'observaciones' && e.tipo === 'texto',
        );

        this.subiendoArchivo = true;

        if (evidenciaExistente) {
          this.sesionService
            .eliminarEvidencia(evidenciaExistente.id)
            .subscribe({
              next: () => {
                this.sesionService
                  .crearEvidenciaTexto(
                    this.sesionId!,
                    JSON.stringify(comentariosExistentes),
                    'observaciones',
                  )
                  .subscribe({
                    next: () => {
                      this.subiendoArchivo = false;
                      this.resetForm();
                      this.cargarEvidencias();
                    },
                    error: () => {
                      this.subiendoArchivo = false;
                      alert('Error al guardar');
                    },
                  });
              },
            });
        } else {
          this.sesionService
            .crearEvidenciaTexto(
              this.sesionId,
              JSON.stringify(comentariosExistentes),
              'observaciones',
            )
            .subscribe({
              next: () => {
                this.subiendoArchivo = false;
                this.resetForm();
                this.cargarEvidencias();
              },
              error: () => {
                this.subiendoArchivo = false;
                alert('Error al guardar');
              },
            });
        }
      } else {
        if (!this.contenidoTexto.trim()) {
          alert('Ingresa un texto');
          return;
        }

        const palabras = this.contenidoTexto.trim().split(/\s+/).length;
        if (seccion.maxPalabras && palabras > seccion.maxPalabras) {
          alert(`El texto no debe superar ${seccion.maxPalabras} palabras`);
          return;
        }

        const textoExistente = this.evidencias.find(
          (e) => e.seccion === this.seccionSeleccionada && e.tipo === 'texto',
        );

        if (textoExistente) {
          alert(`Ya existe un texto para "${seccion.label}"`);
          return;
        }

        this.subiendoArchivo = true;
        this.sesionService
          .crearEvidenciaTexto(
            this.sesionId,
            this.contenidoTexto,
            this.seccionSeleccionada,
          )
          .subscribe({
            next: () => {
              this.subiendoArchivo = false;
              this.resetForm();
              this.cargarEvidencias();
            },
            error: () => {
              this.subiendoArchivo = false;
              alert('Error al guardar');
            },
          });
      }
    } else {
      if (!seccion.permiteFotos) {
        alert(`No se pueden agregar fotos en "${seccion.label}"`);
        return;
      }

      if (this.archivosSeleccionados.length === 0) {
        alert('Selecciona al menos una foto');
        return;
      }

      const fotosActuales = this.evidencias.filter(
        (e) => e.seccion === this.seccionSeleccionada && e.tipo === 'foto',
      ).length;

      if (
        fotosActuales + this.archivosSeleccionados.length >
        seccion.maxFotos
      ) {
        alert(`Solo se permite(n) ${seccion.maxFotos} foto(s)`);
        return;
      }

      this.subiendoArchivo = true;
      this.subirFotos(0);
    }
  }

  eliminarComentario(index: number): void {
    if (!confirm('¿Eliminar este comentario?')) return;

    const comentarios = this.obtenerComentariosActuales();
    comentarios.splice(index, 1);

    const evidencia = this.evidencias.find(
      (e) => e.seccion === 'observaciones' && e.tipo === 'texto',
    );

    if (!evidencia) return;

    this.sesionService.eliminarEvidencia(evidencia.id).subscribe({
      next: () => {
        if (comentarios.length > 0) {
          this.sesionService
            .crearEvidenciaTexto(
              this.sesionId!,
              JSON.stringify(comentarios),
              'observaciones',
            )
            .subscribe({
              next: () => this.cargarEvidencias(),
              error: () => alert('Error al actualizar'),
            });
        } else {
          this.cargarEvidencias();
        }
      },
    });
  }

  resetForm(): void {
    this.contenidoTexto = '';
    this.comentarioTexto = '';
    this.comentarioAutor = '';
    this.archivosSeleccionados = [];
    this.previsualizaciones = [];
  }

  puedeGuardar(): boolean {
    if (this.tipoNueva === 'texto') {
      if (this.seccionSeleccionada === 'observaciones') {
        return (
          this.comentarioTexto.trim().length > 0 &&
          this.comentarioAutor.trim().length > 0 &&
          this.comentarioTexto.length <= 100
        );
      }
      return (
        this.contenidoTexto.trim().length > 0 &&
        this.contarPalabras() <= this.obtenerMaxPalabrasSeccionActual()
      );
    }
    return this.archivosSeleccionados.length > 0;
  }
}
