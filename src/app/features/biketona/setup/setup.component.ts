import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  BiketonaService,
  BiketonaCreatePayload,
} from '../../services/biketona.service';
import { BrainBikeAudioService } from '../../services/audio/brain-bike-audio.service';

interface ConfiguracionCarrera {
  tipoPista: 'digital' | 'fisica' | null;
  numeroBicicletas: number;
  numeroParticipantes: number; // NUEVO: número total de jugadores
  numeroVueltas: number;
  tipoCompetencia: '1v1' | 'campeonato' | 'campeonato-equipos' | null;
}

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './setup.component.html',
  styleUrl: './setup.component.css',
})
export class SetupComponent implements OnInit {
  paso = 1;
  loading = false;

  configuracion: ConfiguracionCarrera = {
    tipoPista: null,
    numeroBicicletas: 2,
    numeroParticipantes: 2,
    numeroVueltas: 3,
    tipoCompetencia: null,
  };

  constructor(
    private router: Router,
    private biketonaService: BiketonaService,
    public audioService: BrainBikeAudioService
  ) {}

  ngOnInit(): void {
    this.audioService.iniciarMusicaFondo('parametros');

    const idSesionStr = localStorage.getItem('idSesion');
    const idSesion = idSesionStr ? Number(idSesionStr) : 0;

    if (!idSesion) {
      console.warn(
        'No se encontró idSesion en localStorage. Se continúa con setup normal.'
      );
      return;
    }

    this.loading = true;
    this.biketonaService.getBySesion(idSesion).subscribe({
      next: (biketona) => {
        this.loading = false;

        if (!biketona || biketona.estado !== 'activa') {
          console.log(
            'No hay biketona activa para esta sesión. Configurar nueva.'
          );
          return;
        }

        localStorage.setItem('biketonaId', biketona.id);

        this.configuracion = {
          tipoPista: biketona.tipoPista,
          numeroBicicletas: biketona.nBicicletas,
          numeroParticipantes: biketona.nParticipantes,
          numeroVueltas: biketona.nVueltas,
          tipoCompetencia:
            biketona.tipoCompetencia === '1vs1'
              ? '1v1'
              : biketona.tipoCompetencia,
        };

        localStorage.setItem(
          'configuracionCarrera',
          JSON.stringify(this.configuracion)
        );

        this.irDirectoAlJuego(biketona);
      },
      error: (err) => {
        this.loading = false;
        console.error('Error consultando biketona por sesión:', err);
      },
    });
  }

  private irDirectoAlJuego(biketona: BiketonaCreatePayload): void {
    this.navegarSegunConfiguracion(
      biketona.tipoPista,
      biketona.tipoCompetencia
    );
  }

  seleccionarTipoPista(tipo: 'digital' | 'fisica'): void {
    this.configuracion.tipoPista = tipo;

    const idSesionStr = localStorage.getItem('idSesion');
    const idSesion = idSesionStr ? Number(idSesionStr) : 0;

    if (!idSesion) {
      console.warn('No se encontró idSesion en localStorage.');
      return;
    }

    this.loading = true;

    this.biketonaService.getBySesion(idSesion).subscribe({
      next: (biketona) => {
        this.loading = false;

        if (!biketona || biketona.estado !== 'activa') {
          console.log('No hay biketona activa. Continuar con setup.');
          return;
        }

        if (biketona.tipoPista !== tipo) {
          console.log('Tipo de pista diferente. Continuar con setup.');
          return;
        }

        localStorage.setItem('biketonaId', biketona.id);

        const usuarioStr = localStorage.getItem('usuario');
        let userId = '0';

        if (usuarioStr) {
          try {
            const usuario = JSON.parse(usuarioStr);
            userId = usuario.id || usuario._id || '0';
          } catch (e) {
            console.warn('No se pudo parsear usuario');
          }
        }

        localStorage.setItem('sesionId', biketona.idSesion.toString());
        localStorage.setItem('userId', userId);

        this.configuracion = {
          tipoPista: biketona.tipoPista,
          numeroBicicletas: biketona.nBicicletas,
          numeroParticipantes: biketona.nParticipantes,
          numeroVueltas: biketona.nVueltas,
          tipoCompetencia:
            biketona.tipoCompetencia === '1vs1'
              ? '1v1'
              : biketona.tipoCompetencia,
        };

        localStorage.setItem(
          'configuracionCarrera',
          JSON.stringify(this.configuracion)
        );

        this.navegarSegunConfiguracion(
          biketona.tipoPista,
          biketona.tipoCompetencia
        );
      },
      error: (err) => {
        this.loading = false;
        console.error('Error consultando biketona:', err);
      },
    });
  }

  private navegarSegunConfiguracion(
    tipoPista: 'digital' | 'fisica',
    tipoCompetencia: string
  ): void {
    const sufijo = tipoPista === 'digital' ? 'digital' : 'fisica';

    if (tipoPista === 'fisica') {
      this.router.navigate(['/biketona/pista-fisica']);
      return;
    }

    if (tipoCompetencia === '1vs1') {
      this.router.navigate([`/biketona/pista-${sufijo}-unovsuno`]);
    } else if (tipoCompetencia === 'campeonato') {
      this.router.navigate([`/biketona/pista-${sufijo}-campeonato`]);
    } else if (tipoCompetencia === 'campeonato-equipos') {
      this.router.navigate([`/biketona/pista-${sufijo}-equipos`]);
    }
  }

  puedeAvanzarPaso1(): boolean {
    return this.configuracion.tipoPista !== null;
  }

  siguiente(): void {
    if (this.paso === 1 && this.puedeAvanzarPaso1()) {
      this.paso = 2;
    } else if (this.paso === 2 && this.puedeAvanzarPaso2()) {
      this.finalizarConfiguracion();
    }
  }

  anterior(): void {
    if (this.paso > 1) {
      this.paso--;
    }
  }

  volver(): void {
    if (this.paso > 1) {
      this.anterior();
    } else {
      this.router.navigate(['/sesion/seleccionar-juego']);
    }
  }

  ajustarBicicletas(valor: number): void {
    const min = 1;
    const max = 10;
    const nuevoValor = Math.max(min, Math.min(max, valor));

    this.configuracion.numeroBicicletas = nuevoValor;

    if (this.configuracion.numeroParticipantes < nuevoValor) {
      this.configuracion.numeroParticipantes = nuevoValor;
    }
  }

  ajustarVueltas(valor: number): void {
    const min = 1;
    const max = 20;
    this.configuracion.numeroVueltas = Math.max(min, Math.min(max, valor));
  }

  requiereTurnos(): boolean {
    return (
      this.configuracion.numeroParticipantes >
      this.configuracion.numeroBicicletas
    );
  }

  obtenerNumeroTurnos(): number {
    if (!this.requiereTurnos()) return 1;
    return Math.ceil(
      this.configuracion.numeroParticipantes /
        this.configuracion.numeroBicicletas
    );
  }

  esPotenciaDeDos(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
  }

  obtenerPotenciaDeDosValida(
    n: number,
    direccion: 'subir' | 'bajar' = 'subir'
  ): number {
    const potencias = [2, 4, 8, 16, 32];

    if (direccion === 'subir') {
      return potencias.find((p) => p >= n) || 4;
    } else {
      const potenciasReversas = [...potencias].reverse();
      return potenciasReversas.find((p) => p <= n) || 2;
    }
  }

  ajustarParticipantes(valor: number): void {
    const valorAnterior = this.configuracion.numeroParticipantes;
    const min = this.configuracion.tipoCompetencia === '1v1' ? 2 : 2;
    const max = 50;
    let nuevoValor = Math.max(min, Math.min(max, valor));

    const minParticipantes = Math.max(min, this.configuracion.numeroBicicletas);
    nuevoValor = Math.max(minParticipantes, nuevoValor);

    if (
      this.configuracion.tipoCompetencia === 'campeonato' ||
      this.configuracion.tipoCompetencia === 'campeonato-equipos'
    ) {
      const direccion = nuevoValor < valorAnterior ? 'bajar' : 'subir';
      nuevoValor = this.obtenerPotenciaDeDosValida(nuevoValor, direccion);
    }

    this.configuracion.numeroParticipantes = nuevoValor;
  }

  validarNumeroParticipantes(): { valido: boolean; mensaje: string } {
    const { tipoCompetencia, numeroParticipantes } = this.configuracion;

    if (
      tipoCompetencia === 'campeonato' ||
      tipoCompetencia === 'campeonato-equipos'
    ) {
      if (!this.esPotenciaDeDos(numeroParticipantes)) {
        return {
          valido: false,
          mensaje: `Para campeonatos debe ser potencia de 2: 2, 4, 8, 16 o 32 participantes. Actualmente: ${numeroParticipantes}`,
        };
      }
    }

    if (tipoCompetencia === '1v1' && numeroParticipantes < 2) {
      return {
        valido: false,
        mensaje: 'Para 1v1 se necesitan mínimo 2 participantes',
      };
    }

    return { valido: true, mensaje: '' };
  }

  seleccionarTipoCompetencia(
    tipo: '1v1' | 'campeonato' | 'campeonato-equipos'
  ): void {
    this.configuracion.tipoCompetencia = tipo;

    if (tipo === '1v1') {
      if (this.configuracion.numeroParticipantes < 2) {
        this.configuracion.numeroParticipantes = 2;
      }
      this.configuracion.numeroBicicletas = Math.min(
        this.configuracion.numeroBicicletas,
        2
      );
    } else if (tipo === 'campeonato' || tipo === 'campeonato-equipos') {
      if (!this.esPotenciaDeDos(this.configuracion.numeroParticipantes)) {
        this.configuracion.numeroParticipantes =
          this.obtenerPotenciaDeDosValida(
            this.configuracion.numeroParticipantes
          );
      }
    }

    if (
      this.configuracion.numeroParticipantes <
      this.configuracion.numeroBicicletas
    ) {
      this.configuracion.numeroParticipantes =
        this.configuracion.numeroBicicletas;
    }
  }

  puedeAvanzarPaso2(): boolean {
    if (this.configuracion.tipoCompetencia === null) return false;
    if (this.configuracion.numeroBicicletas < 1) return false;
    if (this.configuracion.numeroParticipantes < 2) return false;
    if (
      this.configuracion.numeroParticipantes <
      this.configuracion.numeroBicicletas
    )
      return false;
    if (this.configuracion.numeroVueltas < 1) return false;

    const validacion = this.validarNumeroParticipantes();
    return validacion.valido;
  }

  finalizarConfiguracion(): void {
    if (
      this.configuracion.numeroParticipantes <
      this.configuracion.numeroBicicletas
    ) {
      alert(
        'El número de participantes no puede ser menor al número de bicicletas'
      );
      return;
    }

    const validacion = this.validarNumeroParticipantes();
    if (!validacion.valido) {
      alert(validacion.mensaje);
      return;
    }

    const idSesion = Number(localStorage.getItem('idSesion') || 0);
    if (!idSesion) {
      alert(
        'No se encontró id de sesión. Verifica cómo estás manejando la sesión.'
      );
      return;
    }

    const tipoCompetenciaBackend: BiketonaCreatePayload['tipoCompetencia'] =
      this.configuracion.tipoCompetencia === '1v1'
        ? '1vs1'
        : (this.configuracion
            .tipoCompetencia as BiketonaCreatePayload['tipoCompetencia']);

    const nuevoId = crypto.randomUUID();

    const payload: BiketonaCreatePayload = {
      id: nuevoId,
      idSesion,
      tipoPista: this.configuracion.tipoPista!,
      nBicicletas: this.configuracion.numeroBicicletas,
      nParticipantes: this.configuracion.numeroParticipantes,
      nVueltas: this.configuracion.numeroVueltas,
      tipoCompetencia: tipoCompetenciaBackend,
      distanciaPista: 100,
      fechaCreacion: new Date().toISOString(),
      estado: 'activa',
    };

    this.loading = true;

    this.biketonaService.createConfig(payload).subscribe({
      next: (biketonaCreada) => {
        this.loading = false;

        const usuarioStr = localStorage.getItem('usuario');
        let userId = '0';

        if (usuarioStr) {
          try {
            const usuario = JSON.parse(usuarioStr);
            userId = usuario.id || usuario._id || '0';
          } catch (e) {
            console.warn('No se pudo parsear usuario');
          }
        }

        localStorage.setItem('biketonaId', biketonaCreada.id);
        localStorage.setItem('sesionId', biketonaCreada.idSesion.toString());
        localStorage.setItem('userId', userId);
        localStorage.setItem(
          'configuracionCarrera',
          JSON.stringify(this.configuracion)
        );

        this.navegarSegunConfiguracion(
          this.configuracion.tipoPista!,
          tipoCompetenciaBackend
        );
      },
      error: (err) => {
        console.error('❌ Error al registrar biketona:', err);
        this.loading = false;
        alert('Ocurrió un error guardando la configuración en el servidor.');
      },
    });
  }

  ngOnDestroy(): void {
    this.audioService.detenerMusicaFondo();
  }
}
