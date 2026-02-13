import { Injectable } from '@angular/core';

export type BikeKey = 'bici1' | 'bici2';

@Injectable({ providedIn: 'root' })
export class BleEsp32BrainBikeService {
  private devices: Record<BikeKey, BluetoothDevice | null> = {
    bici1: null,
    bici2: null,
  };

  private servers: Record<BikeKey, BluetoothRemoteGATTServer | null> = {
    bici1: null,
    bici2: null,
  };

  SERVICE_UUID = '0000a001-0000-1000-8000-00805f9b34fb';
  CHAR_ID = '0000a002-0000-1000-8000-00805f9b34fb';
  CHAR_VEL = '0000a003-0000-1000-8000-00805f9b34fb';
  CHAR_BTNS = '0000a004-0000-1000-8000-00805f9b34fb';

  characteristics: Record<
    BikeKey,
    Record<string, BluetoothRemoteGATTCharacteristic>
  > = {
    bici1: {},
    bici2: {},
  };

  private subscriptionHandlers: Record<
    BikeKey,
    Record<string, (event: any) => void>
  > = {
    bici1: {},
    bici2: {},
  };

  async requestDevice(bike: BikeKey) {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [this.SERVICE_UUID],
    });

    this.devices[bike] = device;
    console.log('📱 Dispositivo BLE encontrado:', device.name);
    return device;
  }

  isConnected(key: BikeKey): boolean {
    const device = this.devices[key];
    return device?.gatt?.connected || false;
  }

  async connect(bike: BikeKey) {
    const device = this.devices[bike];
    if (!device) throw new Error('No device selected for ' + bike);

    const server = await device.gatt!.connect();
    this.servers[bike] = server;

    const service = await server.getPrimaryService(this.SERVICE_UUID);

    const map: Record<string, string> = {
      id: this.CHAR_ID,
      vel: this.CHAR_VEL,
      btns: this.CHAR_BTNS,
    };

    const chars: Record<string, BluetoothRemoteGATTCharacteristic> = {};

    for (const [key, uuid] of Object.entries(map)) {
      try {
        const ch = await service.getCharacteristic(uuid);
        chars[key] = ch;
      } catch (e) {
        console.error(
          `❌ [${bike}] NO se encontró characteristic ${key} (${uuid})`,
          e,
        );
      }
    }

    this.characteristics[bike] = chars;

    await this.enviarComando(bike, 'brain');

    return true;
  }

  async readValue(bike: BikeKey, key: string): Promise<string> {
    const ch = this.characteristics[bike][key];
    if (!ch) throw new Error(`Characteristic ${key} not found for ${bike}`);

    const v = await ch.readValue();
    return new TextDecoder().decode(v).trim();
  }

  async subscribe(
    bike: BikeKey,
    key: string,
    callback: (value: string) => void,
  ) {
    const ch = this.characteristics[bike][key];
    if (!ch) {
      console.warn(`⚠️ [${bike}] Characteristic ${key} no encontrada`);
      return;
    }

    await ch.startNotifications();

    const handler = (event: any) => {
      const text = new TextDecoder().decode(event.target.value).trim();
      callback(text);
    };

    this.subscriptionHandlers[bike][key] = handler;
    ch.addEventListener('characteristicvaluechanged', handler);
  }

  unsubscribe(key: BikeKey, characteristic: string): void {
    const char = this.characteristics[key][characteristic];
    const handler = this.subscriptionHandlers[key][characteristic];

    if (char && handler) {
      char.removeEventListener('characteristicvaluechanged', handler);
      delete this.subscriptionHandlers[key][characteristic];
      console.log(`🔕 Desuscrito de ${key}:${characteristic}`);
    }
  }

  async subscribeRaw(
    bike: BikeKey,
    key: string,
    callback: (value: DataView) => void,
  ) {
    const ch = this.characteristics[bike][key];
    if (!ch) return;

    await ch.startNotifications();
    ch.addEventListener('characteristicvaluechanged', (event: any) => {
      callback(event.target.value);
    });
  }

  disconnect(bike: BikeKey) {
    const device = this.devices[bike];
    if (device?.gatt?.connected) {
      device.gatt.disconnect();
    }

    this.devices[bike] = null;
    this.servers[bike] = null;
    this.characteristics[bike] = {};
  }

  disconnectAll() {
    this.disconnect('bici1');
    this.disconnect('bici2');
  }

  async getBikeId(bike: BikeKey): Promise<string> {
    return await this.readValue(bike, 'id');
  }

  async subscribeSensores(
    bike: BikeKey,
    callback: (sensor1: number, sensor2: number, estadoID: number) => void,
  ) {
    const ch = this.characteristics[bike]['btns'];
    if (!ch) {
      console.warn(`⚠️ [${bike}] Characteristic btns no encontrada`);
      return;
    }

    await ch.startNotifications();

    const handler = (event: any) => {
      const text = new TextDecoder().decode(event.target.value).trim();
      const [s1, s2, estado] = text.split(',').map((v) => parseInt(v) || 0);
      callback(s1, s2, estado);
    };

    this.subscriptionHandlers[bike]['btns'] = handler;
    ch.addEventListener('characteristicvaluechanged', handler);
  }

  async enviarComando(bike: BikeKey, comando: string): Promise<void> {
    const ch = this.characteristics[bike]['id'];
    if (!ch) {
      console.error(`Characteristic id no encontrada para ${bike}`);
      return;
    }

    const encoder = new TextEncoder();
    await ch.writeValue(encoder.encode(comando));
    console.log(`📤 Comando enviado al ESP32: ${comando}`);
  }
}
