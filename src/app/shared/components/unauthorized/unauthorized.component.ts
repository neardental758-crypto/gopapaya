import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  template: `
    <div class="min-h-screen bg-dark-950 flex items-center justify-center p-6">
      <div
        class="bg-dark-900 border border-dark-700 rounded-card p-12 text-center max-w-lg shadow-neon-red"
      >
        <div class="text-8xl mb-6">🚫</div>
        <h1 class="text-4xl font-bold text-white mb-4">
          Acceso <span class="text-neon-red">Denegado</span>
        </h1>
        <p class="text-lg text-gray-400 mb-8">
          No tienes permisos para acceder a esta sección
        </p>
        <button
          (click)="goHome()"
          class="px-8 py-3 bg-neon-yellow text-dark-950 rounded-lg font-bold shadow-neon-yellow hover:shadow-neon-yellow-lg hover:scale-105 transition-all"
        >
          Volver al Inicio
        </button>
      </div>
    </div>
  `,
})
export class UnauthorizedComponent {
  constructor(private router: Router) {}

  goHome(): void {
    this.router.navigate(['/home']);
  }
}
