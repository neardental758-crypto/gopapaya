import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-biketona-splash',
  standalone: true,
  template: `
    <div
      class="fixed inset-0 bg-dark-950 flex items-center justify-center z-50"
    >
      <div class="text-center animate-pulse">
        <div class="text-9xl mb-8 animate-bounce">🚴</div>
        <h1 class="text-6xl font-display font-bold text-white mb-4">
          <span class="text-neon-blue">Bike</span>tona
        </h1>
        <p class="text-gray-400 text-xl">Cargando juego...</p>
        <div class="mt-8 flex justify-center gap-2">
          <div
            class="w-3 h-3 bg-neon-blue rounded-full animate-bounce"
            style="animation-delay: 0s"
          ></div>
          <div
            class="w-3 h-3 bg-neon-yellow rounded-full animate-bounce"
            style="animation-delay: 0.2s"
          ></div>
          <div
            class="w-3 h-3 bg-neon-blue rounded-full animate-bounce"
            style="animation-delay: 0.4s"
          ></div>
        </div>
      </div>
    </div>
  `,
})
export class BiketonaSplashComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {
    setTimeout(() => {
      this.router.navigate(['/biketona/setup']);
    }, 3000);
  }
}
