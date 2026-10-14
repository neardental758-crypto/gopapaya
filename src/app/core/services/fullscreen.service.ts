import { Injectable, signal, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class FullscreenService {
  readonly isFullscreen = signal<boolean>(false);
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      this.checkFullscreenStatus();

      const onFullscreenChange = () => this.checkFullscreenStatus();
      document.addEventListener('fullscreenchange', onFullscreenChange);
      document.addEventListener('webkitfullscreenchange', onFullscreenChange);
      document.addEventListener('mozfullscreenchange', onFullscreenChange);
      document.addEventListener('MSFullscreenChange', onFullscreenChange);
    }
  }

  private checkFullscreenStatus(): void {
    if (!this.isBrowser) return;

    const doc = document as any;
    const isFull = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
    this.isFullscreen.set(isFull);
  }

  toggleFullscreen(): void {
    if (!this.isBrowser) return;

    if (!this.isFullscreen()) {
      this.enterFullscreen();
    } else {
      this.exitFullscreen();
    }
  }

  enterFullscreen(): void {
    if (!this.isBrowser) return;

    const docEl = document.documentElement as any;
    try {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch((err: any) => console.warn('Fullscreen request failed:', err));
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      }
    } catch (e) {
      console.warn('Error invoking fullscreen:', e);
    }
  }

  exitFullscreen(): void {
    if (!this.isBrowser) return;

    const doc = document as any;
    try {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch((err: any) => console.warn('Exit fullscreen failed:', err));
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    } catch (e) {
      console.warn('Error exiting fullscreen:', e);
    }
  }
}
