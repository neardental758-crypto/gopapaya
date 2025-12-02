import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TematicasService } from './services/tematicas.service';
import { ContenidoService } from './services/contenido.service';
import { PreguntaService } from './services/pregunta.service';
import { RespuestaService } from './services/respuesta.service';
import {
  Tematica,
  Contenido,
  Pregunta,
  Respuesta,
} from '../../core/interfaces/tematica.interface';
import {
  DynamicFormComponent,
  FormField,
} from '../../shared/components/dynamic-form/dynamic-form.component';
import { QuestionFormComponent } from '../../shared/components/question-form/question-form.component';
import { catchError, forkJoin, of, Subscription, throwError } from 'rxjs';

@Component({
  selector: 'app-tematicas',
  standalone: true,
  imports: [CommonModule, DynamicFormComponent, QuestionFormComponent],
  templateUrl: './tematicas.component.html',
  styleUrls: ['./tematicas.component.css'],
})
export class TematicasComponent implements OnInit, OnDestroy {
  private tematicasService = inject(TematicasService);
  private contenidoService = inject(ContenidoService);
  private preguntaService = inject(PreguntaService);
  private respuestaService = inject(RespuestaService);

  tematicas: Tematica[] = [];
  selectedTematica: Tematica | null = null;
  selectedContenido: Contenido | null = null;
  selectedPregunta: Pregunta | null = null;

  showForm: string | null = null;
  editMode: boolean = false;
  preguntaParaEditar: any = null;

  private subscriptions: Subscription[] = [];

  tematicaFields: FormField[] = [
    {
      name: 'nombre_tematica',
      label: 'Nombre de la Temática',
      type: 'text',
      required: true,
      placeholder: 'Ej: Matemáticas Básicas',
    },
    {
      name: 'descripcion',
      label: 'Descripción',
      type: 'textarea',
      placeholder: 'Describe brevemente esta temática...',
    },
    {
      name: 'logo_tematica',
      label: 'URL del Logo',
      type: 'url',
      placeholder: 'https://ejemplo.com/logo.png',
    },
  ];

  contenidoFields: FormField[] = [
    {
      name: 'nombre_contenido',
      label: 'Nombre del Contenido',
      type: 'text',
      required: true,
      placeholder: 'Ej: Suma y Resta',
    },
    {
      name: 'link_video',
      label: 'URL del Video',
      type: 'url',
      placeholder: 'https://youtube.com/...',
    },
  ];

  ngOnInit() {
    this.loadTematicas();
  }

  loadTematicas() {
    const sub = this.tematicasService.getAllTematicas().subscribe({
      next: (data) => {
        this.tematicas = data;
      },
      error: (error) => console.error('Error al cargar temáticas:', error),
    });
    this.subscriptions.push(sub);
  }

  selectTematica(tematica: Tematica) {
    this.selectedTematica = tematica;
    this.selectedContenido = null;
    this.selectedPregunta = null;
  }

  selectContenido(contenido: Contenido) {
    this.selectedContenido = contenido;
    this.selectedPregunta = null;
  }

  selectPregunta(pregunta: Pregunta) {
    this.selectedPregunta = pregunta;
  }

  toggleFormTematica(tematica?: Tematica) {
    if (tematica) {
      this.editMode = true;
      this.selectedTematica = tematica;
      this.tematicaFields = this.tematicaFields.map((field) => ({
        ...field,
        value: tematica[field.name as keyof Tematica],
      }));
    } else {
      this.editMode = false;
      this.tematicaFields = this.tematicaFields.map((field) => ({
        ...field,
        value: '',
      }));
    }
    this.showForm = this.showForm === 'tematica' ? null : 'tematica';
  }

  onSubmitTematica(formData: any) {
    if (this.editMode && this.selectedTematica) {
      const idToUpdate = this.selectedTematica._id;
      const index = this.tematicas.findIndex((t) => t._id === idToUpdate);

      if (index !== -1) {
        const sub = this.tematicasService
          .updateTematica(idToUpdate, formData)
          .subscribe({
            next: () => {
              this.tematicas = this.tematicas.map((t, i) =>
                i === index ? { ...t, ...formData } : t
              );
              this.selectedTematica = this.tematicas[index];
              this.cancelForm();
            },
            error: (error) => console.error('Error al actualizar:', error),
          });
        this.subscriptions.push(sub);
      }
    } else {
      const tematicaData = {
        ...formData,
        _id: this.generateId(),
        tematica_activa: true,
        contenidos: [],
      };

      const sub = this.tematicasService.createTematica(tematicaData).subscribe({
        next: () => {
          this.tematicas = [...this.tematicas, tematicaData];
          this.cancelForm();
        },
        error: (error) => console.error('Error al crear:', error),
      });
      this.subscriptions.push(sub);
    }
  }

  deleteTematica(tematica: Tematica) {
    const index = this.tematicas.findIndex((t) => t._id === tematica._id);

    if (
      index !== -1 &&
      (!tematica.contenidos || tematica.contenidos.length === 0)
    ) {
      if (confirm(`¿Eliminar "${tematica.nombre_tematica}"?`)) {
        const sub = this.tematicasService
          .deleteTematica(tematica._id)
          .subscribe({
            next: () => {
              this.tematicas = this.tematicas.filter(
                (t) => t._id !== tematica._id
              );
              this.selectedTematica = null;
              this.selectedContenido = null;
              this.selectedPregunta = null;
            },
            error: (error) => console.error('Error al eliminar:', error),
          });
        this.subscriptions.push(sub);
      }
    } else {
      alert('No se puede eliminar una temática con contenidos asociados');
    }
  }

  toggleFormContenido(contenido?: Contenido) {
    if (!this.selectedTematica) return;

    if (contenido) {
      this.editMode = true;
      this.selectedContenido = contenido;
      this.contenidoFields = this.contenidoFields.map((field) => ({
        ...field,
        value: contenido[field.name as keyof Contenido],
      }));
    } else {
      this.editMode = false;
      this.contenidoFields = this.contenidoFields.map((field) => ({
        ...field,
        value: '',
      }));
    }
    this.showForm = this.showForm === 'contenido' ? null : 'contenido';
  }

  onSubmitContenido(formData: any) {
    if (!this.selectedTematica) return;

    if (this.editMode && this.selectedContenido) {
      const index = this.selectedTematica.contenidos?.findIndex(
        (c) => c._id === this.selectedContenido!._id
      );

      if (index !== undefined && index !== -1) {
        const sub = this.contenidoService
          .update(this.selectedContenido._id, formData)
          .subscribe({
            next: () => {
              const updatedContenidos = [...this.selectedTematica!.contenidos!];
              updatedContenidos[index] = {
                ...updatedContenidos[index],
                ...formData,
              };

              const updatedTematica = {
                ...this.selectedTematica!,
                contenidos: updatedContenidos,
              };

              const tematicaIndex = this.tematicas.findIndex(
                (t) => t._id === this.selectedTematica!._id
              );

              if (tematicaIndex !== -1) {
                this.tematicas = this.tematicas.map((t, i) =>
                  i === tematicaIndex ? updatedTematica : t
                );
              }

              this.selectedTematica = updatedTematica;
              this.selectedContenido = updatedContenidos[index];
              this.cancelForm();
            },
            error: (error) => console.error('Error al actualizar:', error),
          });
        this.subscriptions.push(sub);
      }
    } else {
      const contenidoData = {
        ...formData,
        _id: this.generateId(),
        id_tematica: this.selectedTematica._id,
        num_preguntas: 0,
        preguntas: [],
      };

      const sub = this.contenidoService.create(contenidoData).subscribe({
        next: () => {
          const updatedContenidos = [
            ...(this.selectedTematica!.contenidos || []),
            contenidoData,
          ];

          const updatedTematica = {
            ...this.selectedTematica!,
            contenidos: updatedContenidos,
          };

          const tematicaIndex = this.tematicas.findIndex(
            (t) => t._id === this.selectedTematica!._id
          );

          if (tematicaIndex !== -1) {
            this.tematicas = this.tematicas.map((t, i) =>
              i === tematicaIndex ? updatedTematica : t
            );
          }

          this.selectedTematica = updatedTematica;
          this.selectedContenido = contenidoData;
          this.cancelForm();
        },
        error: (error) => console.error('Error al crear:', error),
      });
      this.subscriptions.push(sub);
    }
  }

  deleteContenido(contenido: Contenido) {
    if (!this.selectedTematica) return;

    const index = this.selectedTematica.contenidos?.findIndex(
      (c) => c._id === contenido._id
    );

    if (
      index !== undefined &&
      index !== -1 &&
      (!contenido.preguntas || contenido.preguntas.length === 0)
    ) {
      if (confirm(`¿Eliminar "${contenido.nombre_contenido}"?`)) {
        const sub = this.contenidoService.delete(contenido._id).subscribe({
          next: () => {
            const updatedContenidos = this.selectedTematica!.contenidos!.filter(
              (c) => c._id !== contenido._id
            );

            const updatedTematica = {
              ...this.selectedTematica!,
              contenidos: updatedContenidos,
            };

            const tematicaIndex = this.tematicas.findIndex(
              (t) => t._id === this.selectedTematica!._id
            );

            if (tematicaIndex !== -1) {
              this.tematicas = this.tematicas.map((t, i) =>
                i === tematicaIndex ? updatedTematica : t
              );
            }

            this.selectedTematica = updatedTematica;
            this.selectedContenido = null;
            this.selectedPregunta = null;
          },
          error: (error) => console.error('Error al eliminar:', error),
        });
        this.subscriptions.push(sub);
      }
    } else {
      alert('No se puede eliminar un contenido con preguntas asociadas');
    }
  }

  toggleFormPregunta(pregunta?: Pregunta) {
    if (pregunta) {
      this.editMode = true;
      this.selectedPregunta = pregunta;
      this.preguntaParaEditar = {
        texto_pregunta: pregunta.texto_pregunta,
        respuestas: pregunta.respuestas ? [...pregunta.respuestas] : [],
      };
    } else {
      this.editMode = false;
      this.preguntaParaEditar = null;
    }
    this.showForm = this.showForm === 'pregunta' ? null : 'pregunta';
  }

  onSubmitPregunta(formData: any) {
    if (!this.selectedContenido) {
      alert('Debes seleccionar un contenido primero');
      return;
    }

    if (!formData.texto_pregunta?.trim()) {
      alert('Debes escribir la pregunta');
      return;
    }

    if (!formData.respuestas || formData.respuestas.length < 2) {
      alert('Debes agregar al menos 2 respuestas');
      return;
    }

    const tieneCorrecta = formData.respuestas.some((r: any) => r.es_correcta);
    if (!tieneCorrecta) {
      alert('Debes marcar cuál es la respuesta correcta');
      return;
    }

    if (this.editMode && this.selectedPregunta) {
      this.actualizarPreguntaExistente(formData);
    } else {
      this.crearNuevaPregunta(formData);
    }
  }

  private crearNuevaPregunta(formData: any) {
    const idPregunta = this.generateId();
    const preguntaData = {
      _id: idPregunta,
      id_contenido: this.selectedContenido!._id,
      texto_pregunta: formData.texto_pregunta.trim(),
    };

    const sub = this.preguntaService.create(preguntaData).subscribe({
      next: () => {
        const respuestasData = formData.respuestas.map((resp: any) => ({
          _id: this.generateId(),
          id_pregunta: idPregunta,
          texto_respuesta: resp.texto_respuesta.trim(),
          es_correcta: resp.es_correcta,
        }));

        const respuestasObservables = respuestasData.map((r: any) =>
          this.respuestaService.create(r)
        );

        const subRespuestas = forkJoin(respuestasObservables).subscribe({
          next: () => {
            const nuevaPreguntaCompleta = {
              ...preguntaData,
              respuestas: respuestasData,
            };

            this.selectedContenido = {
              ...this.selectedContenido!,
              preguntas: [
                ...(this.selectedContenido!.preguntas || []),
                nuevaPreguntaCompleta,
              ],
              num_preguntas:
                (this.selectedContenido!.preguntas?.length || 0) + 1,
            };

            this.actualizarContenidoEnTematica();
            this.selectedPregunta = nuevaPreguntaCompleta;
            this.cancelForm();
          },
          error: (error) => {
            console.error('Error al crear respuestas:', error);
            alert('Error al crear las respuestas');
          },
        });
        this.subscriptions.push(subRespuestas);
      },
      error: (error) => {
        console.error('Error al crear pregunta:', error);
        alert('Error al crear la pregunta');
      },
    });
    this.subscriptions.push(sub);
  }

  private actualizarPreguntaExistente(formData: any) {
    if (!this.selectedPregunta) return;

    const textoActualizado = formData.texto_pregunta.trim();

    const sub = this.preguntaService
      .update(this.selectedPregunta._id, {
        texto_pregunta: textoActualizado,
      })
      .subscribe({
        next: () => {
          this.selectedPregunta!.texto_pregunta = textoActualizado;
          this.actualizarRespuestas(
            this.selectedPregunta!._id,
            formData.respuestas
          );
        },
        error: (error) => {
          console.error('Error al actualizar pregunta:', error);
          alert('Error al actualizar la pregunta');
        },
      });
    this.subscriptions.push(sub);
  }

  private actualizarRespuestas(idPregunta: string, nuevasRespuestas: any[]) {
    const respuestasExistentes = this.selectedPregunta?.respuestas || [];

    const deleteObservables = respuestasExistentes.map((r) =>
      this.respuestaService.delete(r._id).pipe(
        catchError((error) => {
          if (error.status === 200) {
            return of(null);
          }
          return throwError(() => error);
        })
      )
    );

    const deleteObs$ =
      deleteObservables.length > 0 ? forkJoin(deleteObservables) : of([]);

    const sub = deleteObs$.subscribe({
      next: () => {
        const respuestasData = nuevasRespuestas.map((resp: any) => ({
          _id: this.generateId(),
          id_pregunta: idPregunta,
          texto_respuesta: resp.texto_respuesta.trim(),
          es_correcta: resp.es_correcta,
        }));

        const createObservables = respuestasData.map((r: any) =>
          this.respuestaService.create(r)
        );

        const subCreate = forkJoin(createObservables).subscribe({
          next: () => {
            const preguntaIndex = this.selectedContenido!.preguntas!.findIndex(
              (p) => p._id === idPregunta
            );

            if (preguntaIndex !== -1) {
              const updatedPreguntas = [...this.selectedContenido!.preguntas!];
              updatedPreguntas[preguntaIndex] = {
                ...updatedPreguntas[preguntaIndex],
                texto_pregunta: this.selectedPregunta!.texto_pregunta,
                respuestas: respuestasData,
              };

              this.selectedContenido = {
                ...this.selectedContenido!,
                preguntas: updatedPreguntas,
              };

              this.actualizarContenidoEnTematica();
              this.selectedPregunta = updatedPreguntas[preguntaIndex];
            }

            this.cancelForm();
          },
          error: (error) => {
            console.error('Error al crear nuevas respuestas:', error);
            alert('Error al actualizar las respuestas');
          },
        });
        this.subscriptions.push(subCreate);
      },
      error: (error) => {
        console.error('Error inesperado:', error);
        alert('Error al procesar la actualización');
      },
    });
    this.subscriptions.push(sub);
  }

  private actualizarContenidoEnTematica() {
    if (!this.selectedTematica || !this.selectedContenido) return;

    const contenidoIndex = this.selectedTematica.contenidos?.findIndex(
      (c) => c._id === this.selectedContenido!._id
    );

    if (contenidoIndex !== undefined && contenidoIndex !== -1) {
      const updatedContenidos = [...this.selectedTematica.contenidos!];
      updatedContenidos[contenidoIndex] = this.selectedContenido;

      const updatedTematica = {
        ...this.selectedTematica,
        contenidos: updatedContenidos,
      };

      const tematicaIndex = this.tematicas.findIndex(
        (t) => t._id === this.selectedTematica!._id
      );

      if (tematicaIndex !== -1) {
        this.tematicas = this.tematicas.map((t, i) =>
          i === tematicaIndex ? updatedTematica : t
        );
      }

      this.selectedTematica = updatedTematica;
    }
  }

  editarPregunta(pregunta: Pregunta) {
    this.toggleFormPregunta(pregunta);
  }

  deletePregunta(pregunta: Pregunta) {
    if (!this.selectedContenido) return;

    const index = this.selectedContenido.preguntas?.findIndex(
      (p) => p._id === pregunta._id
    );

    if (index !== undefined && index !== -1) {
      if (confirm('¿Eliminar esta pregunta?')) {
        const sub = this.preguntaService.delete(pregunta._id).subscribe({
          next: () => {
            this.selectedContenido = {
              ...this.selectedContenido!,
              preguntas: this.selectedContenido!.preguntas!.filter(
                (p) => p._id !== pregunta._id
              ),
              num_preguntas:
                (this.selectedContenido!.preguntas?.length || 1) - 1,
            };

            this.actualizarContenidoEnTematica();
            this.selectedPregunta = null;
          },
          error: (error) => console.error('Error al eliminar:', error),
        });
        this.subscriptions.push(sub);
      }
    }
  }

  cancelForm() {
    this.showForm = null;
    this.editMode = false;
    this.preguntaParaEditar = null;
  }

  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
