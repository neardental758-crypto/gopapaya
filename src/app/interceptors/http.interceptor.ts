import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');

  let headers: any = {
    Authorization: token ? `Bearer ${token}` : '',
  };

  if (!(req.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const clonedRequest = req.clone({
    setHeaders: headers,
  });

  return next(clonedRequest).pipe(
    catchError((error) => {
      console.error('Error HTTP:', error);
      return throwError(() => error);
    })
  );
};
