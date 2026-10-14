import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullscreenService } from '../../../core/services/fullscreen.service';

@Component({
  selector: 'app-fullscreen-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Modo Flotante -->
    <div
      *ngIf="mode === 'floating'"
      class="fixed top-3 right-3 z-50 flex items-center gap-2"
    >
      <button
        type="button"
        (click)="toggle()"
        [attr.aria-label]="fullscreenService.isFullscreen() ? 'Salir de pantalla completa' : 'Pantalla completa'"
        class="group flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-dark-900/90 hover:bg-dark-800 text-white border-2 backdrop-blur-md transition-all shadow-lg active:scale-95 cursor-pointer"
        [class.border-neon-yellow]="fullscreenService.isFullscreen()"
        [class.shadow-neon-yellow]="fullscreenService.isFullscreen()"
        [class.border-dark-600]="!fullscreenService.isFullscreen()"
      >
        <!-- Icono Expandir -->
        <svg
          *ngIf="!fullscreenService.isFullscreen()"
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 text-neon-yellow transition-transform group-hover:scale-110"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>

        <!-- Icono Comprimir / Salir -->
        <svg
          *ngIf="fullscreenService.isFullscreen()"
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 text-neon-yellow transition-transform group-hover:scale-110"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 4v4m0 0H5m4 0L4 3m11 1v4m0 0h4m-4 0l5-5M9 20v-4m0 0H5m4 0l-5 5m11-1v-4m0 0h4m-4 0l5 5" />
        </svg>

        <span class="text-xs sm:text-sm font-bold tracking-wide hidden sm:inline">
          {{ fullscreenService.isFullscreen() ? 'Salir' : 'Pantalla Completa' }}
        </span>
      </button>
    </div>

    <!-- Modo Inline (Para cabeceras) -->
    <button
      *ngIf="mode === 'inline'"
      type="button"
      (click)="toggle()"
      [attr.aria-label]="fullscreenService.isFullscreen() ? 'Salir de pantalla completa' : 'Pantalla completa'"
      [class]="customClass || defaultInlineClass"
      [class.border-neon-yellow]="fullscreenService.isFullscreen()"
      [class.shadow-neon-yellow]="fullscreenService.isFullscreen()"
      [class.border-dark-600]="!fullscreenService.isFullscreen()"
    >
      <svg
        *ngIf="!fullscreenService.isFullscreen()"
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5 text-neon-yellow"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
      <svg
        *ngIf="fullscreenService.isFullscreen()"
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5 text-neon-yellow"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 4v4m0 0H5m4 0L4 3m11 1v4m0 0h4m-4 0l5-5M9 20v-4m0 0H5m4 0l-5 5m11-1v-4m0 0h4m-4 0l5 5" />
      </svg>
      <span class="text-xs sm:text-sm font-bold tracking-wide">
        {{ fullscreenService.isFullscreen() ? 'Salir' : 'Pantalla Completa' }}
      </span>
    </button>
  `,
})
export class FullscreenButtonComponent {
  fullscreenService = inject(FullscreenService);

  @Input() mode: 'inline' | 'floating' = 'inline';
  @Input() customClass = '';

  defaultInlineClass =
    'flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-white border transition-all active:scale-95 cursor-pointer';

  toggle(): void {
    this.fullscreenService.toggleFullscreen();
  }
}
