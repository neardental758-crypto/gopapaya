import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Usuario } from '../../core/interfaces/usuario.interface';

type ManualBullet = {
  title: string;
  description?: string;
};

type ManualSection = {
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  badge?: string;
  disabled?: boolean;
  description: string;
  infoShown?: string[];
  functionalities?: string[];
  actions?: ManualBullet[];
};

@Component({
  selector: 'app-manual-usuario',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manual-usuario.component.html',
})
export class ManualUsuarioComponent implements OnInit {
  usuario: Usuario | null = null;
  sections: ManualSection[] = [];
  openSectionIndex: number | null = 0;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.usuario = this.authService.getUsuario();
    this.sections = this.buildSections();

    this.authService.usuario$.subscribe((u) => {
      this.usuario = u;
      this.sections = this.buildSections();
      this.openSectionIndex = 0;
    });
  }

  isSuperAdmin(): boolean {
    return this.usuario?.rol === 'super_admin';
  }

  isAdmin(): boolean {
    return this.usuario?.rol === 'admin';
  }

  goTo(route?: string, disabled?: boolean): void {
    if (!route || disabled) return;
    this.router.navigate([route]);
  }

  toggleSection(index: number): void {
    this.openSectionIndex = this.openSectionIndex === index ? null : index;
  }

  isSectionOpen(index: number): boolean {
    return this.openSectionIndex === index;
  }

  private buildSections(): ManualSection[] {
    if (this.isSuperAdmin()) {
      return this.getSuperAdminSections();
    }

    return this.getAdminSections();
  }

  private getAdministracionRoute(): string {
    return this.isSuperAdmin() ? '/admin/usuarios' : '/admin/aliados';
  }

  private getSuperAdminSections(): ManualSection[] {
    return [
      {
        title: 'Brain Bike',
        subtitle: 'Temáticas',
        icon: '🧠',
        route: '/brain-bike',
        description:
          'Módulo para consultar y gestionar las temáticas disponibles de Brain Bike.',
        infoShown: [
          'Tabla de temáticas: Nombre, Descripción, Logo, Contenidos (cantidad).',
          'Sección de Contenidos (al seleccionar una temática): nombre, link del video (si existe), número de preguntas.',
          'Sección de Preguntas (al seleccionar un contenido): pregunta y sus respuestas (marca la correcta).',
        ],
        functionalities: [
          'Seleccionar una temática para mostrar sus contenidos.',
          'Seleccionar un contenido para mostrar sus preguntas.',
        ],
        actions: [
          {
            title: '➕ Nueva Temática',
            description:
              'Abre el formulario para crear una temática (nombre, descripción y logo).',
          },
          {
            title: '✏️ Editar / 🗑️ Eliminar (Temática)',
            description:
              'Edita los datos de la temática o la elimina (solo se permite eliminar si no tiene contenidos asociados).',
          },
          {
            title: '➕ Nuevo Contenido',
            description:
              'Crea contenido dentro de una temática (nombre del contenido y link de video).',
          },
          {
            title: '🔗 Ver video',
            description:
              'Abre el link del video del contenido en una pestaña nueva (si fue configurado).',
          },
          {
            title: '✏️ / 🗑️ (Contenido)',
            description:
              'Edita o elimina un contenido (solo se permite eliminar si no tiene preguntas asociadas).',
          },
          {
            title: '➕ Nueva Pregunta',
            description:
              'Crea una pregunta con mínimo 2 respuestas y marca la respuesta correcta.',
          },
          {
            title: '✏️ / 🗑️ (Pregunta)',
            description:
              'Edita o elimina una pregunta del contenido seleccionado.',
          },
        ],
      },
      {
        title: 'Bicilicuadora',
        subtitle: 'Bebidas',
        icon: '🥤',
        route: '/bicilicuadora/bebidas',
        description:
          'Módulo para gestionar el catálogo de bebidas que se usa en Bicilicuadora.',
        infoShown: [
          'Tabla de bebidas: Nombre, Foto, Tiempo (segundos), Ingredientes (cantidad), Ritmos (cantidad), Acciones.',
          'Formulario de bebida: nombre, descripción, foto, tiempo de pedaleo, calorías, watts, link de video (YouTube) con preview si es válido.',
          'Secciones internas por bebida: Ingredientes y Ritmos de pedaleo (según configuración del módulo).',
        ],
        functionalities: [
          'Seleccionar una bebida para ver sus secciones internas (ingredientes/ritmos).',
          'Validación de formulario: algunos campos son obligatorios (por ejemplo nombre y tiempo de pedaleo).',
        ],
        actions: [
          {
            title: '➕ Nueva Bebida',
            description:
              'Abre el formulario para crear una bebida nueva y guardarla en el catálogo.',
          },
          {
            title: '📷 Seleccionar imagen',
            description:
              'Adjunta una foto; se muestra una vista previa antes de guardar.',
          },
          {
            title: '💾 Guardar / Actualizar',
            description:
              'Guarda los cambios del formulario. El botón se deshabilita si el formulario no es válido.',
          },
          {
            title: '👁️ Ver detalle',
            description: 'Abre el modal de detalle de la bebida seleccionada.',
          },
          {
            title: '✏️ Editar / 🗑️ Eliminar',
            description: 'Edita o elimina la bebida del catálogo.',
          },
        ],
      },
      {
        title: 'Administración',
        subtitle: 'Usuarios / Aliados',
        icon: '⚙️',
        route: this.getAdministracionRoute(),
        description:
          'Módulo administrativo con submódulos para gestionar usuarios administradores y aliados.',
        infoShown: [
          'Usuarios: tabla con Nombre, Email, Rol y Acciones.',
          'Aliados: paneles para Aliados, AGRs y Empresas, con buscador y lista seleccionable.',
          'Modal de detalles: información del item seleccionado (por ejemplo logo, nombre, contacto, notas, fechas).',
        ],
        functionalities: [
          'Usuarios: crear/editar administradores y asignar rol (admin/super_admin/viewer).',
          'Aliados: filtrar por texto (búsqueda) en Aliados/AGRs/Empresas.',
          'Aliados: seleccionar un Aliado para cargar AGRs, y un AGR para cargar Empresas.',
        ],
        actions: [
          {
            title: 'Usuarios (Solo Super Admin)',
            description:
              'Permite crear y editar administradores; asignar roles/empresa según el flujo del sistema.',
          },
          {
            title: 'Aliados',
            description:
              'Permite gestionar aliados usados en sesiones y actividades (crear/editar).',
          },
          {
            title: '👥 Usuarios - ➕ Nuevo Usuario',
            description:
              'Abre el formulario para crear un usuario (Nombre, Email, Contraseña y Rol).',
          },
          {
            title: '👥 Usuarios - ✏️ Editar / 🗑️ Desactivar',
            description:
              'Edita un usuario o lo desactiva desde la tabla de acciones.',
          },
          {
            title: '🤝 Aliados - 🔍 Buscar + ➕ Crear',
            description:
              'Busca por nombre/POC/email y crea nuevos registros (Aliado/AGR/Empresa) desde cada panel.',
          },
          {
            title: '🤝 Aliados - 👁️ Detalles / ✏️ Editar / 🗑️ Desactivar',
            description:
              'Acciones rápidas disponibles en cada tarjeta de listado.',
          },
        ],
      },
      {
        title: 'Calendario',
        subtitle: 'Agenda de sesiones',
        icon: '📅',
        route: '/calendario',
        description:
          'Módulo para consultar la programación de sesiones, fechas y horarios.',
        infoShown: [
          'Vista calendario (Mes/Semana/Día).',
          'Eventos por día con hora, cliente y ubicación (si aplica).',
        ],
        functionalities: [
          'Filtros por: Aliado, AGR, Empresa, Admin y Juego.',
          'Navegación: mes anterior, hoy y mes siguiente.',
          'Cambio de vista: Mes / Semana / Día.',
        ],
        actions: [
          {
            title: '➕ Nueva Sesión (Solo Super Admin)',
            description:
              'Crea una sesión desde el calendario (disponible solo para Super Admin).',
          },
          {
            title: '➕ Crear sesión en una fecha (Mes)',
            description:
              'En la vista Mes, aparece un botón ➕ por día para crear sesión en esa fecha (Super Admin).',
          },
          {
            title: 'Mes / Semana / Día',
            description: 'Cambian la forma de visualización del calendario.',
          },
        ],
      },
      {
        title: 'Historial',
        subtitle: 'Sesiones finalizadas',
        icon: '📜',
        route: '/historial',
        description:
          'Módulo para consultar sesiones finalizadas y revisar su detalle cuando aplique.',
        infoShown: [
          'Filtros: Empresa, Juego, Cronograma, Secuencia, Rango de fechas (Desde/Hasta).',
          'Indicadores globales (según filtros): sesiones, participantes, duración total y métricas adicionales por juego.',
          'Listado agrupado de sesiones: empresa/cliente, juego, acciones de exportación y evidencias.',
          'Al expandir una sesión: métricas (participantes, velocidades, distancia, calorías, vatios, duración) según tipo de juego.',
        ],
        functionalities: [
          'Filtrar el historial por empresa/juego/fechas y criterios adicionales (cronograma/secuencia).',
          'Expandir/contraer todas las sesiones para revisión rápida.',
        ],
        actions: [
          {
            title: '🗑️ Limpiar filtros',
            description:
              'Restablece filtros y vuelve al listado general (según tu rol).',
          },
          {
            title: '📊 Exportar Todo',
            description:
              'Exporta el historial general a Excel (se deshabilita si no hay datos).',
          },
          {
            title: '📥 Descargar estadísticas (Excel) por sesión',
            description:
              'Descarga el Excel de estadísticas para el grupo/sesión seleccionada.',
          },
          {
            title: '📄 Informe PDF',
            description: 'Descarga el informe PDF de la sesión.',
          },
          {
            title: '📸 Evidencias',
            description: 'Abre el modal de evidencias asociadas a la sesión.',
          },
          {
            title: '✉️ Enviar correo',
            description:
              'Abre el modal para enviar correos con información de la sesión (visible en pantallas con espacio suficiente).',
          },
        ],
      },
      {
        title: 'Manual',
        subtitle: 'Guía de módulos',
        icon: '📘',
        route: '/manual',
        description:
          'Guía rápida de funcionalidades por módulo con acceso directo.',
      },
    ];
  }

  private getAdminSections(): ManualSection[] {
    return [
      {
        title: 'Calendario',
        subtitle: 'Agenda de sesiones',
        icon: '📅',
        route: '/calendario',
        description:
          'Consulta la programación de sesiones y sus fechas/horarios.',
        infoShown: ['Vista calendario (Mes/Semana/Día) con eventos por fecha.'],
        functionalities: [
          'Filtros por: Aliado, AGR, Empresa, Admin y Juego.',
          'Navegación por mes y botón “Hoy”.',
          'Cambio de vista: Mes / Semana / Día.',
        ],
        actions: [
          {
            title: 'Mes / Semana / Día',
            description: 'Cambia el tipo de vista del calendario.',
          },
        ],
      },
      {
        title: 'Historial',
        subtitle: 'Sesiones finalizadas',
        icon: '📜',
        route: '/historial',
        description:
          'Consulta el historial de sesiones finalizadas y accede al detalle cuando aplique.',
        infoShown: [
          'Filtros por empresa, juego, cronograma, secuencia y rango de fechas.',
          'Indicadores globales según filtros (cuando aplica).',
          'Acciones por sesión: Excel, PDF, Evidencias y (según pantalla) Enviar correo.',
        ],
        functionalities: [
          'Aplicar filtros para reducir resultados.',
          'Expandir/contraer sesiones para ver métricas.',
        ],
        actions: [
          {
            title: '📊 Exportar Todo',
            description: 'Exporta el historial filtrado a Excel.',
          },
          {
            title: '📸 Evidencias',
            description: 'Abre evidencias de la sesión.',
          },
        ],
      },
      {
        title: 'Reportes',
        subtitle: 'En construcción',
        icon: '📈',
        route: '/reportes',
        badge: 'Sin construir',
        disabled: true,
        description:
          'Este módulo aún no está construido. Aquí se mostrarán reportes e indicadores cuando se habilite.',
        infoShown: [
          'Próximamente: reportes por empresa/juego/fecha y exportaciones.',
        ],
        functionalities: [
          'Próximamente: filtros por rango de fechas, empresa y tipo de reporte.',
        ],
        actions: [
          {
            title: '🔧 En desarrollo',
            description:
              'Aún no hay pantallas disponibles para este módulo; se habilitará en una próxima versión.',
          },
        ],
      },
      {
        title: 'Manual',
        subtitle: 'Guía de módulos',
        icon: '📘',
        route: '/manual',
        description:
          'Guía rápida de funcionalidades por módulo con acceso directo.',
      },
    ];
  }
}
