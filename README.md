# Sistema de Actividades Papaya

Plataforma web para la gestión y ejecución de actividades físicas interactivas, diseñada para empresas y organizaciones que  ofrecen experiencias de bienestar y entretenimiento activo.

## Descripción General

El sistema permite crear, gestionar y ejecutar sesiones de actividades físicas interactivas que combinan tecnología, ejercicio y gamificación. Los administradores pueden programar sesiones para diferentes empresas, mientras que los participantes disfrutan de experiencias únicas como bicicletas interactivas, realidad virtual y juegos de competencia.

## Funcionalidades Principales

### 🎮 Actividades y Juegos
- **Brain Bike**: Actividad cognitiva en bicicleta estática con desafíos mentales
- **Biketona**: Competencias en pista digital y física (1 vs 1, campeonatos, equipos)
- **Bicilicuadora**: Bicicleta que funciona como licuadora al pedalear
- **Realidad Virtual**: Experiencias inmersivas de ejercicio
- **Hit Fit**: Rutinas de entrenamiento interactivas
- **Bici Paseo**: Recorridos virtuales guiados en bicicleta
- **Dr. Bici**: Experiencias médicas de rehabilitación

### 👥 Gestión de Usuarios
- Autenticación por roles (super_admin, admin, viewer)
- Gestión de empresas y sus usuarios asignados
- Control de acceso por empresa y permisos

### 📅 Administración de Sesiones
- Creación y programación de sesiones por empresa
- Calendario de actividades con visualización intuitiva
- Historial completo de sesiones ejecutadas
- Registro de participantes y métricas

### 📊 Reportes y Seguimiento
- Historial detallado de sesiones
- Métricas de participantes por actividad
- Evidencias fotográficas de sesiones
- Exportación de datos en Excel

## Tecnologías Principales

- **Frontend**: Angular 19 con TypeScript
- **Estilos**: Tailwind CSS para diseño moderno y responsive
- **Estado**: Servicios de Angular con inyección de dependencias
- **Comunicación**: HTTP Client para API REST
- **Voz**: Google Cloud Text-to-Speech para accesibilidad
- **Excel**: XLSX para exportación de datos

## Requisitos Previos

- Node.js 18+
- Angular CLI 19+
- NPM o Yarn
- Acceso al backend API (configurado en environment.prod.ts)

## Instalación

```bash
# Clonar el repositorio
git clone [URL-del-repositorio]
cd gopapaya

# Instalar dependencias
npm install

# Configurar variables de entorno
# Editar src/environments/environment.prod.ts si es necesario
```

## Ejecución en Local

```bash
# Iniciar servidor de desarrollo
npm start
# o
ng serve

# La aplicación estará disponible en http://localhost:4200
```

## Configuración Importante

- **API URL**: Configurada en `src/environments/environment.prod.ts`
- **Idioma**: Español (es-ES) configurado por defecto
- **Modo Desarrollo**: Cambiar `production: false` en environment para desarrollo local

## Estructura General del Proyecto

```
src/
├── app/
│   ├── core/           # Servicios e interfaces centrales
│   ├── features/       # Módulos de funcionalidad (juegos, administración)
│   ├── layouts/        # Componentes de layout
│   ├── guards/         # Protección de rutas
│   ├── interceptors/   # Interceptores HTTP
│   └── shared/         # Componentes reutilizables
├── assets/             # Imágenes y recursos estáticos
└── environments/       # Configuración de entornos
```

## Puntos Importantes para Desarrolladores

### Arquitectura
- **Standalone Components**: Angular 19 con componentes independientes
- **Lazy Loading**: Las rutas principales cargan bajo demanda
- ** Guards**: Protección por roles y estado de sesión
- **Interceptors**: Manejo centralizado de peticiones HTTP

### Flujo de Sesiones
1. Crear sesión → Asignar empresa y actividad
2. Configurar parámetros específicos del juego
3. Registro de participantes
4. Ejecución de la actividad
5. Finalización y generación de reportes

### Consideraciones Técnicas
- Las sesiones no se pueden editar 1 hora antes de inicio
- Los usuarios 'viewer' solo ven historial, no administran
- Cada actividad tiene su propio flujo de componentes
- Conexión Bluetooth para dispositivos físicos (BLE ESP32)

### Backend Integration
- API REST en `https://backend-papaya.onrender.com/api`
- Autenticación mediante token JWT
- Endpoints específicos por módulo (sesiones, usuarios, empresas)

---

**Nota**: Este es el frontend del sistema. Para funcionamiento completo requiere el backend API corriendo y configuración de base de datos.
