import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const historialGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const usuarioString = localStorage.getItem('usuario');

  if (!usuarioString) {
    router.navigate(['/login']);
    return false;
  }

  try {
    const usuario = JSON.parse(usuarioString);
    if (
      usuario.rol === 'super_admin' ||
      usuario.rol === 'admin' ||
      usuario.rol === 'viewer'
    ) {
      return true;
    }
    router.navigate(['/unauthorized']);
    return false;
  } catch (error) {
    router.navigate(['/login']);
    return false;
  }
};
