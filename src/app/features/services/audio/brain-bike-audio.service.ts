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

  reproducirSonidoSintetico(tipo: string): void {
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

      case 'motor':
        oscillator.type = 'sawtooth';
        const oscillator2 = this.audioContext.createOscillator();
        oscillator2.type = 'square';
        oscillator2.connect(filter);

        oscillator.frequency.setValueAtTime(80, now);
        oscillator.frequency.exponentialRampToValueAtTime(180, now + 0.3);
        oscillator.frequency.exponentialRampToValueAtTime(120, now + 0.6);

        oscillator2.frequency.setValueAtTime(160, now);
        oscillator2.frequency.exponentialRampToValueAtTime(360, now + 0.3);
        oscillator2.frequency.exponentialRampToValueAtTime(240, now + 0.6);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(800, now + 0.3);
        filter.frequency.exponentialRampToValueAtTime(600, now + 0.6);

        gainNode.gain.setValueAtTime(this.volumenEfectos * 0.6, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

        oscillator.stop(now + 0.7);
        oscillator2.start(now);
        oscillator2.stop(now + 0.7);
        break;

      case 'victoria':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, now);
        oscillator.frequency.setValueAtTime(659.25, now + 0.15);
        oscillator.frequency.setValueAtTime(783.99, now + 0.3);
        oscillator.frequency.setValueAtTime(1046.5, now + 0.45);
        oscillator.frequency.setValueAtTime(1318.51, now + 0.6);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.Q.value = 3;

        gainNode.gain.setValueAtTime(this.volumenEfectos * 0.7, now);
        gainNode.gain.setValueAtTime(this.volumenEfectos * 0.8, now + 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
        oscillator.stop(now + 1.0);
        break;

      case 'banderaCarrera':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.setValueAtTime(800, now + 0.1);
        oscillator.frequency.setValueAtTime(600, now + 0.2);
        oscillator.frequency.setValueAtTime(800, now + 0.3);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, now);

        gainNode.gain.setValueAtTime(this.volumenEfectos * 0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        oscillator.stop(now + 0.4);
        break;

      case 'sirenaLargada':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.5);
        oscillator.frequency.exponentialRampToValueAtTime(800, now + 1.0);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1500, now);
        filter.Q.value = 2;

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(
          this.volumenEfectos * 0.6,
          now + 0.1
        );
        gainNode.gain.linearRampToValueAtTime(
          this.volumenEfectos * 0.4,
          now + 0.5
        );
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
        oscillator.stop(now + 1.0);
        break;

      case 'podio':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1046.5, now);
        oscillator.frequency.setValueAtTime(1318.51, now + 0.2);
        oscillator.frequency.setValueAtTime(1567.98, now + 0.4);
        oscillator.frequency.setValueAtTime(2093.0, now + 0.6);

        gainNode.gain.setValueAtTime(this.volumenEfectos * 0.6, now);
        gainNode.gain.setValueAtTime(this.volumenEfectos * 0.7, now + 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
        oscillator.stop(now + 0.9);
        break;

      case 'cambioLlave':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.setValueAtTime(600, now + 0.1);
        oscillator.frequency.setValueAtTime(800, now + 0.2);

        filter.type = 'highpass';
        filter.frequency.setValueAtTime(300, now);

        gainNode.gain.setValueAtTime(this.volumenEfectos * 0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        oscillator.stop(now + 0.3);
        break;
    }
  }

  reproducirSonidoMotor(): void {
    this.reproducirSonidoSintetico('motor');
  }

  reproducirSonidoVictoria(): void {
    this.reproducirSonidoSintetico('victoria');
  }

  reproducirSonidoBanderaCarrera(): void {
    this.reproducirSonidoSintetico('banderaCarrera');
  }

  reproducirSonidoSirenaLargada(): void {
    this.reproducirSonidoSintetico('sirenaLargada');
  }

  reproducirSonidoPodio(): void {
    this.reproducirSonidoSintetico('podio');
  }

  reproducirSonidoCambioLlave(): void {
    this.reproducirSonidoSintetico('cambioLlave');
  }

  reproducirMusicaCarrera(): void {
    if (this.musicaFondo) {
      this.detenerMusicaFondo();
    }

    this.musicaFondo = new Audio(
      'https://www.bensound.com/bensound-music/bensound-actionable.mp3'
    );
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

  reproducirSonidoMotorAcelerando(): void {
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

    oscillator1.type = 'sawtooth';
    oscillator2.type = 'square';
    oscillator3.type = 'triangle';

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 2);
    filter.Q.value = 8;

    oscillator1.frequency.setValueAtTime(60, now);
    oscillator1.frequency.exponentialRampToValueAtTime(240, now + 2);

    oscillator2.frequency.setValueAtTime(120, now);
    oscillator2.frequency.exponentialRampToValueAtTime(480, now + 2);

    oscillator3.frequency.setValueAtTime(90, now);
    oscillator3.frequency.exponentialRampToValueAtTime(360, now + 2);

    gainNode.gain.setValueAtTime(0.4, now);
    gainNode.gain.setValueAtTime(0.7, now + 1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 2.2);

    oscillator1.start(now);
    oscillator1.stop(now + 2.2);
    oscillator2.start(now);
    oscillator2.stop(now + 2.2);
    oscillator3.start(now);
    oscillator3.stop(now + 2.2);
  }

  reproducirSonidoBocinaCarrera(): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.setValueAtTime(1046, now + 0.15);
    oscillator.frequency.setValueAtTime(880, now + 0.3);

    gainNode.gain.setValueAtTime(0.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    oscillator.start(now);
    oscillator.stop(now + 0.35);
  }

  reproducirSonidoLlegadaMeta(): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;

    const oscillator1 = this.audioContext.createOscillator();
    const oscillator2 = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    oscillator1.connect(filter);
    oscillator2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.Q.value = 5;

    oscillator1.type = 'sine';
    oscillator1.frequency.setValueAtTime(1046.5, now);
    oscillator1.frequency.setValueAtTime(1318.51, now + 0.3);
    oscillator1.frequency.setValueAtTime(1567.98, now + 0.6);
    oscillator1.frequency.setValueAtTime(2093.0, now + 0.9);

    oscillator2.type = 'triangle';
    oscillator2.frequency.setValueAtTime(523.25, now);
    oscillator2.frequency.setValueAtTime(659.25, now + 0.3);
    oscillator2.frequency.setValueAtTime(783.99, now + 0.6);
    oscillator2.frequency.setValueAtTime(1046.5, now + 0.9);

    gainNode.gain.setValueAtTime(0.6, now);
    gainNode.gain.setValueAtTime(0.8, now + 0.5);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

    oscillator1.start(now);
    oscillator1.stop(now + 1.5);
    oscillator2.start(now);
    oscillator2.stop(now + 1.5);
  }

  reproducirSonidoPitStop(): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const noiseBuffer = this.audioContext.createBuffer(
      1,
      this.audioContext.sampleRate * 0.3,
      this.audioContext.sampleRate
    );
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = noiseBuffer;

    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(4000, now + 0.3);
    filter.Q.value = 10;

    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    noise.start(now);
    noise.stop(now + 0.3);
  }
}
