import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Usuario } from '../../core/interfaces/usuario.interface';
import { AuthService } from '../../core/services/auth.service';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { AdminFloatingMenuComponent } from '../../features/admin/admin-floating-menu/admin-floating-menu.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SidebarComponent,
    AdminFloatingMenuComponent,
  ],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent implements OnInit {
  usuario: Usuario | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.authService.usuario$.subscribe((usuario) => {
      this.usuario = usuario;
    });
  }

  isSuperAdmin(): boolean {
    return this.usuario?.rol === 'super_admin';
  }

  isAdmin(): boolean {
    return this.usuario?.rol === 'admin';
  }

  isViewer(): boolean {
    return this.usuario?.rol === 'viewer';
  }

  isInGame(): boolean {
    const url = this.router.url;
    const gameRoutes = [
      '/brain-bike',
      '/biketona',
      '/bicilicuadora',
      '/vr',
      '/hit-fit',
      '/bici-paseo',
    ];
    return gameRoutes.some((route) => url.includes(route));
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getRolLabel(rol?: string): string {
    if (!rol) return '';
    if (rol === 'super_admin') return 'Super Admin';
    if (rol === 'viewer') return 'Viewer';
    return 'Admin';
  }
}
