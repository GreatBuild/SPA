import { Component } from '@angular/core';
import { UserType } from '../../model/user-type.vo';
import { RegisterFormComponent } from '../../components/register-form/register-form.component';
import {MatButton} from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { Router} from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [RegisterFormComponent, MatButton, MatCardModule, TranslatePipe, RouterModule],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.css'
})
export class RegisterPageComponent {
  isRegistered = false;
  successMessage = '';
  errorMessage = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private translate: TranslateService,
    private router: Router
  ) {}

  resetValues() {
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }


  private setError(translationKey: string, details?: string) {
    this.errorMessage = this.translate.instant(translationKey) + (details ? ` ${details}` : '');
    this.successMessage = '';
    this.isLoading = false;
  }


  onRegisterSubmitted(formData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: UserType;
  }) {
    this.resetValues();

    const request = {
      email: formData.email.toLowerCase(),
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      roleName: this.toRoleName(formData.role)
    };

    this.authService.register(request).subscribe({
      next: (response) => {
        this.isRegistered = true;
        this.successMessage = response.message ?? '';
        this.isLoading = false;
      },
      error: (err: any) => {
        const details = err?.error?.message ?? err?.message;
        this.setError('register-page.form.errors.create-account', details);
      }
    });
  }

  private toRoleName(role: UserType): 'ROLE_CLIENT' | 'ROLE_WORKER' {
    return role === UserType.TYPE_WORKER ? 'ROLE_WORKER' : 'ROLE_CLIENT';
  }
}

