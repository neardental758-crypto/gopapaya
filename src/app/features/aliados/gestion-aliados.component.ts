import { Component, OnInit } from '@angular/core';
import {
  AliadosService,
  Aliado,
  AGR,
  Empresa,
} from '../services/aliados.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type EntityType = 'aliado' | 'agr' | 'empresa';
@Component({
  selector: 'app-gestion-aliados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-aliados.component.html',
})
export class GestionAliadosComponent implements OnInit {
  aliados: Aliado[] = [];
  agrs: AGR[] = [];
  empresas: Empresa[] = [];

  filteredAliados: Aliado[] = [];
  filteredAGRs: AGR[] = [];
  filteredEmpresas: Empresa[] = [];

  searchAliado = '';
  searchAGR = '';
  searchEmpresa = '';

  selectedAliado: Aliado | null = null;
  selectedAGR: AGR | null = null;
  selectedEmpresa: Empresa | null = null;

  showForm = false;
  showDetails = false;
  editMode = false;
  currentEntityType: EntityType = 'aliado';
  detailsItem: any = null;

  aliadoForm = {
    nombre: '',
    logo: '',
    nombre_poc: '',
    email_poc: '',
    telefono: '',
    notas: '',
  };

  agrForm = {
    nombre: '',
    email: '',
    telefono: '',
    notas: '',
  };

  empresaForm = {
    nombre: '',
    logo: '',
    email: '',
    telefono: '',
    notas: '',
  };

  constructor(private aliadosService: AliadosService) {}

  ngOnInit(): void {
    this.loadAliados();
  }

  loadAliados(): void {
    this.aliadosService.getAliados().subscribe({
      next: (aliados) => {
        this.aliados = aliados;
        this.filteredAliados = aliados;
      },
      error: (error) => {
        console.error('Error al cargar aliados:', error);
      },
    });
  }

  loadAGRs(aliadoId: string): void {
    this.aliadosService.getAGRsByAliado(aliadoId).subscribe({
      next: (agrs) => {
        this.agrs = agrs;
        this.filteredAGRs = agrs;
      },
      error: (error) => {
        console.error('Error al cargar AGRs:', error);
      },
    });
  }

  loadEmpresas(agrId: string): void {
    this.aliadosService.getEmpresasByAGR(agrId).subscribe({
      next: (empresas) => {
        this.empresas = empresas;
        this.filteredEmpresas = empresas;
      },
      error: (error) => {
        console.error('Error al cargar empresas:', error);
      },
    });
  }

  filterAliados(): void {
    const search = this.searchAliado.toLowerCase();
    this.filteredAliados = this.aliados.filter(
      (a) =>
        a.nombre.toLowerCase().includes(search) ||
        (a.nombre_poc && a.nombre_poc.toLowerCase().includes(search)) ||
        (a.email_poc && a.email_poc.toLowerCase().includes(search))
    );
  }

  filterAGRs(): void {
    const search = this.searchAGR.toLowerCase();
    this.filteredAGRs = this.agrs.filter(
      (a) =>
        a.nombre.toLowerCase().includes(search) ||
        a.email.toLowerCase().includes(search)
    );
  }

  filterEmpresas(): void {
    const search = this.searchEmpresa.toLowerCase();
    this.filteredEmpresas = this.empresas.filter(
      (e) =>
        e.nombre.toLowerCase().includes(search) ||
        (e.email && e.email.toLowerCase().includes(search))
    );
  }

  showDetailsModal(type: EntityType, item: any): void {
    this.currentEntityType = type;
    this.detailsItem = item;
    this.showDetails = true;
  }

  closeDetails(): void {
    this.showDetails = false;
    this.detailsItem = null;
  }

  selectAliado(aliado: Aliado): void {
    this.selectedAliado = aliado;
    this.selectedAGR = null;
    this.selectedEmpresa = null;
    this.searchAGR = '';
    this.searchEmpresa = '';
    this.loadAGRs(aliado._id);
    this.empresas = [];
    this.filteredEmpresas = [];
  }

  selectAGR(agr: AGR): void {
    this.selectedAGR = agr;
    this.selectedEmpresa = null;
    this.searchEmpresa = '';
    this.loadEmpresas(agr._id);
  }

  selectEmpresa(empresa: Empresa): void {
    this.selectedEmpresa = empresa;
  }

  toggleForm(type: EntityType, item?: any): void {
    this.showForm = !this.showForm;
    this.currentEntityType = type;

    if (item) {
      this.editMode = true;
      if (type === 'aliado') {
        this.aliadoForm = {
          nombre: item.nombre,
          logo: item.logo || '',
          nombre_poc: item.nombre_poc || '',
          email_poc: item.email_poc || '',
          telefono: item.telefono || '',
          notas: item.notas || '',
        };
        this.selectedAliado = item;
      } else if (type === 'agr') {
        this.agrForm = {
          nombre: item.nombre,
          email: item.email,
          telefono: item.telefono || '',
          notas: item.notas || '',
        };
        this.selectedAGR = item;
      } else if (type === 'empresa') {
        this.empresaForm = {
          nombre: item.nombre,
          logo: item.logo || '',
          email: item.email || '',
          telefono: item.telefono || '',
          notas: item.notas || '',
        };
        this.selectedEmpresa = item;
      }
    } else {
      this.editMode = false;
      this.resetForms();
    }
  }

  resetForms(): void {
    this.aliadoForm = {
      nombre: '',
      logo: '',
      nombre_poc: '',
      email_poc: '',
      telefono: '',
      notas: '',
    };
    this.agrForm = {
      nombre: '',
      email: '',
      telefono: '',
      notas: '',
    };
    this.empresaForm = {
      nombre: '',
      logo: '',
      email: '',
      telefono: '',
      notas: '',
    };
  }

  onSubmit(): void {
    if (this.currentEntityType === 'aliado') {
      this.submitAliado();
    } else if (this.currentEntityType === 'agr') {
      this.submitAGR();
    } else if (this.currentEntityType === 'empresa') {
      this.submitEmpresa();
    }
  }

  submitAliado(): void {
    if (this.editMode && this.selectedAliado) {
      const data: any = { ...this.aliadoForm };
      Object.keys(data).forEach((key) => {
        if (!data[key]) delete data[key];
      });

      this.aliadosService
        .updateAliado(this.selectedAliado._id, data)
        .subscribe({
          next: () => {
            this.loadAliados();
            this.cancelForm();
          },
          error: (error) => {
            console.error('Error al actualizar aliado:', error);
            alert('Error al actualizar el aliado');
          },
        });
    } else {
      this.aliadosService.createAliado(this.aliadoForm).subscribe({
        next: () => {
          this.loadAliados();
          this.cancelForm();
        },
        error: (error) => {
          console.error('Error al crear aliado:', error);
          alert('Error al crear el aliado');
        },
      });
    }
  }

  submitAGR(): void {
    if (!this.selectedAliado) {
      alert('Selecciona un aliado primero');
      return;
    }

    const agrData = { ...this.agrForm, aliado_id: this.selectedAliado._id };

    if (this.editMode && this.selectedAGR) {
      const data: any = { ...agrData };
      Object.keys(data).forEach((key) => {
        if (!data[key]) delete data[key];
      });

      this.aliadosService.updateAGR(this.selectedAGR._id, data).subscribe({
        next: () => {
          this.loadAGRs(this.selectedAliado!._id);
          this.cancelForm();
        },
        error: (error) => {
          console.error('Error al actualizar AGR:', error);
          alert('Error al actualizar el AGR');
        },
      });
    } else {
      this.aliadosService.createAGR(agrData).subscribe({
        next: () => {
          this.loadAGRs(this.selectedAliado!._id);
          this.cancelForm();
        },
        error: (error) => {
          console.error('Error al crear AGR:', error);
          alert('Error al crear el AGR');
        },
      });
    }
  }

  submitEmpresa(): void {
    if (!this.selectedAGR) {
      alert('Selecciona un AGR primero');
      return;
    }

    const empresaData = { ...this.empresaForm, agr_id: this.selectedAGR._id };

    if (this.editMode && this.selectedEmpresa) {
      const data: any = { ...empresaData };
      Object.keys(data).forEach((key) => {
        if (!data[key]) delete data[key];
      });

      this.aliadosService
        .updateEmpresa(this.selectedEmpresa._id, data)
        .subscribe({
          next: () => {
            this.loadEmpresas(this.selectedAGR!._id);
            this.cancelForm();
          },
          error: (error) => {
            console.error('Error al actualizar empresa:', error);
            alert('Error al actualizar la empresa');
          },
        });
    } else {
      this.aliadosService.createEmpresa(empresaData).subscribe({
        next: () => {
          this.loadEmpresas(this.selectedAGR!._id);
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
    this.resetForms();
  }

  deleteAliado(aliado: Aliado): void {
    if (confirm(`¿Desactivar aliado ${aliado.nombre}?`)) {
      this.aliadosService.deleteAliado(aliado._id).subscribe({
        next: () => {
          this.loadAliados();
          if (this.selectedAliado?._id === aliado._id) {
            this.selectedAliado = null;
            this.agrs = [];
            this.filteredAGRs = [];
            this.empresas = [];
            this.filteredEmpresas = [];
          }
        },
        error: (error) => {
          console.error('Error al eliminar aliado:', error);
          alert('Error al eliminar el aliado');
        },
      });
    }
  }

  deleteAGR(agr: AGR): void {
    if (confirm(`¿Desactivar AGR ${agr.nombre}?`)) {
      this.aliadosService.deleteAGR(agr._id).subscribe({
        next: () => {
          if (this.selectedAliado) {
            this.loadAGRs(this.selectedAliado._id);
          }
          if (this.selectedAGR?._id === agr._id) {
            this.selectedAGR = null;
            this.empresas = [];
            this.filteredEmpresas = [];
          }
        },
        error: (error) => {
          console.error('Error al eliminar AGR:', error);
          alert('Error al eliminar el AGR');
        },
      });
    }
  }

  deleteEmpresa(empresa: Empresa): void {
    if (confirm(`¿Desactivar empresa ${empresa.nombre}?`)) {
      this.aliadosService.deleteEmpresa(empresa._id).subscribe({
        next: () => {
          if (this.selectedAGR) {
            this.loadEmpresas(this.selectedAGR._id);
          }
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
