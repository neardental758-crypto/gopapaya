import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { SesionService } from '../features/services/sesion.service';
import { BicilicuadoraConfigService } from '../features/services/bicilicuadora/bicilicuadora-config.service';

@Injectable({
  providedIn: 'root',
})
export class BicilicuadoraConfigGuard implements CanActivate {
  constructor(
    private bicilicuadoraConfigService: BicilicuadoraConfigService,
    private sesionService: SesionService,
    private router: Router
  ) {}

  canActivate() {
    const sesion = this.sesionService.getSesionSeleccionada();

    if (!sesion?.id) {
      this.router.navigate(['/home']);
      return false;
    }

    return this.bicilicuadoraConfigService.getConfigBySesion(sesion.id).pipe(
      map((config) => {
        if (config) {
          this.bicilicuadoraConfigService.setConfigActual(config);
          return true;
        }
        this.router.navigate(['/bicilicuadora/parametros']);
        return false;
      }),
      catchError(() => {
        this.router.navigate(['/bicilicuadora/parametros']);
        return of(false);
      })
    );
  }
}
