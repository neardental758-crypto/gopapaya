import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-floating-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-floating-menu.component.html',
})
export class AdminFloatingMenuComponent {
  isOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  toggleMenu(): void {
    this.isOpen = !this.isOpen;
  }

  closeMenu(): void {
    this.isOpen = false;
  }

  verCalendario(): void {
    this.closeMenu();
    this.router.navigate(['/calendario']);
  }

  verReportes(): void {
    alert('📊 Módulo de Reportes - Próximamente disponible');
    this.closeMenu();
  }

  verHistorial(): void {
    this.closeMenu();
    this.router.navigate(['/historial']);
  }

  verManual(): void {
    this.closeMenu();
    this.router.navigate(['/manual']);
  }

  logout(): void {
    this.closeMenu();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
