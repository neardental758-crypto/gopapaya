import { SesionAgrupada } from '../../../services/historial-sesion.service';
import { HistorialDrBiciAdapter } from '../adapter/historial-dr-bici.adapter';
import * as XLSX from 'xlsx';
export class ExcelExportDrBiciService {
  exportarDrBici(
    wb: XLSX.WorkBook,
    grupo: SesionAgrupada,
    componentesMap?: Map<string, string>,
  ): void {
    this.agregarHojaResumen(wb, grupo, componentesMap);
    this.agregarHojaParticipantes(wb, grupo, componentesMap);
  }

  private agregarHojaResumen(
    wb: XLSX.WorkBook,
    grupo: SesionAgrupada,
    componentesMap?: Map<string, string>,
  ): void {
    const historial = grupo.carreras[0];
    const estadisticas = HistorialDrBiciAdapter.getEstadisticas(
      historial,
      componentesMap,
    );

    const data = [
      ['RESUMEN DE SESIÓN DR-BICI'],
      [],
      ['Cliente', grupo.sesion.nombreCliente],
      ['Empresa', grupo.sesion.empresa?.nombre || grupo.sesion.nombreCliente],
      ['Lugar', grupo.sesion.lugarEjecucion || 'N/A'],
      ['Fecha Sesión', grupo.sesion.fecha_sesion],
      [],
      ['TOTALES'],
      ['Total Participantes', estadisticas.totalParticipantes],
      ['Tiempo Total (segundos)', estadisticas.tiempoTotal],
      ['Trabajos Realizados', estadisticas.totalTrabajos],
      ['Repuestos Usados', estadisticas.totalRepuestos],
      [],
      ['DISTRIBUCIÓN POR GÉNERO'],
      ['Hombres', estadisticas.distribucionSexo.hombres],
      ['Mujeres', estadisticas.distribucionSexo.mujeres],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 30 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen');
  }

  private agregarHojaParticipantes(
    wb: XLSX.WorkBook,
    grupo: SesionAgrupada,
    componentesMap?: Map<string, string>,
  ): void {
    const historial = grupo.carreras[0];
    const participantes = HistorialDrBiciAdapter.adaptarParticipantes(
      historial,
      componentesMap,
    );

    const headers = [
      'Nombre',
      'Apellido',
      'Sexo',
      'Documento',
      'Trabajos Realizados',
      'Repuestos Utilizados',
    ];
    const data = [['DETALLE DE PARTICIPANTES'], [], headers];

    participantes.forEach((p) => {
      const trabajos = p.tiposTrabajo.join(', ') || 'N/A';
      const repuestos = p.repuestosUtilizados.join(', ') || 'N/A';

      const row = [
        p.nombre,
        p.apellido,
        p.sexo === 'M' ? 'Masculino' : p.sexo === 'F' ? 'Femenino' : 'N/E',
        p.documento || 'N/A',
        trabajos,
        repuestos,
      ];
      data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
      { wch: 15 },
      { wch: 30 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Participantes');
  }
}
