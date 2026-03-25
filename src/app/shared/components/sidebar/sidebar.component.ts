import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

interface SubMenuItem {
  label: string;
  icon: string;
  route: string;
}

interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  subItems?: SubMenuItem[];
  expanded?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  isCollapsed = false;

  menuItems: MenuItem[] = [
    {
      label: 'Inicio',
      icon: '🏠',
      route: '/home',
    },
    {
      label: 'Brain Bike',
      icon: '🧠',
      expanded: false,
      subItems: [{ label: 'Temáticas', icon: '📚', route: '/brain-bike' }],
    },
    {
      label: 'Bicilicuadora',
      icon: '🥤',
      expanded: false,
      subItems: [
        { label: 'Bebidas', icon: '🍹', route: '/bicilicuadora/bebidas' },
      ],
    },
    {
      label: 'Administración',
      icon: '⚙️',
      expanded: false,
      subItems: [
        { label: 'Usuarios', icon: '👥', route: '/admin/usuarios' },
        { label: 'Aliados', icon: '🤝', route: '/admin/aliados' },
      ],
    },
    {
      label: 'Calendario',
      icon: '📅',
      route: '/calendario',
    },
    {
      label: 'Historial',
      icon: '📜',
      route: '/historial',
    },
    {
      label: 'Manual',
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
