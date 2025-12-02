import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BiketonaService, BiketonaCreatePayload } from '../../services/biketona.service';

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
  styleUrl: './setup.component.css'
})
export class SetupComponent implements OnInit {
  paso = 1;
  loading = false;

  configuracion: ConfiguracionCarrera = {
    tipoPista: null,
    numeroBicicletas: 2,
    numeroParticipantes: 2, 
    numeroVueltas: 3,
    tipoCompetencia: null
  };

  constructor(
    private router: Router,
    private biketonaService: BiketonaService
  ) {}
  
  ngOnInit(): void {
    console.log('iniciando configuracion');

    const idSesionStr = localStorage.getItem('idSesion');
    const idSesion = idSesionStr ? Number(idSesionStr) : 0;

    if (!idSesion) {
      console.warn('No se encontró idSesion en localStorage. Se continúa con setup normal.');
      return;
    }

    this.loading = true;
    this.biketonaService.getBySesion(idSesion).subscribe({
      next: (biketona) => {
        this.loading = false;

        // Si no hay registro o no está activa, seguimos con el flujo normal del setup
        if (!biketona || biketona.estado !== 'activa') {
          console.log('No hay biketona activa para esta sesión. Configurar nueva.');
          return;
        }

        console.log('Biketona activa encontrada:', biketona);

        // 👉 Guardamos el id de la biketona para usarlo en la pista
        localStorage.setItem('biketonaId', biketona.id);

        // 👉 Pasamos la configuración del backend al objeto de setup
        this.configuracion = {
          tipoPista: biketona.tipoPista,
          numeroBicicletas: biketona.nBicicletas,
          numeroParticipantes: biketona.nParticipantes,
          numeroVueltas: biketona.nVueltas,
          // Mapear 1vs1 (backend) -> 1v1 (front)
          tipoCompetencia: biketona.tipoCompetencia === '1vs1' ? '1v1' : biketona.tipoCompetencia
        };

        // Guardamos también la config en localStorage como lo hacías antes
        localStorage.setItem('configuracionCarrera', JSON.stringify(this.configuracion));

        // 👉 Navegamos directamente al juego según la config
        this.irDirectoAlJuego(biketona);
      },
      error: (err) => {
        this.loading = false;
        console.error('Error consultando biketona por sesión:', err);
        // En caso de error, simplemente dejamos que el usuario configure de nuevo
      }
    });
  }

  private irDirectoAlJuego(biketona: BiketonaCreatePayload): void {
  if (biketona.tipoPista === 'digital') {
    if (biketona.tipoCompetencia === '1vs1') {
      this.router.navigate(['/biketona/pista-digital-unovsuno']);
    } else if (biketona.tipoCompetencia === 'campeonato') {
      this.router.navigate(['/biketona/pista-digital-campeonato']);
    } else if (biketona.tipoCompetencia === 'campeonato-equipos') {
      this.router.navigate(['/biketona/pista-digital-equipos']);
    }
  } else if (biketona.tipoPista === 'fisica') {
    this.router.navigate(['/biketona/pista-fisica']);
  }
}


  // Paso 1: Selección de tipo de pista
  seleccionarTipoPista(tipo: 'digital' | 'fisica'): void {
    this.configuracion.tipoPista = tipo;
  }

  puedeAvanzarPaso1(): boolean {
    return this.configuracion.tipoPista !== null;
  }

  // Paso 2: Configuración de carrera

  seleccionarTipoCompetencia(tipo: '1v1' | 'campeonato' | 'campeonato-equipos'): void {
    this.configuracion.tipoCompetencia = tipo;
    
    if (tipo === '1v1') {
      // ✅ 1v1: muchos participantes, pero duelos de máximo 2 bicis
      if (this.configuracion.numeroParticipantes < 2) {
        this.configuracion.numeroParticipantes = 2;
      }
      this.configuracion.numeroBicicletas = Math.min(this.configuracion.numeroBicicletas, 2);
    } else if (tipo === 'campeonato') {
      if (this.configuracion.numeroParticipantes < 4) {
        this.configuracion.numeroParticipantes = 4;
      }
    } else if (tipo === 'campeonato-equipos') {
      if (this.configuracion.numeroParticipantes < 4) {
        this.configuracion.numeroParticipantes = 4;
      }
    }

    // Aseguramos siempre: participantes >= bicicletas
    if (this.configuracion.numeroParticipantes < this.configuracion.numeroBicicletas) {
      this.configuracion.numeroParticipantes = this.configuracion.numeroBicicletas;
    }
  }

  puedeAvanzarPaso2(): boolean {
    return (
      this.configuracion.tipoCompetencia !== null &&
      this.configuracion.numeroBicicletas >= 1 &&
      this.configuracion.numeroParticipantes >= 2 &&
      this.configuracion.numeroParticipantes >= this.configuracion.numeroBicicletas && // Los participantes deben ser >= bicicletas
      this.configuracion.numeroVueltas >= 1
    );
  }

  // Navegación entre pasos
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

finalizarConfiguracion(): void {
  console.log('Configuración completada:', this.configuracion);

  if (this.configuracion.numeroParticipantes < this.configuracion.numeroBicicletas) {
    alert('El número de participantes no puede ser menor al número de bicicletas');
    return;
  }

  // 🔹 idSesion real desde la selección de sesión
  const idSesion = Number(localStorage.getItem('idSesion') || 0);

  if (!idSesion) {
    alert('No se encontró id de sesión. Verifica cómo estás manejando la sesión.');
    return;
  }

  const tipoCompetenciaBackend: BiketonaCreatePayload['tipoCompetencia'] =
    this.configuracion.tipoCompetencia === '1v1'
      ? '1vs1'
      : (this.configuracion.tipoCompetencia as BiketonaCreatePayload['tipoCompetencia']);

  // 👉 Generamos un id tipo UUID para la PK (varchar(45) lo soporta de sobra)
  const nuevoId = crypto.randomUUID(); // disponible en navegadores modernos

  const payload: BiketonaCreatePayload = {
    id: nuevoId,             // 👈 AHORA SÍ ENVIAMOS 'id'
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

  console.log('Payload que se envía a /biketona/registrar:', payload);

  this.loading = true;

  this.biketonaService.createConfig(payload).subscribe({
    next: (biketonaCreada) => {
      console.log('Biketona guardada en DB:', biketonaCreada);
      this.loading = false;

      // 👉 Guardamos el id de la biketona para usarlo al registrar participantes
      localStorage.setItem('biketonaId', biketonaCreada.id);

      localStorage.setItem('configuracionCarrera', JSON.stringify(this.configuracion));

      if (this.configuracion.tipoPista === 'digital') {
        if (this.configuracion.tipoCompetencia === '1v1') {
          this.router.navigate(['/biketona/pista-digital-unovsuno']);
        } else if (this.configuracion.tipoCompetencia === 'campeonato') {
          this.router.navigate(['/biketona/pista-digital-campeonato']);
        } else if (this.configuracion.tipoCompetencia === 'campeonato-equipos') {
          this.router.navigate(['/biketona/pista-digital-equipos']);
        }
      } else if (this.configuracion.tipoPista === 'fisica') {
        this.router.navigate(['/biketona/pista-fisica']);
      }
    },
    error: (err) => {
      console.error('Error al registrar configuración de Biketona:', err);
      console.error('Respuesta del servidor:', err.error);
      this.loading = false;
      alert('Ocurrió un error guardando la configuración en el servidor.');
    },
  });
}


  volver(): void {
    if (this.paso > 1) {
      this.anterior();
    } else {
      this.router.navigate(['/sesion/seleccionar-juego']);
    }
  }

  // Helpers para validación de números
  ajustarBicicletas(valor: number): void {
    const min = 1;
    const max = 10;
    const nuevoValor = Math.max(min, Math.min(max, valor));
    
    this.configuracion.numeroBicicletas = nuevoValor;
    
    // Asegurar que los participantes sean al menos igual al número de bicicletas
    if (this.configuracion.numeroParticipantes < nuevoValor) {
      this.configuracion.numeroParticipantes = nuevoValor;
    }
  }

  ajustarParticipantes(valor: number): void {
    const min = this.configuracion.tipoCompetencia === '1v1' ? 2 : 2;
    const max = 50; // Máximo de participantes
    const nuevoValor = Math.max(min, Math.min(max, valor));
    
    // Los participantes deben ser al menos igual al número de bicicletas
    const minParticipantes = Math.max(min, this.configuracion.numeroBicicletas);
    
    this.configuracion.numeroParticipantes = Math.max(minParticipantes, nuevoValor);
  }

  ajustarVueltas(valor: number): void {
    const min = 1;
    const max = 20;
    this.configuracion.numeroVueltas = Math.max(min, Math.min(max, valor));
  }

  // Helper para mostrar si habrá turnos
  requiereTurnos(): boolean {
    return this.configuracion.numeroParticipantes > this.configuracion.numeroBicicletas;
  }

  obtenerNumeroTurnos(): number {
    if (!this.requiereTurnos()) return 1;
    return Math.ceil(this.configuracion.numeroParticipantes / this.configuracion.numeroBicicletas);
  }
}