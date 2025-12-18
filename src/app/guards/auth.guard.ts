import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  if (token) {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

    if (state.url === '/login') {
      if (usuario.rol === 'viewer') {
        router.navigate(['/historial']);
      } else {
        router.navigate(['/home']);
      }
      return false;
    }

    if (state.url === '/home' && usuario.rol === 'viewer') {
      router.navigate(['/historial']);
      return false;
    }

    return true;
  }

  if (state.url !== '/login') {
    router.navigate(['/login']);
  }
  return state.url === '/login';
};
