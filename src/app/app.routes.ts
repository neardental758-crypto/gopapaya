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
import { GestionAliadosComponent } from './features/aliados/gestion-aliados.component';
import { PistaFisicaCampeonatoComponent } from './features/biketona/pista-fisica/pista-fisica-campeonato/pista-fisica-campeonato.component';
import { PistaFisicaUnovsunoComponent } from './features/biketona/pista-fisica/pista-fisica-unovsuno/pista-fisica-unovsuno.component';
import { BicilicuadoraComponent } from './features/bicilicuadora/bicilicuadora.component';
import { BicilicuadoraParametrosComponent } from './features/bicilicuadora/bicilicuadora-parametros/bicilicuadora-parametros.component';
import { BicilicuadoraRegistroComponent } from './features/bicilicuadora/bicilicuadora-registro/bicilicuadora-registro.component';
import { BicilicuadoraConfigGuard } from './guards/bicilicuadora-config.guard';
import { BicilicuadoraJuegoComponent } from './features/bicilicuadora/bicilicuadora-juego/bicilicuadora-juego.component';
import { BicilicuadoraConexionComponent } from './features/bicilicuadora/bicilicuadora-conexion/bicilicuadora-conexion.component';
import { PistaFisicaEquiposComponent } from './features/biketona/pista-fisica/pista-fisica-equipos/pista-fisica-equipos.component';
import { VrRegistroComponent } from './features/Vr/vr-registro/vr-registro.component';
import { VrJuegoComponent } from './features/Vr/juego/vr-juego.component';
import { HitFitRegistroComponent } from './features/hit-fit/registro/hit-fit-registro.component';
import { HitFitJuegoComponent } from './features/hit-fit/juego/hit-fit-juego.component';
import { BiciPaseoRegistroComponent } from './features/bici-paseo/registro/bici-paseo-registro.component';
import { BiciPaseoJuegoComponent } from './features/bici-paseo/juego/bici-paseo-juego.component';

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
        path: 'admin/aliados',
        component: GestionAliadosComponent,
        canActivate: [rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'sesion/crear',
        component: CrearSesionComponent,
        canActivate: [rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'sesion/seleccionar-juego/:id',
        component: SeleccionarJuegoComponent,
        canActivate: [sesionActivaGuard, rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'brain-bike/splash',
        component: BrainBikeSplashComponent,
        canActivate: [sesionActivaGuard, rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'brain-bike/parametros',
        component: BrainBikeParametrosComponent,
        canActivate: [sesionActivaGuard, rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'brain-bike/registro',
        component: BrainBikeRegistroComponent,
        canActivate: [sesionActivaGuard, rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'brain-bike/reglas',
        component: BrainBikeReglasComponent,
        canActivate: [sesionActivaGuard, rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'brain-bike/countdown',
        component: BrainBikeCountdownComponent,
        canActivate: [sesionActivaGuard, rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'brain-bike/juego',
        component: BrainBikeJuegoComponent,
        canActivate: [sesionActivaGuard, rolGuard],
        data: { roles: ['super_admin', 'admin'] },
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
        canActivate: [rolGuard],
        data: { roles: ['super_admin', 'admin', 'viewer'] },
      },
      {
        path: 'historial',
        component: HistorialSesionesComponent,
        canActivate: [rolGuard],
        data: { roles: ['super_admin', 'admin', 'viewer'] },
      },
      {
        path: 'historial/:id',
        component: HistorialDetalleComponent,
        canActivate: [rolGuard],
        data: { roles: ['super_admin', 'admin', 'viewer'] },
      },
      {
        path: 'biketona/splash',
        component: BiketonaSplashComponent,
        canActivate: [sesionActivaGuard, rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'biketona/setup',
        component: SetupComponent,
        canActivate: [sesionActivaGuard, rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'biketona/pista-digital-unovsuno',
        component: PistaDigital1v1Component,
        canActivate: [sesionActivaGuard, rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'biketona/pista-digital-campeonato',
        component: PistaDigitalCampeonatoComponent,
        canActivate: [sesionActivaGuard, rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'biketona/pista-digital-equipos',
        component: PistaDigitalEquiposComponent,
        canActivate: [sesionActivaGuard, rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'biketona/pista-fisica-unovsuno',
        component: PistaFisicaUnovsunoComponent,
        canActivate: [sesionActivaGuard, rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'biketona/pista-fisica-equipos',
        component: PistaFisicaEquiposComponent,
        canActivate: [sesionActivaGuard, rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'biketona/pista-fisica-campeonato',
        component: PistaFisicaCampeonatoComponent,
        canActivate: [sesionActivaGuard, rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      // ✅ BICILICUADORA - Movido aquí dentro
      {
        path: 'bicilicuadora/parametros',
        component: BicilicuadoraParametrosComponent,
        canActivate: [sesionActivaGuard, rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'bicilicuadora/registro',
        component: BicilicuadoraRegistroComponent,
        canActivate: [sesionActivaGuard, rolGuard, BicilicuadoraConfigGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'bicilicuadora/juego',
        component: BicilicuadoraJuegoComponent,
        canActivate: [sesionActivaGuard, rolGuard, BicilicuadoraConfigGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'bicilicuadora/bebidas',
        component: BicilicuadoraComponent,
        canActivate: [rolGuard],
        data: { roles: ['super_admin'] },
      },
      {
        path: 'bicilicuadora/conexion',
        component: BicilicuadoraConexionComponent,
      },
      {
        path: 'vr/registro',
        component: VrRegistroComponent,
        canActivate: [sesionActivaGuard, rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'vr/juego',
        component: VrJuegoComponent,
        canActivate: [sesionActivaGuard, rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'hit-fit/registro',
        component: HitFitRegistroComponent,
        canActivate: [sesionActivaGuard, rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'hit-fit/juego',
        component: HitFitJuegoComponent,
        canActivate: [sesionActivaGuard, rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'bici-paseo/registro',
        component: BiciPaseoRegistroComponent,
        canActivate: [sesionActivaGuard, rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
      {
        path: 'bici-paseo/juego',
        component: BiciPaseoJuegoComponent,
        canActivate: [sesionActivaGuard, rolGuard],
        data: { roles: ['super_admin', 'admin'] },
      },
    ],
  },
  { path: '**', redirectTo: 'home' },
];
