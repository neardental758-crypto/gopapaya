/*import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BleEsp32Service } from '../services/ble-esp32.service';

interface Question {
  id: number;
  text: string;
  options: string[];    // 4 opciones
  correctIndex: number; // 0..3
}

@Component({
  selector: 'app-ble-esp32',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ble-esp32.component.html',
  styleUrl: './ble-esp32.component.css'
})
export class BleEsp32Component {

  status = 'Desconectado';

  id = '';
  velocidad = '0.0';

  // estado del juego
  questions: Question[] = [
    {
      id: 1,
      text: '¿Cuál es el músculo principal que trabaja al pedalear bicicleta?',
      options: ['Bíceps', 'Cuádriceps', 'Pectoral', 'Tríceps'],
      correctIndex: 1
    },
    {
      id: 2,
      text: '¿Qué elemento NO puede faltar al montar en bici?',
      options: ['Casco', 'Sandalias', 'Gafas de sol', 'Guantes'],
      correctIndex: 0
    },
    {
      id: 3,
      text: 'Usar bicicleta ayuda principalmente a...',
      options: ['Contaminar más', 'Mejorar la salud', 'Gastar más gasolina', 'Dormir menos'],
      correctIndex: 1
    }
  ];

  currentQuestionIndex = 0;
  score = 0;
  lastAnswerBtn: number | null = null;
  lastAnswerCorrect: boolean | null = null;

  constructor(private ble: BleEsp32Service) {}

  get currentQuestion(): Question | null {
    return this.questions[this.currentQuestionIndex] ?? null;
  }

  async buscar() {
    try {
      await this.ble.requestDevice();
      this.status = 'Dispositivo encontrado. Presiona conectar.';
    } catch (e: any) {
      console.error('❌ Error en requestDevice:', e);
      this.status = 'Error buscando dispositivo: ' + (e?.message ?? e);
    }
  }

  async conectar() {
    try {
      await this.ble.connect();
      this.status = 'Conectado a ESP32';

      // Leer ID una vez
      this.id = await this.ble.readValue('id');

      // Suscripción velocidad
      this.ble.subscribe('vel', v => this.velocidad = v || '0.0');

      // Suscripción botones (último botón pulsado)
      this.ble.subscribeRaw('btns', dv => {
        const btn = dv.getUint8(0); // 1..4
        if (btn >= 1 && btn <= 4) {
          this.onAnswer(btn);
        }
      });

    } catch (e: any) {
      console.error(e);
      this.status = 'Error al conectar: ' + (e?.message ?? e);
    }
  }

  desconectar() {
    this.ble.disconnect();
    this.status = 'Desconectado';
  }

  onAnswer(btn: number) {
    if (!this.currentQuestion) return;

    this.lastAnswerBtn = btn;

    const selectedIndex = btn - 1; // botón 1 → opción 0
    const isCorrect = selectedIndex === this.currentQuestion.correctIndex;
    this.lastAnswerCorrect = isCorrect;

    if (isCorrect) {
      this.score++;
    }

    // Pasar a la siguiente pregunta después de un pequeño delay
    setTimeout(() => {
      this.currentQuestionIndex++;
      this.lastAnswerBtn = null;
      this.lastAnswerCorrect = null;
    }, 1000);
  }
}
*/