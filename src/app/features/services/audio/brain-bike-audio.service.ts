import { Injectable } from '@angular/core';
import { TextToSpeechService } from './text-to-speech.service';

declare const responsiveVoice: any;

@Injectable({
  providedIn: 'root',
})
export class BrainBikeAudioService {
  private audioContext: AudioContext | null = null;
  private apiKey = 'AIzaSyCNUx5PaF4wPTMT5l2Kb1LthRM1ZLUEWiY';
  private musicaFondo: HTMLAudioElement | null = null;
  private audioActual: HTMLAudioElement | null = null;
  private volumenMusica = 0.3;
  private volumenEfectos = 0.5;
  private ttsService: TextToSpeechService;

  constructor(ttsService: TextToSpeechService) {
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    this.ttsService = ttsService;
  }

  async leerTexto(texto: string, esEnfasis: boolean = false): Promise<void> {
    this.detenerLectura();

    const caracteres = texto.length;

    try {
      const usoActual = await this.ttsService.obtenerUso().toPromise();
      const apiKey = usoActual?.api_key_activa || this.apiKey;

      if (apiKey === 'FALLBACK') {
        return this.usarFallbackVoz(texto);
      }

      const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

      const body = {
        input: { text: texto },
        voice: {
          languageCode: 'es-US',
          name: 'es-US-Studio-B',
          ssmlGender: 'MALE',
        },
        audioConfig: {
          audioEncoding: 'MP3',
          pitch: -2.0,
          speakingRate: 0.95,
          volumeGainDb: 2.0,
          effectsProfileId: ['headphone-class-device'],
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error('Error API');
      }

      const data = await response.json();

      this.ttsService.registrarUso(caracteres).subscribe({
        next: (uso) => console.log('Uso registrado:', uso),
        error: (err) => console.error('Error registrando uso:', err),
      });

      return new Promise((resolve, reject) => {
        this.audioActual = new Audio(
          `data:audio/mp3;base64,${data.audioContent}`
        );

        if (this.musicaFondo) this.bajarVolumenMusica();

        this.audioActual.onended = () => {
          if (this.musicaFondo) this.subirVolumenMusica();
          this.audioActual = null;
          resolve();
        };

        this.audioActual.onerror = () => reject();
        this.audioActual.play();
      });
    } catch (error) {
      return this.usarFallbackVoz(texto);
    }
  }

  detenerLectura(): void {
    if (this.audioActual) {
      this.audioActual.pause();
      this.audioActual.currentTime = 0;
      this.audioActual = null;
    }
    window.speechSynthesis?.cancel();
  }

  private usarFallbackVoz(texto: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const synth = window.speechSynthesis;
      if (!synth) {
        reject('No hay soporte de voz');
        return;
      }

      synth.cancel();

      const voices = synth.getVoices();
      const spanishVoice =
        voices.find(
          (voice) =>
            voice.lang.includes('es') &&
            (voice.name.includes('Google') || voice.name.includes('Microsoft'))
        ) || voices.find((voice) => voice.lang.includes('es'));

      const utterance = new SpeechSynthesisUtterance(texto);
      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }
      utterance.lang = 'es-MX';
      utterance.rate = 1.0;
      utterance.pitch = 1.2;
      utterance.volume = 1;

      if (this.musicaFondo) {
        this.bajarVolumenMusica();
      }

      utterance.onend = () => {
        if (this.musicaFondo) {
          this.subirVolumenMusica();
        }
        resolve();
      };
      utterance.onerror = () => reject();
      synth.speak(utterance);
    });
  }

  detenerTodo(): void {
    this.detenerLectura();
    this.detenerMusicaFondo();
  }

  iniciarMusicaFondo(tipo: 'parametros' | 'juego' = 'parametros'): void {
    if (this.musicaFondo) {
      this.detenerMusicaFondo();
    }

    const url =
      tipo === 'parametros'
        ? 'https://www.bensound.com/bensound-music/bensound-scifi.mp3'
        : 'https://www.bensound.com/bensound-music/bensound-rumble.mp3';

    this.musicaFondo = new Audio(url);
    this.musicaFondo.loop = true;
    this.musicaFondo.volume = 0;
    this.musicaFondo
      .play()
      .catch((err) => console.error('Error reproduciendo música:', err));

    let volumenActual = 0;
    const fadeIn = setInterval(() => {
      if (volumenActual < this.volumenMusica) {
        volumenActual += 0.05;
        if (this.musicaFondo) {
          this.musicaFondo.volume = Math.min(volumenActual, this.volumenMusica);
        }
      } else {
        clearInterval(fadeIn);
      }
    }, 50);
  }

  detenerMusicaFondo(): void {
    if (!this.musicaFondo) return;

    const fadeOut = setInterval(() => {
      if (this.musicaFondo && this.musicaFondo.volume > 0.05) {
        this.musicaFondo.volume -= 0.05;
      } else {
        if (this.musicaFondo) {
          this.musicaFondo.pause();
          this.musicaFondo = null;
        }
        clearInterval(fadeOut);
      }
    }, 50);
  }

  private bajarVolumenMusica(): void {
    if (!this.musicaFondo) return;
    const volumenBajo = this.volumenMusica * 0.2;

    const fadeDown = setInterval(() => {
      if (this.musicaFondo && this.musicaFondo.volume > volumenBajo) {
        this.musicaFondo.volume = Math.max(
          this.musicaFondo.volume - 0.02,
          volumenBajo
        );
      } else {
        clearInterval(fadeDown);
      }
    }, 30);
  }

  private subirVolumenMusica(): void {
    if (!this.musicaFondo) return;

    const fadeUp = setInterval(() => {
      if (this.musicaFondo && this.musicaFondo.volume < this.volumenMusica) {
        this.musicaFondo.volume = Math.min(
          this.musicaFondo.volume + 0.02,
          this.volumenMusica
        );
      } else {
        clearInterval(fadeUp);
      }
    }, 30);
  }

  cambiarVolumenMusica(volumen: number): void {
    this.volumenMusica = Math.max(0, Math.min(1, volumen));
    if (this.musicaFondo) {
      this.musicaFondo.volume = this.volumenMusica;
    }
  }

  reproducirSonidoClick(): void {
    this.reproducirSonidoSintetico('click');
  }

  reproducirSonidoExito(): void {
    this.reproducirSonidoSintetico('exito');
  }

  reproducirSonidoError(): void {
    this.reproducirSonidoSintetico('error');
  }

  reproducirSonidoDecepcion(): void {
    this.reproducirSonidoSintetico('decepcion');
  }

  reproducirSonidoTransicion(): void {
    this.reproducirSonidoSintetico('transicion');
  }

  reproducirSonidoSeleccion(): void {
    this.reproducirSonidoSintetico('seleccion');
  }

  reproducirSonidoHover(): void {
    this.reproducirSonidoSintetico('hover');
  }

  reproducirSonidoCambioColor(): void {
    this.reproducirSonidoSintetico('cambioColor');
  }

  reproducirSonidoAbrirModal(): void {
    this.reproducirSonidoSintetico('abrirModal');
  }

  reproducirSonidoCerrarModal(): void {
    this.reproducirSonidoSintetico('cerrarModal');
  }

  reproducirSonidoInput(): void {
    this.reproducirSonidoSintetico('input');
  }

  reproducirSonidoCuentaRegresiva(): void {
    this.reproducirSonidoSintetico('cuentaRegresiva');
  }

  reproducirSonidoInicio(): void {
    this.reproducirSonidoSintetico('inicio');
  }

  reproducirSonidoTrompetaInicio(): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;

    const oscillator1 = this.audioContext.createOscillator();
    const oscillator2 = this.audioContext.createOscillator();
    const oscillator3 = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    oscillator1.connect(filter);
    oscillator2.connect(filter);
    oscillator3.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 3;

    oscillator1.type = 'sawtooth';
    oscillator1.frequency.setValueAtTime(261.63, now);
    oscillator1.frequency.setValueAtTime(329.63, now + 0.2);
    oscillator1.frequency.setValueAtTime(392.0, now + 0.4);
    oscillator1.frequency.setValueAtTime(523.25, now + 0.6);

    oscillator2.type = 'sawtooth';
    oscillator2.frequency.setValueAtTime(130.81, now);
    oscillator2.frequency.setValueAtTime(164.81, now + 0.2);
    oscillator2.frequency.setValueAtTime(196.0, now + 0.4);
    oscillator2.frequency.setValueAtTime(261.63, now + 0.6);

    oscillator3.type = 'sine';
    oscillator3.frequency.setValueAtTime(523.25, now);
    oscillator3.frequency.setValueAtTime(659.25, now + 0.2);
    oscillator3.frequency.setValueAtTime(783.99, now + 0.4);
    oscillator3.frequency.setValueAtTime(1046.5, now + 0.6);

    gainNode.gain.setValueAtTime(0.6, now);
    gainNode.gain.setValueAtTime(0.7, now + 0.2);
    gainNode.gain.setValueAtTime(0.8, now + 0.4);
    gainNode.gain.setValueAtTime(1, now + 0.6);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

    oscillator1.start(now);
    oscillator1.stop(now + 1.2);
    oscillator2.start(now);
    oscillator2.stop(now + 1.2);
    oscillator3.start(now);
    oscillator3.stop(now + 1.2);
  }

  private reproducirSonidoSintetico(tipo: string): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start(now);

    switch (tipo) {
      case 'click':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, now);
        gainNode.gain.setValueAtTime(this.volumenEfectos * 0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        oscillator.stop(now + 0.08);
        break;

      case 'exito':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, now);
        oscillator.frequency.setValueAtTime(659.25, now + 0.1);
        oscillator.frequency.setValueAtTime(783.99, now + 0.2);
        gainNode.gain.setValueAtTime(this.volumenEfectos * 0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        oscillator.stop(now + 0.4);
        break;

      case 'error':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);
        gainNode.gain.setValueAtTime(this.volumenEfectos * 0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        oscillator.stop(now + 0.3);
        break;

      case 'decepcion':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, now);
        oscillator.frequency.exponentialRampToValueAtTime(80, now + 0.8);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.8);
        gainNode.gain.setValueAtTime(this.volumenEfectos * 0.6, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        oscillator.stop(now + 0.8);
        break;

      case 'transicion':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.15);
        oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
        gainNode.gain.setValueAtTime(this.volumenEfectos * 0.35, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        oscillator.stop(now + 0.35);
        break;

      case 'seleccion':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(900, now);
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(500, now);
        gainNode.gain.setValueAtTime(this.volumenEfectos * 0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        oscillator.stop(now + 0.12);
        break;

      case 'hover':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, now);
        gainNode.gain.setValueAtTime(this.volumenEfectos * 0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        oscillator.stop(now + 0.05);
        break;

      case 'cambioColor':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.setValueAtTime(1000, now + 0.08);
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1500, now);
        gainNode.gain.setValueAtTime(this.volumenEfectos * 0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        oscillator.stop(now + 0.15);
        break;

      case 'abrirModal':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.exponentialRampToValueAtTime(900, now + 0.15);
        gainNode.gain.setValueAtTime(this.volumenEfectos * 0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        oscillator.stop(now + 0.18);
        break;

      case 'cerrarModal':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(900, now);
        oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        gainNode.gain.setValueAtTime(this.volumenEfectos * 0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        oscillator.stop(now + 0.18);
        break;

      case 'input':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(500, now);
        gainNode.gain.setValueAtTime(this.volumenEfectos * 0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
        oscillator.stop(now + 0.06);
        break;

      case 'cuentaRegresiva':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, now);
        gainNode.gain.setValueAtTime(this.volumenEfectos * 0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        oscillator.stop(now + 0.2);
        break;

      case 'inicio':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, now);
        oscillator.frequency.setValueAtTime(659.25, now + 0.15);
        oscillator.frequency.setValueAtTime(783.99, now + 0.3);
        oscillator.frequency.setValueAtTime(1046.5, now + 0.45);
        gainNode.gain.setValueAtTime(this.volumenEfectos * 0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        oscillator.stop(now + 0.6);
        break;
    }
  }
}
