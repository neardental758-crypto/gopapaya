import { Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { ActivatedRoute, Router } from '@angular/router';

export type SupportedLanguage = 'es' | 'en';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  flag: string;
  label: string;
}

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private translocoService = inject(TranslocoService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  private readonly STORAGE_KEY = 'gopapaya_lang';
  public readonly supportedLanguages: LanguageOption[] = [
    { code: 'es', name: 'Español', flag: '🇪🇸', label: 'ES' },
    { code: 'en', name: 'English', flag: '🇺🇸', label: 'EN' },
  ];

  public currentLang = signal<SupportedLanguage>('es');

  constructor() {
    this.initLanguage();
  }

  /**
   * Initializes language based on priority:
   * 1. URL Query Param (?lang=es|en)
   * 2. Saved Preference in localStorage
   * 3. Browser Language
   * 4. Fallback default ('es')
   */
  public initLanguage(): void {
    const urlLang = this.getLangFromUrl();
    const storedLang = this.getStoredLanguage();
    const browserLang = this.getBrowserLanguage();

    const selectedLang: SupportedLanguage =
      urlLang || storedLang || browserLang || 'es';

    this.setLanguage(selectedLang, false);
  }

  public getActiveLanguage(): SupportedLanguage {
    return this.currentLang();
  }

  public setLanguage(lang: SupportedLanguage, updateUrl: boolean = true): void {
    if (!this.isValidLanguage(lang)) {
      lang = 'es';
    }

    this.currentLang.set(lang);
    this.translocoService.setActiveLang(lang);
    this.persistLanguage(lang);
    this.updateHtmlLang(lang);

    if (updateUrl) {
      this.syncUrlQueryParam(lang);
    }
  }

  public toggleLanguage(): void {
    const nextLang: SupportedLanguage = this.currentLang() === 'es' ? 'en' : 'es';
    this.setLanguage(nextLang, true);
  }

  private isValidLanguage(lang: string | null): lang is SupportedLanguage {
    return lang === 'es' || lang === 'en';
  }

  private getLangFromUrl(): SupportedLanguage | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const lang = params.get('lang');
    return this.isValidLanguage(lang) ? lang : null;
  }

  private getStoredLanguage(): SupportedLanguage | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return this.isValidLanguage(stored) ? stored : null;
    } catch {
      return null;
    }
  }

  private getBrowserLanguage(): SupportedLanguage | null {
    if (typeof window === 'undefined' || !navigator) return null;
    const navLang = (navigator.language || (navigator as any).userLanguage || '').toLowerCase();
    if (navLang.startsWith('en')) return 'en';
    if (navLang.startsWith('es')) return 'es';
    return null;
  }

  private persistLanguage(lang: SupportedLanguage): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(this.STORAGE_KEY, lang);
    } catch (e) {
      console.warn('Could not persist language to localStorage', e);
    }
  }

  private updateHtmlLang(lang: SupportedLanguage): void {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }

  private syncUrlQueryParam(lang: SupportedLanguage): void {
    if (typeof window === 'undefined') return;
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { lang },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
