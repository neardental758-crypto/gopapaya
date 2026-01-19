import { DecimalPipe, CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BicilicuadoraConfigService } from '../../services/bicilicuadora/bicilicuadora-config.service';
import { BleEsp32Service, BikeKey } from '../../services/ble-esp32.service';
import { BicilicuadoraGameService } from '../../services/bicilicuadora/bicilicuadora-game.service';

@Component({
  selector: 'app-bicilicuadora-conexion',
  templateUrl: './bicilicuadora-conexion.component.html',
  providers: [DecimalPipe],
  imports: [CommonModule, FormsModule],
})
export class BicilicuadoraConexionComponent implements OnInit, OnDestroy {
  config: any = null;
  bicis: BiciUI[] = [];

  constructor(
    private bicilicuadoraConfigService: BicilicuadoraConfigService,
    private ble: BleEsp32Service,
    public router: Router,
    private gameService: BicilicuadoraGameService
  ) {}

  ngOnInit(): void {
    this.config = this.bicilicuadoraConfigService.getConfigActual();

    if (!this.config) {
      this.router.navigate(['/bicilicuadora/parametros']);
      return;
    }

    localStorage.removeItem('participante_actual');
    localStorage.removeItem('bici1Conectada');

    this.inicializarBicis();
  }

  inicializarBicis(): void {
    this.bicis = [];

    this.bicis.push({
      key: `bici1` as BikeKey,
      label: `Bicicleta`,
      status: 'Desconectado',
      conectado: false,
      deviceId: '',
    });
  }

  irARegistro(): void {
    if (!this.bicis[0].conectado) {
      alert('Conecta la bicicleta');
      return;
    }
    this.bicilicuadoraConfigService.setConfigActual(this.config);

    localStorage.setItem('bici1Conectada', 'true');

    this.router.navigate(['/bicilicuadora/registro']);
  }

  async buscarBici(key: BikeKey) {
    const biciUI = this.getBiciUI(key);
    try {
      const device = await this.ble.requestDevice(key);
      biciUI.status = `Dispositivo: ${device.name ?? 'sin nombre'}`;
      biciUI.deviceId = device.id;
    } catch (e: any) {
      biciUI.status = 'Error buscando';
      biciUI.conectado = false;
      biciUI.deviceId = '';
    }
  }

  async conectarBici(key: BikeKey) {
    const biciUI = this.getBiciUI(key);

    try {
      await this.ble.connect(key);
      biciUI.status = 'Conectado';
      biciUI.conectado = true;

      this.ble
        .readValue(key, 'id')
        .then((id) => (biciUI.deviceId = id))
        .catch(() => {});

      await this.ble.subscribe(key, 'vel', (velocidadStr) => {
        const velocidad = parseFloat(velocidadStr.split(',')[0]);
        const bikeNumber = parseInt(key.replace('bici', ''));
        this.gameService.actualizarVelocidad(bikeNumber, velocidad);
      });
    } catch (e: any) {
      console.error('❌ Error:', e);
      biciUI.status = 'Error al conectar';
      biciUI.conectado = false;
    }
  }

  ngOnDestroy(): void {}

  desconectarBici(key: BikeKey) {
    const biciUI = this.getBiciUI(key);
    this.ble.disconnect(key);
    biciUI.conectado = false;
    biciUI.status = 'Desconectado';
    biciUI.deviceId = '';
  }

  private getBiciUI(key: BikeKey): BiciUI {
    return this.bicis.find((x) => x.key === key)!;
  }

  todasBicisConectadas(): boolean {
    return this.bicis.every((b) => b.conectado);
  }
}

interface BiciUI {
  key: BikeKey;
  label: string;
  status: string;
  conectado: boolean;
  deviceId: string;
}
