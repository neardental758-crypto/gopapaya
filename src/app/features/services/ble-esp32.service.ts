import { Injectable } from '@angular/core';

export type BikeKey = 'bici1' | 'bici2';

@Injectable({ providedIn: 'root' })
export class BleEsp32Service {

  private devices: Record<BikeKey, BluetoothDevice | null> = {
    bici1: null,
    bici2: null
  };

  private servers: Record<BikeKey, BluetoothRemoteGATTServer | null> = {
    bici1: null,
    bici2: null
  };

  SERVICE_UUID = '0000a001-0000-1000-8000-00805f9b34fb';
  CHAR_ID      = '0000a002-0000-1000-8000-00805f9b34fb';
  CHAR_VEL     = '0000a003-0000-1000-8000-00805f9b34fb';
  CHAR_BTNS    = '0000a004-0000-1000-8000-00805f9b34fb';

  // Characteristics por bici
  characteristics: Record<BikeKey, Record<string, BluetoothRemoteGATTCharacteristic>> = {
    bici1: {},
    bici2: {}
  };

  // ------------------------
  //     REQUEST DEVICE
  // ------------------------
  async requestDevice(bike: BikeKey) {
    console.log(`🔍 Pidiendo dispositivo BLE para ${bike}...`);
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'Bici_' }],
      optionalServices: [this.SERVICE_UUID],
    });

    console.log(`✅ Dispositivo seleccionado para ${bike}:`, device);
    this.devices[bike] = device;
    return device;
  }

  // ------------------------
  //     CONNECT DEVICE
  // ------------------------
  async connect(bike: BikeKey) {
    const device = this.devices[bike];
    if (!device) throw new Error('No device selected for ' + bike);

    const server = await device.gatt!.connect();
    this.servers[bike] = server;

    const service = await server.getPrimaryService(this.SERVICE_UUID);

    const map: Record<string, string> = {
      id:   this.CHAR_ID,
      vel:  this.CHAR_VEL,
      btns: this.CHAR_BTNS,
    };

    const chars: Record<string, BluetoothRemoteGATTCharacteristic> = {};

    for (const [key, uuid] of Object.entries(map)) {
      try {
        const ch = await service.getCharacteristic(uuid);
        chars[key] = ch;
        console.log(`✔ [${bike}] Characteristic ${key} ok: ${uuid}`);
      } catch (e) {
        console.error(`❌ [${bike}] NO se encontró characteristic ${key} (${uuid})`, e);
      }
    }

    this.characteristics[bike] = chars;
    return true;
  }

  // ------------------------
  //        READ VALUE
  // ------------------------
  async readValue(bike: BikeKey, key: string): Promise<string> {
    const ch = this.characteristics[bike][key];
    if (!ch) throw new Error(`Characteristic ${key} not found for ${bike}`);

    const v = await ch.readValue();
    return new TextDecoder().decode(v).trim();
  }

  // ------------------------
  //       SUBSCRIBE
  // ------------------------
  async subscribe(
    bike: BikeKey,
    key: string,
    callback: (value: string) => void
  ) {
    const ch = this.characteristics[bike][key];
    if (!ch) {
      console.warn(`⚠️ [${bike}] Characteristic ${key} no encontrada`);
      return;
    }

    await ch.startNotifications();
    ch.addEventListener('characteristicvaluechanged', (event: any) => {
      const text = new TextDecoder().decode(event.target.value).trim();
      callback(text);
    });
  }

  // RAW para botones si lo necesitas
  async subscribeRaw(
    bike: BikeKey,
    key: string,
    callback: (value: DataView) => void
  ) {
    const ch = this.characteristics[bike][key];
    if (!ch) return;

    await ch.startNotifications();
    ch.addEventListener('characteristicvaluechanged', (event: any) => {
      callback(event.target.value);
    });
  }

  // ------------------------
  //     DISCONNECT ONE
  // ------------------------
  disconnect(bike: BikeKey) {
    const device = this.devices[bike];
    if (device?.gatt?.connected) {
      device.gatt.disconnect();
    }

    this.devices[bike] = null;
    this.servers[bike] = null;
    this.characteristics[bike] = {};
  }

  // ------------------------
  //   DISCONNECT ALL
  // ------------------------
  disconnectAll() {
    this.disconnect('bici1');
    this.disconnect('bici2');
  }
}
