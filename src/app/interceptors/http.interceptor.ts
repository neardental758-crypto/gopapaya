import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { catchError, of, throwError } from 'rxjs';

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
      // Si el servidor respondió 2xx exitoso (ej. 200 OK) pero falló el parser JSON de Angular
      // porque el backend retornó texto plano o body no JSON:
      if (error instanceof HttpErrorResponse && error.status >= 200 && error.status < 300) {
        return of(
          new HttpResponse({
            status: error.status,
            statusText: error.statusText,
            url: error.url || undefined,
            body: error.error?.text ?? null,
          })
        );
      }

      console.error('Error HTTP:', error);
      return throwError(() => error);
    })
  );
};
