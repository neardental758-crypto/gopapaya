import { Pipe, PipeTransform } from '@angular/core';
import {
  DomSanitizer,
  SafeResourceUrl,
  SafeHtml,
  SafeUrl,
} from '@angular/platform-browser';

@Pipe({
  name: 'safe',
  standalone: true,
})
export class SafePipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(url: string, type: string): SafeResourceUrl | SafeHtml | SafeUrl {
    switch (type) {
      case 'resourceUrl':
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
      case 'html':
        return this.sanitizer.bypassSecurityTrustHtml(url);
      case 'url':
        return this.sanitizer.bypassSecurityTrustUrl(url);
      default:
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
  }
}
