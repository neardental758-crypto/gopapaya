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
      this.formData[field.name] = field.value || '';
    });
  }

  handleSubmit() {
    this.onSubmit.emit(this.formData);
  }

  handleCancel() {
    this.onCancel.emit();
  }

  isFormValid(): boolean {
    return this.fields
      .filter((field) => field.required)
      .every((field) => this.formData[field.name]?.toString().trim());
  }
}
