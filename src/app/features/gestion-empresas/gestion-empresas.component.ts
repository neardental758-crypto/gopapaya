import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpresaService } from '../services/empresa.service';
import { Empresa } from '../services/empresa.service';

@Component({
  selector: 'app-gestion-empresas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-empresas.component.html',
})
export class GestionEmpresasComponent implements OnInit {
  empresas: Empresa[] = [];
  selectedEmpresa: Empresa | null = null;
  showForm = false;
  editMode = false;

  empresaForm = {
    nombre: '',
    logo: '',
  };

  constructor(private empresaService: EmpresaService) {}

  ngOnInit(): void {
    this.loadEmpresas();
  }

  loadEmpresas(): void {
    this.empresaService.getEmpresas().subscribe({
      next: (empresas) => {
        this.empresas = empresas;
      },
      error: (error) => {
        console.error('Error al cargar empresas:', error);
      },
    });
  }

  selectEmpresa(empresa: Empresa): void {
    this.selectedEmpresa = empresa;
  }

  toggleForm(empresa?: Empresa): void {
    this.showForm = !this.showForm;

    if (empresa) {
      this.editMode = true;
      this.empresaForm = {
        nombre: empresa.nombre,
        logo: empresa.logo || '',
      };
      this.selectedEmpresa = empresa;
    } else {
      this.editMode = false;
      this.resetForm();
    }
  }

  resetForm(): void {
    this.empresaForm = {
      nombre: '',
      logo: '',
    };
  }

  onSubmit(): void {
    if (this.editMode && this.selectedEmpresa) {
      const data: any = { ...this.empresaForm };
      if (!data.logo) delete data.logo;

      this.empresaService
        .updateEmpresa(this.selectedEmpresa._id, data)
        .subscribe({
          next: () => {
            this.loadEmpresas();
            this.cancelForm();
          },
          error: (error) => {
            console.error('Error al actualizar empresa:', error);
            alert('Error al actualizar la empresa');
          },
        });
    } else {
      this.empresaService.createEmpresa(this.empresaForm).subscribe({
        next: () => {
          this.loadEmpresas();
          this.cancelForm();
        },
        error: (error) => {
          console.error('Error al crear empresa:', error);
          alert('Error al crear la empresa');
        },
      });
    }
  }

  cancelForm(): void {
    this.showForm = false;
    this.editMode = false;
    this.resetForm();
  }

  deleteEmpresa(empresa: Empresa): void {
    if (confirm(`¿Desactivar empresa ${empresa.nombre}?`)) {
      this.empresaService.deleteEmpresa(empresa._id).subscribe({
        next: () => {
          this.loadEmpresas();
          if (this.selectedEmpresa?._id === empresa._id) {
            this.selectedEmpresa = null;
          }
        },
        error: (error) => {
          console.error('Error al eliminar empresa:', error);
          alert('Error al eliminar la empresa');
        },
      });
    }
  }
}
