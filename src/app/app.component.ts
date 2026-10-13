import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from './core/services/language.service';
import { I18nSeoService } from './core/services/i18n-seo.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: [],
})
export class AppComponent implements OnInit {
  private languageService = inject(LanguageService);
  private seoService = inject(I18nSeoService);

  ngOnInit(): void {
    this.languageService.initLanguage();
    this.seoService.init();
  }
}

