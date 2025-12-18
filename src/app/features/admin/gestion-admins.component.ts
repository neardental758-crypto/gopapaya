import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../services/usuario.service';

import { Usuario } from '../../core/interfaces/usuario.interface';
import { EmpresaService } from '../services/empresa.service';
import { Empresa } from '../services/sesion.service';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-gestion-admins',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-admins.component.html',
})
export class GestionAdminsComponent implements OnInit {
  usuarios: Usuario[] = [];
  empresas: Empresa[] = [];
  selectedUsuario: Usuario | null = null;
  showForm = false;
  editMode = false;
  errorMessage = '';

  usuarioForm = {
    nombre: '',
    email: '',
    password: '',
    rol: 'admin' as 'admin' | 'super_admin' | 'viewer',
    empresa_ids: [] as string[],
  };

  passwordRequirements = {
    minLength: false,
  };

  constructor(
    private usuarioService: UsuarioService,
    private empresaService: EmpresaService
  ) {}

  ngOnInit(): void {
    this.loadUsuarios();
    this.loadEmpresas();
  }

  loadUsuarios(): void {
    this.usuarioService.getUsuarios().subscribe({
      next: (response) => {
        this.usuarios = response.data.map((usuario) => ({
          ...usuario,
          empresa_ids: usuario.empresa_ids || [],
        }));
      },
      error: (error) => {
        console.error('Error al cargar usuarios:', error);
      },
    });
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

  selectUsuario(usuario: Usuario): void {
    this.selectedUsuario = usuario;
  }

  toggleForm(usuario?: Usuario): void {
    this.showForm = !this.showForm;
    this.errorMessage = '';

    if (usuario) {
      this.editMode = true;
      let empresaIds: string[] = [];

      if (typeof usuario.empresa_ids === 'string') {
        try {
          empresaIds = JSON.parse(usuario.empresa_ids);
        } catch {
          empresaIds = [];
        }
      } else if (Array.isArray(usuario.empresa_ids)) {
        empresaIds = [...usuario.empresa_ids];
      }

      this.usuarioForm = {
        nombre: usuario.nombre,
        email: usuario.email,
        password: '',
        rol: usuario.rol,
        empresa_ids: empresaIds,
      };
      this.selectedUsuario = usuario;
    } else {
      this.editMode = false;
      this.resetForm();
    }
    this.resetPasswordRequirements();
  }

  resetForm(): void {
    this.usuarioForm = {
      nombre: '',
      email: '',
      password: '',
      rol: 'admin',
      empresa_ids: [],
    };
    this.errorMessage = '';
    this.resetPasswordRequirements();
  }

  onPasswordChange(): void {
    const password = this.usuarioForm.password;
    this.passwordRequirements = {
      minLength: password.length >= 6,
    };
  }

  isPasswordValid(): boolean {
    if (this.editMode && !this.usuarioForm.password) {
      return true;
    }
    return this.usuarioForm.password.length >= 6;
  }

  resetPasswordRequirements(): void {
    this.passwordRequirements = {
      minLength: false,
    };
  }

  toggleEmpresa(empresaId: string): void {
    const index = this.usuarioForm.empresa_ids.indexOf(empresaId);
    if (index > -1) {
      this.usuarioForm.empresa_ids.splice(index, 1);
    } else {
      this.usuarioForm.empresa_ids.push(empresaId);
    }
  }

  isEmpresaSelected(empresaId: string): boolean {
    return this.usuarioForm.empresa_ids.includes(empresaId);
  }

  onRolChange(): void {
    if (this.usuarioForm.rol === 'super_admin') {
      this.usuarioForm.empresa_ids = [];
    }
  }

  onSubmit(): void {
    this.errorMessage = '';

    if (
      (this.usuarioForm.rol === 'admin' || this.usuarioForm.rol === 'viewer') &&
      this.usuarioForm.empresa_ids.length === 0
    ) {
      this.errorMessage =
        'Los usuarios Admin y Viewer deben tener al menos una empresa asignada';
      return;
    }

    if (!this.editMode && !this.isPasswordValid()) {
      this.errorMessage = 'La contraseña no cumple con los requisitos mínimos';
      return;
    }

    if (this.editMode && this.selectedUsuario) {
      const data: any = { ...this.usuarioForm };
      if (!data.password) {
        delete data.password;
      } else if (!this.isPasswordValid()) {
        this.errorMessage =
          'La contraseña no cumple con los requisitos mínimos';
        return;
      }

      this.usuarioService
        .updateUsuario(this.selectedUsuario._id, data)
        .subscribe({
          next: () => {
            this.loadUsuarios();
            this.cancelForm();
          },
          error: (error) => {
            console.error('Error al actualizar usuario:', error);
            this.errorMessage =
              error.error?.message || 'Error al actualizar el usuario';
          },
        });
    } else {
      this.usuarioService.createUsuario(this.usuarioForm).subscribe({
        next: () => {
          this.loadUsuarios();
          this.cancelForm();
        },
        error: (error) => {
          console.error('Error al crear usuario:', error);
          this.errorMessage =
            error.error?.message || 'Error al crear el usuario';
        },
      });
    }
  }

  cancelForm(): void {
    this.showForm = false;
    this.editMode = false;
    this.resetForm();
  }

  deleteUsuario(usuario: Usuario): void {
    if (confirm(`¿Desactivar usuario ${usuario.nombre}?`)) {
      this.usuarioService.deleteUsuario(usuario._id).subscribe({
        next: () => {
          this.loadUsuarios();
          if (this.selectedUsuario?._id === usuario._id) {
            this.selectedUsuario = null;
          }
        },
        error: (error) => {
          console.error('Error al eliminar usuario:', error);
          alert('Error al eliminar el usuario');
        },
      });
    }
  }

  getRolLabel(rol: string): string {
    if (rol === 'super_admin') return 'Super Admin';
    if (rol === 'viewer') return 'Viewer';
    return 'Admin';
  }

  getEmpresasNombres(empresaIds: string[] | string): string {
    if (!empresaIds) return 'N/A';

    if (typeof empresaIds === 'string') {
      try {
        empresaIds = JSON.parse(empresaIds);
      } catch {
        return 'N/A';
      }
    }

    if (!Array.isArray(empresaIds) || empresaIds.length === 0) return 'N/A';

    const nombres = empresaIds
      .map((id) => {
        const empresa = this.empresas.find((e) => e._id === id);
        return empresa ? empresa.nombre : null;
      })
      .filter((n) => n !== null);
    return nombres.length > 0 ? nombres.join(', ') : 'N/A';
  }
}
