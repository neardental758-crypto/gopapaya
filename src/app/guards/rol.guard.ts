import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const rolGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const usuarioString = localStorage.getItem('usuario');

  if (!usuarioString) {
    router.navigate(['/login']);
    return false;
  }

  try {
    const usuario = JSON.parse(usuarioString);
    const rolesPermitidos = route.data['roles'] as Array<string>;

    if (rolesPermitidos && rolesPermitidos.length > 0) {
      if (!rolesPermitidos.includes(usuario.rol)) {
        router.navigate(['/unauthorized']);
        return false;
      }
    }

    return true;
  } catch (error) {
    router.navigate(['/login']);
    return false;
  }
};
