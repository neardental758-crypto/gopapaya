import { Component, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService, SupportedLanguage } from '../../../core/services/language.service';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule, TranslocoPipe],
  template: `
    <div class="relative inline-block text-left" #dropdownContainer>
      <!-- Accessible Language Toggle Button -->
      <button
        type="button"
        (click)="toggleDropdown()"
        (keydown)="onKeydown($event)"
        [attr.aria-expanded]="isOpen"
        aria-haspopup="listbox"
        [attr.aria-label]="'common.select_language' | transloco"
        [attr.title]="'common.language' | transloco"
        class="inline-flex items-center gap-2 px-3 py-1.5 bg-dark-800 hover:bg-dark-700 text-gray-200 border border-dark-600 hover:border-neon-yellow rounded-lg text-xs sm:text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-neon-yellow shadow-sm cursor-pointer"
        id="language-menu-button"
      >

        <span class="text-base leading-none" aria-hidden="true">
          {{ currentLang === 'es' ? '🇪🇸' : '🇺🇸' }}
        </span>
        <span class="font-bold tracking-wider text-neon-yellow">
          {{ currentLang.toUpperCase() }}
        </span>
        <svg
          class="w-3.5 h-3.5 text-gray-400 transition-transform duration-200"
          [class.rotate-180]="isOpen"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Dropdown Menu -->
      <div
        *ngIf="isOpen"
        role="listbox"
        aria-labelledby="language-menu-button"
        class="absolute right-0 mt-2 w-36 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-lg animate-fadeIn py-1"
      >
        <button
          *ngFor="let lang of languageService.supportedLanguages; let i = index"
          type="button"
          role="option"
          [attr.aria-selected]="currentLang === lang.code"
          [attr.aria-current]="currentLang === lang.code ? 'true' : null"
          (click)="selectLanguage(lang.code)"
          class="w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm text-left transition-colors cursor-pointer"
          [ngClass]="{
            'bg-dark-700 text-neon-yellow font-bold border-l-2 border-neon-yellow': currentLang === lang.code,
            'text-gray-300 hover:bg-dark-750 hover:text-white': currentLang !== lang.code
          }"
        >
          <div class="flex items-center gap-2">
            <span class="text-base leading-none">{{ lang.flag }}</span>
            <span>{{ lang.name }}</span>
          </div>
          <span *ngIf="currentLang === lang.code" class="text-neon-yellow text-xs font-bold">
            ✓
          </span>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .animate-fadeIn {
        animation: fadeIn 0.15s ease-out forwards;
      }
    `,
  ],
})
export class LanguageSelectorComponent {
  public languageService = inject(LanguageService);
  private elementRef = inject(ElementRef);

  public isOpen = false;

  get currentLang(): SupportedLanguage {
    return this.languageService.currentLang();
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  closeDropdown(): void {
    this.isOpen = false;
  }

  selectLanguage(lang: SupportedLanguage): void {
    this.languageService.setLanguage(lang);
    this.closeDropdown();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeDropdown();
    } else if (event.key === 'ArrowDown' && !this.isOpen) {
      this.isOpen = true;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }
}
