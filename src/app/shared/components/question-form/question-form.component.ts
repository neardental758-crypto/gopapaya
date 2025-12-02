import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-question-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './question-form.component.html',
})
export class QuestionFormComponent {
  @Input() isEditMode: boolean = false;
  @Output() onSubmit = new EventEmitter<any>();
  @Output() onCancel = new EventEmitter<void>();

  pregunta: { texto_pregunta: string; respuestas: any[] } = {
    texto_pregunta: '',
    respuestas: [],
  };
  nuevaRespuesta: string = '';

  agregarRespuesta() {
    if (this.nuevaRespuesta.trim()) {
      this.pregunta.respuestas.push({
        texto_respuesta: this.nuevaRespuesta,
        es_correcta: false,
      });
      this.nuevaRespuesta = '';
    }
  }

  eliminarRespuesta(index: number) {
    this.pregunta.respuestas.splice(index, 1);
  }

  marcarCorrecta(index: number) {
    this.pregunta.respuestas.forEach((r, i) => {
      r.es_correcta = i === index;
    });
  }

  guardar() {
    if (this.isValid()) {
      this.onSubmit.emit(this.pregunta);
    }
  }

  cancelar() {
    this.onCancel.emit();
  }

  isValid(): boolean {
    return (
      this.pregunta.texto_pregunta.trim() !== '' &&
      this.pregunta.respuestas.length >= 2 &&
      this.tieneRespuestaCorrecta()
    );
  }

  tieneRespuestaCorrecta(): boolean {
    return this.pregunta.respuestas.some((r) => r.es_correcta);
  }

  @Input() set preguntaData(data: any) {
    if (data) {
      this.pregunta = {
        texto_pregunta: data.texto_pregunta || '',
        respuestas: data.respuestas ? [...data.respuestas] : [],
      };
    }
  }
}
