import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'url' | 'number';
  required?: boolean;
  placeholder?: string;
  value?: any;
}

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dynamic-form.component.html',
})
export class DynamicFormComponent {
  @Input() title: string = 'Formulario';
  @Input() fields: FormField[] = [];
  @Input() submitLabel: string = 'Guardar';
  @Input() isEditMode: boolean = false;
  @Output() onSubmit = new EventEmitter<any>();
  @Output() onCancel = new EventEmitter<void>();

  formData: any = {};

  ngOnInit() {
    this.initFormData();
  }

  ngOnChanges() {
    this.initFormData();
  }

  initFormData() {
    this.formData = {};
    this.fields.forEach((field) => {
      if (field.value !== undefined && field.value !== null) {
        this.formData[field.name] = field.value;
      } else {
        this.formData[field.name] = field.type === 'number' ? null : '';
      }
    });
  }

  handleSubmit() {
    const cleanData = { ...this.formData };
    Object.keys(cleanData).forEach((key) => {
      if (cleanData[key] === '' || cleanData[key] === null) {
        delete cleanData[key];
      }
    });
    this.onSubmit.emit(cleanData);
  }

  handleCancel() {
    this.onCancel.emit();
  }

  isFormValid(): boolean {
    return this.fields
      .filter((field) => field.required)
      .every((field) => {
        const value = this.formData[field.name];
        if (field.type === 'number') {
          return value !== null && value !== '' && !isNaN(value);
        }
        return value && value.toString().trim();
      });
  }

  getPlaceholder(field: FormField): string {
    if (field.placeholder) return field.placeholder;
    return `Ingrese ${field.label.toLowerCase()}`;
  }
}
