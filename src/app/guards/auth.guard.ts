import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  if (token) {
    if (state.url === '/login') {
      router.navigate(['/home']);
      return false;
    }
    return true;
  }

  if (state.url !== '/login') {
    router.navigate(['/login']);
  }
  return state.url === '/login';
};
