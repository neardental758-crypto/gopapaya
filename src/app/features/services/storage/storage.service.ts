import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly KEYS = {
    BRAIN_BIKE_CONFIG: 'brainBikeConfig',
    USUARIO: 'usuario',
    TOKEN: 'token',
  };

  constructor() {}

  set(key: string, value: any): void {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
    } catch (error) {
      console.error('Error al guardar en localStorage:', error);
    }
  }

  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error al leer de localStorage:', error);
      return null;
    }
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }

  exists(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  setBrainBikeConfig(config: any): void {
    this.set(this.KEYS.BRAIN_BIKE_CONFIG, config);
  }

  getBrainBikeConfig(): any {
    return this.get(this.KEYS.BRAIN_BIKE_CONFIG);
  }

  removeBrainBikeConfig(): void {
    this.remove(this.KEYS.BRAIN_BIKE_CONFIG);
  }

  limpiarDatosSesion(): void {
    this.removeBrainBikeConfig();
  }
}
