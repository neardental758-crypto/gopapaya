import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { SesionService } from '../features/services/sesion.service';

export const sesionActivaGuard = () => {
  const sesionService = inject(SesionService);
  const router = inject(Router);

  const sesionActiva = sesionService.getSesionSeleccionada();

  if (!sesionActiva) {
    router.navigate(['/home']);
    return false;
  }

  return true;
};
