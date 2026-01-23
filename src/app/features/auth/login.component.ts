import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  loginForm = {
    email: '',
    password: '',
  };

  goPapayaIcon = 'assets/images/gopapaya.png';

  errorMessage = '';
  loading = false;
  showPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (token) {
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      if (usuario.rol === 'viewer') {
        this.router.navigate(['/historial']);
      } else {
        this.router.navigate(['/home']);
      }
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.loading = true;

    this.authService
      .login(this.loginForm.email, this.loginForm.password)
      .subscribe({
        next: () => {
          this.loading = false;
          const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
          if (usuario.rol === 'viewer') {
            this.router.navigate(['/historial']);
          } else {
            console.log('Redirigiendo a home...');
            this.router.navigate(['/home']);
          }
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage =
            error.error?.message ||
            'Credenciales incorrectas. Verifica tu email y contraseña.';
        },
      });
  }
}
