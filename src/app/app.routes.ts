import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { HomeComponent } from './features/home/home.component';
import { TematicasComponent } from './features/tematicas/tematicas.component';
import { authGuard } from './guards/auth.guard';
import { rolGuard } from './guards/rol.guard';
import { sesionActivaGuard } from './guards/sesion-activa.guard';
import { GestionAdminsComponent } from './features/admin/gestion-admins.component';
import { LoginComponent } from './features/auth/login.component';
import { CrearSesionComponent } from './features/sesion/crear-sesion.component';
import { SeleccionarJuegoComponent } from './features/sesion/seleccion/seleccionar-juego.component';
import { UnauthorizedComponent } from './shared/components/unauthorized/unauthorized.component';
import { BrainBikeParametrosComponent } from './features/brain-bike/parametros/parametros.component';
import { BrainBikeRegistroComponent } from './features/brain-bike/registro/registro.component';
import { BrainBikeReglasComponent } from './features/brain-bike/reglas/reglas.component';
import { BrainBikeSplashComponent } from './features/brain-bike/splash/splash.component';
import { BrainBikeCountdownComponent } from './features/brain-bike/countdown/countdown.component';
import { BrainBikeJuegoComponent } from './features/brain-bike/juego/juego.component';
import { GestionEmpresasComponent } from './features/gestion-empresas/gestion-empresas.component';
import { EditarParametrosSesionComponent } from './features/brain-bike/editar-parametros-sesion/editar-parametros-sesion.component';
import { CalendarioSesionesComponent } from './features/brain-bike/calendario-sesiones/calendario-sesiones.component';
import { HistorialSesionesComponent } from './features/brain-bike/historial-sesiones/historial-sesiones.component';
import { historialGuard } from './guards/historial.guard';
import { HistorialDetalleComponent } from './features/brain-bike/historial-sesiones/historial-detalle/historial-detalle.component';
import { SetupComponent } from './features/biketona/setup/setup.component';
import { BiketonaSplashComponent } from './features/biketona/splash/splash.component';
import { PistaDigital1v1Component } from './features/biketona/pista-digital-unovsuno/pista-digital-unovsuno.component';
import { PistaDigitalCampeonatoComponent } from './features/biketona/pista-digital-campeonato/pista-digital-campeonato.component';
import { PistaDigitalEquiposComponent } from './features/biketona/pista-digital-equipos/pista-digital-equipos.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'unauthorized',
    component: UnauthorizedComponent,
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      { path: 'brain-bike', component: TematicasComponent },
      {
        path: 'admin/usuarios',
        component: GestionAdminsComponent,
        canActivate: [rolGuard],
        data: { roles: ['super_admin'] },
      },
      {
        path: 'admin/empresas',
        component: GestionEmpresasComponent,
        canActivate: [rolGuard],
        data: { roles: ['super_admin'] },
      },
      {
        path: 'sesion/crear',
        component: CrearSesionComponent,
      },
      {
        path: 'sesion/seleccionar-juego/:id',
        component: SeleccionarJuegoComponent,
        canActivate: [sesionActivaGuard],
      },
      {
        path: 'brain-bike/splash',
        component: BrainBikeSplashComponent,
        canActivate: [sesionActivaGuard],
      },
      {
        path: 'brain-bike/parametros',
        component: BrainBikeParametrosComponent,
        canActivate: [sesionActivaGuard],
      },
      {
        path: 'brain-bike/registro',
        component: BrainBikeRegistroComponent,
        canActivate: [sesionActivaGuard],
      },
      {
        path: 'brain-bike/reglas',
        component: BrainBikeReglasComponent,
        canActivate: [sesionActivaGuard],
      },
      {
        path: 'brain-bike/countdown',
        component: BrainBikeCountdownComponent,
        canActivate: [sesionActivaGuard],
      },
      {
        path: 'brain-bike/juego',
        component: BrainBikeJuegoComponent,
        canActivate: [sesionActivaGuard],
      },
      {
        path: 'sesion/editar-parametros/:id',
        component: EditarParametrosSesionComponent,
        canActivate: [rolGuard],
        data: { roles: ['super_admin'] },
      },
      {
        path: 'calendario',
        component: CalendarioSesionesComponent,
      },
      {
        path: 'historial',
        component: HistorialSesionesComponent,
        canActivate: [historialGuard],
      },
      {
        path: 'historial/:id',
        component: HistorialDetalleComponent,
        canActivate: [historialGuard],
      },
      {
        path: 'biketona/splash',
        component: BiketonaSplashComponent,
        canActivate: [sesionActivaGuard],
      },
      {
        path: 'biketona/setup',
        component: SetupComponent,
        canActivate: [sesionActivaGuard],
      },
      {
        path: 'biketona/pista-digital-unovsuno',
        component: PistaDigital1v1Component,
        canActivate: [sesionActivaGuard],
      },
      {
        path: 'biketona/pista-digital-campeonato',
        component: PistaDigitalCampeonatoComponent,
        canActivate: [sesionActivaGuard],
      },
      {
        path: 'biketona/pista-digital-equipos',
        component: PistaDigitalEquiposComponent,
        canActivate: [sesionActivaGuard],
      },
      /*{
        path: 'ble-esp32',
        component: BleEsp32Component,
        canActivate: [sesionActivaGuard],
      }*/
    ],
  },
  { path: '**', redirectTo: 'home' },
];
