export class HistorialBiciPaseoAdapter {
  static adaptarParticipantes(historial: any): any[] {
    let participantes = historial.participantes_data;

    if (typeof participantes === 'string') {
      try {
        participantes = JSON.parse(participantes);
      } catch (e) {
        return [];
      }
    }

    if (!Array.isArray(participantes)) return [];

    return participantes.map((p: any) => ({
      nombreCompleto:
        `${p.nombreParticipante || ''} ${p.apellidoParticipante || ''}`.trim(),
      nombre: p.nombreParticipante || '',
      apellido: p.apellidoParticipante || '',
      sexo: p.sexo || '',
      tipoVehiculo: p.tipoVehiculo || p.tipo_vehiculo || '',
      documento: p.documento || '',
      fechaRegistro: p.fechaRegistro || p.fecha_registro || '',
    }));
  }

  static getEstadisticas(historial: any): any {
    let estadisticas = historial.estadisticas_generales;

    if (typeof estadisticas === 'string') {
      try {
        estadisticas = JSON.parse(estadisticas);
      } catch (e) {
        estadisticas = {};
      }
    }

    const participantes = this.adaptarParticipantes(historial);

    const distribucionVehiculos = this.getDistribucionVehiculos(participantes);
    const distribucionSexo = this.getDistribucionSexo(participantes);

    return {
      totalParticipantes: participantes.length,
      ruta: estadisticas?.ruta || 'No especificada',
      distancia: estadisticas?.distancia || 'No especificada',
      distribucionVehiculos,
      distribucionSexo,
      hombres: distribucionSexo.hombres,
      mujeres: distribucionSexo.mujeres,
    };
  }

  static getDistribucionVehiculos(participantes: any[]): any {
    const distribucion: any = {
      'patineta-electrica': 0,
      'bicicleta-mecanica': 0,
      'bicicleta-electrica': 0,
    };

    participantes.forEach((p) => {
      if (distribucion.hasOwnProperty(p.tipoVehiculo)) {
        distribucion[p.tipoVehiculo]++;
      }
    });

    return {
      patineta: distribucion['patineta-electrica'],
      bicicletaMecanica: distribucion['bicicleta-mecanica'],
      bicicletaElectrica: distribucion['bicicleta-electrica'],
    };
  }

  static getDistribucionSexo(participantes: any[]): any {
    let hombres = 0;
    let mujeres = 0;

    participantes.forEach((p) => {
      if (p.sexo === 'M') hombres++;
      else if (p.sexo === 'F') mujeres++;
    });

    return { hombres, mujeres };
  }

  static getNombreVehiculo(tipo: string): string {
    const nombres: { [key: string]: string } = {
      'patineta-electrica': 'Patineta Eléctrica',
      'bicicleta-mecanica': 'Bicicleta Mecánica',
      'bicicleta-electrica': 'Bicicleta Eléctrica',
    };
    return nombres[tipo] || tipo;
  }
}
