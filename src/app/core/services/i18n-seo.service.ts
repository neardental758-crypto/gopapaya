import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { TranslocoService } from '@jsverse/transloco';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LanguageService, SupportedLanguage } from './language.service';

export interface SeoPageConfig {
  titleKey: string;
  descriptionKey: string;
  keywordsKey?: string;
  ogType?: string;
}

@Injectable({
  providedIn: 'root',
})
export class I18nSeoService {
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private transloco = inject(TranslocoService);
  private languageService = inject(LanguageService);
  private router = inject(Router);

  private readonly BASE_URL = 'https://gopapaya.com';

  private routeMetaMap: Record<string, SeoPageConfig> = {
    '/home': {
      titleKey: 'seo.pages.home.title',
      descriptionKey: 'seo.pages.home.description',
      keywordsKey: 'seo.pages.home.keywords',
    },
    '/login': {
      titleKey: 'seo.pages.login.title',
      descriptionKey: 'seo.pages.login.description',
      keywordsKey: 'seo.pages.login.keywords',
    },
    '/brain-bike': {
      titleKey: 'seo.pages.brainBike.title',
      descriptionKey: 'seo.pages.brainBike.description',
      keywordsKey: 'seo.pages.brainBike.keywords',
    },
    '/calendario': {
      titleKey: 'seo.pages.calendar.title',
      descriptionKey: 'seo.pages.calendar.description',
    },
    '/historial': {
      titleKey: 'seo.pages.history.title',
      descriptionKey: 'seo.pages.history.description',
    },
    '/manual': {
      titleKey: 'seo.pages.manual.title',
      descriptionKey: 'seo.pages.manual.description',
    },
    '/admin/usuarios': {
      titleKey: 'seo.pages.adminUsers.title',
      descriptionKey: 'seo.pages.adminUsers.description',
    },
    '/admin/aliados': {
      titleKey: 'seo.pages.adminAllies.title',
      descriptionKey: 'seo.pages.adminAllies.description',
    },
  };

  public init(): void {
    // Listen for language changes and route changes to synchronize SEO tags
    this.transloco.langChanges$.subscribe((lang) => {
      this.updateSeoForCurrentRoute(lang as SupportedLanguage);
      this.updateStructuredData(lang as SupportedLanguage);
    });

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateSeoForCurrentRoute(this.languageService.getActiveLanguage());
      });
  }

  public updateSeoForCurrentRoute(lang: SupportedLanguage): void {
    if (typeof window === 'undefined') return;

    const currentPath = this.router.url.split('?')[0];
    const config = this.routeMetaMap[currentPath] || {
      titleKey: 'seo.default.title',
      descriptionKey: 'seo.default.description',
      keywordsKey: 'seo.default.keywords',
    };

    const title = this.transloco.translate(config.titleKey);
    const description = this.transloco.translate(config.descriptionKey);
    const keywords = config.keywordsKey ? this.transloco.translate(config.keywordsKey) : '';

    this.titleService.setTitle(title ? `${title} | Go PAPAYA` : 'Go PAPAYA');

    this.metaService.updateTag({ name: 'description', content: description });
    if (keywords) {
      this.metaService.updateTag({ name: 'keywords', content: keywords });
    }

    // Open Graph
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({
      property: 'og:locale',
      content: lang === 'es' ? 'es_ES' : 'en_US',
    });
    this.metaService.updateTag({
      property: 'og:locale:alternate',
      content: lang === 'es' ? 'en_US' : 'es_ES',
    });
    this.metaService.updateTag({ property: 'og:site_name', content: 'Go PAPAYA' });
    this.metaService.updateTag({ property: 'og:type', content: config.ogType || 'website' });

    // Twitter Card
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: title });
    this.metaService.updateTag({ name: 'twitter:description', content: description });

    // Canonical & Hreflang Tags
    this.updateCanonicalAndHreflang(currentPath, lang);
  }

  private updateCanonicalAndHreflang(path: string, lang: SupportedLanguage): void {
    if (typeof document === 'undefined') return;

    const cleanPath = path === '/' ? '/home' : path;
    const currentUrl = `${this.BASE_URL}${cleanPath}?lang=${lang}`;
    const esUrl = `${this.BASE_URL}${cleanPath}?lang=es`;
    const enUrl = `${this.BASE_URL}${cleanPath}?lang=en`;

    this.setOrCreateLinkTag('canonical', currentUrl);
    this.setOrCreateLinkTag('alternate', esUrl, 'es');
    this.setOrCreateLinkTag('alternate', enUrl, 'en');
    this.setOrCreateLinkTag('alternate', esUrl, 'x-default');
  }

  private setOrCreateLinkTag(rel: string, href: string, hreflang?: string): void {
    if (typeof document === 'undefined') return;

    let selector = `link[rel="${rel}"]`;
    if (hreflang) {
      selector += `[hreflang="${hreflang}"]`;
    }

    let link: HTMLLinkElement | null = document.querySelector(selector);
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', rel);
      if (hreflang) {
        link.setAttribute('hreflang', hreflang);
      }
      document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  public updateStructuredData(lang: SupportedLanguage): void {
    if (typeof document === 'undefined') return;

    const scriptId = 'json-ld-gopapaya';
    let scriptTag = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = scriptId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const isEs = lang === 'es';
    const schema = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': 'https://gopapaya.com/#organization',
          name: 'Go PAPAYA',
          url: 'https://gopapaya.com',
          logo: 'https://gopapaya.com/assets/images/logo.png',
          description: isEs
            ? 'Plataforma líder en actividades interactivas de bienestar experiencial, salud corporativa, gamificación deportiva y eduentretenimiento.'
            : 'Leading platform for interactive experiential wellness activities, corporate health, sports gamification, and edutainment.',
          sameAs: ['https://instagram.com/gopapaya'],
          knowsAbout: [
            'Brain Bike',
            'Bicilicuadora',
            'Biketona',
            'Corporate Wellness',
            'Experiential Marketing',
          ],
        },
        {
          '@type': 'SoftwareApplication',
          '@id': 'https://gopapaya.com/#software',
          name: 'Go PAPAYA Activity System',
          applicationCategory: 'HealthApplication, SportsApplication, BusinessApplication',
          operatingSystem: 'Web, Progressive Web App',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
          inLanguage: ['es', 'en'],
        },
      ],
    };

    scriptTag.text = JSON.stringify(schema);
  }
}
