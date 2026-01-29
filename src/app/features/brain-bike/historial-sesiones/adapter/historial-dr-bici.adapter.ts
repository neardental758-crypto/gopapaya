export class HistorialDrBiciAdapter {
  static adaptarParticipantes(
    historial: any,
    componentesMap?: Map<string, string>,
  ): any[] {
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
      documento: p.documento || '',
      tiposTrabajo: Array.isArray(p.tiposTrabajo) ? p.tiposTrabajo : [],
      repuestosUtilizados: this.extraerNombresRepuestos(
        p.repuestosUtilizados,
        componentesMap,
      ),
      tiempoParticipacion: p.tiempoParticipacion || 0,
    }));
  }

  private static extraerNombresRepuestos(
    repuestos: any,
    componentesMap?: Map<string, string>,
  ): string[] {
    if (!Array.isArray(repuestos)) return [];

    return repuestos.map((repuesto: any) => {
      const id = String(repuesto);
      if (componentesMap && componentesMap.has(id)) {
        return componentesMap.get(id)!;
      }
      return id;
    });
  }

  static getEstadisticas(
    historial: any,
    componentesMap?: Map<string, string>,
  ): any {
    let estadisticas = historial.estadisticas_generales;

    if (typeof estadisticas === 'string') {
      try {
        estadisticas = JSON.parse(estadisticas);
      } catch (e) {
        estadisticas = {};
      }
    }

    const participantes = this.adaptarParticipantes(historial, componentesMap);

    return {
      totalParticipantes: participantes.length,
      tiempoTotal: estadisticas?.tiempoTotal || 0,
      distribucionSexo: this.getDistribucionSexo(participantes),
      totalTrabajos: this.getTotalTrabajos(participantes),
      totalRepuestos: this.getTotalRepuestos(participantes),
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

  static getTotalTrabajos(participantes: any[]): number {
    return participantes.reduce(
      (total, p) => total + (p.tiposTrabajo?.length || 0),
      0,
    );
  }

  static getTotalRepuestos(participantes: any[]): number {
    return participantes.reduce(
      (total, p) => total + (p.repuestosUtilizados?.length || 0),
      0,
    );
  }
}
