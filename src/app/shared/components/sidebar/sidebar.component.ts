import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

interface SubMenuItem {
  labelKey: string;
  icon: string;
  route: string;
}

interface MenuItem {
  labelKey: string;
  icon: string;
  route?: string;
  subItems?: SubMenuItem[];
  expanded?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslocoPipe],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  isCollapsed = false;

  menuItems: MenuItem[] = [
    {
      labelKey: 'nav.home',
      icon: '🏠',
      route: '/home',
    },
    {
      labelKey: 'nav.brain_bike',
      icon: '🧠',
      expanded: false,
      subItems: [{ labelKey: 'nav.themes', icon: '📚', route: '/brain-bike' }],
    },
    {
      labelKey: 'nav.bicilicuadora',
      icon: '🥤',
      expanded: false,
      subItems: [
        { labelKey: 'nav.drinks', icon: '🍹', route: '/bicilicuadora/bebidas' },
      ],
    },
    {
      labelKey: 'nav.biketona',
      icon: '🚴',
      expanded: false,
      subItems: [
        { labelKey: 'nav.setup', icon: '⚙️', route: '/biketona/splash' },
      ],
    },
    {
      labelKey: 'nav.administration',
      icon: '⚙️',
      expanded: false,
      subItems: [
        { labelKey: 'nav.users', icon: '👥', route: '/admin/usuarios' },
        { labelKey: 'nav.allies', icon: '🤝', route: '/admin/aliados' },
      ],
    },
    {
      labelKey: 'nav.calendar',
      icon: '📅',
      route: '/calendario',
    },
    {
      labelKey: 'nav.history',
      icon: '📜',
      route: '/historial',
    },
    {
      labelKey: 'nav.manual',
      icon: '📘',
      route: '/manual',
    },
  ];


  constructor(private router: Router) {}

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    if (this.isCollapsed) {
      this.menuItems.forEach((item) => (item.expanded = false));
    }
  }

  toggleSubMenu(item: MenuItem): void {
    if (this.isCollapsed) return;

    if (item.subItems) {
      item.expanded = !item.expanded;
    } else if (item.route) {
      this.router.navigate([item.route]);
    }
  }

  hasSubItems(item: MenuItem): boolean {
    return !!item.subItems && item.subItems.length > 0;
  }
}
