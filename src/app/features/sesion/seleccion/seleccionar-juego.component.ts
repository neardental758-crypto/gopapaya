import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Sesion, SesionService } from '../../services/sesion.service';

interface Juego {
  id: string;
  nombre: string;
  icono: string;
  descripcion: string;
  ruta: string;
  disponible: boolean;
}

@Component({
  selector: 'app-seleccionar-juego',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './seleccionar-juego.component.html',
})
export class SeleccionarJuegoComponent implements OnInit {
  sesionActiva: Sesion | null = null;
  cargandoSesion = true;
  idSesion: number = 0;

  juegos: Juego[] = [
    {
      id: 'brain-bike',
      nombre: 'Brain Bike',
      icono: '🧠',
      descripcion:
        'Trivia interactiva que combina ejercicio físico y preguntas de conocimiento',
      ruta: '/brain-bike/splash',
      disponible: true,
    },
    {
      id: 'biketona',
      nombre: 'Biketona',
      icono: '🚴',
      descripcion: 'Carreras competitivas en bicicletas estáticas',
      ruta: '/biketona/splash',
      disponible: true,
    }
  ];

  constructor(
    private sesionService: SesionService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.idSesion = +params['id'];
      if (this.idSesion) {
        this.cargarSesion();
      } else {
        this.router.navigate(['/home']);
      }
    });
  }

  cargarSesion(): void {
    this.cargandoSesion = true;

    this.sesionActiva = this.sesionService.getSesionSeleccionada();

    if (this.sesionActiva && this.sesionActiva.id === this.idSesion) {
      this.verificarJuegoAsignado();
      this.cargandoSesion = false;
    } else {
      this.sesionService.getSesion(this.idSesion).subscribe({
        next: (sesion) => {
          if (sesion.estadoSesion === 'activa') {
            this.sesionActiva = sesion;
            this.sesionService.setSesionSeleccionada(sesion);
            this.verificarJuegoAsignado();
          } else {
            alert('La sesión no está activa');
            this.router.navigate(['/home']);
          }
          this.cargandoSesion = false;
        },
        error: () => {
          alert('Error al cargar la sesión');
          this.router.navigate(['/home']);
          this.cargandoSesion = false;
        },
      });
    }
  }

  verificarJuegoAsignado(): void {
    if (this.sesionActiva?.juego_asignado) {
      const juegoAsignado = this.juegos.find(
        (j) => j.id === this.sesionActiva?.juego_asignado
      );
      if (juegoAsignado?.disponible) {
        this.router.navigate([juegoAsignado.ruta]);
      }
    }
  }

  seleccionarJuego(juego: Juego): void {
    if (juego.disponible && this.sesionActiva) {
      this.router.navigate([juego.ruta]);
    }
  }

  volverHome(): void {
    this.router.navigate(['/home']);
  }
}
